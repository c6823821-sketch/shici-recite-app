import { Solar } from 'lunar-typescript';
import { ApiSettings, Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';
import { loadPreferenceProfile, preferenceScore, topInterests } from './preference';

export interface DailyDiscoveryItem {
  workId: string;
  lineIndex: number;
  quote: string;
}

export interface DailyDiscovery {
  dateKey: string;
  title: string;
  reason: string;
  items: DailyDiscoveryItem[];
  source: 'local' | 'api';
  personalized?: boolean;
  interests?: string[];
}

interface DiscoveryContext {
  title: string;
  reason: string;
  themes: string[];
  keywords: string[];
}

function dateKey(date = new Date()): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function calendarContext(date = new Date()): DiscoveryContext {
  const solar = Solar.fromDate(date);
  const lunar = solar.getLunar();
  const festivals = [...solar.getFestivals(), ...lunar.getFestivals()];
  const jieQi = lunar.getJieQi();
  const month = date.getMonth() + 1;
  const season = month >= 3 && month <= 5
    ? { title: '春日应景', themes: ['春'], keywords: ['春', '花', '东风', '新绿'] }
    : month >= 6 && month <= 8
      ? { title: '夏日应景', themes: ['夏'], keywords: ['夏', '荷', '雨', '清风'] }
      : month >= 9 && month <= 11
        ? { title: '秋日应景', themes: ['秋'], keywords: ['秋', '月', '西风', '落叶', '霜'] }
        : { title: '冬日应景', themes: ['冬'], keywords: ['冬', '雪', '寒', '梅花'] };

  if (festivals.includes('中秋节')) return { title: '中秋应景', reason: '今日中秋，适合读月色、团圆与思念。', themes: ['中秋', '月亮', '思念', '亲情'], keywords: ['月', '中秋', '团圆', '婵娟'] };
  if (festivals.includes('国庆节')) return { title: '国庆应景', reason: '今日国庆，适合读山河、家国与壮阔气象。', themes: ['爱国', '怀古', '山河'], keywords: ['山河', '神州', '国', '万里'] };
  if (festivals.includes('重阳节')) return { title: '重阳应景', reason: '今日重阳，适合读登高、秋色与思乡。', themes: ['重阳', '秋', '思乡'], keywords: ['重阳', '登高', '菊', '秋'] };
  if (festivals.includes('元宵节')) return { title: '元宵应景', reason: '今日元宵，适合读灯火、相逢与春夜。', themes: ['元宵', '相聚', '爱情'], keywords: ['灯', '月', '相逢', '春'] };
  if (festivals.includes('七夕节')) return { title: '七夕应景', reason: '今日七夕，适合读相思、星河与相逢。', themes: ['七夕', '爱情', '相思'], keywords: ['星河', '相思', '织女', '月'] };
  if (festivals.includes('清明节') || jieQi === '清明') return { title: '清明应景', reason: '今日清明，适合读春景、追思与怀念。', themes: ['清明', '春', '思念'], keywords: ['清明', '春', '柳', '雨'] };
  if (jieQi === '冬至') return { title: '冬至应景', reason: '今日冬至，适合读冬日、归家与亲情。', themes: ['冬', '思乡', '亲情'], keywords: ['冬', '雪', '寒', '归'] };
  return { title: season.title, reason: `今天属于${season.title.replace('应景', '')}，给你挑几句相近的句子。`, themes: season.themes, keywords: season.keywords };
}

function pickItems(context: DiscoveryContext, profile: Awaited<ReturnType<typeof loadPreferenceProfile>>, catalog: Work[]): DailyDiscoveryItem[] {
  const ranked = catalog.map((work) => {
    const contextScore = work.themes.filter((theme) => context.themes.includes(theme)).length * 4;
    const lineIndex = work.lines.findIndex((line) => context.keywords.some((keyword) => line.includes(keyword)));
    const keywordScore = lineIndex >= 0 ? 3 : 0;
    const personalScore = preferenceScore(work, profile);
    return { work, lineIndex: lineIndex >= 0 ? lineIndex : 0, score: contextScore + keywordScore + personalScore };
  }).sort((left, right) => right.score - left.score);
  return ranked.slice(0, 3).map((item) => ({ workId: item.work.id, lineIndex: item.lineIndex, quote: item.work.lines[item.lineIndex] ?? item.work.lines[0] }));
}

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

async function enrichWithApi(settings: ApiSettings, context: DiscoveryContext): Promise<DiscoveryContext> {
  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      max_tokens: 400,
      response_format: settings.endpoint.includes('deepseek') ? { type: 'json_object' } : undefined,
      messages: [
        {
          role: 'system',
          content: '你只负责根据日期补充诗词推荐主题。只输出 JSON：{"reason":"一句话","themes":["主题"],"keywords":["关键词"]}。不要直接编造诗句，不要推荐库外内容，每项最多5个。',
        },
        { role: 'user', content: JSON.stringify({ date: dateKey(), context }, null, 2) },
      ],
    }),
  });
  if (!response.ok) return context;
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content;
  if (!text) return context;
  const cleaned = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)) as Record<string, unknown>;
  return {
    ...context,
    reason: typeof parsed.reason === 'string' && parsed.reason.trim() ? parsed.reason : context.reason,
    themes: Array.isArray(parsed.themes) ? parsed.themes.filter((item): item is string => typeof item === 'string') : context.themes,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.filter((item): item is string => typeof item === 'string') : context.keywords,
  };
}

export async function loadDailyDiscovery(settings: ApiSettings | null, catalog: Work[]): Promise<DailyDiscovery> {
  const key = `daily_discovery_${dateKey()}`;
  const cached = await getStoredValue(key);
  if (cached) {
    try { return JSON.parse(cached) as DailyDiscovery; } catch { /* regenerate */ }
  }
  const local = calendarContext();
  const profile = await loadPreferenceProfile();
  let context = local;
  let source: DailyDiscovery['source'] = 'local';
  if (settings?.endpoint.trim() && settings.model.trim()) {
    try {
      context = await enrichWithApi(settings, local);
      source = 'api';
    } catch {
      context = local;
    }
  }
  const interests = topInterests(profile);
  const result: DailyDiscovery = {
    dateKey: dateKey(),
    title: context.title,
    reason: interests.length
      ? `${context.reason} 也参考了你最近常看、收藏和背诵过的主题。`
      : context.reason,
    items: pickItems(context, profile, catalog),
    source,
    personalized: interests.length > 0,
    interests,
  };
  await setStoredValue(key, JSON.stringify(result));
  return result;
}
