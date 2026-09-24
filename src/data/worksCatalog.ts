import { Work } from '../types';

let cached: Work[] | null = null;
let pending: Promise<Work[]> | null = null;

export async function loadWorksCatalog(): Promise<Work[]> {
  if (cached) return cached;
  if (!pending) {
    pending = import('./works').then((module) => {
      cached = module.WORKS;
      return cached;
    });
  }
  return pending;
}

export function loadedWorksCatalog(): Work[] {
  return cached ?? [];
}
