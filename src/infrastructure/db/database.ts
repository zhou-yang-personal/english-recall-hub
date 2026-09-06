import Dexie, { type Table } from 'dexie';
import type { CardRecord, NoteRecord } from '../../domain/content';
import type { LearnerProfile } from '../../domain/profile';
import type { ReviewEvent, ReviewState } from '../../domain/review';

export const DATABASE_NAME = 'english-recall-hub';
export const DATABASE_VERSION = 3;

export interface SyncState {
  learnerProfileId: string;
  lastRemoteSeq: number;
  lastContentVersion?: string;
  lastProgressSyncAt?: string;
}

export interface ContentSyncState {
  contentProfileId: string;
  manifestUpdatedAt: string;
  projectionVersion?: number;
  importedAt: string;
  noteCount: number;
  cardCount: number;
}

export class RecallDatabase extends Dexie {
  learnerProfiles!: Table<LearnerProfile, string>;
  notes!: Table<NoteRecord, [string, string]>;
  cards!: Table<CardRecord, [string, string]>;
  reviewEvents!: Table<ReviewEvent, string>;
  reviewStates!: Table<ReviewState, [string, string]>;
  syncStates!: Table<SyncState, string>;
  contentSyncStates!: Table<ContentSyncState, string>;

  constructor(databaseName = DATABASE_NAME) {
    super(databaseName);

    this.version(2).stores({
      learnerProfiles: '&learnerProfileId, userId, contentProfileId',
      notes: '&[contentProfileId+noteId], contentProfileId, [contentProfileId+status]',
      cards:
        '&[contentProfileId+cardId], contentProfileId, [contentProfileId+noteId], [contentProfileId+status]',
      reviewEvents:
        '&eventId, learnerProfileId, [learnerProfileId+cardId], [learnerProfileId+syncStatus], remoteSeq',
      reviewStates:
        '&[learnerProfileId+cardId], [learnerProfileId+dueAt], [learnerProfileId+state]',
      syncStates: '&learnerProfileId',
      contentSyncStates: '&contentProfileId',
    });

    this.version(DATABASE_VERSION).stores({
      learnerProfiles: '&learnerProfileId, cloudSyncId, contentProfileId',
      notes: '&[contentProfileId+noteId], contentProfileId, [contentProfileId+status]',
      cards:
        '&[contentProfileId+cardId], contentProfileId, [contentProfileId+noteId], [contentProfileId+status]',
      reviewEvents:
        '&eventId, learnerProfileId, [learnerProfileId+cardId], [learnerProfileId+syncStatus], remoteSeq',
      reviewStates:
        '&[learnerProfileId+cardId], [learnerProfileId+dueAt], [learnerProfileId+state]',
      syncStates: '&learnerProfileId',
      contentSyncStates: '&contentProfileId',
    }).upgrade(async (transaction) => {
      await transaction.table('learnerProfiles').toCollection().modify((profile: Record<string, unknown>) => {
        if (typeof profile.userId === 'string') {
          profile.cloudSyncId = 'family';
          delete profile.userId;
        }
      });
    });
  }
}

export const db = new RecallDatabase();
