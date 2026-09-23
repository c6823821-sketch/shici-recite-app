import rawClassics from './classics.json';
import { Classic, ClassicSection, Work } from '../types';

export const CLASSICS = rawClassics as Classic[];

export function classicToWork(classic: Classic): Work {
  const lines = classic.sections.map((section) => `${section.title}｜${section.text}`);
  return {
    id: `classic-${classic.id}`,
    title: classic.title,
    author: classic.author,
    dynasty: classic.category,
    genre: '典籍',
    collections: ['典籍', classic.title],
    themes: ['典籍', classic.category],
    moods: ['古雅'],
    intro: classic.title + '典籍补充文本',
    source: classic.source,
    lines,
    translations: [],
    glossary: [],
  };
}

export function classicSectionText(section: ClassicSection): string {
  return section.text;
}
