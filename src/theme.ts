import { Platform } from 'react-native';

export const colors = {
  paper: '#F9F7F2',
  paperDeep: '#F0ECE3',
  paperLight: '#FFFFFF',
  ink: '#333333',
  inkSoft: '#666666',
  muted: '#999999',
  line: '#E8E2D8',
  vermilion: '#C62828',
  vermilionDark: '#9E1F1F',
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
  md: 16,
  lg: 20,
  xl: 32,
};

export const radius = {
  card: 16,
  button: 14,
  pill: 999,
};

export const shadow = {
  shadowColor: '#333333',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 8,
  elevation: 2,
};
