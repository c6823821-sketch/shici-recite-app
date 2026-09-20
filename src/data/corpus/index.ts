import shijing from './shijing.json';
import tangshi from './tangshi.json';
import songci300 from './songci300.json';
import songci from './songci.json';
import { Work } from '../../types';

export const CORPUS_WORKS = [
  ...(shijing as Work[]),
  ...(tangshi as Work[]),
  ...(songci300 as Work[]),
  ...(songci as Work[]),
];
