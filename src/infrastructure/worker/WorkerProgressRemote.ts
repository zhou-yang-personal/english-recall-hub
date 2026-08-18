import { z } from 'zod';
import type { ReviewEvent } from '../../domain/review';
import type { ProgressRemote } from '../../features/progress-sync/progressRemote';
import type { WorkerApiClient } from './WorkerApiClient';

const synchronizedEventSchema = z.object({
  eventId: z.uuid(),
  learnerProfileId: z.uuid(),
  cardId: z.string().regex(/^[0-9a-f]{64}$/u),
  rating: z.enum(['unknown', 'fuzzy', 'known']),
  reviewedAt: z.iso.datetime({ offset: true }),
  effectiveAt: z.iso.datetime({ offset: true }),
  deviceId: z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/u),
  schedulerVersion: z.literal(1),
  remoteSeq: z.number().int().positive(),
  syncStatus: z.literal('synced'),
});

function toRemoteRow(event: ReviewEvent): Record<string, unknown> {
  return {
    event_id: event.eventId,
    learner_profile_id: event.learnerProfileId,
    card_id: event.cardId,
    rating: event.rating,
    reviewed_at: event.reviewedAt,
    effective_at: event.effectiveAt,
    device_id: event.deviceId,
    scheduler_version: event.schedulerVersion,
  };
}

export class WorkerProgressRemote implements ProgressRemote {
  constructor(private readonly api: WorkerApiClient) {}

  async push(events: readonly ReviewEvent[]): Promise<ReviewEvent[]> {
    const result = await this.api.request<{ events: unknown[] }>('/review-events', {
      method: 'POST',
      body: JSON.stringify({ events: events.map(toRemoteRow) }),
    });
    return z.array(synchronizedEventSchema).parse(result.events);
  }

  async pull(
    learnerProfileId: string,
    afterRemoteSeq: number,
    limit: number,
  ): Promise<ReviewEvent[]> {
    const query = new URLSearchParams({
      learnerProfileId,
      after: String(afterRemoteSeq),
      limit: String(limit),
    });
    const result = await this.api.request<{ events: unknown[] }>(`/review-events?${query}`);
    return z.array(synchronizedEventSchema).parse(result.events);
  }
}
