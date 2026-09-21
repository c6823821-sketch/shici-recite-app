import dictionary from '../data/dictionary/Word_Explain.json';
import { Explanation, Work } from '../types';
import { getSelection } from './text';

interface DictionaryEntry {
  pronunciation?: string;
  explains?: string[];
}

const DICT = dictionary as Record<string, DictionaryEntry[]>;

export function findDictionaryExplanation(work: Work, lineIndex: number, start: number, end: number): Explanation | null {
  const line = work.lines[lineIndex];
  const selection = getSelection(line, start, end);
  if (Array.from(selection).length !== 1) return null;
  const entries = DICT[selection];
  if (!entries?.length) return null;
  const pronunciations = entries.map((entry) => entry.pronunciation).filter(Boolean).join(' / ');
  const notes = entries
    .flatMap((entry) => (entry.explains ?? []).slice(0, 2))
    .filter(Boolean)
    .slice(0, 5);
  return {
    selection,
    pinyin: pronunciations || undefined,
    meaningInContext: '这是古汉语词典释义，需结合当前句判断具体义项。',
    plainTranslation: `当前句：${line}`,
    notes,
    evidence: ['古汉语词典释义（本地离线）'],
    confidence: 'medium',
    source: 'local',
  };
}
