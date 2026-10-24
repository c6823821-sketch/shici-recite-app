import { Work } from '../types';

function firstLineTitle(work: Work): string {
  const firstLine = work.lines[0]?.trim() ?? '';
  return Array.from(firstLine.replace(/[\s，。！？；：、,.!?;:]+$/g, '')).slice(0, 16).join('');
}

export function workDisplayTitle(work: Work): string {
  const title = work.title.trim();
  if (work.genre !== '词' || /[·・]/.test(title)) return title;
  const subtitle = firstLineTitle(work);
  return subtitle && subtitle !== title ? `${title}·${subtitle}` : title;
}
