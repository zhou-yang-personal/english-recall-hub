import type { CardRecord, NoteRecord } from '../../domain/content';
import type { ContentStore } from '../../features/content-sync/contentStore';
import type { ContentSyncState, RecallDatabase } from './database';

export class DexieContentStore implements ContentStore {
  constructor(private readonly database: RecallDatabase) {}

  getSyncState(contentProfileId: string): Promise<ContentSyncState | undefined> {
    return this.database.contentSyncStates.get(contentProfileId);
  }

  async replaceContent(
    contentProfileId: string,
    notes: readonly NoteRecord[],
    cards: readonly CardRecord[],
    state: ContentSyncState,
  ): Promise<void> {
    await this.database.transaction(
      'rw',
      this.database.notes,
      this.database.cards,
      this.database.contentSyncStates,
      async () => {
        await this.database.notes.where('contentProfileId').equals(contentProfileId).delete();
        await this.database.cards.where('contentProfileId').equals(contentProfileId).delete();
        await this.database.notes.bulkPut([...notes]);
        await this.database.cards.bulkPut([...cards]);
        await this.database.contentSyncStates.put(state);
      },
    );
  }
}
