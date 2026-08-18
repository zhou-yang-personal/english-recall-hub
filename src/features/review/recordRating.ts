import type { ReviewEvent, ReviewRating, ReviewState } from '../../domain/review';
import { applyReviewEvent, createReviewEvent } from '../../domain/scheduler';
import type { RecallDatabase } from '../../infrastructure/db/database';

export interface RecordRatingInput {
  learnerProfileId: string;
  cardId: string;
  rating: ReviewRating;
  deviceId: string;
  reviewedAt?: string;
}

export interface RecordRatingDependencies {
  now: () => Date;
  createEventId: () => string;
}

export interface RecordRatingResult {
  event: ReviewEvent;
  state: ReviewState;
}

const defaultDependencies: RecordRatingDependencies = {
  now: () => new Date(),
  createEventId: () => crypto.randomUUID(),
};

export async function recordRating(
  database: RecallDatabase,
  input: RecordRatingInput,
  dependencies: RecordRatingDependencies = defaultDependencies,
): Promise<RecordRatingResult> {
  return database.transaction('rw', database.reviewEvents, database.reviewStates, async () => {
    const current = await database.reviewStates.get([input.learnerProfileId, input.cardId]);
    const event = createReviewEvent(
      {
        eventId: dependencies.createEventId(),
        learnerProfileId: input.learnerProfileId,
        cardId: input.cardId,
        rating: input.rating,
        reviewedAt: input.reviewedAt ?? dependencies.now().toISOString(),
        deviceId: input.deviceId,
      },
      current,
    );
    const state = applyReviewEvent(current, event);

    await database.reviewEvents.add(event);
    await database.reviewStates.put(state);

    return { event, state };
  });
}
