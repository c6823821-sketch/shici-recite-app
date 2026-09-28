export interface SemanticUnit {
  index: number;
  text: string;
  lineStart: number;
  lineEnd: number;
  charStart: number;
  charEnd: number;
  label: string;
}

const SENTENCE_END = /[???]/;
const SOFT_END = /[???]/;

function clean(value: string): string {
  return value.replace(/\s+/g, '').trim();
}

export function splitSemanticText(value: string, target = 96, max = 160): string[] {
  const text = clean(value);
  if (!text) return [];

  const chars = Array.from(text);
  const result: string[] = [];
  let current = '';

  const flush = () => {
    const part = current.trim();
    if (part) result.push(part);
    current = '';
  };

  chars.forEach((char, index) => {
    current += char;
    const next = chars[index + 1];
    const sentenceEnded = SENTENCE_END.test(char) && next !== '?' && next !== '?';
    if (sentenceEnded && current.length >= target) {
      flush();
      return;
    }
    if (current.length < max) return;
    let cutAt = -1;
    for (let cursor = current.length - 1; cursor >= Math.floor(target * 0.7); cursor -= 1) {
      if (SENTENCE_END.test(current[cursor])) {
        cutAt = cursor;
        break;
      }
    }
    if (cutAt < 0) {
      for (let cursor = current.length - 1; cursor >= Math.floor(target * 0.7); cursor -= 1) {
        if (SOFT_END.test(current[cursor])) {
          cutAt = cursor;
          break;
        }
      }
    }
    const fallbackEnd = current.endsWith('?') ? current.length - 1 : current.length;
    const end = cutAt >= 0 ? cutAt + 1 : fallbackEnd;
    const part = current.slice(0, end).trim();
    if (part) result.push(part);
    current = current.slice(end);
  });

  flush();
  return result
    .map((part) => (part.endsWith('?') ? part.slice(0, -1) : part))
    .filter(Boolean);
}

export function buildTextUnits(value: string, target = 96, max = 160): SemanticUnit[] {
  const parts = splitSemanticText(value, target, max);
  let offset = 0;
  return parts.map((text, index) => {
    const charStart = offset;
    const charEnd = offset + Array.from(text).length - 1;
    offset += Array.from(text).length;
    return { index, text, lineStart: index, lineEnd: index, charStart, charEnd, label: `?${index + 1}?` };
  });
}

export function buildLineUnits(lines: string[], target = 96, max = 160): SemanticUnit[] {
  if (!lines.length) return [];
  const offsets: number[] = [];
  let offset = 0;
  lines.forEach((line) => {
    offsets.push(offset);
    offset += Array.from(line).length;
  });

  const units: SemanticUnit[] = [];
  let start = 0;
  let charCount = 0;

  const flush = (endLine: number) => {
    const text = lines.slice(start, endLine + 1).join('');
    if (!text.trim()) return;
    const charStart = offsets[start] ?? 0;
    const charEnd = (offsets[endLine] ?? charStart) + Math.max(0, Array.from(lines[endLine] ?? '').length - 1);
    units.push({
      index: units.length,
      text,
      lineStart: start,
      lineEnd: endLine,
      charStart,
      charEnd,
      label: `?${units.length + 1}?`,
    });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const lineChars = Array.from(line).length;
    const previousEnded = index > start && SENTENCE_END.test(lines[index - 1]?.trim().slice(-1) ?? '');
    if (charCount > 0 && (charCount + lineChars > max || (charCount >= target && previousEnded))) {
      flush(index - 1);
      start = index;
      charCount = 0;
    }
    charCount += lineChars;
  }
  flush(lines.length - 1);
  return units;
}

export function isLongText(lines: string[], minChars = 240, minLines = 12): boolean {
  const chars = lines.reduce((total, line) => total + Array.from(line).length, 0);
  return chars >= minChars || lines.length >= minLines;
}

export function unitContainingLine(units: SemanticUnit[], lineIndex: number): number {
  const found = units.findIndex((unit) => lineIndex >= unit.lineStart && lineIndex <= unit.lineEnd);
  return found >= 0 ? found : 0;
}
