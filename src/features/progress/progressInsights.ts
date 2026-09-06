import { estimateMinimumKnownRatingsToMature } from '../../domain/scheduler';
import type { CardRecord, NoteRecord } from '../../domain/content';
import type { ReviewStage, ReviewState } from '../../domain/review';
import type { RecallDatabase } from '../../infrastructure/db/database';

export type ProgressCategory = 'unseen' | 'learning' | 'review' | 'mature';

export interface CardProgressInsight {
  cardId: string;
  cardType: CardRecord['cardType'];
  stage: ReviewStage;
  dueAt?: string;
  intervalDays: number;
  reviewCount: number;
  lapseCount: number;
  minimumKnownRatingsToMature: number;
}

export interface NoteProgressInsight {
  noteId: string;
  noteType: string;
  core: string;
  meaningCn: string;
  pronunciationText?: string;
  pronunciationLang?: string;
  category: ProgressCategory;
  due: boolean;
  forgotten: boolean;
  nextDueAt?: string;
  cards: CardProgressInsight[];
}

export interface DailyReviewActivity {
  dateKey: string;
  label: string;
  count: number;
}

export interface ProgressInsights {
  total: number;
  unseen: number;
  learning: number;
  review: number;
  mature: number;
  due: number;
  todayReviews: number;
  recentActivity: DailyReviewActivity[];
  items: NoteProgressInsight[];
}

function isAvailable(status: NoteRecord['status'] | CardRecord['status']): boolean {
  return status === 'active' || status === 'mature';
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function categoryFor(
  cards: readonly CardRecord[],
  states: readonly ReviewState[],
): ProgressCategory {
  if (states.length === 0) {
    return 'unseen';
  }

  if (cards.length > 0 && states.length === cards.length && states.every(({ state }) => state === 'mature')) {
    return 'mature';
  }

  if (
    states.length < cards.length
    || states.some(({ state }) => state === 'learning' || state === 'relearning')
  ) {
    return 'learning';
  }

  return 'review';
}

function toCardInsight(card: CardRecord, state: ReviewState | undefined): CardProgressInsight {
  return {
    cardId: card.cardId,
    cardType: card.cardType,
    stage: state?.state ?? 'new',
    ...(state?.dueAt ? { dueAt: state.dueAt } : {}),
    intervalDays: state?.intervalDays ?? 0,
    reviewCount: state?.reviewCount ?? 0,
    lapseCount: state?.lapseCount ?? 0,
    minimumKnownRatingsToMature: estimateMinimumKnownRatingsToMature(state),
  };
}

export async function loadProgressInsights(
  database: RecallDatabase,
  learnerProfileId: string,
  contentProfileId: string,
  now = new Date(),
): Promise<ProgressInsights> {
  const [allNotes, allCards, allStates, events] = await Promise.all([
    database.notes.where('contentProfileId').equals(contentProfileId).toArray(),
    database.cards.where('contentProfileId').equals(contentProfileId).toArray(),
    database.reviewStates.toArray(),
    database.reviewEvents.where('learnerProfileId').equals(learnerProfileId).toArray(),
  ]);
  const notes = allNotes.filter(({ status }) => isAvailable(status));
  const cards = allCards.filter(({ status }) => isAvailable(status));
  const states = allStates.filter((state) => state.learnerProfileId === learnerProfileId);
  const stateByCardId = new Map(states.map((state) => [state.cardId, state]));
  const cardsByNoteId = new Map<string, CardRecord[]>();

  for (const card of cards) {
    const noteCards = cardsByNoteId.get(card.noteId) ?? [];
    noteCards.push(card);
    cardsByNoteId.set(card.noteId, noteCards);
  }

  const nowIso = now.toISOString();
  const items = notes
    .map((note): NoteProgressInsight | undefined => {
      const noteCards = (cardsByNoteId.get(note.noteId) ?? [])
        .sort((left, right) => left.cardType.localeCompare(right.cardType));

      if (noteCards.length === 0) {
        return undefined;
      }

      const noteStates = noteCards
        .map(({ cardId }) => stateByCardId.get(cardId))
        .filter((state): state is ReviewState => state !== undefined);
      const dueDates = noteStates.map(({ dueAt }) => dueAt).sort();

      return {
        noteId: note.noteId,
        noteType: note.noteType,
        core: note.core,
        meaningCn: note.meaningCn,
        ...(note.pronunciationText ? { pronunciationText: note.pronunciationText } : {}),
        ...(note.pronunciationLang ? { pronunciationLang: note.pronunciationLang } : {}),
        category: categoryFor(noteCards, noteStates),
        due: noteStates.some(({ dueAt }) => dueAt <= nowIso),
        forgotten: noteStates.some(({ lapseCount }) => lapseCount > 0),
        ...(dueDates[0] ? { nextDueAt: dueDates[0] } : {}),
        cards: noteCards.map((card) => toCardInsight(card, stateByCardId.get(card.cardId))),
      };
    })
    .filter((item): item is NoteProgressInsight => item !== undefined)
    .sort((left, right) => {
      if (left.due !== right.due) return left.due ? -1 : 1;
      return (left.nextDueAt ?? '9999').localeCompare(right.nextDueAt ?? '9999')
        || left.core.localeCompare(right.core);
    });

  const activityStart = new Date(now);
  activityStart.setHours(0, 0, 0, 0);
  activityStart.setDate(activityStart.getDate() - 6);
  const activityCounts = new Map<string, number>();

  for (const event of events) {
    const reviewedAt = new Date(event.reviewedAt);

    if (reviewedAt >= activityStart && reviewedAt <= now) {
      const key = localDateKey(reviewedAt);
      activityCounts.set(key, (activityCounts.get(key) ?? 0) + 1);
    }
  }

  const recentActivity = Array.from({ length: 7 }, (_, index): DailyReviewActivity => {
    const date = new Date(activityStart);
    date.setDate(activityStart.getDate() + index);
    const dateKey = localDateKey(date);
    return {
      dateKey,
      label: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date),
      count: activityCounts.get(dateKey) ?? 0,
    };
  });
  const todayKey = localDateKey(now);

  return {
    total: items.length,
    unseen: items.filter(({ category }) => category === 'unseen').length,
    learning: items.filter(({ category }) => category === 'learning').length,
    review: items.filter(({ category }) => category === 'review').length,
    mature: items.filter(({ category }) => category === 'mature').length,
    due: items.filter(({ due }) => due).length,
    todayReviews: activityCounts.get(todayKey) ?? 0,
    recentActivity,
    items,
  };
}
