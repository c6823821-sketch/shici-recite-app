import { CompositionForm } from '../data/composition';
import { LocalPrecheck } from './prosody';
import { ApiSettings } from '../types';

export interface ScoreIssue {
  severity: 'critical' | 'major' | 'minor' | 'uncertain';
  category: string;
  line?: number;
  quote?: string;
  problem: string;
  suggestion: string;
}

export interface CompositionScore {
  overallScore: number;
  level: string;
  verdict: string;
  summary: string;
  categoryScores: Record<string, number>;
  issues: ScoreIssue[];
  strengths: string[];
  revisionPlan: string[];
  confidence: 'high' | 'medium' | 'low';
}

const CATEGORY_LABELS: Record<string, string> = {
  rules: '格律合规',
  rhyme: '押韵',
  tone: '平仄',
  structure: '句法结构',
  parallelism: '对仗',
  language: '语言',
  imagery: '意象',
  coherence: '章法连贯',
  originality: '创造性',
};

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
  if (start < 0 || end <= start) throw new Error('评分 API 没有返回 JSON。');
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function clampScore(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function normalizeIssues(value: unknown): ScoreIssue[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      severity: ['critical', 'major', 'minor', 'uncertain'].includes(String(item.severity))
        ? (String(item.severity) as ScoreIssue['severity'])
        : 'uncertain',
      category: String(item.category ?? '未分类'),
      line: Number.isInteger(item.line) ? Number(item.line) : undefined,
      quote: typeof item.quote === 'string' ? item.quote : undefined,
      problem: String(item.problem ?? '未说明问题'),
      suggestion: String(item.suggestion ?? '未给出修改建议'),
    }));
}

export async function scoreComposition(
  settings: ApiSettings,
  form: CompositionForm,
  text: string,
  precheck: LocalPrecheck,
): Promise<CompositionScore> {
  if (!settings.endpoint.trim() || !settings.model.trim()) {
    throw new Error('请先在设置中填写 API 地址和模型名称。');
  }

  const systemPrompt = `你是极其严格的古典诗词格律审校员，不是夸夸群。你的任务是找出格律、押韵、句式、语言和章法问题，并给出可执行的修改意见。

绝对规则：
1. 不得恭维用户，不得为了照顾情绪提高分数，不得只说“意境优美”“很有天赋”等空话。
2. 先判硬性规则，再判语言与意境。硬性规则有错时，总分必须显著扣分。
3. 近体诗重点检查：句数、字数、平仄、押韵、粘对、孤平、三平尾、对仗和重字。
4. 词重点检查：词牌、字数、句读、平仄、韵位、换韵、叶韵、对仗和领字。
5. 曲重点检查：曲牌、宫调、字数、句读、衬字、韵脚、平仄和曲谱版本。曲牌存在不同版本时，必须明确采用哪一版，不能把不确定写成确定。
6. 现代普通话读音只能辅助，判断古韵时必须使用用户选择的韵书。
7. 每一条优点必须有文本证据；每一条问题必须指出具体位置和修改方向。
8. 不确定就写 uncertain，不能编造词谱规则或古人评价。
9. 本地预检已经发现硬性错误时，总分不得超过 79。

评分档位：
- 90-100：格律基本无误，语言和章法都达到较高水平。
- 80-89：硬性规则基本合格，仍有可明确指出的修改空间。
- 70-79：有明显格律、押韵或结构问题，不视为合格定稿。
- 60-69：多处硬伤，需要重写局部。
- 0-59：核心规则不成立或整体结构失败。

只输出 JSON：
{
  "overall_score": 0,
  "level": "优秀 | 合格偏上 | 仍需修改 | 不合格",
  "verdict": "一句直接、严格的结论",
  "summary": "总体评价，必须具体",
  "category_scores": {
    "rules": 0,
    "rhyme": 0,
    "tone": 0,
    "structure": 0,
    "parallelism": 0,
    "language": 0,
    "imagery": 0,
    "coherence": 0,
    "originality": 0
  },
  "issues": [
    {
      "severity": "critical | major | minor | uncertain",
      "category": "格律 | 押韵 | 平仄 | 句式 | 语言 | 意象 | 章法 | 其他",
      "line": 1,
      "quote": "原文片段",
      "problem": "具体问题",
      "suggestion": "具体修改方向"
    }
  ],
  "strengths": ["有明确文本证据的优点"],
  "revision_plan": ["按优先级排列的修改步骤"],
  "confidence": "high | medium | low"
}`;

  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      max_tokens: 1800,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify(
            {
              genre: form.genre,
              form: form.label,
              rhyme_book: form.rhymeBook,
              requested_rules: form.hint,
              reference_pattern: {
                char_count: form.charCount,
                line_count: form.lineCount,
                line_lengths: form.lineLengths,
                ci_pattern: form.patternLines,
                tone_pattern: form.tonePattern,
                rhyme_positions: form.rhymePositions,
                source: form.source,
              },
              local_precheck: precheck,
              submitted_text: text,
            },
            null,
            2,
          ),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`评分 API 请求失败（${response.status}）：${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('评分 API 返回内容为空。');
  const parsed = parseJson(content);
  const rawCategories = (parsed.category_scores ?? {}) as Record<string, unknown>;
  const categoryScores = Object.fromEntries(
    Object.entries(CATEGORY_LABELS).map(([key]) => [key, clampScore(rawCategories[key])]),
  );

  return {
    overallScore: clampScore(parsed.overall_score),
    level: String(parsed.level ?? '仍需修改'),
    verdict: String(parsed.verdict ?? '结果缺少结论。'),
    summary: String(parsed.summary ?? '结果缺少总体评价。'),
    categoryScores,
    issues: normalizeIssues(parsed.issues),
    strengths: stringArray(parsed.strengths),
    revisionPlan: stringArray(parsed.revision_plan),
    confidence: ['high', 'medium', 'low'].includes(String(parsed.confidence))
      ? (String(parsed.confidence) as CompositionScore['confidence'])
      : 'low',
  };
}

export { CATEGORY_LABELS };
