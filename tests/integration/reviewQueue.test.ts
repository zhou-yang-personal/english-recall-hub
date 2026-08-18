import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import type { CardRecord } from '../../src/domain/content';
import type { ReviewState } from '../../src/domain/review';
import {
  buildReviewQueue,
  getReviewSummary,
  prepareReviewQueue,
} from '../../src/features/review/reviewQueue';
import { RecallDatabase } from '../../src/infrastructure/db/database';

let database: RecallDatabase | undefined;

afterEach(async () => {
  if (database) {
    await database.delete();
    database = undefined;
  }
});

const card = (cardId: string): CardRecord => ({
  contentProfileId: 'manman',
  cardId,
  noteId: `note-${cardId}`,
  templateId: 'word.v1',
  cardType: 'recognition',
  status: 'active',
  prompt: cardId,
  answer: cardId,
});

const state = (
  cardId: string,
  stage: ReviewState['state'],
  dueAt: string,
): ReviewState => ({
  learnerProfileId: 'learner-1',
  cardId,
  state: stage,
  dueAt,
  intervalDays: 1,
  reviewCount: 1,
  lapseCount: 0,
});

describe('review queue', () => {
  it('prioritizes relearning, learning, due review and then bounded new cards', async () => {
    database = new RecallDatabase('review-queue-test');
    await database.cards.bulkPut([
      card('relearning'),
      card('learning'),
      card('review'),
      card('future'),
      card('new-a'),
      card('new-b'),
    ]);
    await database.reviewStates.bulkPut([
      state('review', 'review', '2026-08-17T10:00:00Z'),
      state('learning', 'learning', '2026-08-17T11:00:00Z'),
      state('relearning', 'relearning', '2026-08-17T12:00:00Z'),
      state('future', 'review', '2026-08-20T00:00:00Z'),
    ]);

    const queue = await buildReviewQueue(
      database,
      'learner-1',
      'manman',
      1,
      new Date('2026-08-18T00:00:00Z'),
    );

    expect(queue.map(({ card: queueCard }) => queueCard.cardId)).toEqual([
      'relearning',
      'learning',
      'review',
      'new-a',
    ]);
    await expect(
      getReviewSummary(
        database,
        'learner-1',
        'manman',
        1,
        new Date('2026-08-18T00:00:00Z'),
      ),
    ).resolves.toEqual({ due: 3, learning: 2, newCards: 1, totalCards: 6 });
  });

  it('synchronizes content and rebuilds when a direct review visit has no local cards', async () => {
    database = new RecallDatabase('review-queue-content-fallback-test');
    let syncCalls = 0;

    const queue = await prepareReviewQueue(
      database,
      'learner-1',
      'manman',
      10,
      async () => {
        syncCalls += 1;
        await database!.cards.put(card('downloaded-card'));
      },
      new Date('2026-08-18T00:00:00Z'),
    );

    expect(syncCalls).toBe(1);
    expect(queue.map(({ card: queueCard }) => queueCard.cardId)).toEqual(['downloaded-card']);
  });
});
