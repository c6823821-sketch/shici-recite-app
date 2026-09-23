import { Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';

const KEY = 'imported_works_v1';

export async function loadImportedWorks(): Promise<Work[]> {
  const raw = await getStoredValue(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Work[];
  } catch {
    return [];
  }
}

export async function saveImportedWork(work: Work): Promise<void> {
  const current = await loadImportedWorks();
  const next = [work, ...current.filter((item) => item.id !== work.id)].slice(0, 500);
  await setStoredValue(KEY, JSON.stringify(next));
}
