import { getStoredValue, setStoredValue } from './settings';

function key(workId: string, lineIndex: number): string {
  return `translation_${workId}_${lineIndex}`;
}

export async function loadCachedTranslation(workId: string, lineIndex: number): Promise<string | null> {
  return getStoredValue(key(workId, lineIndex));
}

export async function saveCachedTranslation(workId: string, lineIndex: number, text: string): Promise<void> {
  if (!text.trim()) return;
  await setStoredValue(key(workId, lineIndex), text.trim());
}
