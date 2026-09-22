import { ApiSettings, Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';
import { saveCachedTranslation } from './translationCache';
import { loadWholeTranslation } from './wholeTranslation';

export async function loadWholeTranslationCached(
  settings: ApiSettings | null,
  work: Work,
  onProgress?: (progress: number) => void,
): Promise<string[]> {
  const cached = await getStoredValue(`work_translation_${work.id}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as string[];
      if (parsed.length === work.lines.length && parsed.every((value) => typeof value === 'string' && value.trim())) return parsed;
    } catch { /* regenerate */ }
  }
  const result = await loadWholeTranslation(settings, work, onProgress);
  await setStoredValue(`work_translation_${work.id}`, JSON.stringify(result));
  await Promise.all(result.map((value, index) => value?.trim() ? saveCachedTranslation(work.id, index, value) : Promise.resolve()));
  return result;
}
