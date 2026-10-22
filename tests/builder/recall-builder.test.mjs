import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { build, cardId, noteId } from '../../scripts/recall-builder.mjs';

function put(root,path,content){const target=join(root,path);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,content);}
function validDraft(id='draft_1',core='Please review the certification documents.'){
 const clean=core.toLowerCase().replace(/['’]/g,'').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
 return {draft_id:id,profile_id:'manman',source_project:'英文学习',source_type:'chatgpt',source_question:'请检查认证材料',note_type:'sentence',core,meaning_cn:'请检查认证材料。',explanation_cn:'工作场景的完整句子。',source_sentence:'请检查认证材料',examples:[{en:core,cn:'请检查认证材料。'}],pronunciation:{text:core,lang:'en',hint_cn:'重读 certification'},candidate_cards:['recognition','production'],dedupe_key:`sentence:${clean}`,collections:['scenario:business-communication'],tags:['sentence','business'],quality_hint:'high',created_at:'2026-10-20T16:00:00Z',status:'new'};
}
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'recall-builder-'));const draft=join(root,'draft'),card=join(root,'card');
 put(card,'profiles/manman/manifest.json',JSON.stringify({profile_id:'manman',schema_version:'0.1.0',updated_at:'2026-10-19T00:00:00Z',note_count:0,packs:[],templates:['profiles/manman/templates/sentence.v1.json'],collections_path:'profiles/manman/collections.json',dedupe_index_path:'profiles/manman/dedupe_index.json',builder_ledger_path:'profiles/manman/builder-ledger.jsonl',notes:{active:0,mature:0,suspended:0,archived:0},warnings:[]}));
 put(card,'profiles/manman/dedupe_index.json',JSON.stringify({profile_id:'manman',updated_at:'2026-10-19T00:00:00Z',items:{}}));
 put(card,'profiles/manman/collections.json',JSON.stringify({profile_id:'manman',updated_at:'2026-10-19T00:00:00Z',collections:[{collection_id:'scenario:business-communication',name:'Business Communication',type:'scenario',note_count:0}]}));
 put(card,'profiles/manman/templates/sentence.v1.json',JSON.stringify({note_type:'sentence',template_id:'sentence.v1',cards:[{card_type:'recognition'},{card_type:'production'},{card_type:'cloze'}]}));
 return {draft,card};
}
const inbox='profiles/manman/inbox/2026/10/2026-10-20.jsonl';
function pending(f,lines){put(f.draft,inbox,lines.join('\n')+'\n');}
function read(f,path){return JSON.parse(readFileSync(join(f.card,path),'utf8'));}
const now='2026-10-20T22:51:41Z';
test('publishes a new sentence, updates 4 metadata artifacts and is idempotent',()=>{
 const f=fixture(),d=validDraft();pending(f,[JSON.stringify(d)]);
 const result=build({...f,draftRoot:f.draft,cardRoot:f.card,now});
 assert.equal(result.published,1);assert.equal(result.rejected,0);
 assert.equal(result.written_files.length,5);
 const manifest=read(f,'profiles/manman/manifest.json');
 assert.equal(manifest.note_count,1);assert.equal(manifest.packs.length,1);assert.equal(manifest.packs[0].note_count,1);
 assert.equal(manifest.packs[0].sha256,null);
 const idx=read(f,'profiles/manman/dedupe_index.json');
 assert.equal(idx.items[d.dedupe_key],noteId(d));
 const pack=readFileSync(join(f.card,manifest.packs[0].path),'utf8').trim();
 const note=JSON.parse(pack);assert.equal(note.type,'sentence');assert.deepEqual(note.source_draft_ids,[d.draft_id]);
 assert.equal(cardId(note.note_id,'sentence.v1','recognition').length,64);
 const again=build({...f,draftRoot:f.draft,cardRoot:f.card,now:'2026-10-21T00:00:00Z'});
 assert.equal(again.changed,false);assert.equal(again.skipped,1);
});
test('rejects bad records, invalid type fields, and missing grammar template independently',()=>{
 const f=fixture(),badPron=validDraft('draft_bad','Please review the report.');badPron.pronunciation.audio_url='https://example.invalid/audio';
 const grammar=validDraft('draft_grammar','Please review the grammar.');grammar.note_type='grammar';grammar.dedupe_key='grammar:relative_clause';
 const good=validDraft();pending(f,['invalid-json',JSON.stringify(badPron),JSON.stringify(grammar),JSON.stringify(good)]);
 const result=build({...f,draftRoot:f.draft,cardRoot:f.card,now});
 assert.equal(result.total,4);assert.equal(result.rejected,3);assert.equal(result.published,1);
 assert.match(result.rejected_items.map(x=>x.reason).join('|'),/invalid JSON/);
 assert.match(result.rejected_items.map(x=>x.reason).join('|'),/invalid pronunciation/);
 assert.match(result.rejected_items.map(x=>x.reason).join('|'),/no active template/);
});
test('dry run does not write, and duplicate input keys publish once',()=>{
 const f=fixture(),d=validDraft(),d2={...d,draft_id:'draft_2'};
 pending(f,[JSON.stringify(d),JSON.stringify(d2)]);
 const dry=build({...f,draftRoot:f.draft,cardRoot:f.card,now,dryRun:true});
 assert.equal(dry.published,1);assert.equal(dry.skipped,1);
 assert.equal(read(f,'profiles/manman/manifest.json').note_count,0);
 const actual=build({...f,draftRoot:f.draft,cardRoot:f.card,now});
 assert.equal(actual.published,1);assert.equal(actual.skipped,1);
});
test('merges another source draft into published note without changing its id',()=>{
 const f=fixture(),d=validDraft();pending(f,[JSON.stringify(d)]);
 build({...f,draftRoot:f.draft,cardRoot:f.card,now});
 const second={...d,draft_id:'draft_2',examples:[{en:'Please review the documents.',cn:'请检查材料。'}]};
 pending(f,[JSON.stringify(d),JSON.stringify(second)]);
 const merge=build({...f,draftRoot:f.draft,cardRoot:f.card,now:'2026-10-21T10:00:00Z'});
 assert.equal(merge.published,0);assert.equal(merge.merged,1);
 const manifest=read(f,'profiles/manman/manifest.json');assert.equal(manifest.note_count,1);
 const note=JSON.parse(readFileSync(join(f.card,manifest.packs[0].path),'utf8').trim());
 assert.deepEqual(note.source_draft_ids,['draft_1','draft_2']);assert.equal(note.note_id,noteId(d));assert.equal(note.examples.length,2);
});
test('supports legacy normal quality_hint without duplicate publication',()=>{
 const f=fixture(),d=validDraft();
 d.quality_hint='normal';
 pending(f,[JSON.stringify(d)]);
 const first=build({...f,draftRoot:f.draft,cardRoot:f.card,now});
 assert.equal(first.published,1);assert.equal(first.rejected,0);
 const second=build({...f,draftRoot:f.draft,cardRoot:f.card,now:'2026-10-21T00:00:00Z'});
 assert.equal(second.changed,false);assert.equal(second.skipped,1);assert.equal(second.rejected,0);
});
test('aborts without writes if card manifest counts are inconsistent',()=>{
 const f=fixture();pending(f,[JSON.stringify(validDraft())]);
 const manifest=read(f,'profiles/manman/manifest.json');manifest.note_count=42;
 put(f.card,'profiles/manman/manifest.json',JSON.stringify(manifest));
 assert.throws(()=>build({...f,draftRoot:f.draft,cardRoot:f.card,now}),/manifest\/index total mismatch/);
 assert.equal(read(f,'profiles/manman/manifest.json').note_count,42);
});
