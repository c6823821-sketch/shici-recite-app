import { Work } from '../types';

const STARTER_ORDER_LIMIT = 10000;

function contentLength(work: Work): number {
  return work.lines.join('').replace(/\s/g, '').length;
}

export function isReciteFriendly(work: Work): boolean {
  const length = contentLength(work);
  return work.lines.length > 0
    && work.lines.length <= 32
    && length <= 220
    && !work.incomplete
    && !work.fragment
    && work.genre !== '文';
}

export function reciteQualityScore(work: Work): number {
  const length = contentLength(work);
  const order = work.order ?? Number.MAX_SAFE_INTEGER;
  let score = 0;

  if (order < STARTER_ORDER_LIMIT) score += 400;
  if (work.lines.length <= 16) score += 120;
  else if (work.lines.length <= 24) score += 50;
  if (length <= 80) score += 60;
  else if (length <= 160) score += 20;
  if (work.collections.some((item) => /唐诗|宋词|元曲|诗经|乐府|小学|初中/.test(item))) score += 40;
  if (work.lines.length > 40) score -= 240;
  if (length > 260) score -= 240;

  return score;
}

function hashSeed(value: string): number {
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return hash >>> 0;
}

function rotate<T>(items: T[], offset: number): T[] {
  if (!items.length) return [];
  const start = Math.abs(offset) % items.length;
  return [...items.slice(start), ...items.slice(0, start)];
}

function localDateSeed(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function rankedReciteWorks(
  catalog: Work[],
  completedIds: ReadonlySet<string> = new Set(),
  seed = localDateSeed(),
): Work[] {
  const candidates = catalog.filter((work) => isReciteFriendly(work) && !completedIds.has(work.id));
  const starter = candidates.filter((work) => (work.order ?? Number.MAX_SAFE_INTEGER) < STARTER_ORDER_LIMIT);
  const remaining = candidates
    .filter((work) => (work.order ?? Number.MAX_SAFE_INTEGER) >= STARTER_ORDER_LIMIT)
    .sort((left, right) => {
      const scoreDelta = reciteQualityScore(right) - reciteQualityScore(left);
      if (scoreDelta !== 0) return scoreDelta;
      return (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER);
    });

  return [...rotate(starter, hashSeed(seed)), ...remaining];
}

export function bestDailyWork(catalog: Work[], seed = localDateSeed()): Work | undefined {
  return rankedReciteWorks(catalog, new Set(), seed)[0];
}
