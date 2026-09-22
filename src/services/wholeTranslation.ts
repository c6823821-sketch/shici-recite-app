import { ApiSettings, Work } from '../types';
import { explainWithApi } from './api';
import { getStoredValue, setStoredValue } from './settings';
import { loadCachedTranslation, saveCachedTranslation } from './translationCache';

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

async function translateChunk(settings: ApiSettings, work: Work, start: number, lines: string[]): Promise<string[]> {
  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      max_tokens: 2600,
      response_format: settings.endpoint.includes('deepseek') ? { type: 'json_object' } : undefined,
      messages: [
        {
          role: 'system',
          content: '你是古诗文翻译助手。把用户给出的每一句翻译成简洁白话，保持原句数量，不增删。只输出 JSON：{"translations":["第1句白话","第2句白话"]}。',
        },
        { role: 'user', content: JSON.stringify({ title: work.title, author: work.author, lines }, null, 2) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`全篇译文请求失败（${response.status}）`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('全篇译文返回为空。');
  const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)) as { translations?: unknown };
  const values = Array.isArray(parsed.translations) ? parsed.translations : [];
  return lines.map((_, index) => typeof values[index] === 'string' ? values[index] : '');
}

export async function loadWholeTranslation(settings: ApiSettings | null, work: Work, onProgress?: (progress: number) => void): Promise<string[]> {
  const cached = await getStoredValue(`work_translation_${work.id}`);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as string[];
      if (parsed.length === work.lines.length) return parsed;
    } catch { /* regenerate */ }
  }

  const result = work.translations.slice();
  const missing = result.map((value, index) => ({ index, value })).filter((item) => !item.value.trim());
  if (!missing.length) return result;
  if (!settings?.endpoint.trim() || !settings.model.trim()) return result;

  if (work.lines.length <= 24) {
    for (let index = 0; index < work.lines.length; index += 1) {
      if (result[index]?.trim()) continue;
      try {
        const single = await explainWithApi(settings, {
          work,
          lineIndex: index,
          selectionStart: 0,
          selectionEnd: Math.max(0, Array.from(work.lines[index]).length - 1),
        });
        result[index] = single.plainTranslation || single.literalTranslation || single.meaningInContext;
      } catch {
        // Keep empty; the UI shows a retryable error if every line fails.
      }
      onProgress?.((index + 1) / work.lines.length);
    }
    if (!result.some(Boolean)) throw new Error('全篇译文生成失败，请检查 API 设置后重试。');
    await setStoredValue(`work_translation_${work.id}`, JSON.stringify(result));
    await Promise.all(result.map((value, index) => value ? saveCachedTranslation(work.id, index, value) : Promise.resolve()));
    return result;
  }

  const chunkSize = 16;
  const chunks: Array<{ start: number; lines: string[] }> = [];
  for (let start = 0; start < work.lines.length; start += chunkSize) {
    chunks.push({ start, lines: work.lines.slice(start, start + chunkSize) });
  }
  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    try {
      const translated = await translateChunk(settings, work, chunk.start, chunk.lines);
      translated.forEach((value, offset) => { result[chunk.start + offset] = value || result[chunk.start + offset]; });
    } catch {
      // Batch JSON occasionally gets truncated. Fall back to one line at a time so a single
      // malformed batch does not poison the whole work.
      for (let offset = 0; offset < chunk.lines.length; offset += 1) {
        const lineIndex = chunk.start + offset;
        if (result[lineIndex]?.trim()) continue;
        try {
          const single = await explainWithApi(settings, {
            work,
            lineIndex,
            selectionStart: 0,
            selectionEnd: Math.max(0, Array.from(chunk.lines[offset]).length - 1),
          });
          result[lineIndex] = single.plainTranslation || single.literalTranslation || single.meaningInContext;
        } catch {
          // Leave this line empty; UI will show which lines still need checking.
        }
      }
    }
    onProgress?.((index + 1) / chunks.length);
  }
  if (!result.some(Boolean)) throw new Error('全篇译文生成失败，请检查 API 设置后重试。');
  await setStoredValue(`work_translation_${work.id}`, JSON.stringify(result));
  await Promise.all(result.map((value, index) => value ? saveCachedTranslation(work.id, index, value) : Promise.resolve()));
  return result;
}
