import { DailyRecommendation } from '../types';
import { getStoredValue, setStoredValue } from './settings';

function todayKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export async function loadTodayRecommendation(): Promise<DailyRecommendation | null> {
  const raw = await getStoredValue(`daily_recommendation_${todayKey()}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DailyRecommendation;
  } catch {
    return null;
  }
}

export async function saveTodayRecommendation(recommendation: DailyRecommendation): Promise<void> {
  await setStoredValue(`daily_recommendation_${todayKey()}`, JSON.stringify(recommendation));
}
