export const REVIEW_RATINGS = ['unknown', 'fuzzy', 'known'] as const;
export const REVIEW_STAGES = ['new', 'learning', 'review', 'relearning', 'mature'] as const;

export type ReviewRating = (typeof REVIEW_RATINGS)[number];
export type ReviewStage = (typeof REVIEW_STAGES)[number];
export type ReviewSyncStatus = 'pending' | 'synced';

export interface ReviewEvent {
  eventId: string;
  learnerProfileId: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  effectiveAt: string;
  deviceId: string;
  schedulerVersion: 1;
  remoteSeq?: number;
  syncStatus: ReviewSyncStatus;
}

export interface ReviewState {
  learnerProfileId: string;
  cardId: string;
  state: ReviewStage;
  dueAt: string;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  lastReviewedAt?: string;
  lastEventId?: string;
}

export interface CreateReviewEventInput {
  eventId: string;
  learnerProfileId: string;
  cardId: string;
  rating: ReviewRating;
  reviewedAt: string;
  deviceId: string;
}
