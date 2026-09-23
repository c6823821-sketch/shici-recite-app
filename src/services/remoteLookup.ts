import { ApiSettings, Work } from '../types';

interface RemoteShape {
  found?: boolean;
  title?: string;
  author?: string;
  dynasty?: string;
  genre?: string;
  lines?: unknown;
  matched_line_index?: number;
  confidence?: string;
  note?: string;
}

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

function parse(text: string): RemoteShape {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)) as RemoteShape;
}

function normalize(value: string): string {
  return value.replace(/[\s，。！？；：、,.!?;:'"“”‘’《》〈〉()（）]/g, '');
}

export async function lookupRemoteWork(query: string, settings: ApiSettings): Promise<Work> {
  if (!settings.endpoint.trim() || !settings.model.trim()) throw new Error('请先到“我的 → API 设置”配置接口。');
  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      max_tokens: 2800,
      messages: [
        {
          role: 'system',
          content: '你是古籍检索助手。用户给你一句诗词或古文。若你能确定出处，只返回 JSON；不能确定就返回 {"found":false}。禁止编造。JSON 格式：{"found":true,"title":"篇名","author":"作者","dynasty":"朝代","genre":"诗|词|曲|文|典籍","lines":["原文按句分行"],"matched_line_index":0,"confidence":"high|medium|low","note":"简短说明"}。必须保证原文库包含用户给出的原句。',
        },
        { role: 'user', content: JSON.stringify({ query }) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`联网补录失败（${response.status}）`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('联网补录返回为空。');
  const parsed = parse(content);
  if (!parsed.found) throw new Error('API 无法确定这句的出处。');
  const lines = Array.isArray(parsed.lines)
    ? parsed.lines.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).map((line) => line.trim())
    : [];
  if (!parsed.title || !parsed.author || !lines.length) throw new Error('API 返回的篇目信息不完整。');
  const normalizedQuery = normalize(query);
  if (!lines.some((line) => normalize(line).includes(normalizedQuery))) {
    throw new Error('API 返回的原文不包含你搜索的原句，已拒绝写入。');
  }
  const matched = Number.isInteger(parsed.matched_line_index) ? Number(parsed.matched_line_index) : 0;
  return {
    id: `remote-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: parsed.title.trim(),
    author: parsed.author.trim(),
    dynasty: (parsed.dynasty || '待校订').trim(),
    genre: (parsed.genre || '诗').trim(),
    collections: ['API 补录', '待校对'],
    themes: ['补录'],
    moods: ['待校订'],
    intro: parsed.note || '通过 API 检索补录，待人工校订。',
    source: 'API 补录（待校对）',
    lines,
    translations: [],
    glossary: [],
    order: 50000 + Date.now() % 100000,
    imported: true,
  };
}
