import { Explanation, Work } from '../types';
import { getSelection, isWholeLine } from './text';

export function findLocalExplanation(
  work: Work,
  lineIndex: number,
  start: number,
  end: number,
): Explanation | null {
  const line = work.lines[lineIndex];
  const selection = getSelection(line, start, end);
  const exact = work.glossary.find(
    (item) => item.lineIndex === lineIndex && item.surface === selection,
  );

  if (exact) {
    return {
      selection,
      pinyin: exact.pinyin,
      partOfSpeech: exact.partOfSpeech,
      meaningInContext: exact.meaningInContext,
      literalTranslation: exact.literalTranslation,
      plainTranslation: exact.plainTranslation,
      grammar: exact.grammar,
      notes: exact.notes ?? [],
      evidence: exact.evidence ?? [],
      uncertainty: exact.uncertainty,
      confidence: exact.confidence,
      source: 'local',
    };
  }

  if (isWholeLine(line, start, end) && work.translations[lineIndex]?.trim()) {
    return {
      selection,
      meaningInContext: '整句白话翻译',
      plainTranslation: work.translations[lineIndex],
      notes: [],
      evidence: [`原文：${line}`, `篇目：${work.title}`],
      confidence: 'high',
      source: 'local',
    };
  }

  return null;
}
