import { ApiSettings } from '../types';
import { getStoredValue, setStoredValue } from './settings';

export interface AuthorInfo {
  name: string;
  dynasty?: string;
  bio: string;
  achievements: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'local' | 'api';
}

const CACHE_PREFIX = 'author_info_v1_';

const LOCAL_AUTHORS: Record<string, Omit<AuthorInfo, 'name' | 'source'>> = {
  '\u674e\u767d': {
    dynasty: '\u5510',
    bio: '\u674e\u767d\uff08\u5b57\u592a\u767d\uff0c\u53f7\u9752\u83b2\u5c45\u58eb\uff09\u662f\u76db\u5510\u6d6a\u6f2b\u4e3b\u4e49\u8bd7\u4eba\uff0c\u8bd7\u98ce\u8c6a\u653e\u6f02\u9038\uff0c\u5e38\u4ee5\u5927\u80c6\u7684\u60f3\u8c61\u548c\u5947\u7279\u7684\u8bed\u8a00\u8868\u8fbe\u81ea\u7531\u4e0e\u5b64\u72ec\uff0c\u88ab\u540e\u4eba\u79f0\u4e3a\u201c\u8bd7\u4ed9\u201d\u3002',
    achievements: ['\u300a\u9759\u591c\u601d\u300b', '\u300a\u5c06\u8fdb\u9152\u300b', '\u300a\u8700\u9053\u96be\u300b'],
    confidence: 'high',
  },
  '\u675c\u752b': {
    dynasty: '\u5510',
    bio: '\u675c\u752b\uff08\u5b57\u5b50\u7f8e\uff09\u662f\u5510\u4ee3\u73b0\u5b9e\u4e3b\u4e49\u8bd7\u4eba\uff0c\u8bd7\u4f5c\u5173\u6ce8\u6218\u4e71\u3001\u6c11\u751f\u548c\u4e2a\u4eba\u906d\u9645\uff0c\u98ce\u683c\u6c89\u90c1\u987f\u632b\uff0c\u88ab\u79f0\u4e3a\u201c\u8bd7\u5723\u201d\u3002',
    achievements: ['\u300a\u6625\u671b\u300b', '\u300a\u8305\u5c4b\u4e3a\u79cb\u98ce\u6240\u7834\u6b4c\u300b', '\u201c\u4e09\u540f\u201d\u201c\u4e09\u522b\u201d'],
    confidence: 'high',
  },
  '\u82cf\u8f7c': {
    dynasty: '\u5b8b',
    bio: '\u82cf\u8f7c\uff08\u5b57\u5b50\u77bb\uff0c\u53f7\u4e1c\u5761\u5c45\u58eb\uff09\u662f\u5317\u5b8b\u8457\u540d\u6587\u5b66\u5bb6\u3001\u4e66\u753b\u5bb6\u3002\u5176\u8bd7\u8bcd\u6587\u58f0\u60c5\u5e76\u91cd\uff0c\u8c6a\u653e\u4e0e\u5a49\u7ea6\u517c\u64c5\uff0c\u5bf9\u5b8b\u4ee3\u6587\u5b66\u5f71\u54cd\u6781\u5927\u3002',
    achievements: ['\u300a\u5ff5\u5974\u5a07\u00b7\u8d64\u58c1\u6000\u53e4\u300b', '\u300a\u6c34\u8c03\u6b4c\u5934\u00b7\u660e\u6708\u51e0\u65f6\u6709\u300b', '\u300a\u6c5f\u57ce\u5b50\u00b7\u4e59\u536f\u6b63\u6708\u4e8c\u5341\u65e5\u591c\u8bb0\u68a6\u300b'],
    confidence: 'high',
  },
  '\u674e\u6e05\u7167': {
    dynasty: '\u5b8b',
    bio: '\u674e\u6e05\u7167\uff08\u53f7\u6613\u5b89\u5c45\u58eb\uff09\u662f\u5b8b\u4ee3\u5a49\u7ea6\u8bcd\u4ee3\u8868\u4f5c\u5bb6\u4e4b\u4e00\uff0c\u4f5c\u54c1\u4ee5\u7ec6\u817b\u7684\u60c5\u611f\u3001\u6e05\u65b0\u81ea\u7136\u7684\u8bed\u8a00\u548c\u4e25\u8c28\u7684\u97f3\u5f8b\u89c1\u957f\u3002',
    achievements: ['\u300a\u58f0\u58f0\u6162\u300b', '\u300a\u5982\u68a6\u4ee4\u300b', '\u300a\u4e00\u526a\u6885\u300b'],
    confidence: 'high',
  },
  '\u8f9b\u5f03\u75be': {
    dynasty: '\u5b8b',
    bio: '\u8f9b\u5f03\u75be\uff08\u5b57\u5e7c\u5b89\uff0c\u53f7\u7a3c\u8f69\uff09\u662f\u5357\u5b8b\u8c6a\u653e\u8bcd\u4ee3\u8868\u4eba\u7269\uff0c\u4f5c\u54c1\u5e38\u5199\u5bb6\u56fd\u4e4b\u601d\u3001\u6218\u4e89\u4e0e\u4e2a\u4eba\u6000\u624d\u4e0d\u9047\u3002',
    achievements: ['\u300a\u7834\u9635\u5b50\u00b7\u4e3a\u9648\u540c\u752b\u8d4b\u58ee\u8bcd\u4ee5\u5bc4\u4e4b\u300b', '\u300a\u6c38\u9047\u4e50\u00b7\u4eac\u53e3\u5317\u56fa\u4ead\u6000\u53e4\u300b', '\u300a\u9752\u7389\u6848\u00b7\u5143\u5915\u300b'],
    confidence: 'high',
  },
  '\u5218\u8fc7': {
    dynasty: '\u5b8b',
    bio: '\u5218\u8fc7\uff08\u5b57\u6539\u4e4b\uff0c\u53f7\u9f99\u6d32\u9053\u4eba\uff09\u662f\u5357\u5b8b\u8bcd\u4eba\u3002\u4f5c\u54c1\u517c\u6709\u8c6a\u653e\u4e0e\u5a49\u7ea6\u4e4b\u98ce\uff0c\u5e38\u5bc4\u5bd3\u5bb6\u56fd\u4e4b\u611f\u4e0e\u8eab\u4e16\u4e4b\u60b2\u3002',
    achievements: ['\u300a\u5510\u591a\u4ee4\u00b7\u82a6\u53f6\u6ee1\u6c40\u6d32\u300b', '\u300a\u6c81\u56ed\u6625\u00b7\u5f20\u8def\u5206\u6c34\u300b'],
    confidence: 'high',
  },
  '\u674e\u715c': {
    dynasty: '\u4e94\u4ee3\u5341\u56fd',
    bio: '\u674e\u715c\uff08\u5b57\u91cd\u5149\uff09\u662f\u5357\u5510\u540e\u4e3b\uff0c\u4e5f\u662f\u4e94\u4ee3\u8bcd\u4ee3\u8868\u4f5c\u5bb6\u3002\u4f5c\u54c1\u4ee5\u771f\u5207\u7684\u4ea1\u56fd\u4e4b\u75db\u548c\u6df1\u60c5\u7684\u4eba\u751f\u4f53\u609f\u89c1\u957f\u3002',
    achievements: ['\u300a\u865e\u7f8e\u4eba\u300b', '\u300a\u6d6a\u6dd8\u6c99\u4ee4\u300b', '\u300a\u76f8\u89c1\u6b22\u300b'],
    confidence: 'high',
  },
};

