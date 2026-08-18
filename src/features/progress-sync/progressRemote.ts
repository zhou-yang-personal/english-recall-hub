import type { ReviewEvent } from '../../domain/review';

export interface ProgressRemote {
  push(events: readonly ReviewEvent[]): Promise<ReviewEvent[]>;
  pull(learnerProfileId: string, afterRemoteSeq: number, limit: number): Promise<ReviewEvent[]>;
}
