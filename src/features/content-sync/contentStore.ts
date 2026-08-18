import type { CardRecord, NoteRecord } from '../../domain/content';
import type { ContentSyncState } from '../../infrastructure/db/database';

export interface ContentStore {
  getSyncState(contentProfileId: string): Promise<ContentSyncState | undefined>;
  replaceContent(
    contentProfileId: string,
    notes: readonly NoteRecord[],
    cards: readonly CardRecord[],
    state: ContentSyncState,
  ): Promise<void>;
}