function safeCacheKey(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${CACHE_PREFIX}${(hash >>> 0).toString(36)}`;
}

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
  if (start < 0 || end <= start) throw new Error('???? API ???? JSON?');
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

export async function loadAuthorInfo(settings: ApiSettings | null, author: string): Promise<AuthorInfo> {
  const name = author.trim();
  const local = LOCAL_AUTHORS[name];
  if (local) return { name, ...local, source: 'local' };

  const cacheKey = safeCacheKey(name);
  const cached = await getStoredValue(cacheKey);
  if (cached) {
    try {
      return { ...(JSON.parse(cached) as Omit<AuthorInfo, 'source'>), source: 'api' };
    } catch {
      // ignore malformed cache
    }
  }

  if (!settings?.endpoint.trim() || !settings.model.trim()) {
    throw new Error('????? API?????????????????');
  }

  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.1,
      max_tokens: 1200,
      messages: [
        {
          role: 'system',
          content: '?????????????????? JSON??????????????????{"name":"","dynasty":"","bio":"","achievements":["??????"],"confidence":"high|medium|low"}???????? confidence ????????',
        },
        { role: 'user', content: JSON.stringify({ author: name }) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`?????????${response.status}?`);
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('???? API ?????');
  const parsed = parseJson(content);
  const result: Omit<AuthorInfo, 'source'> = {
    name,
    dynasty: typeof parsed.dynasty === 'string' ? parsed.dynasty : '',
    bio: typeof parsed.bio === 'string' ? parsed.bio : '',
    achievements: stringArray(parsed.achievements),
    confidence: ['high', 'medium', 'low'].includes(String(parsed.confidence))
      ? (String(parsed.confidence) as AuthorInfo['confidence'])
      : 'low',
  };
  if (!result.bio.trim()) throw new Error('???? API ???????');
  await setStoredValue(cacheKey, JSON.stringify(result));
  return { ...result, source: 'api' };
}
