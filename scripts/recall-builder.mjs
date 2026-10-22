#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';

const NOTE_TYPES = new Set(['word', 'phrase', 'sentence', 'grammar', 'expression']);
const REQUIRED_DRAFT_FIELDS = [
  'draft_id', 'profile_id', 'source_project', 'source_type', 'source_question',
  'note_type', 'core', 'meaning_cn', 'explanation_cn', 'source_sentence',
  'examples', 'pronunciation', 'candidate_cards', 'dedupe_key',
  'collections', 'tags', 'quality_hint', 'created_at', 'status',
];
const PRONUNCIATION_FIELDS = new Set(['text', 'lang', 'hint_cn']);
const SUPPORTED_CARDS = new Set(['recognition', 'production']);
const PROFILE_PATTERN = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const DRAFT_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}\.jsonl$/;

function fail(message) { throw new Error(message); }
export function sha256(text) { return createHash('sha256').update(text, 'utf8').digest('hex'); }
export function cardId(noteId, templateId, cardType) {
  return sha256(`${noteId}|${templateId}|${cardType}`);
}
export function noteId(draft) {
  const slug = draft.core.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return `note_${draft.note_type}_${slug}_v1`;
}

function uniqueStrings(value) {
  return Array.isArray(value) && value.every(x => typeof x === 'string' && x.trim()) && new Set(value).size === value.length;
}
function verifyDraft(d, profile, templates) {
  if (!d || typeof d !== 'object' || Array.isArray(d)) return 'Draft must be an object';
  if (JSON.stringify(Object.keys(d).sort()) !== JSON.stringify([...REQUIRED_DRAFT_FIELDS].sort())) return 'required fields mismatch';
  if (d.profile_id !== profile || d.source_project !== '英文学习' || d.source_type !== 'chatgpt') return 'wrong source/profile';
  if (d.status !== 'new') return 'status is not new';
  if (!NOTE_TYPES.has(d.note_type)) return 'illegal note_type';
  for (const field of ['draft_id','source_question','core','meaning_cn','explanation_cn','source_sentence','dedupe_key','created_at']) {
    if (typeof d[field] !== 'string' || !d[field].trim()) return `invalid ${field}`;
  }
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(d.created_at) || Number.isNaN(Date.parse(d.created_at))) return 'invalid created_at';
  if (!d.dedupe_key.startsWith(`${d.note_type}:`)) return 'dedupe_key disagrees with note_type';
  if (!uniqueStrings(d.tags) || !uniqueStrings(d.collections) || !uniqueStrings(d.candidate_cards)) return 'invalid tags/collections/candidate_cards';
  if (!['high','medium'].includes(d.quality_hint)) return 'low or illegal quality_hint';
  if (!Array.isArray(d.examples) || !d.examples.every(x=>x && typeof x.en==='string' && x.en.trim() && typeof x.cn==='string' && x.cn.trim())) return 'invalid examples';
  const pron=d.pronunciation;
  if (!pron || typeof pron!=='object' || Array.isArray(pron) || Object.keys(pron).some(k=>!PRONUNCIATION_FIELDS.has(k)) || typeof pron.text!=='string' || !pron.text.trim() || typeof pron.lang!=='string' || !pron.lang.trim() || (pron.hint_cn!==undefined && typeof pron.hint_cn!=='string')) return 'invalid pronunciation';
  if (d.note_type==='word' && /\s/.test(d.core.trim())) return 'word contains whitespace; check phrase/sentence';
  if (d.note_type==='phrase' && (!/\s/.test(d.core.trim()) || /[.!?]$/.test(d.core.trim()))) return 'phrase should be multiword and non-sentence';
  if (d.note_type==='sentence' && !/[.!?]$/.test(d.core.trim())) return 'sentence does not end with sentence punctuation';
  const template=templates.get(d.note_type);
  if (!template) return 'no active template for note_type';
  if (!d.candidate_cards.some(t=>SUPPORTED_CARDS.has(t) && template.cards.some(c=>c.card_type===t))) return 'no supported candidate_cards';
  return null;
}

