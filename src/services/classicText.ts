export interface ClassicTextSegment {
  text: string;
  highlights: string[];
}

const FAMOUS_PHRASES = [
  '学而时习之',
  '温故而知新',
  '见贤思齐焉',
  '三人行，必有我师焉',
  '己所不欲，勿施于人',
  '知之为知之，不知为不知',
  '敏而好学，不耻下问',
  '不义而富且贵，于我如浮云',
  '士不可以不弘毅',
  '任重而道远',
  '岁寒，然后知松柏之后凋也',
  '逝者如斯夫，不舍昼夜',
  '君子坦荡荡，小人长戚戚',
  '德不孤，必有邻',
  '听其言而观其行',
  '不迁怒，不贰过',
  '朝闻道，夕死可矣',
  '克己复礼为仁',
  '四海之内皆兄弟也',
  '内省不疚，夫何忧何惧',
  '知者不惑，仁者不忧，勇者不惧',
  '其身正，不令而行；其身不正，虽令不从',
  '工欲善其事，必先利其器',
  '人无远虑，必有近忧',
  '小不忍则乱大谋',
  '道不同，不相为谋',
  '大学之道，在明明德，在亲民，在止于至善',
  '苟日新，日日新，又日新',
  '格物致知',
  '修身齐家治国平天下',
  '博学之，审问之，慎思之，明辨之，笃行之',
  '凡事豫则立，不豫则废',
  '君子慎其独也',
  '上善若水',
  '天下难事，必作于易；天下大事，必作于细',
  '千里之行，始于足下',
  '知人者智，自知者明',
  '胜人者有力，自胜者强',
  '祸兮福之所倚，福兮祸之所伏',
  '富贵不能淫，贫贱不能移，威武不能屈',
  '老吾老，以及人之老',
  '生于忧患，死于安乐',
  '得道多助，失道寡助',
  '民为贵，社稷次之，君为轻',
  '各美其美，美人之美，美美与共，天下大同',
  '无他，但手熟尔',
  '惟手熟尔',
];

function normalizePhrase(value: string): string {
  return value.replace(/[\s\u3000，。！？；：、,.!?;:"“”‘’（）()《》〈〉·—\-]/g, '');
}

function tidySegment(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/\s+/g, '')
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/, '')
    .trim();
}

function isNoiseSegment(value: string): boolean {
  return !value || /^[，。！？；：、,.!?;:"“”‘’（）()《》〈〉·—\-]+$/.test(value);
}

function splitLongParagraph(value: string, targetLength = 170, hardLimit = 280): string[] {
  const chars = Array.from(value);
  const result: string[] = [];
  let current = '';

  const flush = (cutAt?: number) => {
    const end = cutAt === undefined ? current.length : cutAt + 1;
    const part = current.slice(0, end).trim();
    if (part) result.push(part);
    current = current.slice(end);
  };

  chars.forEach((char, index) => {
    current += char;
    const next = chars[index + 1];
    const sentenceEnd = /[。！？]/.test(char);
    const closingQuoteFollows = next === '”' || next === '’';

    if (sentenceEnd && !closingQuoteFollows && current.length >= targetLength) {
      flush();
      return;
    }
    if (current.length < hardLimit) return;

    let cutAt = -1;
    for (let cursor = current.length - 1; cursor >= Math.floor(targetLength * 0.55); cursor -= 1) {
      if (/[，、；：]/.test(current[cursor])) {
        cutAt = cursor;
        break;
      }
    }
    flush(cutAt >= 0 ? cutAt : current.length - 1);
  });

  if (current.trim()) result.push(current.trim());
  return result;
}

export function highlightPhrasesIn(text: string): string[] {
  const normalizedText = normalizePhrase(text);
  return FAMOUS_PHRASES.filter((phrase) => normalizedText.includes(normalizePhrase(phrase)));
}

export function splitClassicText(text: string): ClassicTextSegment[] {
  const paragraphs = text
    .replace(/\r/g, '')
    .split(/\n+/)
    .map(tidySegment)
    .filter((part) => !isNoiseSegment(part));

  const segments = paragraphs.flatMap((paragraph) => (
    paragraph.length <= 190 ? [paragraph] : splitLongParagraph(paragraph)
  ));

  return segments
    .map(tidySegment)
    .filter((part) => !isNoiseSegment(part))
    .map((part) => ({ text: part, highlights: highlightPhrasesIn(part) }));
}

export function paginateClassicSegments(
  segments: ClassicTextSegment[],
  maxChars = 620,
  maxSegments = 6,
): ClassicTextSegment[][] {
  if (segments.length === 0) return [[]];

  const pages: ClassicTextSegment[][] = [];
  let current: ClassicTextSegment[] = [];
  let charCount = 0;

  segments.forEach((segment) => {
    const currentChars = segment.text.length;
    const shouldBreak = current.length > 0
      && (current.length >= maxSegments || charCount + currentChars > maxChars);
    if (shouldBreak) {
      pages.push(current);
      current = [];
      charCount = 0;
    }
    current.push(segment);
    charCount += currentChars;
  });

  if (current.length > 0) pages.push(current);
  return pages.length > 0 ? pages : [[]];
}

export const CLASSIC_FAMOUS_PHRASES = FAMOUS_PHRASES;
