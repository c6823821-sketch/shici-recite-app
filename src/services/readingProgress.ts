import { getStoredValue, setStoredValue } from './settings';

export interface ReadingProgress {
  key: string;
  unitIndex: number;
  lineIndex: number;
  charIndex: number;
  completedUnits: number[];
  updatedAt: string;
}

const STORAGE_KEY = 'reading_progress_v2';

function normalize(value: unknown): ReadingProgress[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ReadingProgress => Boolean(
    item
    && typeof item.key === 'string'
    && typeof item.unitIndex === 'number'
    && typeof item.lineIndex === 'number'
    && typeof item.charIndex === 'number'
    && Array.isArray(item.completedUnits),
  ));
}

async function readAll(): Promise<ReadingProgress[]> {
  const raw = await getStoredValue(STORAGE_KEY);
  if (!raw) return [];
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function loadReadingProgress(key: string): Promise<ReadingProgress | null> {
  const all = await readAll();
  return all.find((item) => item.key === key) ?? null;
}

export async function saveReadingProgress(
  key: string,
  patch: Partial<Omit<ReadingProgress, 'key' | 'updatedAt'>>,
): Promise<ReadingProgress> {
  const all = await readAll();
  const previous = all.find((item) => item.key === key);
  const next: ReadingProgress = {
    key,
    unitIndex: patch.unitIndex ?? previous?.unitIndex ?? 0,
    lineIndex: patch.lineIndex ?? previous?.lineIndex ?? 0,
    charIndex: patch.charIndex ?? previous?.charIndex ?? 0,
    completedUnits: patch.completedUnits ?? previous?.completedUnits ?? [],
    updatedAt: new Date().toISOString(),
  };
  await setStoredValue(STORAGE_KEY, JSON.stringify([
    ...all.filter((item) => item.key !== key),
    next,
  ]));
  return next;
}

export async function markReadingUnitComplete(key: string, unitIndex: number): Promise<ReadingProgress> {
  const current = await loadReadingProgress(key);
  const completed = new Set(current?.completedUnits ?? []);
  completed.add(unitIndex);
  return saveReadingProgress(key, {
    unitIndex,
    completedUnits: [...completed].sort((left, right) => left - right),
  });
}
