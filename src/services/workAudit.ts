import { ApiSettings, Work } from '../types';

export interface WorkAuditIssue {
  field: 'title' | 'author' | 'text';
  line?: number;
  problem: string;
  suggestion?: string;
}

export interface WorkAudit {
  title: string;
  author: string;
  dynasty?: string;
  correct: boolean;
  issues: WorkAuditIssue[];
  summary: string;
  confidence: 'high' | 'medium' | 'low';
}

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return value.replace(/\/+$/, '') + '/chat/completions';
}

function parse(text: string): Record<string, unknown> {
  const cleaned = text.trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('校对 API 没有返回 JSON。');
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

export async function auditWork(settings: ApiSettings, work: Work): Promise<WorkAudit> {
  if (!settings.endpoint.trim() || !settings.model.trim()) {
    throw new Error('请先在“我的 → API 设置”配置接口。');
  }
  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + settings.apiKey },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0,
      max_tokens: 2200,
      response_format: settings.endpoint.includes('deepseek') ? { type: 'json_object' } : undefined,
      messages: [
        {
          role: 'system',
          content: '你是严格的中国古籍校勘助手。只检查用户给出的篇名、作者、朝代和正文是否存在确定错误。禁止凭记忆臆断，禁止改写原文。只返回 JSON：{"title":"校对后的篇名或原篇名","author":"校对后的作者或原作者","dynasty":"朝代","correct":true,"issues":[{"field":"title|author|text","line":1,"problem":"问题","suggestion":"建议"}],"summary":"一句话","confidence":"high|medium|low"}。没有确定问题时 correct 必须为 true，issues 为空。',
        },
        {
          role: 'user',
          content: JSON.stringify({ title: work.title, author: work.author, dynasty: work.dynasty, genre: work.genre, lines: work.lines }, null, 2),
        },
      ],
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error('校对 API 请求失败（' + response.status + '）：' + body.slice(0, 160));
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('校对 API 返回内容为空。');
  const parsed = parse(content);
  const issues = Array.isArray(parsed.issues)
    ? parsed.issues.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((item) => ({
        field: ['title', 'author', 'text'].includes(String(item.field)) ? String(item.field) as WorkAuditIssue['field'] : 'text' as const,
        line: Number.isInteger(item.line) ? Number(item.line) : undefined,
        problem: String(item.problem ?? '未说明问题'),
        suggestion: typeof item.suggestion === 'string' ? item.suggestion : undefined,
      }))
    : [];
  return {
    title: String(parsed.title ?? work.title),
    author: String(parsed.author ?? work.author),
    dynasty: typeof parsed.dynasty === 'string' ? parsed.dynasty : work.dynasty,
    correct: parsed.correct === true && issues.length === 0,
    issues,
    summary: String(parsed.summary ?? '校对完成。'),
    confidence: ['high', 'medium', 'low'].includes(String(parsed.confidence))
      ? String(parsed.confidence) as WorkAudit['confidence']
      : 'low',
  };
}
