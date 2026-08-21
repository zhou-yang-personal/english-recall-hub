import { generateCardsForNote, type CardIdFactory } from '../../domain/cardGenerator';
import type {
  CardGenerationNote,
  CardRecord,
  CardTemplateDefinition,
  NoteRecord,
} from '../../domain/content';
import { sha256Hex } from '../../shared/sha256';
import {
  manifestSchema,
  noteSchema,
  templateSchema,
  type NotePayload,
} from './contentSchemas';
import type { CardContentSource } from './contentSource';
import type { ContentStore } from './contentStore';

export const CONTENT_PROJECTION_VERSION = 2;

export interface ContentSyncReport {
  status: 'unchanged' | 'updated';
  requestedPacks: number;
  loadedPacks: number;
  validNotes: number;
  skippedNotes: number;
  generatedCards: number;
  warnings: string[];
}

export interface SyncContentDependencies {
  now: () => Date;
  createCardId: CardIdFactory;
}

const defaultDependencies: SyncContentDependencies = {
  now: () => new Date(),
  createCardId: sha256Hex,
};

function parseJson(value: string, path: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`JSON 格式无效：${path}`);
  }
}

function assertProfilePath(path: string, contentProfileId: string): void {
  if (!path.startsWith(`profiles/${contentProfileId}/`)) {
    throw new Error(`Manifest 包含其他内容档案的路径：${path}`);
  }
}

async function mapWithConcurrency<T, R>(
  values: readonly T[],
  concurrency: number,
  mapValue: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = Array.from({ length: values.length }) as R[];
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      const value = values[index];

      if (value !== undefined) {
        results[index] = await mapValue(value, index);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker()),
  );
  return results;
}

function parsePack(
  text: string,
  path: string,
  contentProfileId: string,
): { notes: NotePayload[]; skipped: number; warnings: string[] } {
  const notes: NotePayload[] = [];
  const warnings: string[] = [];
  let skipped = 0;

  for (const [index, rawLine] of text.split(/\r?\n/).entries()) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(line) as unknown;
    } catch {
      skipped += 1;
      warnings.push(`${path}:${index + 1} 不是有效 JSON。`);
      continue;
    }

    const result = noteSchema.safeParse(parsed);

    if (!result.success || result.data.profile_id !== contentProfileId) {
      skipped += 1;
      warnings.push(`${path}:${index + 1} Note 字段无效或档案不匹配。`);
      continue;
    }

    notes.push(result.data);
  }

  return { notes, skipped, warnings };
}

function toTemplate(value: ReturnType<typeof templateSchema.parse>): CardTemplateDefinition {
  return {
    templateId: value.template_id,
    noteType: value.note_type,
    cards: value.cards.map((card) => ({
      cardType: card.card_type,
      front: card.front,
      back: card.back,
    })),
  };
}

function toGenerationNote(note: NotePayload): CardGenerationNote {
  return {
    contentProfileId: note.profile_id,
    noteId: note.note_id,
    noteType: note.type,
    status: note.status,
    core: note.core,
    meaningCn: note.meaning_cn,
    ...(note.pronunciation?.text
      ? { pronunciationText: note.pronunciation.text }
      : {}),
    ...(note.pronunciation?.lang
      ? { pronunciationLang: note.pronunciation.lang }
      : {}),
  };
}

