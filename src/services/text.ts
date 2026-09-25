export function toChars(line: string): string[] {
  return Array.from(line);
}

export function getSelection(line: string, start: number, end: number): string {
  const chars = toChars(line);
  const safeStart = Math.max(0, Math.min(start, chars.length - 1));
  const safeEnd = Math.max(safeStart, Math.min(end, chars.length - 1));
  return chars.slice(safeStart, safeEnd + 1).join('');
}

export function isWholeLine(line: string, start: number, end: number): boolean {
  const chars = toChars(line);
  return start <= 0 && end >= chars.length - 1;
}
export function sentenceAroundLine(lines: string[], index: number): { start: number; end: number; text: string } {
  if (!lines.length) return { start: 0, end: 0, text: '' };
  const safeIndex = Math.max(0, Math.min(index, lines.length - 1));
  const terminal = /[???!?]$/;
  let start = safeIndex;
  let end = safeIndex;
  while (start > 0 && !terminal.test(lines[start - 1].trim())) start -= 1;
  while (end < lines.length - 1 && !terminal.test(lines[end].trim())) end += 1;
  return { start, end, text: lines.slice(start, end + 1).join('').trim() };
}
