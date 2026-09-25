import { CompositionForm, CompositionGenre } from '../data/composition';
import { ApiSettings } from '../types';
import { getStoredValue, setStoredValue } from './settings';

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

function parseJson(text: string): Record<string, unknown> {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('词牌检索没有返回 JSON。');
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function integer(value: unknown): number {
  return Number.isInteger(value) ? Number(value) : Number(value) || 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function numberArray(value: unknown): number[] {
  return Array.isArray(value) ? value.map((item) => integer(item)).filter((item) => item >= 0) : [];
}

export async function lookupCompositionForm(settings: ApiSettings, genre: CompositionGenre, query: string): Promise<CompositionForm> {
  if (!settings.endpoint.trim() || !settings.model.trim()) throw new Error('请先配置 API。');
  const label = query.trim();
  if (!label) throw new Error('请先输入词牌名。');
  const cacheKey = `composition_form_${genre}_${label.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const cached = await getStoredValue(cacheKey);
  if (cached) {
    try { return JSON.parse(cached) as CompositionForm; } catch { /* ignore */ }
  }

  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      max_tokens: 2200,
      messages: [
        { role: 'system', content: '你是古典词谱整理助手。根据用户给出的词牌名，返回一个通行格例的 JSON。不得编造，若无法确定就返回 {"error":"无法确定"}。字段：{"label":"词牌名","charCount":0,"lineCount":0,"lineLengths":[0],"patternLines":["按句展示"],"tonePattern":"平仄中字符串","rhymePositions":[0],"rhymeBook":"词林正韵","hint":"说明","source":"来源说明"}。' },
        { role: 'user', content: JSON.stringify({ genre, tune: label }) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`词牌检索失败（${response.status}）`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('词牌检索返回为空。');
  const parsed = parseJson(content);
  if (parsed.error) throw new Error(String(parsed.error));
  const patternLines = stringArray(parsed.patternLines);
  const charCount = integer(parsed.charCount);
  const tonePattern = typeof parsed.tonePattern === 'string' ? parsed.tonePattern.trim() : '';
  if (!patternLines.length || charCount <= 0 || !tonePattern) throw new Error('返回的词牌格例不完整，已拒绝写入。');
  const form: CompositionForm = {
    id: `api-${genre}-${label}-${Date.now()}`,
    label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label.trim() : label,
    genre,
    charCount,
    lineCount: integer(parsed.lineCount) || patternLines.length,
    lineLengths: numberArray(parsed.lineLengths),
    rhymeBook: '词林正韵',
    patternLines,
    tonePattern,
    rhymePositions: numberArray(parsed.rhymePositions),
    hint: typeof parsed.hint === 'string' ? parsed.hint : '通过 API 补录的词牌格例，使用前请人工复核。',
    source: typeof parsed.source === 'string' ? parsed.source : 'API 补录，待校对',
  };
  await setStoredValue(cacheKey, JSON.stringify(form));
  return form;
}
