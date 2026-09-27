import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredValue, setStoredValue } from './settings';

export type AppBackgroundKey = 'paper' | 'warm' | 'brown' | 'mist' | 'sage' | 'rose';

export const APP_BACKGROUNDS: Array<{ key: AppBackgroundKey; label: string; color: string; card: string; note: string }> = [
  { key: 'paper', label: '宣纸白', color: '#F9F7F2', card: '#FFFFFF', note: '清透、安静，适合长时间阅读' },
  { key: 'warm', label: '暖米色', color: '#F2EDE3', card: '#FAF6EE', note: '你截图中偏爱的暖米色，温柔、低对比' },
  { key: 'brown', label: '旧纸棕', color: '#E9DCCB', card: '#F7EDE0', note: '更暖的旧纸棕色，接近古籍纸色' },
  { key: 'mist', label: '淡紫色', color: '#F1EEF5', card: '#FAF8FC', note: '柔和、低饱和，略带现代感' },
  { key: 'sage', label: '青绿色', color: '#E6EDE6', card: '#F7FAF7', note: '清雅的浅青绿色，接近山水留白' },
  { key: 'rose', label: '藕粉色', color: '#F3E8E4', card: '#FCF7F5', note: '温和的藕粉底色，适合阅读和收藏' },
];

const STORAGE_KEY = 'app_background_theme_v1';
const DEFAULT_BACKGROUND: AppBackgroundKey = 'warm';

interface AppearanceValue {
  backgroundKey: AppBackgroundKey;
  background: string;
  cardBackground: string;
  setBackground: (key: AppBackgroundKey) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceValue>({
  backgroundKey: DEFAULT_BACKGROUND,
  background: APP_BACKGROUNDS[0].color,
  cardBackground: APP_BACKGROUNDS[0].card,
  setBackground: async () => undefined,
});

function isBackgroundKey(value: string | null): value is AppBackgroundKey {
  return APP_BACKGROUNDS.some((item) => item.key === value);
}

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [backgroundKey, setBackgroundKey] = useState<AppBackgroundKey>(DEFAULT_BACKGROUND);

  useEffect(() => {
    void getStoredValue(STORAGE_KEY).then((value) => {
      if (isBackgroundKey(value)) setBackgroundKey(value);
    });
  }, []);

  const theme = APP_BACKGROUNDS.find((item) => item.key === backgroundKey) ?? APP_BACKGROUNDS[0];
  const setBackground = async (key: AppBackgroundKey) => {
    setBackgroundKey(key);
    await setStoredValue(STORAGE_KEY, key);
  };

  return (
    <AppearanceContext.Provider value={{ backgroundKey, background: theme.color, cardBackground: theme.card, setBackground }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceValue {
  return useContext(AppearanceContext);
}
