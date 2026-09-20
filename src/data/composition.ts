import { CI_PATTERNS } from './prosody/ci-patterns';

export type CompositionGenre = '诗' | '词' | '曲';
export type RhymeBook = '平水韵' | '词林正韵' | '中华新韵' | '中原音韵';

export interface CompositionForm {
  id: string;
  label: string;
  genre: CompositionGenre;
  charCount?: number;
  lineCount?: number;
  lineLengths?: number[];
  rhymeBook: RhymeBook;
  patternLines?: string[];
  tonePattern?: string;
  rhymePositions?: number[];
  hint: string;
  source: string;
}

const POETRY_FORMS: CompositionForm[] = [
  {
    id: 'wuyan-jueju',
    label: '五言绝句',
    genre: '诗',
    charCount: 20,
    lineCount: 4,
    lineLengths: [5, 5, 5, 5],
    rhymeBook: '平水韵',
    hint: '四句，每句五字；通常二、四句押平声韵，首句可入韵也可不入韵。',
    source: '近体诗通行规则',
  },
  {
    id: 'qiyan-jueju',
    label: '七言绝句',
    genre: '诗',
    charCount: 28,
    lineCount: 4,
    lineLengths: [7, 7, 7, 7],
    rhymeBook: '平水韵',
    hint: '四句，每句七字；押平声韵，注意粘对、孤平和三平尾。',
    source: '近体诗通行规则',
  },
  {
    id: 'wuyan-lvshi',
    label: '五言律诗',
    genre: '诗',
    charCount: 40,
    lineCount: 8,
    lineLengths: [5, 5, 5, 5, 5, 5, 5, 5],
    rhymeBook: '平水韵',
    hint: '八句，每句五字；中间两联原则上要对仗。',
    source: '近体诗通行规则',
  },
  {
    id: 'qiyan-lvshi',
    label: '七言律诗',
    genre: '诗',
    charCount: 56,
    lineCount: 8,
    lineLengths: [7, 7, 7, 7, 7, 7, 7, 7],
    rhymeBook: '平水韵',
    hint: '八句，每句七字；中间两联原则上要对仗。',
    source: '近体诗通行规则',
  },
  {
    id: 'guti',
    label: '古体诗',
    genre: '诗',
    rhymeBook: '平水韵',
    hint: '句式、篇幅较自由，但仍需检查押韵、节奏、层次和语句完整度。',
    source: '古体诗通行规则',
  },
];

const QU_FORMS: CompositionForm[] = [
  ['tian-jing-sha', '天净沙', '常见小令，句式短、意象密集；用韵和句式仍需按曲牌核对。'],
  ['shan-po-yang', '山坡羊', '句式有长短变化，常见对仗和直抒胸臆；不可只按字数凑句。'],
  ['zui-tai-ping', '醉太平', '曲牌句式较严，需核对句读、衬字和韵脚。'],
  ['shui-xian-zi', '水仙子', '常见小令，句读和韵脚需按曲谱检查。'],
  ['zhe-gui-ling', '折桂令', '曲牌变体较多，必须明确曲谱版本后再判。'],
  ['mai-hua-sheng', '卖花声', '句式与韵位较固定，衬字不能随意闯入。'],
].map(([id, label, hint]) => ({
  id,
  label,
  genre: '曲' as const,
  rhymeBook: '中原音韵' as const,
  hint,
  source: '曲牌基础规则（具体曲谱以所选版本为准）',
}));

const CI_FORMS: CompositionForm[] = Object.entries(CI_PATTERNS).map(([label, patterns]) => {
  const pattern = patterns[0];
  return {
    id: `ci-${label}`,
    label,
    genre: '词',
    charCount: pattern.geLyuStr.length,
    lineCount: pattern.ciSep.length,
    lineLengths: pattern.ciSep.map((line) => line.replace(/\s/g, '').length),
    rhymeBook: '词林正韵',
    patternLines: pattern.ciSep,
    tonePattern: pattern.geLyuStr,
    rhymePositions: pattern.rhymePos,
    hint: `按《${pattern.tune}》常见格例预检。押韵位置按照本地词谱，平仄和句读再结合 API 严格复核。`,
    source: 'couyun（MIT）词谱数据',
  };
});

export const COMPOSITION_FORMS: CompositionForm[] = [
  ...POETRY_FORMS,
  ...CI_FORMS,
  ...QU_FORMS,
];

export const GENRE_FORMS: Record<CompositionGenre, CompositionForm[]> = {
  诗: POETRY_FORMS,
  词: CI_FORMS,
  曲: QU_FORMS,
};