export function parseJsonl(content, source) {
  const parsed=[];
  for (const [index,line] of content.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    try { parsed.push({value:JSON.parse(line), line:index+1}); }
    catch (e) { parsed.push({error:`${source}:${index+1}: invalid JSON (${e.message})`,line:index+1}); }
  }
  return parsed;
}
function readJson(path) { return JSON.parse(readFileSync(path, 'utf8')); }
function readJsonl(path) { return parseJsonl(readFileSync(path,'utf8'),path).map(x=>{if(x.error)fail(x.error);return x.value;}); }
function findDraftPaths(folder) {
  if(!existsSync(folder)) return [];
  const result=[];
  function traverse(root) {
    for (const entry of readdirSync(root,{withFileTypes:true})) {
      const p=join(root,entry.name);
      if(entry.isDirectory()) traverse(p);
      else if(entry.isFile() && DRAFT_FILE_PATTERN.test(entry.name) && /^\d{4}\/\d{2}\/\d{4}-\d{2}-\d{2}\.jsonl$/.test(relative(folder,p).replaceAll('\\','/'))) result.push(p);
    }
  }
  traverse(folder); return result.sort();
}
function writeSafely(path, content) {
  mkdirSync(dirname(path),{recursive:true});
  const tmp=`${path}.builder-tmp`;
  writeFileSync(tmp,content,'utf8');
  renameSync(tmp,path);
}
function jsonFile(data) {return `${JSON.stringify(data,null,2)}\n`;}
function jsonlFile(rows) {return `${rows.map(v=>JSON.stringify(v)).join('\n')}\n`;}
function uniqueMerge(existing, appended) {
  const result=[...existing]; const seen=new Set(existing.map(x=>JSON.stringify(x)));
  for(const item of appended){const key=JSON.stringify(item);if(!seen.has(key)){result.push(item);seen.add(key);}}
  return result;
}
function formalNote(d, now) {
  return {
    note_id:noteId(d),profile_id:d.profile_id,type:d.note_type,core:d.core,
    meaning_cn:d.meaning_cn,explanation_cn:d.explanation_cn,source_sentence:d.source_sentence,
    examples:d.examples,pronunciation:d.pronunciation,dedupe_key:d.dedupe_key,
    collections:d.collections,tags:d.tags,source_draft_ids:[d.draft_id],
    status:'active',created_at:d.created_at,updated_at:now,
  };
}
function auditTemplates(cardRoot, manifest) {
  const templates=new Map();
  for(const name of manifest.templates){
    const t=readJson(join(cardRoot,name));
    if(t?.note_type && typeof t.template_id==='string' && Array.isArray(t.cards))templates.set(t.note_type,t);
  }
  return templates;
}

