import { Platform } from 'react-native';
import rawUiTuning from '../ui-tuning.json';

export interface UiTuning {
  pagePadding: number;
  cardGap: number;
  fontScale: number;
  titleSize: number;
  sourceSize: number;
  cardRadius: number;
  buttonHeight: number;
  buttonRadius: number;
  inputBorder: number;
  pageBg: string;
  cardBg: string;
  accent: string;
  inputBorderColor: string;
  recommendArtHeight: number;
}

const fallbackUiTuning: UiTuning = {
  pagePadding: 20,
  cardGap: 16,
  fontScale: 1,
  titleSize: 16,
  sourceSize: 12,
  cardRadius: 16,
  buttonHeight: 56,
  buttonRadius: 6,
  inputBorder: 2,
  pageBg: '#F2EDE3',
  cardBg: '#FAF6EE',
  accent: '#8E1B1F',
  inputBorderColor: '#8A7760',
  recommendArtHeight: 220,
};

function positiveNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function colorValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback;
}

export const uiTuning: UiTuning = {
  pagePadding: positiveNumber(rawUiTuning.pagePadding, fallbackUiTuning.pagePadding),
  cardGap: positiveNumber(rawUiTuning.cardGap, fallbackUiTuning.cardGap),
  fontScale: positiveNumber(rawUiTuning.fontScale, fallbackUiTuning.fontScale),
  titleSize: positiveNumber(rawUiTuning.titleSize, fallbackUiTuning.titleSize),
  sourceSize: positiveNumber(rawUiTuning.sourceSize, fallbackUiTuning.sourceSize),
  cardRadius: positiveNumber(rawUiTuning.cardRadius, fallbackUiTuning.cardRadius),
  buttonHeight: positiveNumber(rawUiTuning.buttonHeight, fallbackUiTuning.buttonHeight),
  buttonRadius: positiveNumber(rawUiTuning.buttonRadius, fallbackUiTuning.buttonRadius),
  inputBorder: positiveNumber(rawUiTuning.inputBorder, fallbackUiTuning.inputBorder),
  pageBg: colorValue(rawUiTuning.pageBg, fallbackUiTuning.pageBg),
  cardBg: colorValue(rawUiTuning.cardBg, fallbackUiTuning.cardBg),
  accent: colorValue(rawUiTuning.accent, fallbackUiTuning.accent),
  inputBorderColor: colorValue(rawUiTuning.inputBorderColor, fallbackUiTuning.inputBorderColor),
  recommendArtHeight: positiveNumber(rawUiTuning.recommendArtHeight, fallbackUiTuning.recommendArtHeight),
};

export const colors = {
  paper: uiTuning.pageBg,
  paperDeep: '#F0ECE3',
  paperLight: uiTuning.cardBg,
  ink: '#333333',
  inkSoft: '#666666',
  muted: '#999999',
  line: '#E8E2D8',
  vermilion: uiTuning.accent,
  vermilionDark: uiTuning.accent,
  jade: '#4A675B',
  gold: '#B08A4A',
  white: '#FFFFFF',
  danger: '#C62828',
};

export const fonts = {
  title: Platform.select({ ios: 'Songti SC', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'Songti SC', android: 'serif', default: 'serif' }),
  sans: Platform.select({ ios: 'PingFang SC', android: 'sans-serif', default: 'sans-serif' }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: uiTuning.cardGap,
  lg: uiTuning.pagePadding,
  xl: uiTuning.pagePadding + 12,
};

export const radius = {
  card: uiTuning.cardRadius,
  button: uiTuning.buttonRadius,
  pill: 999,
};

export const shadow = {
  shadowColor: '#333333',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
