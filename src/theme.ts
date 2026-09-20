import { Platform } from 'react-native';

export const colors = {
  paper: '#F3EDDF',
  paperDeep: '#E8DEC9',
  paperLight: '#FAF6EC',
  ink: '#211E19',
  inkSoft: '#5E574C',
  muted: '#8D8373',
  line: '#CFC3AE',
  vermilion: '#A3342A',
  vermilionDark: '#7E281F',
  jade: '#40584C',
  white: '#FFFDF7',
  danger: '#9C342B',
};

export const fonts = {
  title: Platform.select({ ios: 'Songti SC', android: 'serif', default: 'serif' }),
  body: Platform.select({ ios: 'Songti SC', android: 'serif', default: 'serif' }),
  sans: Platform.select({ ios: 'PingFang SC', android: 'sans-serif', default: 'sans-serif' }),
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};

export const shadow = {
  shadowColor: '#3A2E1F',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.12,
  shadowRadius: 8,
  elevation: 3,
};
