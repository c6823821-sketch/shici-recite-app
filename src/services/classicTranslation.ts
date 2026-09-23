import { ApiSettings } from '../types';
import { getStoredValue, setStoredValue } from './settings';

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

function chunks(text: string): string[] {
  const paragraphs = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const result: string[] = [];
  let current = '';
  for (const paragraph of paragraphs) {
    const pieces = paragraph.length > 700
      ? paragraph.match(/[^。！？；]+[。！？；]?/g) ?? [paragraph]
      : [paragraph];
    for (const piece of pieces) {
      if ((current + piece).length > 700 && current) {
        result.push(current);
        current = piece;
      } else {
        current += piece;
      }
    }
  }
  if (current) result.push(current);
  return result.length ? result : [text];
}

export async function translateClassicSection(
  settings: ApiSettings | null,
  cacheKey: string,
  title: string,
  text: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const cached = await getStoredValue(`classic_translation_${cacheKey}`);
  if (cached?.trim()) return cached;
  if (!settings?.endpoint.trim() || !settings.model.trim()) {
    throw new Error('还没有配置 API。请到“我的 → API 设置”配置后再翻译。');
  }

  const parts = chunks(text);
  const output: string[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    const response = await fetch(endpointUrl(settings.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify({
        model: settings.model,
        temperature: 0.1,
        max_tokens: 1800,
        messages: [
          { role: 'system', content: '你是古文翻译助手。把用户给的古文翻译成准确、简洁的现代白话，不要解释，不要加标题，只输出译文。' },
          { role: 'user', content: JSON.stringify({ title, text: parts[index] }) },
        ],
      }),
    });
    if (!response.ok) throw new Error(`典籍翻译请求失败（${response.status}）`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const value = payload.choices?.[0]?.message?.content?.trim();
    if (!value) throw new Error('典籍翻译返回为空。');
    output.push(value.replace(/^```(?:text)?/i, '').replace(/```$/i, '').trim());
    onProgress?.((index + 1) / parts.length);
  }
  const result = output.join('\n\n');
  await setStoredValue(`classic_translation_${cacheKey}`, result);
  return result;
}
