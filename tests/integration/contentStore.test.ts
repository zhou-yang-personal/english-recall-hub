import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CardRecord, NoteRecord } from '../../src/domain/content';
import { DexieContentStore } from '../../src/infrastructure/db/DexieContentStore';
import { RecallDatabase } from '../../src/infrastructure/db/database';

let database: RecallDatabase | undefined;

afterEach(async () => {
  if (database) {
    await database.delete();
    database = undefined;
  }
});

const note: NoteRecord = {
  contentProfileId: 'manman',
  noteId: 'note-1',
  status: 'active',
  source: 'notes.jsonl',
  updatedAt: '2026-08-18T00:00:00Z',
  payload: {},
};

const card: CardRecord = {
  contentProfileId: 'manman',
  cardId: 'card-1',
  noteId: 'note-1',
  templateId: 'word.v1',
  cardType: 'recognition',
  status: 'active',
  prompt: 'prompt',
  answer: 'answer',
};

const syncState = {
  contentProfileId: 'manman',
  manifestUpdatedAt: '2026-08-18T00:00:00Z',
  importedAt: '2026-08-18T01:00:00Z',
  noteCount: 1,
  cardCount: 1,
};

describe('DexieContentStore', () => {
  it('replaces content and its version in one transaction', async () => {
    database = new RecallDatabase('content-store-test');
    const store = new DexieContentStore(database);

    await store.replaceContent('manman', [note], [card], syncState);

    await expect(database.notes.toArray()).resolves.toEqual([note]);
    await expect(database.cards.toArray()).resolves.toEqual([card]);
    await expect(store.getSyncState('manman')).resolves.toEqual(syncState);
  });

  it('retains the previous dataset when replacement fails', async () => {
    database = new RecallDatabase('content-store-rollback-test');
    const store = new DexieContentStore(database);
    await store.replaceContent('manman', [note], [card], syncState);
    vi.spyOn(database.cards, 'bulkPut').mockRejectedValueOnce(new Error('write failed'));

    await expect(
      store.replaceContent(
        'manman',
        [{ ...note, noteId: 'replacement-note' }],
        [{ ...card, cardId: 'replacement-card' }],
        { ...syncState, manifestUpdatedAt: '2026-08-19T00:00:00Z' },
      ),
    ).rejects.toThrow('write failed');

    expect((await database.notes.toArray()).map(({ noteId }) => noteId)).toEqual(['note-1']);
    expect((await database.cards.toArray()).map(({ cardId }) => cardId)).toEqual(['card-1']);
    await expect(store.getSyncState('manman')).resolves.toEqual(syncState);
  });
});
