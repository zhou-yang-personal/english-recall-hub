import { describe, expect, it } from 'vitest';
import type { ReviewEvent, ReviewRating, ReviewState } from '../../src/domain/review';
import {
  applyReviewEvent,
  createReviewEvent,
  estimateMinimumKnownRatingsToMature,
  previewReviewSchedule,
} from '../../src/domain/scheduler';

const START = '2026-08-17T12:00:00.000Z';

function event(rating: ReviewRating, eventId = `event-${rating}`): ReviewEvent {
  return {
    eventId,
    learnerProfileId: 'learner-1',
    cardId: 'card-1',
    rating,
    reviewedAt: START,
    effectiveAt: START,
    deviceId: 'device-1',
    schedulerVersion: 1,
    syncStatus: 'pending',
  };
}

function currentState(intervalDays: number, lapseCount = 2): ReviewState {
  return {
    learnerProfileId: 'learner-1',
    cardId: 'card-1',
    state: 'review',
    dueAt: START,
    intervalDays,
    reviewCount: 4,
    lapseCount,
    lastReviewedAt: '2026-08-16T12:00:00.000Z',
    lastEventId: 'previous-event',
  };
}

describe('scheduler v1', () => {
  it.each([
    ['unknown', 'relearning', 0, '2026-08-17T12:10:00.000Z'],
    ['fuzzy', 'learning', 1, '2026-08-18T12:00:00.000Z'],
    ['known', 'review', 3, '2026-08-20T12:00:00.000Z'],
  ] as const)('schedules an initial %s rating', (rating, stage, intervalDays, dueAt) => {
    const result = applyReviewEvent(undefined, event(rating));

    expect(result).toMatchObject({
      state: stage,
      intervalDays,
      dueAt,
      reviewCount: 1,
      lapseCount: 0,
    });
  });

  it('resets an unknown card and increments its lapse count', () => {
    const result = applyReviewEvent(currentState(20), event('unknown'));

    expect(result).toMatchObject({
      state: 'relearning',
      intervalDays: 0,
      dueAt: '2026-08-17T12:10:00.000Z',
      reviewCount: 5,
      lapseCount: 3,
    });
  });

  it('uses the fuzzy multiplier with a one-day floor', () => {
    expect(applyReviewEvent(currentState(0), event('fuzzy')).intervalDays).toBe(1);
    expect(applyReviewEvent(currentState(9), event('fuzzy')).intervalDays).toBe(14);
  });

  it('uses the known multiplier, mature threshold and 180-day cap', () => {
    expect(applyReviewEvent(currentState(2), event('known')).intervalDays).toBe(5);
    expect(applyReviewEvent(currentState(40), event('known')).state).toBe('mature');
    expect(applyReviewEvent(currentState(100), event('known')).intervalDays).toBe(180);
  });

  it('previews the same schedule that a committed event produces', () => {
    const current = currentState(8);
    const preview = previewReviewSchedule(current, 'known', START);
    const committed = applyReviewEvent(current, event('known'));

    expect(preview).toMatchObject({
      dueAt: committed.dueAt,
      intervalDays: committed.intervalDays,
      state: committed.state,
      reviewCount: committed.reviewCount,
    });
  });

  it('estimates only the minimum future known ratings needed for maturity', () => {
    expect(estimateMinimumKnownRatingsToMature(undefined)).toBe(5);
    expect(estimateMinimumKnownRatingsToMature(currentState(20))).toBe(2);
    expect(estimateMinimumKnownRatingsToMature({ ...currentState(125), state: 'mature' })).toBe(0);
  });

  it('makes effective time monotonic when a device clock moves backwards', () => {
    const current = currentState(3);
    current.lastReviewedAt = '2026-08-20T12:00:00.000Z';

    const created = createReviewEvent(
      {
        eventId: 'late-event',
        learnerProfileId: 'learner-1',
        cardId: 'card-1',
        rating: 'known',
        reviewedAt: START,
        deviceId: 'device-2',
      },
      current,
    );

    expect(created.effectiveAt).toBe('2026-08-20T12:00:00.000Z');
    expect(applyReviewEvent(current, created).dueAt).toBe('2026-08-28T12:00:00.000Z');
  });
});
