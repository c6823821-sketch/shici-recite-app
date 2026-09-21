import { Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';

export type PreferenceEvent = 'view' | 'favorite' | 'completed' | 'pending';

export interface PreferenceProfile {
  themes: Record<string, number>;
  moods: Record<string, number>;
  authors: Record<string, number>;
  dynasties: Record<string, number>;
  recentWorkIds: string[];
  updatedAt: string;
}

const KEY = 'preference_profile_v1';

const emptyProfile = (): PreferenceProfile => ({
  themes: {}, moods: {}, authors: {}, dynasties: {}, recentWorkIds: [], updatedAt: new Date().toISOString(),
});

export async function loadPreferenceProfile(): Promise<PreferenceProfile> {
  const raw = await getStoredValue(KEY);
  if (!raw) return emptyProfile();
  try {
    const parsed = JSON.parse(raw) as Partial<PreferenceProfile>;
    return { ...emptyProfile(), ...parsed };
  } catch {
    return emptyProfile();
  }
}

function bump(record: Record<string, number>, key: string, amount: number): void {
  if (!key) return;
  record[key] = Math.min(100, (record[key] ?? 0) + amount);
}

export async function recordInteraction(work: Work, event: PreferenceEvent, durationMs = 0): Promise<void> {
  const profile = await loadPreferenceProfile();
  const base = event === 'favorite' ? 5 : event === 'completed' ? 3.5 : event === 'pending' ? 0.6 : 0.08;
  const duration = Math.min(2.5, durationMs / 60000);
  const amount = base + duration;
  for (const theme of work.themes) bump(profile.themes, theme, amount);
  for (const mood of work.moods) bump(profile.moods, mood, amount * 0.8);
  bump(profile.authors, work.author, amount * 0.5);
  bump(profile.dynasties, work.dynasty, amount * 0.4);
  profile.recentWorkIds = [work.id, ...profile.recentWorkIds.filter((id) => id !== work.id)].slice(0, 30);
  profile.updatedAt = new Date().toISOString();
  await setStoredValue(KEY, JSON.stringify(profile));
}

export function preferenceScore(work: Work, profile: PreferenceProfile): number {
  let score = 0;
  for (const theme of work.themes) score += profile.themes[theme] ?? 0;
  for (const mood of work.moods) score += (profile.moods[mood] ?? 0) * 0.8;
  score += (profile.authors[work.author] ?? 0) * 0.5;
  score += (profile.dynasties[work.dynasty] ?? 0) * 0.4;
  if (profile.recentWorkIds.includes(work.id)) score -= 1.5;
  return score;
}

export function topInterests(profile: PreferenceProfile, limit = 5): string[] {
  return Object.entries({ ...profile.themes, ...profile.moods })
    .sort((left, right) => right[1] - left[1])
    .slice(0, limit)
    .map(([key]) => key);
}
