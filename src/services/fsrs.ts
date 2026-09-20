import { Card, Rating, createEmptyCard, fsrs, type Grade } from 'ts-fsrs';
import { getStoredValue, setStoredValue } from './settings';

export type ReviewRating = 'again' | 'hard' | 'good' | 'easy';

const scheduler = fsrs({
  request_retention: 0.9,
  maximum_interval: 36500,
  enable_fuzz: true,
  enable_short_term: true,
  learning_steps: ['5m', '30m'],
  relearning_steps: ['10m'],
});

interface StoredCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review?: string | null;
}

function key(workId: string): string {
  return `fsrs_${workId}`;
}

function serialize(card: Card): string {
  const stored: StoredCard = {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review?.toISOString() ?? null,
  };
  return JSON.stringify(stored);
}

function deserialize(raw: string): Card | null {
  try {
    const stored = JSON.parse(raw) as StoredCard;
    return {
      due: new Date(stored.due),
      stability: stored.stability,
      difficulty: stored.difficulty,
      elapsed_days: stored.elapsed_days,
      scheduled_days: stored.scheduled_days,
      learning_steps: stored.learning_steps,
      reps: stored.reps,
      lapses: stored.lapses,
      state: stored.state,
      last_review: stored.last_review ? new Date(stored.last_review) : undefined,
    };
  } catch {
    return null;
  }
}

export async function loadCard(workId: string): Promise<Card> {
  const raw = await getStoredValue(key(workId));
  return (raw ? deserialize(raw) : null) ?? createEmptyCard();
}

const ratingMap: Record<ReviewRating, Grade> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export async function rateWork(workId: string, rating: ReviewRating): Promise<Card> {
  const card = await loadCard(workId);
  const result = scheduler.next(card, new Date(), ratingMap[rating]);
  await setStoredValue(key(workId), serialize(result.card));
  return result.card;
}

export function formatDue(card: Card): string {
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.round((card.due.getTime() - now) / 60000));

  if (diffMinutes < 1) return '马上';
  if (diffMinutes < 60) return `${diffMinutes} 分钟后`;
  if (diffMinutes < 48 * 60) return `${Math.round(diffMinutes / 60)} 小时后`;

  const date = card.due;
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`;
}

export function dueLabel(card: Card): string {
  if (card.reps === 0) return '初次学习';
  if (card.due.getTime() <= Date.now()) return '现在复习';
  return `下次 ${formatDue(card)}`;
}

