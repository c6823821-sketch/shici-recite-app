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
