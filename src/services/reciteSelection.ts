import { Work } from '../types';

const STARTER_ORDER_LIMIT = 10000;
const friendlyCache = new WeakMap<Work, boolean>();
const qualityCache = new WeakMap<Work, number>();

function contentLength(work: Work): number {
  return work.lines.join('').replace(/\s/g, '').length;
}

export function isReciteFriendly(work: Work): boolean {
  const cached = friendlyCache.get(work);
  if (cached !== undefined) return cached;
  const length = contentLength(work);
  const friendly = work.lines.length > 0
    && work.lines.length <= 32
    && length <= 220
    && !work.incomplete
    && !work.fragment
    && work.genre !== '文';
  friendlyCache.set(work, friendly);
  return friendly;
}

export function reciteQualityScore(work: Work): number {
  const cached = qualityCache.get(work);
  if (cached !== undefined) return cached;
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

  qualityCache.set(work, score);
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

interface RankedCandidate {
  work: Work;
  score: number;
  order: number;
}

function rankCandidate(work: Work): RankedCandidate {
  return {
    work,
    score: reciteQualityScore(work),
    order: work.order ?? Number.MAX_SAFE_INTEGER,
  };
}

function compareCandidates(left: RankedCandidate, right: RankedCandidate): number {
  const scoreDelta = right.score - left.score;
  if (scoreDelta !== 0) return scoreDelta;
  return left.order - right.order;
}

function splitReciteCandidates(
  catalog: Work[],
  completedIds: ReadonlySet<string>,
): { starter: Work[]; remaining: RankedCandidate[] } {
  const starter: Work[] = [];
  const remaining: RankedCandidate[] = [];
  for (const work of catalog) {
    if (completedIds.has(work.id) || !isReciteFriendly(work)) continue;
    if ((work.order ?? Number.MAX_SAFE_INTEGER) < STARTER_ORDER_LIMIT) {
      starter.push(work);
    } else {
      remaining.push(rankCandidate(work));
    }
  }
  return { starter, remaining };
}

function selectTopCandidates(candidates: RankedCandidate[], limit: number): RankedCandidate[] {
  if (limit <= 0) return [];
  const selected: RankedCandidate[] = [];
  for (const candidate of candidates) {
    if (selected.length < limit) {
      selected.push(candidate);
      selected.sort(compareCandidates);
      continue;
    }
    const last = selected[selected.length - 1];
    if (compareCandidates(candidate, last) >= 0) continue;
    selected[selected.length - 1] = candidate;
    selected.sort(compareCandidates);
  }
  return selected;
}

export function selectReciteWorks(
  catalog: Work[],
  limit: number,
  completedIds: ReadonlySet<string> = new Set(),
  seed = localDateSeed(),
): Work[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (safeLimit === 0) return [];
  const { starter, remaining } = splitReciteCandidates(catalog, completedIds);
  const orderedStarter = rotate(starter, hashSeed(seed));
  if (orderedStarter.length >= safeLimit) return orderedStarter.slice(0, safeLimit);
  const rest = selectTopCandidates(remaining, safeLimit - orderedStarter.length).map((item) => item.work);
  return [...orderedStarter, ...rest];
}

export function rankedReciteWorks(
  catalog: Work[],
  completedIds: ReadonlySet<string> = new Set(),
  seed = localDateSeed(),
): Work[] {
  const { starter, remaining } = splitReciteCandidates(catalog, completedIds);
  const orderedRemaining = remaining.sort(compareCandidates).map((item) => item.work);
  return [...rotate(starter, hashSeed(seed)), ...orderedRemaining];
}

export function bestDailyWork(catalog: Work[], seed = localDateSeed()): Work | undefined {
  return selectReciteWorks(catalog, 1, new Set(), seed)[0];
}

export function randomReciteWork(
  catalog: Work[],
  excludedIds: ReadonlySet<string> = new Set(),
  random = Math.random(),
): Work | undefined {
  const pool = catalog.filter((work) => (
    !excludedIds.has(work.id)
    && (work.order ?? Number.MAX_SAFE_INTEGER) < STARTER_ORDER_LIMIT
    && isReciteFriendly(work)
  ));
  if (!pool.length) return undefined;
  const index = Math.min(pool.length - 1, Math.floor(Math.max(0, random) * pool.length));
  return pool[index];
}
