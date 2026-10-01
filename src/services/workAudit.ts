import { correctKnownImportedWork } from '../data/corrections';
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
  incomplete?: boolean;
}

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return value.replace(/\/+$/, '') + '/chat/completions';
}

const KNOWN_TUNE_NAMES = new Set([
  '\u91c7\u6851\u5b50', '\u4e11\u5974\u513f', '\u6dfb\u5b57\u4e11\u5974\u513f', '\u6d63\u6eaa\u6c99', '\u83e9\u8428\u9a6c',
  '\u8776\u604b\u82b1', '\u6c34\u8c03\u6b4c\u5934', '\u5ff5\u5974\u5a07', '\u6c81\u56ed\u6625', '\u6c5f\u57ce\u5b50', '\u865e\u7f8e\u4eba',
  '\u4e00\u526a\u6885', '\u4e00\u7ffa\u6885', '\u5fc6\u738b\u5b59',
]);

function localAuditIssues(work: Work): WorkAuditIssue[] {
  const issues: WorkAuditIssue[] = [];
  const lines = work.lines.map((line) => line.trim()).filter(Boolean);
  for (let index = 1; index < lines.length; index += 1) {
    if (work.genre !== '词' && lines[index] && lines[index] === lines[index - 1]) {
      issues.push({
        field: 'text', line: index + 1,
        problem: `\u7b2c ${index}\u3001${index + 1} \u53e5\u5b8c\u5168\u76f8\u540c\uff0c\u53ef\u80fd\u662f\u53e0\u53e5\uff0c\u4e5f\u53ef\u80fd\u662f\u5f55\u5165\u91cd\u590d\u3002`,
        suggestion: '\u8bf7\u6838\u5bf9\u901a\u884c\u672c\uff1b\u82e5\u8bcd\u724c\u8981\u6c42\u53e0\u53e5\u53ef\u4fdd\u7559\uff0c\u5426\u5219\u5220\u9664\u91cd\u590d\u53e5\u3002',
      });
    }
  }
  const content = lines.join('');
  if (work.incomplete) {
    issues.push({
      field: 'text',
      problem: '底本中含缺字或“下缺”标记，当前正文不是可确认的完整全文。',
      suggestion: '仅可作为残篇参考；补全前不要把它当作完整原文背诵。',
    });
  }
  const canonical = correctKnownImportedWork(work);
  if (canonical.title !== work.title) {
    issues.push({
      field: 'title',
      problem: '当前篇题与通行篇名不一致。',
      suggestion: `建议改为“${canonical.title}”。`,
    });
  }
  const titleParts = work.title.split(/[\u00b7\u30fb]/).map((part) => part.trim()).filter(Boolean);
  if (canonical.title === work.title && titleParts.length === 2 && KNOWN_TUNE_NAMES.has(titleParts[1]) && work.genre === '\u8bcd') {
    const firstLine = lines[0]?.replace(/[\s\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u3001,.!?;:]+$/g, '').slice(0, 12) ?? '';
    issues.push({
      field: 'title',
      problem: `\u7bc7\u9898\u7b2c\u4e8c\u90e8\u5206\u201c${titleParts[1]}\u201d\u662f\u8bcd\u724c\u540d\uff0c\u53ef\u80fd\u662f\u8bcd\u724c\u5f02\u540d\u6216\u6807\u9898\u6df7\u5165\u3002`,
      suggestion: firstLine ? `\u6838\u5bf9\u901a\u884c\u7bc7\u9898\uff0c\u53ef\u80fd\u5e94\u4f5c\u201c${titleParts[0]}\u00b7${firstLine}\u201d\u3002` : '\u8bf7\u6838\u5bf9\u901a\u884c\u7bc7\u9898\u3002',
    });
  }
  if (content.includes('\u7a97\u524d\u8c01\u79cd\u82ad\u8549\u6811') && content.includes('\u70b9\u6ef4\u9716\u973e') && work.title.includes('\u91c7\u6851\u5b50')) {
    issues.push({ field: 'title', problem: '\u901a\u884c\u7bc7\u9898\u901a\u5e38\u4f5c\u201c\u6dfb\u5b57\u4e11\u5974\u513f\u00b7\u7a97\u524d\u8c01\u79cd\u82ad\u8549\u6811\u201d\uff0c\u4e0d\u662f\u628a\u201c\u91c7\u6851\u5b50\u201d\u4f5c\u4e3a\u526f\u9898\u3002', suggestion: '\u5efa\u8bae\u6539\u4e3a\u201c\u6dfb\u5b57\u4e11\u5974\u513f\u00b7\u7a97\u524d\u8c01\u79cd\u82ad\u8549\u6811\u201d\u3002' });
  }
  return issues;
}

