import { ApiSettings, Work } from '../types';
import { correctKnownImportedWork, markIncompleteWork } from '../data/corrections';

interface RemoteShape {
  found?: boolean;
  title?: string;
  author?: string;
  dynasty?: string;
  genre?: string;
  lines?: unknown;
  matched_line_index?: number;
  matched_query?: string;
  aliases?: unknown;
  confidence?: string;
  note?: string;
  text_scope?: string;
  full_text?: boolean;
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
  return value
    .replace(/[\s\u3000\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u3001,.!?;:'\"\u201c\u201d\u2018\u2019\u300a\u300b\u3008\u3009()\uff08\uff09]/g, '')
    .replace(/\u6545\u4eba\u4eca\u4e0d\u5728/g, '\u6545\u4eba\u4eca\u5728\u5426')
    .replace(/\u585e\u6c99/g, '\u5bd2\u6c99')
    .replace(/\u7cfb\u821f/g, '\u7cfb\u8239')
    .replace(/[\u552f\u60df]/g, '\u60df');
}

export async function lookupRemoteWork(query: string, settings: ApiSettings): Promise<Work> {
  if (!settings.endpoint.trim() || !settings.model.trim()) throw new Error('请先到“我的 → API 设置”配置接口。');
  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      max_tokens: 8000,
      messages: [
        {
          role: 'system',
          content: '你是古籍检索助手。用户给你一句诗词、古文，或者“词牌·别名”、旧题、省略了“添字/减字/偷声/促拍/摊破/转调/添声”等前缀的篇名。若输入是别名或旧题且能唯一确定通行篇目，必须返回该篇规范篇名和完整原文，不得因为篇名不是逐字相同就返回 found:false；不能唯一确定时才返回 {"found":false}。禁止编造。JSON 格式：{"found":true,"title":"规范篇名","author":"作者","dynasty":"朝代","genre":"诗|词|曲|文|典籍","lines":["原文按句分行"],"matched_line_index":0,"matched_query":"原样返回用户输入","aliases":["识别到的等价题名"],"confidence":"high|medium|low","note":"简短说明"}。必须保证原文库包含用户给出的原句或可唯一对应的别名。若用户给的是篇名或别名，必须返回该篇完整原文；若给的是名句，必须返回该句所属篇目的完整原文。不能只返回搜索句或摘录。JSON 必须额外包含 "text_scope":"full" 和 "full_text":true。',
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
  const normalizedTitle = normalize(parsed.title);
  const queryMatchesTitle = normalizedTitle.includes(normalizedQuery)
    || normalizedQuery.includes(normalizedTitle)
    || (normalizedTitle.length >= 2 && normalizedQuery.length >= 2
      && (normalizedTitle.startsWith(normalizedQuery) || normalizedQuery.startsWith(normalizedTitle)));
  const aliasValues = [
    typeof parsed.matched_query === 'string' ? parsed.matched_query : '',
    ...(Array.isArray(parsed.aliases) ? parsed.aliases.filter((item): item is string => typeof item === 'string') : []),
  ].map(normalize).filter(Boolean);
  const queryMatchesAlias = aliasValues.some((alias) => alias.includes(normalizedQuery) || normalizedQuery.includes(alias));
  const queryMatchesLine = lines.some((line) => normalize(line).includes(normalizedQuery));
  if (!queryMatchesTitle && !queryMatchesAlias && !queryMatchesLine) {
    throw new Error('API 返回的原文不包含你搜索的原句、篇名或可验证别名，已拒绝写入。');
  }
  const fullText = parsed.text_scope === 'full' || parsed.full_text === true || lines.length >= 2;
  if (!fullText) {
    throw new Error('API 只返回了摘句，没有返回所属篇目的完整原文，已拒绝写入。');
  }
  const matched = Number.isInteger(parsed.matched_line_index) ? Number(parsed.matched_line_index) : 0;
  const work: Work = {
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
    aliases: aliasValues.length ? aliasValues : undefined,
    translations: [],
    glossary: [],
    order: 50000 + Date.now() % 100000,
    imported: true,
  };
  return markIncompleteWork(correctKnownImportedWork(work));
}
