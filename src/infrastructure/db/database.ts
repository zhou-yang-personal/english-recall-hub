import Dexie, { type Table } from 'dexie';
import type { CardRecord, NoteRecord } from '../../domain/content';
import type { LearnerProfile } from '../../domain/profile';
import type { ReviewEvent, ReviewState } from '../../domain/review';

export const DATABASE_NAME = 'english-recall-hub';
export const DATABASE_VERSION = 1;

export interface SyncState {
  learnerProfileId: string;
  lastRemoteSeq: number;
  lastContentVersion?: string;
  lastProgressSyncAt?: string;
}

export class RecallDatabase extends Dexie {
  learnerProfiles!: Table<LearnerProfile, string>;
  notes!: Table<NoteRecord, [string, string]>;
  cards!: Table<CardRecord, [string, string]>;
  reviewEvents!: Table<ReviewEvent, string>;
  reviewStates!: Table<ReviewState, [string, string]>;
  syncStates!: Table<SyncState, string>;

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName);

    this.version(DATABASE_VERSION).stores({
      learnerProfiles: '&learnerProfileId, userId, contentProfileId',
      notes: '&[contentProfileId+noteId], contentProfileId, [contentProfileId+status]',
      cards:
        '&[contentProfileId+cardId], contentProfileId, [contentProfileId+noteId], [contentProfileId+status]',
      reviewEvents:
        '&eventId, learnerProfileId, [learnerProfileId+cardId], [learnerProfileId+syncStatus], remoteSeq',
      reviewStates:
        '&[learnerProfileId+cardId], [learnerProfileId+dueAt], [learnerProfileId+state]',
      syncStates: '&learnerProfileId',
    });
  }
}

export const db = new RecallDatabase();
