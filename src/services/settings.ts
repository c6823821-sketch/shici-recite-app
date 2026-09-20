import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { ApiSettings } from '../types';

const SETTINGS_KEY = 'shici_api_settings_v1';

const memory = new Map<string, string>();

async function getRaw(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

async function setRaw(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    memory.set(key, value);
    globalThis.localStorage?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function loadApiSettings(): Promise<ApiSettings | null> {
  const raw = await getRaw(SETTINGS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ApiSettings>;
    return {
      endpoint: parsed.endpoint ?? '',
      apiKey: parsed.apiKey ?? '',
      model: parsed.model ?? '',
    };
  } catch {
    return null;
  }
}

export async function saveApiSettings(settings: ApiSettings): Promise<void> {
  await setRaw(SETTINGS_KEY, JSON.stringify(settings));
}

export { getRaw as getStoredValue, setRaw as setStoredValue };
