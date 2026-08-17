import type { ReviewEvent, ReviewState } from './review';
import { applyReviewEvent } from './scheduler';

function eventOrder(left: ReviewEvent, right: ReviewEvent): number {
  const leftIsRemote = left.remoteSeq !== undefined;
  const rightIsRemote = right.remoteSeq !== undefined;

  if (leftIsRemote && rightIsRemote && left.remoteSeq !== right.remoteSeq) {
    return left.remoteSeq! - right.remoteSeq!;
  }

  if (leftIsRemote !== rightIsRemote) {
    return leftIsRemote ? -1 : 1;
  }

  const byEffectiveAt = left.effectiveAt.localeCompare(right.effectiveAt);
  return byEffectiveAt === 0 ? left.eventId.localeCompare(right.eventId) : byEffectiveAt;
}

function preferSynchronized(left: ReviewEvent, right: ReviewEvent): ReviewEvent {
  if (left.remoteSeq === undefined && right.remoteSeq !== undefined) {
    return right;
  }

  if (left.remoteSeq !== undefined && right.remoteSeq === undefined) {
    return left;
  }

  return eventOrder(left, right) <= 0 ? left : right;
}

export function orderReviewEvents(events: readonly ReviewEvent[]): ReviewEvent[] {
  const uniqueEvents = new Map<string, ReviewEvent>();

  for (const event of events) {
    const existing = uniqueEvents.get(event.eventId);
    uniqueEvents.set(event.eventId, existing ? preferSynchronized(existing, event) : event);
  }

  return [...uniqueEvents.values()].sort(eventOrder);
}

export function replayReviewEvents(events: readonly ReviewEvent[]): ReviewState | undefined {
  let state: ReviewState | undefined;

  for (const event of orderReviewEvents(events)) {
    state = applyReviewEvent(state, event);
  }

  return state;
}
