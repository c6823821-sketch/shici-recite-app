import { Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';
import { canonicalWorkKey, correctKnownImportedWork } from '../data/corrections';

const KEY = 'imported_works_v1';

function normalizeImportedList(works: Work[]): Work[] {
  const seen = new Set<string>();
  const result: Work[] = [];
  for (const raw of works) {
    const corrected = correctKnownImportedWork(raw);
    const key = canonicalWorkKey(corrected);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(corrected);
  }
  return result;
}

export async function loadImportedWorks(): Promise<Work[]> {
  const raw = await getStoredValue(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Work[];
    const cleaned = normalizeImportedList(parsed);
    if (JSON.stringify(cleaned) !== JSON.stringify(parsed)) {
      await setStoredValue(KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return [];
  }
}

export async function saveImportedWork(work: Work): Promise<void> {
  const current = await loadImportedWorks();
  const corrected = correctKnownImportedWork(work);
  const next = [
    corrected,
    ...current.filter((item) => item.id !== corrected.id && canonicalWorkKey(item) !== canonicalWorkKey(corrected)),
  ].slice(0, 500);
  await setStoredValue(KEY, JSON.stringify(next));
}
