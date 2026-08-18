import type {
  CreateReviewEventInput,
  ReviewEvent,
  ReviewRating,
  ReviewState,
  ReviewStage,
} from './review';

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;
const MATURE_INTERVAL_DAYS = 90;
const MAX_INTERVAL_DAYS = 180;

interface ScheduleResult {
  state: ReviewStage;
  dueAt: string;
  intervalDays: number;
  lapseCount: number;
}

function timestamp(value: string): number {
  const parsed = Date.parse(value);

  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid ISO timestamp: ${value}`);
  }

  return parsed;
}

function addMilliseconds(value: string, milliseconds: number): string {
  return new Date(timestamp(value) + milliseconds).toISOString();
}

function initialSchedule(rating: ReviewRating, effectiveAt: string): ScheduleResult {
  switch (rating) {
    case 'unknown':
      return {
        state: 'relearning',
        dueAt: addMilliseconds(effectiveAt, 10 * MINUTE_MS),
        intervalDays: 0,
        lapseCount: 0,
      };
    case 'fuzzy':
      return {
        state: 'learning',
        dueAt: addMilliseconds(effectiveAt, DAY_MS),
        intervalDays: 1,
        lapseCount: 0,
      };
    case 'known':
      return {
        state: 'review',
        dueAt: addMilliseconds(effectiveAt, 3 * DAY_MS),
        intervalDays: 3,
        lapseCount: 0,
      };
  }
}

function existingSchedule(
  current: ReviewState,
  rating: ReviewRating,
  effectiveAt: string,
): ScheduleResult {
  if (rating === 'unknown') {
    return {
      state: 'relearning',
      dueAt: addMilliseconds(effectiveAt, 10 * MINUTE_MS),
      intervalDays: 0,
      lapseCount: current.lapseCount + 1,
    };
  }

  const intervalDays =
    rating === 'fuzzy'
      ? Math.max(1, Math.round(current.intervalDays * 1.5))
      : Math.min(MAX_INTERVAL_DAYS, Math.max(3, Math.round(current.intervalDays * 2.5)));

  return {
    state: intervalDays >= MATURE_INTERVAL_DAYS ? 'mature' : 'review',
    dueAt: addMilliseconds(effectiveAt, intervalDays * DAY_MS),
    intervalDays,
    lapseCount: current.lapseCount,
  };
}

export function monotonicEffectiveAt(current: ReviewState | undefined, candidate: string): string {
  const candidateTimestamp = timestamp(candidate);
  const previousTimestamp = current?.lastReviewedAt
    ? timestamp(current.lastReviewedAt)
    : Number.NEGATIVE_INFINITY;

  return new Date(Math.max(previousTimestamp, candidateTimestamp)).toISOString();
}

export function createReviewEvent(
  input: CreateReviewEventInput,
  current: ReviewState | undefined,
): ReviewEvent {
  timestamp(input.reviewedAt);

  return {
    ...input,
    effectiveAt: monotonicEffectiveAt(current, input.reviewedAt),
    schedulerVersion: 1,
    syncStatus: 'pending',
  };
}

export function applyReviewEvent(
  current: ReviewState | undefined,
  event: ReviewEvent,
): ReviewState {
  if (event.schedulerVersion !== 1) {
    throw new Error(`Unsupported scheduler version: ${String(event.schedulerVersion)}`);
  }

  if (
    current &&
    (current.learnerProfileId !== event.learnerProfileId || current.cardId !== event.cardId)
  ) {
    throw new Error('Review event does not belong to the current state.');
  }

  const effectiveAt = monotonicEffectiveAt(current, event.effectiveAt);
  const scheduled = current
    ? existingSchedule(current, event.rating, effectiveAt)
    : initialSchedule(event.rating, effectiveAt);

  return {
    learnerProfileId: event.learnerProfileId,
    cardId: event.cardId,
    state: scheduled.state,
    dueAt: scheduled.dueAt,
    intervalDays: scheduled.intervalDays,
    reviewCount: (current?.reviewCount ?? 0) + 1,
    lapseCount: scheduled.lapseCount,
    lastReviewedAt: effectiveAt,
    lastEventId: event.eventId,
  };
}
