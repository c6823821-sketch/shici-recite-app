import React, { createContext, useContext, useEffect, useState } from 'react';
import { getStoredValue, setStoredValue } from './settings';

export type AppBackgroundKey = 'paper' | 'warm' | 'mist';

export const APP_BACKGROUNDS: Array<{ key: AppBackgroundKey; label: string; color: string; note: string }> = [
  { key: 'paper', label: '宣纸白', color: '#F9F7F2', note: '清透、安静，适合长时间阅读' },
  { key: 'warm', label: '米棕色', color: '#F3EDE2', note: '温暖、古雅，接近旧纸质感' },
  { key: 'mist', label: '淡紫色', color: '#F1EEF5', note: '柔和、低饱和，略带现代感' },
];

const STORAGE_KEY = 'app_background_theme_v1';
const DEFAULT_BACKGROUND: AppBackgroundKey = 'paper';

interface AppearanceValue {
  backgroundKey: AppBackgroundKey;
  background: string;
  setBackground: (key: AppBackgroundKey) => Promise<void>;
}

const AppearanceContext = createContext<AppearanceValue>({
  backgroundKey: DEFAULT_BACKGROUND,
  background: APP_BACKGROUNDS[0].color,
  setBackground: async () => undefined,
});

function isBackgroundKey(value: string | null): value is AppBackgroundKey {
  return value === 'paper' || value === 'warm' || value === 'mist';
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
    <AppearanceContext.Provider value={{ backgroundKey, background: theme.color, setBackground }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceValue {
  return useContext(AppearanceContext);
}