export async function syncContent(
  contentProfileId: string,
  source: CardContentSource,
  store: ContentStore,
  dependencies: SyncContentDependencies = defaultDependencies,
): Promise<ContentSyncReport> {
  const manifestPath = `profiles/${contentProfileId}/manifest.json`;
  const manifest = manifestSchema.parse(
    parseJson(await source.readText(manifestPath), manifestPath),
  );

  if (manifest.profile_id !== contentProfileId) {
    throw new Error('Manifest 的 profile_id 与所选学习者不匹配。');
  }

  const previous = await store.getSyncState(contentProfileId);

  if (
    previous?.manifestUpdatedAt === manifest.updated_at
    && previous.projectionVersion === CONTENT_PROJECTION_VERSION
  ) {
    return {
      status: 'unchanged',
      requestedPacks: manifest.packs.length,
      loadedPacks: manifest.packs.length,
      validNotes: previous.noteCount,
      skippedNotes: 0,
      generatedCards: previous.cardCount,
      warnings: [],
    };
  }

  for (const path of [...manifest.templates, ...manifest.packs.map(({ path }) => path)]) {
    assertProfilePath(path, contentProfileId);
  }

  const [templatePayloads, packPayloads] = await Promise.all([
    mapWithConcurrency(manifest.templates, 4, async (path) =>
      templateSchema.parse(parseJson(await source.readText(path), path)),
    ),
    mapWithConcurrency(manifest.packs, 4, async (pack) => ({
      pack,
      parsed: parsePack(await source.readText(pack.path), pack.path, contentProfileId),
    })),
  ]);

  const templates = templatePayloads.map(toTemplate);
  const warnings: string[] = [];
  const noteById = new Map<string, { payload: NotePayload; source: string }>();
  let skippedNotes = 0;

  if (manifest.packs.some(({ sha256 }) => !sha256)) {
    warnings.push('Manifest 未提供 Pack 哈希，本次仅按 updated_at 判断内容版本。');
  }

  for (const { pack, parsed } of packPayloads) {
    skippedNotes += parsed.skipped;
    warnings.push(...parsed.warnings);

    if (parsed.notes.length + parsed.skipped !== pack.note_count) {
      warnings.push(
        `${pack.path}: Manifest 记录 ${pack.note_count} 条，实际读取 ${parsed.notes.length + parsed.skipped} 条。`,
      );
    }

    for (const note of parsed.notes) {
      if (noteById.has(note.note_id)) {
        warnings.push(`${note.note_id}: 在多个 Pack 中重复，采用 Manifest 中靠后的记录。`);
      }

      noteById.set(note.note_id, { payload: note, source: pack.path });
    }
  }

  const notes: NoteRecord[] = [];
  const cards: CardRecord[] = [];

  for (const { payload, source: noteSource } of noteById.values()) {
    notes.push({
      contentProfileId,
      noteId: payload.note_id,
      status: payload.status,
      source: noteSource,
      updatedAt: payload.updated_at ?? manifest.updated_at,
      noteType: payload.type,
      core: payload.core,
      meaningCn: payload.meaning_cn,
      ...(payload.pronunciation?.text
        ? { pronunciationText: payload.pronunciation.text }
        : {}),
      ...(payload.pronunciation?.lang
        ? { pronunciationLang: payload.pronunciation.lang }
        : {}),
      payload,
    });

    const generated = await generateCardsForNote(
      toGenerationNote(payload),
      templates,
      dependencies.createCardId,
    );
    cards.push(...generated.cards);
    warnings.push(...generated.warnings);
  }

  if (notes.length !== manifest.note_count) {
    warnings.push(
      `Manifest 记录 ${manifest.note_count} 条 Note，本次有效且去重后为 ${notes.length} 条。`,
    );
  }

  if (manifest.note_count > 0 && notes.length === 0) {
    throw new Error('Manifest 声明了 Note，但本次没有任何有效记录；已保留原有内容。');
  }

  const uniqueCards = new Map<string, CardRecord>();

  for (const card of cards) {
    if (uniqueCards.has(card.cardId)) {
      warnings.push(`${card.cardId}: 生成了重复卡片，已按稳定 ID 去重。`);
    }

    uniqueCards.set(card.cardId, card);
  }

  const deduplicatedCards = [...uniqueCards.values()];

  await store.replaceContent(contentProfileId, notes, deduplicatedCards, {
    contentProfileId,
    manifestUpdatedAt: manifest.updated_at,
    projectionVersion: CONTENT_PROJECTION_VERSION,
    importedAt: dependencies.now().toISOString(),
    noteCount: notes.length,
    cardCount: deduplicatedCards.length,
  });

  return {
    status: 'updated',
    requestedPacks: manifest.packs.length,
    loadedPacks: packPayloads.length,
    validNotes: notes.length,
    skippedNotes,
    generatedCards: deduplicatedCards.length,
    warnings,
  };
}
