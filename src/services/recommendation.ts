import { ApiSettings, DailyRecommendation, Work } from '../types';
import { WORKS } from '../data/works';

interface RecommendationResponse {
  work_id?: string;
  title?: string;
  line_index?: number;
  quote?: string;
  reason?: string;
  mood_tags?: unknown;
  confidence?: string;
}

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

function parseJson(text: string): RecommendationResponse {
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('荐诗 API 没有返回 JSON。');
  return JSON.parse(cleaned.slice(start, end + 1)) as RecommendationResponse;
}

function tags(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}


const INTENT_KEYWORDS: Record<string, string[]> = {
  离别: ['离别', '再见', '分别', '分手', '送别', '车站', '毕业', '离开', '舍不得'],
  送别: ['送人', '送朋友', '送客', '远行', '出发', '车站'],
  思乡: ['想家', '故乡', '家乡', '回家', '漂泊', '在外'],
  相思: ['喜欢', '想念', '暗恋', '思念', '牵挂', '喜欢的人'],
  悼亡: ['去世', '离世', '亡故', '纪念', '想念故人', '失去'],
  友情: ['朋友', '兄弟', '知己', '同学', '聚会'],
  亲情: ['家人', '父母', '妈妈', '爸爸', '亲人', '回家'],
  相聚: ['聚会', '重逢', '见面', '一起吃饭', '相聚'],
  月亮: ['月亮', '月光', '夜里', '深夜', '月圆'],
  中秋: ['中秋', '团圆', '月饼'],
  爱情: ['爱情', '恋人', '表白', '心动', '结婚'],
  边塞: ['边疆', '塞外', '军营', '出征'],
  战争: ['战争', '打仗', '战场', '将军'],
  爱国: ['国家', '祖国', '报国', '山河'],
  怀古: ['历史', '古人', '兴亡', '古都', '朝代'],
  山水: ['旅行', '登山', '山水', '风景', '湖边', '江边'],
  田园: ['乡下', '乡村', '田园', '田地', '农活'],
  秋: ['秋天', '秋日', '落叶', '西风'],
  春: ['春天', '春日', '花开', '新绿'],
  隐逸: ['安静', '独处', '躺平', '休息', '不想上班', '不想社交'],
  励志: ['坚持', '努力', '考试', '奋斗', '加油', '希望'],
  悲愤: ['愤怒', '委屈', '不公平', '生气', '压抑'],
};

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseCandidates(userText: string, catalog: Work[]): Work[] {
  const intentTags = Object.entries(INTENT_KEYWORDS)
    .filter(([, keywords]) => keywords.some((keyword) => userText.includes(keyword)))
    .map(([tag]) => tag);
  const scored = catalog
    .map((work) => {
      const themeHits = intentTags.filter((tag) => work.themes.includes(tag) || work.moods.includes(tag)).length;
      const textHits = intentTags.filter((tag) =>
        INTENT_KEYWORDS[tag].some((keyword) => work.lines.some((line) => line.includes(keyword))),
      ).length;
      return { work, score: themeHits * 3 + textHits };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score);

  const result = scored.slice(0, 80).map((item) => item.work);
  if (result.length < 40) {
    const start = hashText(userText) % Math.max(1, catalog.length);
    for (let index = 0; result.length < 80 && index < catalog.length; index += 1) {
      const candidate = catalog[(start + index * 97) % catalog.length];
      if (candidate && !result.some((work) => work.id === candidate.id)) result.push(candidate);
    }
  }
  return result;
}

function resolveRecommendation(
  raw: RecommendationResponse,
  catalog: Work[],
): DailyRecommendation {
  const byId = catalog.find((work) => work.id === raw.work_id);
  const title = (raw.title ?? '').trim();
  const byTitle = title
    ? catalog.find((work) => work.title === title || work.title.includes(title) || title.includes(work.title))
    : undefined;
  const work = byId ?? byTitle;
  if (!work) throw new Error('AI 推荐的篇目不在当前本地书库中，已拒绝这次结果。');

  const quote = (raw.quote ?? '').trim();
  let lineIndex = Number.isInteger(raw.line_index) ? Number(raw.line_index) : -1;
  if (quote) {
    const found = work.lines.findIndex((line) => line.includes(quote) || quote.includes(line));
    if (found >= 0) lineIndex = found;
  }
  if (lineIndex < 0 || lineIndex >= work.lines.length) lineIndex = 0;

  return {
    workId: work.id,
    lineIndex,
    quote: quote || work.lines[lineIndex],
    reason: raw.reason?.trim() || '与今天的心情有相近的情绪。',
    moodTags: tags(raw.mood_tags),
    confidence: ['high', 'medium', 'low'].includes(raw.confidence ?? '')
      ? (raw.confidence as DailyRecommendation['confidence'])
      : 'unknown',
    source: 'api',
  };
}

export function randomRecommendation(catalog: Work[] = WORKS): DailyRecommendation {
  const work = catalog[Math.floor(Math.random() * catalog.length)] ?? catalog[0];
  const lineIndex = 0;
  return {
    workId: work.id,
    lineIndex,
    quote: work.lines[lineIndex],
    reason: '今天不妨随机打开一篇，先读第一句。',
    moodTags: work.themes.slice(0, 3),
    confidence: 'high',
    source: 'random',
  };
}

export async function recommendForMood(
  settings: ApiSettings,
  userText: string,
  catalog: Work[] = WORKS,
): Promise<DailyRecommendation> {
  if (!settings.endpoint.trim() || !settings.model.trim()) {
    throw new Error('请先在设置中填写 API 地址和模型名称。');
  }

  const candidates = chooseCandidates(userText, catalog);
  const compactCatalog = candidates.map((work) => ({
    id: work.id,
    title: work.title,
    author: work.author,
    dynasty: work.dynasty,
    genre: work.genre,
    themes: work.themes,
    moods: work.moods,
    lines: work.lines,
  }));

  const systemPrompt = `你是古诗文荐读助手。用户会描述今天的心情或发生的事。你只能从提供的 catalog 中选择一首现有篇目，并找出一句最贴合用户处境的原句。

必须遵守：
1. work_id 必须来自 catalog 的 id，不能推荐 catalog 之外的篇目。
2. quote 必须是所推荐篇目 lines 中的原句，不能改写。
3. line_index 使用从 0 开始的索引。
4. reason 用现代汉语说明为什么这句和用户今天的心情相合，不要空泛。
5. 不要为了安慰用户而歪曲原诗本意。
6. 只输出 JSON 对象，不要 Markdown。

JSON 格式：
{
  "work_id": "catalog 中的 id",
  "title": "篇名",
  "line_index": 0,
  "quote": "原句",
  "reason": "推荐理由",
  "mood_tags": ["心情标签"],
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
      temperature: 0.4,
      max_tokens: 700,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: JSON.stringify(
            {
              today: userText || '今天没有特别描述，请随机推荐。',
              note: 'catalog 已由 App 按心情和关键词预先筛选，只能从这些本地篇目中选择。',
              catalog: compactCatalog,
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
    throw new Error(`荐诗 API 请求失败（${response.status}）：${body.slice(0, 180)}`);
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('荐诗 API 返回内容为空。');
  return resolveRecommendation(parseJson(content), catalog);
}
