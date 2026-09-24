import { Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';
import { canonicalWorkKey, correctKnownImportedWork, normalizeWorkTitle } from '../data/corrections';

const KEY = 'imported_works_v1';
const longWorkPattern = /腾王阁序|洛神赋|岳阳楼记|出师表|兰亭集序|逍遥游|长恨歌|琵琶行|赤壁赋|阿房宫赋/;

function isIncompleteLongWork(work: Work): boolean {
  const textLength = work.lines.join('').length;
  return longWorkPattern.test(normalizeWorkTitle(work.title)) && work.lines.length < 3 && textLength < 120;
}

function normalizeImportedList(works: Work[]): Work[] {
  const seen = new Set<string>();
  const result: Work[] = [];
  for (const raw of works) {
    const corrected = correctKnownImportedWork(raw);
    if (isIncompleteLongWork(corrected)) continue;
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