function parse(text: string): Record<string, unknown> {
  const cleaned = text.trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('校对 API 没有返回 JSON。');
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

export async function auditWork(settings: ApiSettings, work: Work): Promise<WorkAudit> {
  const plainText = work.lines.join('').replace(/\s/g, '');
  const localIssues = localAuditIssues(work);
  const longForm = work.genre === '文' || /表|序|赋|记|书|论|传|碑|铭|疏|策|诏|檄/.test(work.title);
  if (longForm && plainText.length < 240) {
    return {
      title: work.title,
      author: work.author,
      dynasty: work.dynasty,
      correct: false,
      incomplete: true,
      issues: [{
        field: 'text',
        problem: '当前正文只有 ' + plainText.length + ' 字，疑似摘录，不是完整长文。',
        suggestion: '点击“补全全文”，从已配置 API 重新取得完整篇目。',
      }],
      summary: '当前内容疑似不完整，不能判定为全文无错误。',
      confidence: 'high',
    };
  }
  if (!settings.endpoint.trim() || !settings.model.trim()) {
    if (localIssues.length) {
      return {
        title: work.title,
        author: work.author,
        dynasty: work.dynasty,
        correct: false,
        incomplete: work.incomplete,
        issues: localIssues,
        summary: '本地结构校对发现可疑问题，请配置 API 后再做通行本复核。',
        confidence: 'medium',
      };
    }
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
          content: '你是严格的中国古籍校勘助手。必须把篇名、作者、朝代、正文与通行本逐项比对。重复句可能是词牌叠句，不能直接判错，必须说明是否为叠句；如果是词牌异名、篇题拼接错误、作者张冠李戴、正文漏句或增句，必须写入 issues。禁止只凭结构回答无错误。只返回 JSON：{"title":"校对后的篇名或原篇名","author":"校对后的作者或原作者","dynasty":"朝代","correct":true,"issues":[{"field":"title|author|text","line":1,"problem":"具体差异","suggestion":"具体修改建议"}],"summary":"一句话","confidence":"high|medium|low"}。没有确定问题时 correct 必须为 true，issues 为空。',
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
  const apiIssues = Array.isArray(parsed.issues)
    ? parsed.issues.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((item) => ({
        field: ['title', 'author', 'text'].includes(String(item.field)) ? String(item.field) as WorkAuditIssue['field'] : 'text' as const,
        line: Number.isInteger(item.line) ? Number(item.line) : undefined,
        problem: String(item.problem ?? '未说明问题'),
        suggestion: typeof item.suggestion === 'string' ? item.suggestion : undefined,
      }))
    : [];
  const issues = [...localIssues, ...apiIssues];
  return {
    title: String(parsed.title ?? work.title),
    author: String(parsed.author ?? work.author),
    dynasty: typeof parsed.dynasty === 'string' ? parsed.dynasty : work.dynasty,
    correct: parsed.correct === true && issues.length === 0,
    incomplete: work.incomplete === true,
    issues,
    summary: issues.length ? (String(parsed.summary ?? '').trim() || '发现可疑问题。') : String(parsed.summary ?? '校对完成。'),
    confidence: issues.length ? 'medium' : (['high', 'medium', 'low'].includes(String(parsed.confidence)) ? String(parsed.confidence) as WorkAudit['confidence'] : 'low'),
  };
}
