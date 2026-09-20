import cilin from '../data/prosody/Cilin_Rhyme.json';
import pingshui from '../data/prosody/Pingshui_Rhyme.json';
import xinyun from '../data/prosody/Xinyun_Rhyme.json';
import wordTune from '../data/prosody/Word_Tune.json';
import { CompositionForm, RhymeBook } from '../data/composition';

export interface PrecheckIssue {
  severity: 'error' | 'warning';
  area: '字数' | '句数' | '押韵' | '平仄' | '格式' | '资料';
  message: string;
  line?: number;
}

export interface LocalPrecheck {
  formLabel: string;
  genre: string;
  charCount: number;
  lineCount: number;
  lineLengths: number[];
  expectedCharCount?: number;
  expectedLineCount?: number;
  expectedLineLengths?: number[];
  passed: boolean;
  issues: PrecheckIssue[];
  toneChecked: number;
  toneMatched: number;
  rhymeChecked: number;
  rhymeMatched: number;
}

function stripText(value: string): string {
  return value.replace(/[^\u3400-\u9fff\uf900-\ufaff]/g, '');
}

export function splitCompositionLines(value: string): string[] {
  return value
    .replace(/\r/g, '')
    .split(/[\n，。！？；：]+/)
    .map(stripText)
    .filter(Boolean);
}

type UnknownRecord = Record<string, unknown>;

function collectRhymeGroups(
  node: unknown,
  path: string,
  output: Map<string, string[]>,
): void {
  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item !== 'string') continue;
      const groups = output.get(item) ?? [];
      if (path && !groups.includes(path)) groups.push(path);
      output.set(item, groups);
    }
    return;
  }
  if (!node || typeof node !== 'object') return;
  for (const [key, value] of Object.entries(node as UnknownRecord)) {
    const nextPath = path ? `${path}/${key}` : key;
    collectRhymeGroups(value, nextPath, output);
  }
}

function rhymeBookData(book: RhymeBook): unknown {
  if (book === '中华新韵') return xinyun;
  if (book === '词林正韵') return cilin;
  if (book === '中原音韵') return cilin;
  return pingshui;
}

const rhymeIndexCache = new Map<RhymeBook, Map<string, string[]>>();

export function getRhymeGroups(character: string, book: RhymeBook): string[] {
  let index = rhymeIndexCache.get(book);
  if (!index) {
    index = new Map<string, string[]>();
    collectRhymeGroups(rhymeBookData(book), '', index);
    rhymeIndexCache.set(book, index);
  }
  return index.get(character) ?? [];
}

function compatibleRhyme(left: string, right: string, book: RhymeBook): boolean {
  const leftGroups = getRhymeGroups(left, book);
  const rightGroups = getRhymeGroups(right, book);
  return leftGroups.some((group) => rightGroups.includes(group));
}

function toneOf(character: string): string | undefined {
  const value = (wordTune as Record<string, string>)[character];
  return value;
}

function toneMatches(actual: string | undefined, expected: string): boolean {
  if (expected === '中') return true;
  if (!actual) return false;
  if (actual === '多') return true;
  return actual === expected;
}

function lineEndPosition(lines: string[], lineIndex: number): number {
  return lines.slice(0, lineIndex + 1).join('').length - 1;
}

function checkPoemRhyme(lines: string[], book: RhymeBook, strict: boolean): PrecheckIssue[] {
  if (lines.length < 2) return [];
  const required = lines.filter((_, index) => index % 2 === 1).map((line) => line.slice(-1));
  const first = lines[0]?.slice(-1);
  const firstCanRhyme = first && required.some((character) => compatibleRhyme(first, character, book));
  const issues: PrecheckIssue[] = [];

  for (let index = 1; index < required.length; index += 1) {
    if (!compatibleRhyme(required[0], required[index], book)) {
      issues.push({
        severity: 'error',
        area: '押韵',
        message: `第 ${index * 2 + 2} 句韵脚“${required[index]}”与前面韵脚“${required[0]}”不在同一韵部。`,
        line: index * 2 + 2,
      });
    }
  }
  if (strict && first && !firstCanRhyme) {
    issues.push({
      severity: 'warning',
      area: '押韵',
      message: `首句“${first}”没有与后续韵脚相押；若你采用首句不入韵的格式，这条可以忽略。`,
      line: 1,
    });
  }
  return issues;
}

