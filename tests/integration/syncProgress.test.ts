import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReviewEvent } from '../../src/domain/review';
import type { ProgressRemote } from '../../src/features/progress-sync/progressRemote';
import { syncProgress } from '../../src/features/progress-sync/syncProgress';
import { RecallDatabase } from '../../src/infrastructure/db/database';

let database: RecallDatabase | undefined;

const learnerProfileId = '11111111-1111-4111-8111-111111111111';
const cardId = 'a'.repeat(64);

function reviewEvent(overrides: Partial<ReviewEvent> = {}): ReviewEvent {
  return {
    eventId: '22222222-2222-4222-8222-222222222222',
    learnerProfileId,
    cardId,
    rating: 'known',
    reviewedAt: '2026-08-18T10:00:00.000Z',
    effectiveAt: '2026-08-18T10:00:00.000Z',
    deviceId: 'device-a',
    schedulerVersion: 1,
    syncStatus: 'pending',
    ...overrides,
  };
}

afterEach(async () => {
  if (database) {
    await database.delete();
    database = undefined;
  }
});

describe('syncProgress', () => {
  it('uploads pending events, pulls canonical order and rebuilds local state', async () => {
    database = new RecallDatabase('progress-sync-test');
    const localEvent = reviewEvent();
    const earlierRemoteEvent = reviewEvent({
      eventId: '33333333-3333-4333-8333-333333333333',
      rating: 'fuzzy',
      reviewedAt: '2026-08-18T09:00:00.000Z',
      effectiveAt: '2026-08-18T09:00:00.000Z',
      deviceId: 'device-b',
      remoteSeq: 1,
      syncStatus: 'synced',
    });
    const synchronizedLocalEvent = { ...localEvent, remoteSeq: 2, syncStatus: 'synced' as const };
    await database.reviewEvents.put(localEvent);

    const remote: ProgressRemote = {
      push: vi.fn().mockResolvedValue([synchronizedLocalEvent]),
      pull: vi.fn().mockResolvedValueOnce([earlierRemoteEvent, synchronizedLocalEvent]),
    };

    await expect(syncProgress(database, learnerProfileId, remote)).resolves.toEqual({
      pushed: 1,
      pulled: 2,
      lastRemoteSeq: 2,
    });
    expect(remote.push).toHaveBeenCalledWith([localEvent]);
    expect((await database.reviewEvents.get(localEvent.eventId))?.syncStatus).toBe('synced');
    expect((await database.reviewStates.get([learnerProfileId, cardId]))?.reviewCount).toBe(2);
    expect((await database.syncStates.get(learnerProfileId))?.lastRemoteSeq).toBe(2);
  });

  it('retains a pending event when upload fails', async () => {
    database = new RecallDatabase('progress-sync-failure-test');
    const localEvent = reviewEvent();
    await database.reviewEvents.put(localEvent);
    const remote: ProgressRemote = {
      push: vi.fn().mockRejectedValue(new Error('offline')),
      pull: vi.fn(),
    };

    await expect(syncProgress(database, learnerProfileId, remote)).rejects.toThrow('offline');
    expect(await database.reviewEvents.get(localEvent.eventId)).toEqual(localEvent);
    expect(remote.pull).not.toHaveBeenCalled();
  });
});
