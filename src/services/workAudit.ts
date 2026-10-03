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
  verification: 'local-only' | 'canonical-diff';
  canonicalCompared: boolean;
  canonical?: CanonicalWork;
}

interface CanonicalWork {
  title: string;
  author: string;
  dynasty?: string;
  genre?: string;
  lines: string[];
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

function compareText(value: string): string {
  return value
    .replace(/\s+/g, '')
    .replace(/[，。！？；：、,.!?;:'"“”‘’《》〈〉()（）·・—\-]/g, '')
    .replace(/[唯惟]/g, '惟')
    .trim();
}

function localAuditIssues(work: Work): WorkAuditIssue[] {
  const issues: WorkAuditIssue[] = [];
  const lines = work.lines.map((line) => line.trim()).filter(Boolean);
  for (let index = 1; index < lines.length; index += 1) {
    if (work.genre !== '词' && lines[index] && lines[index] === lines[index - 1]) {
      issues.push({
        field: 'text', line: index + 1,
        problem: `第 ${index}、${index + 1} 句完全相同，可能是叠句，也可能是录入重复。`,
        suggestion: '请核对通行本；若作者或词牌明确不需要重复，应删除重复句。',
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
  const known = correctKnownImportedWork(work);
  if (known.title !== work.title) {
    issues.push({
      field: 'title',
      problem: '当前篇题与已知通行篇名不一致。',
      suggestion: `建议改为“${known.title}”。`,
    });
  }
  if (known.author !== work.author) {
    issues.push({
      field: 'author',
      problem: `当前作者“${work.author}”与通行资料“${known.author}”不一致。`,
      suggestion: `建议改为“${known.author}”。`,
    });
  }
  const titleParts = work.title.split(/[\u00b7\u30fb]/).map((part) => part.trim()).filter(Boolean);
  if (work.titleFromFirstLine && titleParts.length === 2 && !content.includes(titleParts[1])) {
    issues.push({
      field: 'text',
      problem: `篇题副题“${titleParts[1]}”应由正文首句提供，但当前正文中找不到这句，疑似开头漏句。`,
      suggestion: '请补回缺失的首句或与完整底本核对。',
    });
  }
  if (known.title === work.title && titleParts.length === 2 && KNOWN_TUNE_NAMES.has(titleParts[1]) && work.genre === '\u8bcd') {
    const firstLine = lines[0]?.replace(/[\s\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u3001,.!?;:]+$/g, '').slice(0, 12) ?? '';
    issues.push({
      field: 'title',
      problem: `篇题第二部分“${titleParts[1]}”是词牌名，可能是词牌异名或标题混入。`,
      suggestion: firstLine ? `核对通行篇题，可能应作“${titleParts[0]}·${firstLine}”。` : '请核对通行篇题。',
    });
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

function parseCanonical(parsed: Record<string, unknown>): CanonicalWork | null {
  const value = parsed.canonical;
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const lines = Array.isArray(record.lines)
    ? record.lines.filter((line): line is string => typeof line === 'string' && line.trim().length > 0).map((line) => line.trim())
    : [];
  if (typeof record.title !== 'string' || typeof record.author !== 'string' || lines.length === 0) return null;
  return {
    title: record.title.trim(),
    author: record.author.trim(),
    dynasty: typeof record.dynasty === 'string' ? record.dynasty.trim() : undefined,
    genre: typeof record.genre === 'string' ? record.genre.trim() : undefined,
    lines,
  };
}

function lcsLengths(left: string[], right: string[]): number[][] {
  const table = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      table[i][j] = left[i] === right[j]
        ? table[i + 1][j + 1] + 1
        : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

function canonicalDiffIssues(work: Work, canonical: CanonicalWork): WorkAuditIssue[] {
  const issues: WorkAuditIssue[] = [];
  const titleAliases = [work.title, ...(work.aliases ?? [])].map(compareText);
  if (!titleAliases.includes(compareText(canonical.title))) {
    issues.push({
      field: 'title',
      problem: `通行本返回的篇名为“${canonical.title}”，与当前篇名及已知别名均不一致。`,
      suggestion: `建议改为“${canonical.title}”。`,
    });
  }
  if (compareText(canonical.author) !== compareText(work.author)) {
    issues.push({
      field: 'author',
      problem: `通行本作者为“${canonical.author}”，当前为“${work.author}”。`,
      suggestion: `建议改为“${canonical.author}”。`,
    });
  }

  const actual = work.lines.map(compareText).filter(Boolean);
  const expected = canonical.lines.map(compareText).filter(Boolean);
  if (actual.join('') === expected.join('')) return issues;

  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  if (actual.length === expected.length && sortedActual.join('\n') === sortedExpected.join('\n')) {
    issues.push({
      field: 'text',
      problem: '正文句子集合正确，但句序与通行本不一致。',
      suggestion: '请按通行本重新排列句子顺序。',
    });
    return issues;
  }

  const table = lcsLengths(actual, expected);
  let i = 0;
  let j = 0;
  let issueCount = 0;
  while ((i < actual.length || j < expected.length) && issueCount < 20) {
    if (i < actual.length && j < expected.length && actual[i] === expected[j]) {
      i += 1;
      j += 1;
      continue;
    }
    if (j < expected.length && (i >= actual.length || table[i][j + 1] >= table[i + 1][j])) {
      issues.push({
        field: 'text',
        line: j + 1,
        problem: `通行本第 ${j + 1} 句为“${canonical.lines[j] ?? expected[j]}”，当前正文缺失或位置不对。`,
        suggestion: '请补回该句并核对句序。',
      });
      j += 1;
      issueCount += 1;
      continue;
    }
    if (i < actual.length) {
      issues.push({
        field: 'text',
        line: i + 1,
        problem: `当前正文第 ${i + 1} 句“${work.lines[i] ?? actual[i]}”不在通行本对应位置。`,
        suggestion: '请核对是否写错、增句或顺序颠倒。',
      });
      i += 1;
      issueCount += 1;
    }
  }
  if (issues.length === 0) {
    issues.push({
      field: 'text',
      problem: '当前正文与通行本逐句比对不一致。',
      suggestion: '请按通行本重新核对正文。',
    });
  }
  return issues;
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
      verification: 'local-only',
      canonicalCompared: false,
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
        summary: '本地规则发现可疑问题；配置 API 后才能拿通行本逐句复核。',
        confidence: 'medium',
        verification: 'local-only',
        canonicalCompared: false,
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
      max_tokens: 8000,
      response_format: settings.endpoint.includes('deepseek') ? { type: 'json_object' } : undefined,
      messages: [
        {
          role: 'system',
          content: '你是严格的中国古籍校勘助手。不要只回答“有没有错”，必须返回一篇你认为可核验的通行本完整原文，由客户端逐句比对。只返回 JSON：{"canonical":{"title":"通行本篇名","author":"通行本作者","dynasty":"朝代","lines":["完整原文按句逐行"]},"issues":[{"field":"title|author|text","line":1,"problem":"具体差异","suggestion":"具体修改建议"}],"summary":"一句话","confidence":"high|medium|low"}。canonical.lines 必须是完整正文，禁止只返回用户给出的句子或摘录；若无法确定完整通行本，返回 canonical 为空并明确说明，禁止假装完整。issues 只作辅助，客户端会以 canonical 与当前正文的逐句差异为准。',
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
  const canonical = parseCanonical(parsed);
  const apiIssues = Array.isArray(parsed.issues)
    ? parsed.issues.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object').map((item) => ({
        field: ['title', 'author', 'text'].includes(String(item.field)) ? String(item.field) as WorkAuditIssue['field'] : 'text' as const,
        line: Number.isInteger(item.line) ? Number(item.line) : undefined,
        problem: String(item.problem ?? '未说明问题'),
        suggestion: typeof item.suggestion === 'string' ? item.suggestion : undefined,
      }))
    : [];
  const canonicalIssues = canonical ? canonicalDiffIssues(work, canonical) : [];
  const issues = canonical
    ? [...localIssues, ...canonicalIssues]
    : [...localIssues, ...apiIssues];
  const canonicalCompared = canonical !== null;
  const summary = canonicalCompared
    ? issues.length
      ? '已完成通行本逐句比对，发现以下差异。'
      : '当前篇名、作者和正文已与 API 返回的通行本逐句比对一致。'
    : issues.length
      ? '没有获得可逐句核对的完整通行本，仅显示规则和 API 提示。'
      : 'API 没有返回可逐句核对的完整通行本，无法判定全文正确。';

  return {
    title: canonical?.title ?? String(parsed.title ?? work.title),
    author: canonical?.author ?? String(parsed.author ?? work.author),
    dynasty: canonical?.dynasty ?? (typeof parsed.dynasty === 'string' ? parsed.dynasty : work.dynasty),
    correct: canonicalCompared && issues.length === 0,
    incomplete: work.incomplete === true,
    issues,
    summary,
    confidence: canonicalCompared ? 'high' : 'low',
    verification: canonicalCompared ? 'canonical-diff' : 'local-only',
    canonicalCompared,
    canonical: canonical ?? undefined,
  };
}
