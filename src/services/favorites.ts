import { getStoredValue, setStoredValue } from './settings';

export interface FavoriteLine {
  id: string;
  workId: string;
  workTitle: string;
  lineIndex: number;
  quote: string;
  name: string;
  tags: string[];
  createdAt: string;
}

export async function loadFavorites(): Promise<FavoriteLine[]> {
  const raw = await getStoredValue('favorite_lines_v1');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as FavoriteLine[];
  } catch {
    return [];
  }
}

export async function saveFavorite(favorite: FavoriteLine): Promise<void> {
  const current = await loadFavorites();
  const exists = current.find((item) => item.id === favorite.id);
  const next = exists
    ? current.map((item) => (item.id === favorite.id ? favorite : item))
    : [favorite, ...current];
  await setStoredValue('favorite_lines_v1', JSON.stringify(next));
}

export async function removeFavorite(id: string): Promise<void> {
  const current = await loadFavorites();
  await setStoredValue('favorite_lines_v1', JSON.stringify(current.filter((item) => item.id !== id)));
}

export function createFavorite(input: {
  workId: string;
  workTitle: string;
  lineIndex: number;
  quote: string;
  name: string;
  tags: string[];
}): FavoriteLine {
  return {
    id: `${input.workId}-${input.lineIndex}-${Date.now()}`,
    ...input,
    createdAt: new Date().toISOString(),
  };
}