// The caller checks out draft and card separately. No git commands or network access are required here.
// Files are changed only after complete validation and an in-memory publish plan.
export function build({draftRoot,cardRoot,profile='manman',now=new Date().toISOString(),dryRun=false}) {
  if(!PROFILE_PATTERN.test(profile))fail('invalid profile');
  if(!Number.isFinite(Date.parse(now)))fail('invalid now');
  const base=`profiles/${profile}`;
  const manifestPath=join(cardRoot,base,'manifest.json');
  const indexPath=join(cardRoot,base,'dedupe_index.json');
  const collectionsPath=join(cardRoot,base,'collections.json');
  const ledgerPath=join(cardRoot,base,'builder-ledger.jsonl');
  const manifest=readJson(manifestPath), idx=readJson(indexPath), coll=readJson(collectionsPath);
  const index=idx.items;
  if(!index || typeof index!=='object' || Array.isArray(index))fail('dedupe_index.items invalid');
  if(manifest.profile_id!==profile || coll.profile_id!==profile)fail('profile mismatch in card library');
  const templates=auditTemplates(cardRoot,manifest);
  const allNotes=[], packNotes=new Map(), idToPack=new Map(), dedupeToNote=new Map();
  for(const pack of manifest.packs){
    const notes=readJsonl(join(cardRoot,pack.path));
    if(pack.note_count!==notes.length)fail(`pack count mismatch: ${pack.path}`);
    packNotes.set(pack.path,notes);
    for(const n of notes){
      if(dedupeToNote.has(n.dedupe_key)||idToPack.has(n.note_id))fail(`duplicate note in manifest: ${n.note_id}`);
      allNotes.push(n);idToPack.set(n.note_id,pack.path);dedupeToNote.set(n.dedupe_key,n);
      if(index[n.dedupe_key]!==n.note_id)fail(`index mismatch for ${n.dedupe_key}`);
    }
  }
  if(manifest.note_count!==allNotes.length || Object.keys(index).length!==allNotes.length)fail('manifest/index total mismatch');
  const paths=findDraftPaths(join(draftRoot,base,'inbox'));
  const summary={source_files:paths.map(p=>relative(draftRoot,p).replaceAll('\\','/')),total:0,published:0,merged:0,rejected:0,skipped:0,rejected_items:[],published_note_ids:[],merged_draft_ids:[]};
  const seenDraftIds=new Set(),seenNewKeys=new Set(),changedExisting=new Set(),newNotes=[];
  for(const path of paths){
    const source=relative(draftRoot,path).replaceAll('\\','/');
    for(const record of parseJsonl(readFileSync(path,'utf8'),source)){
      summary.total++;
      if(record.error){summary.rejected++;summary.rejected_items.push({source,line:record.line,reason:record.error});continue;}
      const d=record.value;
      const reason=verifyDraft(d,profile,templates);
      if(reason){summary.rejected++;summary.rejected_items.push({source,line:record.line,draft_id:d?.draft_id||null,reason});continue;}
      if(seenDraftIds.has(d.draft_id)){summary.skipped++;continue;}
      seenDraftIds.add(d.draft_id);
      if(seenNewKeys.has(d.dedupe_key)){summary.skipped++;continue;}
      const existing=dedupeToNote.get(d.dedupe_key);
      if(existing){
        if((existing.source_draft_ids||[]).includes(d.draft_id)){summary.skipped++;continue;}
        existing.source_draft_ids=uniqueMerge(existing.source_draft_ids||[],[d.draft_id]);
        existing.examples=uniqueMerge(existing.examples||[],d.examples);
        existing.tags=uniqueMerge(existing.tags||[],d.tags);
        // Do not replace an existing primary learning target or Note ID.
        if(!existing.source_sentence && d.source_sentence)existing.source_sentence=d.source_sentence;
        existing.updated_at=now;
        changedExisting.add(idToPack.get(existing.note_id));summary.merged++;summary.merged_draft_ids.push(d.draft_id);
        continue;
      }
      const n=formalNote(d,now);
      if(idToPack.has(n.note_id) || newNotes.some(x=>x.note_id===n.note_id)){
        summary.rejected++;summary.rejected_items.push({source,line:record.line,draft_id:d.draft_id,reason:'note_id collision'});continue;
      }
      // Card IDs are intentionally derived here, but the Web client materializes the cards.
      const template=templates.get(n.type);
      for(const cardType of d.candidate_cards.filter(x=>SUPPORTED_CARDS.has(x))){
        if(template.cards.some(c=>c.card_type===cardType) && !/^[0-9a-f]{64}$/.test(cardId(n.note_id,template.template_id,cardType))) fail('invalid Card ID');
      }
      seenNewKeys.add(d.dedupe_key);newNotes.push(n);dedupeToNote.set(d.dedupe_key,n);
      index[d.dedupe_key]=n.note_id;
      summary.published++;summary.published_note_ids.push(n.note_id);
    }
  }
  const changed=summary.published>0 || summary.merged>0;
  if(!changed)return {...summary,changed:false,written_files:[]};
  // A run ID incorporates stable draft IDs to avoid overwriting a previous pack on retry.
  const fingerprint=sha256([...summary.published_note_ids,...summary.merged_draft_ids].join('|')).slice(0,12);
  const stamp=now.replace(/[-:TZ.]/g,'').slice(0,14);
  const runId=`builder_${stamp}_${fingerprint}`;
  const writes=new Map();
  for(const p of changedExisting)writes.set(p,jsonlFile(packNotes.get(p)));
  if(newNotes.length){
    const packId=`notes_${stamp}_${fingerprint}`;
    const path=`${base}/packs/${packId}.jsonl`;
    if(existsSync(join(cardRoot,path)))fail(`new pack path already exists: ${path}`);
    writes.set(path,jsonlFile(newNotes));
    manifest.packs.push({pack_id:packId,path,format:'jsonl',note_count:newNotes.length,sealed:true,sha256:null});
  }
  manifest.note_count+=newNotes.length;
  manifest.notes.active+=newNotes.length;
  const oldStamp=manifest.updated_at;
  if(Date.parse(now)<=Date.parse(oldStamp))fail('builder timestamp must exceed manifest.updated_at');
  manifest.updated_at=now;idx.updated_at=now;coll.updated_at=now;
  for(const n of newNotes){
    for(const collectionId of n.collections){
      let item=coll.collections.find(x=>x.collection_id===collectionId);
      if(!item){item={collection_id:collectionId,name:collectionId,type:collectionId.split(':')[0],note_count:0};coll.collections.push(item);}
      item.note_count++;
    }
  }
  writes.set(relative(cardRoot,manifestPath).replaceAll('\\','/'),jsonFile(manifest));
  writes.set(relative(cardRoot,indexPath).replaceAll('\\','/'),jsonFile(idx));
  writes.set(relative(cardRoot,collectionsPath).replaceAll('\\','/'),jsonFile(coll));
  const entry={run_id:runId,profile_id:profile,started_at:now,source_files:summary.source_files,total:summary.total,published:summary.published,merged:summary.merged,rejected:summary.rejected,skipped:summary.skipped,published_note_ids:summary.published_note_ids,merged_draft_ids:summary.merged_draft_ids,rejected_items:summary.rejected_items,status:'success',notes:'Node Builder; recognition/production only. Commit all changed files atomically with Git; no checksum claimed.'};
  const oldLedger=existsSync(ledgerPath)?readFileSync(ledgerPath,'utf8').replace(/\s*$/,'')+'\n':'';
  writes.set(relative(cardRoot,ledgerPath).replaceAll('\\','/'),`${oldLedger}${JSON.stringify(entry)}\n`);
  if(!dryRun){
    for(const [name,content] of writes)writeSafely(join(cardRoot,name),content);
  }
  return {...summary,changed:true,run_id:runId,written_files:[...writes.keys()],dry_run:dryRun};
}

if(process.argv[1] && resolve(process.argv[1])===resolve(new URL(import.meta.url).pathname)){
  const args=Object.fromEntries(process.argv.slice(2).reduce((pairs,item,i,all)=>{if(item.startsWith('--'))pairs.push([item.slice(2),all[i+1]]);return pairs;},[]));
  try{
    if(!args['draft-root']||!args['card-root'])fail('Usage: node scripts/recall-builder.mjs --draft-root ./draft --card-root ./card [--profile manman] [--dry-run]');
    const report=build({draftRoot:resolve(args['draft-root']),cardRoot:resolve(args['card-root']),profile:args.profile||'manman',dryRun:process.argv.includes('--dry-run')});
    process.stdout.write(`${JSON.stringify(report,null,2)}\n`);
  }catch(error){process.stderr.write(`Builder failed: ${error.message}\n`);process.exitCode=1;}
}
