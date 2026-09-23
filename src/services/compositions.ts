import { CompositionGenre } from '../data/composition';
import { getStoredValue, setStoredValue } from './settings';

export interface SavedComposition {
  id: string;
  title: string;
  text: string;
  genre: CompositionGenre;
  formId: string;
  formLabel: string;
  variantIndex: number;
  createdAt: string;
  updatedAt: string;
}

const KEY = 'saved_compositions_v1';

export async function loadSavedCompositions(): Promise<SavedComposition[]> {
  const raw = await getStoredValue(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SavedComposition[];
    return parsed
      .filter((item) => item && typeof item.text === 'string' && item.text.trim().length > 0)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  } catch {
    return [];
  }
}

export async function saveSavedComposition(item: SavedComposition): Promise<void> {
  const current = await loadSavedCompositions();
  const next = [item, ...current.filter((existing) => existing.id !== item.id)]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 300);
  await setStoredValue(KEY, JSON.stringify(next));
}

export async function removeSavedComposition(id: string): Promise<void> {
  const current = await loadSavedCompositions();
  await setStoredValue(KEY, JSON.stringify(current.filter((item) => item.id !== id)));
}

export function createSavedComposition(input: {
  id?: string;
  title: string;
  text: string;
  genre: CompositionGenre;
  formId: string;
  formLabel: string;
  variantIndex: number;
  createdAt?: string;
}): SavedComposition {
  const now = new Date().toISOString();
  return {
    id: input.id ?? `composition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: input.title,
    text: input.text,
    genre: input.genre,
    formId: input.formId,
    formLabel: input.formLabel,
    variantIndex: input.variantIndex,
    createdAt: input.createdAt ?? now,
    updatedAt: now,
  };
}
