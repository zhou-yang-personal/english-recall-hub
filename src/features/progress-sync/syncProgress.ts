import { replayReviewEvents } from '../../domain/replay';
import type { ReviewEvent } from '../../domain/review';
import type { RecallDatabase } from '../../infrastructure/db/database';
import type { ProgressRemote } from './progressRemote';

const PUSH_BATCH_SIZE = 100;
const PULL_PAGE_SIZE = 200;

export interface ProgressSyncReport {
  pushed: number;
  pulled: number;
  lastRemoteSeq: number;
}

async function applyRemoteEvents(
  database: RecallDatabase,
  learnerProfileId: string,
  events: readonly ReviewEvent[],
  advanceCursor: boolean,
): Promise<number> {
  if (events.some((event) => event.learnerProfileId !== learnerProfileId)) {
    throw new Error('云端返回了不属于当前学习者的进度。');
  }

  return database.transaction(
    'rw',
    database.reviewEvents,
    database.reviewStates,
    database.syncStates,
    async () => {
      await database.reviewEvents.bulkPut([...events]);

      const affectedCardIds = new Set(events.map((event) => event.cardId));

      for (const cardId of affectedCardIds) {
        const cardEvents = await database.reviewEvents
          .where('[learnerProfileId+cardId]')
          .equals([learnerProfileId, cardId])
          .toArray();
        const state = replayReviewEvents(cardEvents);

        if (state) {
          await database.reviewStates.put(state);
        }
      }

      const current = await database.syncStates.get(learnerProfileId);
      const pageMax = events.reduce(
        (maximum, event) => Math.max(maximum, event.remoteSeq ?? 0),
        current?.lastRemoteSeq ?? 0,
      );
      const lastRemoteSeq = advanceCursor ? pageMax : current?.lastRemoteSeq ?? 0;
      await database.syncStates.put({
        ...current,
        learnerProfileId,
        lastRemoteSeq,
        lastProgressSyncAt: new Date().toISOString(),
      });
      return lastRemoteSeq;
    },
  );
}

export async function syncProgress(
  database: RecallDatabase,
  learnerProfileId: string,
  remote: ProgressRemote,
): Promise<ProgressSyncReport> {
  const pending = await database.reviewEvents
    .where('[learnerProfileId+syncStatus]')
    .equals([learnerProfileId, 'pending'])
    .limit(PUSH_BATCH_SIZE)
    .toArray();

  if (pending.length > 0) {
    const synchronized = await remote.push(pending);
    await applyRemoteEvents(database, learnerProfileId, synchronized, false);
  }

  let cursor = (await database.syncStates.get(learnerProfileId))?.lastRemoteSeq ?? 0;
  let pulled = 0;

  while (true) {
    const page = await remote.pull(learnerProfileId, cursor, PULL_PAGE_SIZE);

    if (page.length === 0) {
      break;
    }

    const nextCursor = await applyRemoteEvents(database, learnerProfileId, page, true);

    if (nextCursor <= cursor) {
      throw new Error('云端进度游标没有向前推进。');
    }

    cursor = nextCursor;
    pulled += page.length;

    if (page.length < PULL_PAGE_SIZE) {
      break;
    }
  }

  return { pushed: pending.length, pulled, lastRemoteSeq: cursor };
}
