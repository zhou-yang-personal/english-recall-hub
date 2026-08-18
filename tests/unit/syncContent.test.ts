import { describe, expect, it } from 'vitest';
import type { CardRecord, NoteRecord } from '../../src/domain/content';
import type { CardContentSource } from '../../src/features/content-sync/contentSource';
import type { ContentStore } from '../../src/features/content-sync/contentStore';
import { syncContent } from '../../src/features/content-sync/syncContent';
import type { ContentSyncState } from '../../src/infrastructure/db/database';

const manifestPath = 'profiles/manman/manifest.json';
const templatePath = 'profiles/manman/templates/phrase.v1.json';
const packPath = 'profiles/manman/packs/notes.jsonl';

const manifest = {
  profile_id: 'manman',
  schema_version: '0.1.0',
  updated_at: '2026-08-18T00:00:00Z',
  note_count: 1,
  packs: [
    {
      pack_id: 'notes',
      path: packPath,
      format: 'jsonl',
      note_count: 2,
      sha256: null,
    },
  ],
  templates: [templatePath],
};

const template = {
  template_id: 'phrase.v1',
  note_type: 'phrase',
  cards: [
    { card_type: 'recognition', front: '{{core}} 是什么意思？', back: '{{meaning_cn}}' },
    { card_type: 'production', front: '{{meaning_cn}} 用英文怎么说？', back: '{{core}}' },
  ],
};

const note = {
  note_id: 'note-1',
  profile_id: 'manman',
  type: 'phrase',
  core: 'work out',
  meaning_cn: '奏效',
  status: 'active',
  updated_at: '2026-08-18T00:00:00Z',
  pronunciation: { text: 'work out', lang: 'en' },
};

class FakeSource implements CardContentSource {
  readonly reads: string[] = [];

  constructor(readonly values: Map<string, string>) {}

  async readText(path: string): Promise<string> {
    this.reads.push(path);
    const value = this.values.get(path);

    if (value === undefined) {
      throw new Error(`missing: ${path}`);
    }

    return value;
  }
}

class MemoryContentStore implements ContentStore {
  state: ContentSyncState | undefined;
  notes: NoteRecord[] = [];
  cards: CardRecord[] = [];

  async getSyncState(): Promise<ContentSyncState | undefined> {
    return this.state;
  }

  async replaceContent(
    _contentProfileId: string,
    notes: readonly NoteRecord[],
    cards: readonly CardRecord[],
    state: ContentSyncState,
  ): Promise<void> {
    this.notes = [...notes];
    this.cards = [...cards];
    this.state = state;
  }
}

function sourceValues() {
  return new Map([
    [manifestPath, JSON.stringify(manifest)],
    [templatePath, JSON.stringify(template)],
    [packPath, `${JSON.stringify(note)}\nnot-json`],
  ]);
}

describe('syncContent', () => {
  it('imports valid JSONL rows, skips invalid rows and accepts no trailing newline', async () => {
    const source = new FakeSource(sourceValues());
    const store = new MemoryContentStore();

    const report = await syncContent('manman', source, store, {
      now: () => new Date('2026-08-18T01:00:00Z'),
      createCardId: async (canonical) => `hash:${canonical}`,
    });

    expect(report).toMatchObject({
      status: 'updated',
      requestedPacks: 1,
      loadedPacks: 1,
      validNotes: 1,
      skippedNotes: 1,
      generatedCards: 2,
    });
    expect(store.notes).toHaveLength(1);
    expect(store.cards).toHaveLength(2);
    expect(store.state).toMatchObject({ noteCount: 1, cardCount: 2 });
    expect(report.warnings).toContain(
      'Manifest 未提供 Pack 哈希，本次仅按 updated_at 判断内容版本。',
    );
  });

  it('reads only the manifest when the local content version is unchanged', async () => {
    const source = new FakeSource(sourceValues());
    const store = new MemoryContentStore();
    store.state = {
      contentProfileId: 'manman',
      manifestUpdatedAt: manifest.updated_at,
      importedAt: '2026-08-18T01:00:00Z',
      noteCount: 137,
      cardCount: 274,
    };

    await expect(syncContent('manman', source, store)).resolves.toMatchObject({
      status: 'unchanged',
      validNotes: 137,
      generatedCards: 274,
    });
    expect(source.reads).toEqual([manifestPath]);
  });

  it('does not replace the previous content when a required pack fails', async () => {
    const values = sourceValues();
    values.set(manifestPath, JSON.stringify({ ...manifest, updated_at: '2026-08-19T00:00:00Z' }));
    values.delete(packPath);
    const source = new FakeSource(values);
    const store = new MemoryContentStore();
    store.notes = [{
      contentProfileId: 'manman',
      noteId: 'existing',
      status: 'active',
      source: 'existing.jsonl',
      updatedAt: '2026-08-17T00:00:00Z',
      payload: {},
    }];

    await expect(syncContent('manman', source, store)).rejects.toThrow(`missing: ${packPath}`);
    expect(store.notes.map(({ noteId }) => noteId)).toEqual(['existing']);
  });
});
