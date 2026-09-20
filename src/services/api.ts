import { ApiSettings, Explanation, ExplainRequest } from '../types';
import { getSelection } from './text';

interface ApiShape {
  selection?: string;
  pinyin?: string;
  part_of_speech?: string;
  meaning_in_context?: string;
  literal_translation?: string;
  plain_translation?: string;
  grammar?: string;
  notes?: unknown;
  evidence?: unknown;
  uncertainty?: string;
  confidence?: string;
}

const SYSTEM_PROMPT = `你是一位严谨的古诗文训诂与语文老师。你只解释用户选中的字、词或句在“给定诗句”中的含义，不能脱离上下文罗列词典义项。

必须遵守：
1. 先判断用户选中内容在当前句中的语法角色和具体意思。
2. 必须区分“此处意思”“本义或常见义”“整句翻译”“语法说明”。
3. 只有确定才写“高”；存在异说就写“中”并说明争议；无法确定就写“低”，不要猜。
4. 不要编造书名、篇名、古注或出处。没有明确证据时 evidence 返回空数组。
5. 不要把现代网络流行解释当成古汉语定论。
6. 只输出一个 JSON 对象，不要 Markdown 代码块，不要额外说明。

JSON 格式：
{
  "selection": "用户选中的文字",
  "pinyin": "拼音或空字符串",
  "part_of_speech": "词性或句法成分",
  "meaning_in_context": "在当前句中的意思",
  "literal_translation": "尽量贴近字面的翻译",
  "plain_translation": "通顺的白话翻译",
  "grammar": "相关的特殊句式或语法，没有则为空",
  "notes": ["容易误解的地方"],
  "evidence": ["只能写给定上下文中的证据，或留空"],
  "uncertainty": "存在争议或不确定之处，没有则为空",
  "confidence": "high | medium | low"
}`;

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function extractJson(text: string): ApiShape {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('API 没有返回可识别的 JSON。');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as ApiShape;
}

function normalizedEndpoint(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

export async function explainWithApi(
  settings: ApiSettings,
  request: ExplainRequest,
): Promise<Explanation> {
  if (!settings.endpoint.trim() || !settings.model.trim()) {
    throw new Error('请先在设置中填写 API 地址和模型名称。');
  }

  const line = request.work.lines[request.lineIndex];
  const selection = getSelection(line, request.selectionStart, request.selectionEnd);
  const previousLine = request.work.lines[request.lineIndex - 1] ?? '';
  const nextLine = request.work.lines[request.lineIndex + 1] ?? '';

  const context = {
    work: {
      title: request.work.title,
      author: request.work.author,
      dynasty: request.work.dynasty,
      genre: request.work.genre,
    },
    current_line_number: request.lineIndex + 1,
    previous_line: previousLine,
    current_line: line,
    next_line: nextLine,
    selection,
    scope: Array.from(selection).length <= 1 ? '字' : '词或句',
  };

  const response = await fetch(normalizedEndpoint(settings.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.15,
      max_tokens: 900,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: JSON.stringify(context, null, 2) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API 请求失败（${response.status}）：${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('API 返回内容为空。');

  const parsed = extractJson(content);
  const confidence = ['high', 'medium', 'low'].includes(parsed.confidence ?? '')
    ? (parsed.confidence as Explanation['confidence'])
    : 'unknown';

  return {
    selection: parsed.selection || selection,
    pinyin: parsed.pinyin || undefined,
    partOfSpeech: parsed.part_of_speech || undefined,
    meaningInContext: parsed.meaning_in_context || 'API 未返回当前语境释义。',
    literalTranslation: parsed.literal_translation || undefined,
    plainTranslation: parsed.plain_translation || undefined,
    grammar: parsed.grammar || undefined,
    notes: stringArray(parsed.notes),
    evidence: stringArray(parsed.evidence),
    uncertainty: parsed.uncertainty || undefined,
    confidence,
    source: 'api',
  };
}
