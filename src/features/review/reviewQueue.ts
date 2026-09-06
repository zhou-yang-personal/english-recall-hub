import type { CardRecord } from '../../domain/content';
import type { ReviewState } from '../../domain/review';
import type { RecallDatabase } from '../../infrastructure/db/database';

export interface ReviewQueueItem {
  card: CardRecord;
  state?: ReviewState;
}

export interface ReviewSummary {
  due: number;
  learning: number;
  newCards: number;
  totalCards: number;
}

function isAvailable(card: CardRecord): boolean {
  return card.status === 'active' || card.status === 'mature';
}

async function loadCardsAndStates(
  database: RecallDatabase,
  learnerProfileId: string,
  contentProfileId: string,
): Promise<{ cards: CardRecord[]; stateByCardId: Map<string, ReviewState> }> {
  const [allCards, allStates] = await Promise.all([
    database.cards.where('contentProfileId').equals(contentProfileId).toArray(),
    database.reviewStates.toArray(),
  ]);
  const cards = allCards.filter(isAvailable);
  const availableCardIds = new Set(cards.map(({ cardId }) => cardId));
  const stateByCardId = new Map(
    allStates
      .filter(
        (state) =>
          state.learnerProfileId === learnerProfileId && availableCardIds.has(state.cardId),
      )
      .map((state) => [state.cardId, state]),
  );

  return { cards, stateByCardId };
}

export async function getReviewSummary(
  database: RecallDatabase,
  learnerProfileId: string,
  contentProfileId: string,
  dailyNewCardLimit: number,
  now = new Date(),
): Promise<ReviewSummary> {
  const { cards, stateByCardId } = await loadCardsAndStates(
    database,
    learnerProfileId,
    contentProfileId,
  );
  const nowIso = now.toISOString();
  const states = [...stateByCardId.values()];

  return {
    due: states.filter((state) => state.dueAt <= nowIso).length,
    learning: states.filter(
      (state) => state.state === 'learning' || state.state === 'relearning',
    ).length,
    newCards: Math.min(
      dailyNewCardLimit,
      cards.filter((card) => !stateByCardId.has(card.cardId)).length,
    ),
    totalCards: cards.length,
  };
}

export async function buildReviewQueue(
  database: RecallDatabase,
  learnerProfileId: string,
  contentProfileId: string,
  dailyNewCardLimit: number,
  now = new Date(),
): Promise<ReviewQueueItem[]> {
  const { cards, stateByCardId } = await loadCardsAndStates(
    database,
    learnerProfileId,
    contentProfileId,
  );
  const nowIso = now.toISOString();
  const cardById = new Map(cards.map((card) => [card.cardId, card]));

  const dueItems = [...stateByCardId.values()]
    .filter((state) => state.dueAt <= nowIso && cardById.has(state.cardId))
    .sort((left, right) => {
      const priority = (state: ReviewState) => {
        if (state.state === 'relearning') return 0;
        if (state.state === 'learning') return 1;
        return 2;
      };
      return priority(left) - priority(right) || left.dueAt.localeCompare(right.dueAt);
    })
    .map((state) => ({ card: cardById.get(state.cardId)!, state }));

  const newItems = cards
    .filter((card) => !stateByCardId.has(card.cardId))
    .sort((left, right) => left.cardId.localeCompare(right.cardId))
    .slice(0, dailyNewCardLimit)
    .map((card) => ({ card }));

  return [...dueItems, ...newItems];
}

export async function prepareReviewQueue(
  database: RecallDatabase,
  learnerProfileId: string,
  contentProfileId: string,
  dailyNewCardLimit: number,
  synchronizeContent: () => Promise<unknown>,
  now = new Date(),
): Promise<ReviewQueueItem[]> {
  const localQueue = await buildReviewQueue(
    database,
    learnerProfileId,
    contentProfileId,
    dailyNewCardLimit,
    now,
  );

  if (localQueue.length > 0) {
    return localQueue;
  }

  await synchronizeContent();
  return buildReviewQueue(
    database,
    learnerProfileId,
    contentProfileId,
    dailyNewCardLimit,
    now,
  );
}
