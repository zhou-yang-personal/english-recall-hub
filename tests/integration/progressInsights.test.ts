import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { CardRecord, NoteRecord } from '../../src/domain/content';
import type { ReviewEvent, ReviewState } from '../../src/domain/review';
import { loadProgressInsights } from '../../src/features/progress/progressInsights';
import { RecallDatabase } from '../../src/infrastructure/db/database';

let database: RecallDatabase | undefined;

afterEach(async () => {
  await database?.delete();
  database = undefined;
});

function note(noteId: string, core: string): NoteRecord {
  return {
    contentProfileId: 'manman',
    noteId,
    status: 'active',
    source: 'notes.jsonl',
    updatedAt: '2026-08-21T00:00:00Z',
    noteType: 'word',
    core,
    meaningCn: `${core}-中文`,
    pronunciationText: core,
    pronunciationLang: 'en',
    payload: {},
  };
}

function card(noteId: string, cardType: CardRecord['cardType']): CardRecord {
  return {
    contentProfileId: 'manman',
    cardId: `${noteId}-${cardType}`,
    noteId,
    templateId: 'word.v1',
    cardType,
    status: 'active',
    prompt: noteId,
    answer: noteId,
    core: noteId,
    meaningCn: `${noteId}-中文`,
  };
}

function state(cardId: string, stage: ReviewState['state'], dueAt: string): ReviewState {
  return {
    learnerProfileId: 'learner-1',
    cardId,
    state: stage,
    dueAt,
    intervalDays: stage === 'mature' ? 125 : 20,
    reviewCount: 3,
    lapseCount: stage === 'review' ? 1 : 0,
  };
}

describe('progress insights', () => {
  it('groups card directions by Note and derives honest local statistics', async () => {
    database = new RecallDatabase('progress-insights-test');
    await database.notes.bulkPut([note('hello', 'hello'), note('world', 'world')]);
    await database.cards.bulkPut([
      card('hello', 'recognition'),
      card('hello', 'production'),
      card('world', 'recognition'),
      card('world', 'production'),
    ]);
    await database.reviewStates.bulkPut([
      state('hello-recognition', 'review', '2026-08-20T12:00:00Z'),
      state('hello-production', 'mature', '2026-12-24T12:00:00Z'),
    ]);
    const reviewEvent: ReviewEvent = {
      eventId: 'event-1',
      learnerProfileId: 'learner-1',
      cardId: 'hello-recognition',
      rating: 'known',
      reviewedAt: '2026-08-21T08:00:00Z',
      effectiveAt: '2026-08-21T08:00:00Z',
      deviceId: 'device-1',
      schedulerVersion: 1,
      syncStatus: 'pending',
    };
    await database.reviewEvents.put(reviewEvent);

    const insights = await loadProgressInsights(
      database,
      'learner-1',
      'manman',
      new Date('2026-08-21T12:00:00Z'),
    );

    expect(insights).toMatchObject({
      total: 2,
      unseen: 1,
      review: 1,
      due: 1,
      todayReviews: 1,
    });
    expect(insights.items[0]).toMatchObject({
      noteId: 'hello',
      due: true,
      forgotten: true,
    });
    expect(insights.items[0]?.cards).toHaveLength(2);
    expect(insights.recentActivity.at(-1)?.count).toBe(1);
  });
});