function checkCiRhyme(
  lines: string[],
  positions: number[] | undefined,
  book: RhymeBook,
): PrecheckIssue[] {
  if (!positions?.length) return [];
  const chars = Array.from(lines.join(''));
  const issues: PrecheckIssue[] = [];
  const characters = positions
    .map((position) => chars[position])
    .filter((value): value is string => Boolean(value));
  if (characters.length < 2) return issues;
  for (let index = 1; index < characters.length; index += 1) {
    if (!compatibleRhyme(characters[0], characters[index], book)) {
      issues.push({
        severity: 'error',
        area: '押韵',
        message: `第 ${positions[index] + 1} 个字的韵脚“${characters[index]}”与前面的“${characters[0]}”不在同一韵部。`,
      });
    }
  }
  return issues;
}

function checkTone(
  lines: string[],
  form: CompositionForm,
): { issues: PrecheckIssue[]; checked: number; matched: number } {
  if (!form.tonePattern) return { issues: [], checked: 0, matched: 0 };
  const chars = Array.from(lines.join(''));
  const issues: PrecheckIssue[] = [];
  let checked = 0;
  let matched = 0;
  for (let index = 0; index < Math.min(chars.length, form.tonePattern.length); index += 1) {
    const expected = form.tonePattern[index];
    if (!['平', '仄', '中'].includes(expected)) continue;
    checked += 1;
    const actual = toneOf(chars[index]);
    if (toneMatches(actual, expected)) {
      matched += 1;
    } else {
      issues.push({
        severity: actual ? 'error' : 'warning',
        area: '平仄',
        message: `第 ${index + 1} 个字“${chars[index]}”应为${expected}，实际${actual ?? '未收录'}。`,
      });
    }
  }
  if (chars.length !== form.tonePattern.length) {
    issues.push({
      severity: 'error',
      area: '字数',
      message: `所选词牌常见格例为 ${form.tonePattern.length} 字，当前为 ${chars.length} 字。`,
    });
  }
  return { issues, checked, matched };
}

export function precheckComposition(text: string, form: CompositionForm): LocalPrecheck {
  const lines = splitCompositionLines(text);
  const allChars = lines.join('');
  const issues: PrecheckIssue[] = [];

  if (form.genre === '诗' && form.lineCount && lines.length !== form.lineCount) {
    issues.push({
      severity: 'error',
      area: '句数',
      message: `当前 ${lines.length} 句，${form.label} 常见格式为 ${form.lineCount} 句。`,
    });
  }
  if (form.charCount && allChars.length !== form.charCount) {
    issues.push({
      severity: 'error',
      area: '字数',
      message: `当前 ${allChars.length} 字，${form.label} 常见格式为 ${form.charCount} 字。`,
    });
  }
  if (form.genre === '诗' && form.lineLengths) {
    form.lineLengths.forEach((expected, index) => {
      const actual = lines[index]?.length;
      if (actual !== undefined && actual !== expected) {
        issues.push({
          severity: 'error',
          area: '字数',
          message: `第 ${index + 1} 句 ${actual} 字，预期 ${expected} 字。`,
          line: index + 1,
        });
      }
    });
  }

  const rhymeIssues = form.genre === '诗'
    ? checkPoemRhyme(lines, form.rhymeBook, true)
    : checkCiRhyme(lines, form.rhymePositions, form.rhymeBook);
  issues.push(...rhymeIssues);

  const tone = checkTone(lines, form);
  issues.push(...tone.issues);

  if (form.rhymeBook === '中原音韵') {
    issues.push({
      severity: 'warning',
      area: '资料',
      message: '当前基础版本地未内置完整《中原音韵》，曲牌韵部由 API 按所选曲谱继续严格复核。',
    });
  }

  return {
    formLabel: form.label,
    genre: form.genre,
    charCount: allChars.length,
    lineCount: lines.length,
    lineLengths: lines.map((line) => line.length),
    expectedCharCount: form.charCount,
    expectedLineCount: form.lineCount,
    expectedLineLengths: form.lineLengths,
    passed: !issues.some((issue) => issue.severity === 'error'),
    issues,
    toneChecked: tone.checked,
    toneMatched: tone.matched,
    rhymeChecked: rhymeIssues.length,
    rhymeMatched: Math.max(0, rhymeIssues.length - rhymeIssues.filter((issue) => issue.severity === 'error').length),
  };
}
