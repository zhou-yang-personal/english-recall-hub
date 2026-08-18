import { describe, expect, it } from 'vitest';
import type { ReviewEvent } from '../../src/domain/review';
import { orderReviewEvents, replayReviewEvents } from '../../src/domain/replay';

function remoteEvent(
  eventId: string,
  remoteSeq: number,
  rating: ReviewEvent['rating'],
  effectiveAt: string,
): ReviewEvent {
  return {
    eventId,
    learnerProfileId: 'learner-1',
    cardId: 'card-1',
    rating,
    reviewedAt: effectiveAt,
    effectiveAt,
    deviceId: 'device-1',
    schedulerVersion: 1,
    remoteSeq,
    syncStatus: 'synced',
  };
}

describe('review event replay', () => {
  const first = remoteEvent('event-a', 10, 'known', '2026-08-10T00:00:00.000Z');
  const second = remoteEvent('event-b', 11, 'fuzzy', '2026-08-14T00:00:00.000Z');

  it('orders synchronized facts by server sequence', () => {
    expect(orderReviewEvents([second, first]).map(({ eventId }) => eventId)).toEqual([
      'event-a',
      'event-b',
    ]);
  });

  it('converges to the same state regardless of download order', () => {
    expect(replayReviewEvents([second, first])).toEqual(replayReviewEvents([first, second]));
    expect(replayReviewEvents([second, first])).toMatchObject({
      intervalDays: 5,
      dueAt: '2026-08-19T00:00:00.000Z',
      reviewCount: 2,
      lastEventId: 'event-b',
    });
  });

  it('deduplicates by id and prefers the synchronized copy', () => {
    const { remoteSeq: _remoteSeq, ...withoutRemoteSequence } = first;
    const pending = { ...withoutRemoteSequence, syncStatus: 'pending' as const };
    const ordered = orderReviewEvents([pending, first, second]);

    expect(ordered).toHaveLength(2);
    expect(ordered[0]?.remoteSeq).toBe(10);
  });
});
