import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { recordRating } from '../../src/features/review/recordRating';
import { RecallDatabase } from '../../src/infrastructure/db/database';

let database: RecallDatabase | undefined;

afterEach(async () => {
  if (database) {
    await database.delete();
    database = undefined;
  }
});

describe('recordRating', () => {
  it('commits the pending event and derived state together', async () => {
    database = new RecallDatabase('record-rating-test');

    const result = await recordRating(
      database,
      {
        learnerProfileId: 'learner-1',
        cardId: 'card-1',
        rating: 'known',
        deviceId: 'device-1',
      },
      {
        now: () => new Date('2026-08-17T12:00:00.000Z'),
        createEventId: () => 'event-1',
      },
    );

    expect(result.event.syncStatus).toBe('pending');
    expect(await database.reviewEvents.get('event-1')).toEqual(result.event);
    expect(await database.reviewStates.get(['learner-1', 'card-1'])).toEqual(result.state);
  });

  it('rolls back state when the event id violates idempotency', async () => {
    database = new RecallDatabase('record-rating-rollback-test');
    const dependencies = {
      now: () => new Date('2026-08-17T12:00:00.000Z'),
      createEventId: () => 'same-event',
    };
    const input = {
      learnerProfileId: 'learner-1',
      cardId: 'card-1',
      rating: 'known' as const,
      deviceId: 'device-1',
    };

    await recordRating(database, input, dependencies);
    await expect(recordRating(database, input, dependencies)).rejects.toThrow();

    expect(await database.reviewEvents.count()).toBe(1);
    expect((await database.reviewStates.get(['learner-1', 'card-1']))?.reviewCount).toBe(1);
  });
});
