import { ApiSettings, Work } from '../types';
import { getStoredValue, setStoredValue } from './settings';

export interface WorkContext {
  background: string;
  surfaceMeaning: string;
  deeperMeaning: string;
  theme: string;
  source: 'local' | 'api';
}

const LOCAL_CONTEXT: Record<string, Omit<WorkContext, 'source'>> = {
  'jing-ye-si': {
    background: '传统解读认为此诗写旅夜思乡，语言极简，因此版本异文较多。',
    surfaceMeaning: '月光照在床前，像地上的霜；抬头看月，低头想起故乡。',
    deeperMeaning: '动作从“望”转到“思”，把外在月色转为内心乡愁。',
    theme: '月夜、思乡、孤旅',
  },
  'lisao': {
    background: '屈原在政治失意和理想受挫的处境中写成，以香草、美人、神话寄托理想。',
    surfaceMeaning: '诗人自述身世、志向和遭谗受挫，反复表达不肯随俗。',
    deeperMeaning: '“香草美人”不是单纯写物，而是把品德、政治理想和人生选择具象化。',
    theme: '理想、忠诚、香草美人、政治抒情',
  },
  'jian-jia': {
    background: '《诗经·秦风》中的名篇，秋水、芦苇和伊人构成朦胧追寻的空间。',
    surfaceMeaning: '诗人沿着水边寻找所思念的人，但对方始终若即若离。',
    deeperMeaning: '既可读作爱情，也可读作对理想、贤才或难以抵达之境的追寻。',
    theme: '追寻、爱情、理想、秋水',
  },
  'wu-yi': {
    background: '《诗经·秦风》中以同袍、同泽、同裳表现共同御敌的军旅情谊。',
    surfaceMeaning: '谁说没有衣裳？我和你同穿一件，修好兵器一起上阵。',
    deeperMeaning: '反复咏唱把个人衣物变成共同体象征，强调同仇敌忾。',
    theme: '爱国、战争、团结、友情',
  },
  'jiang-nan-yuefu': {
    background: '汉乐府民歌，写江南采莲时鱼在莲叶间游动的轻快场景。',
    surfaceMeaning: '鱼儿在莲叶东、西、南、北四处游动。',
    deeperMeaning: '回环反复的语言模仿游鱼和采莲人的欢快节奏。',
    theme: '江南、劳动、自然、欢快',
  },
  'shui-diao-ge-tou': {
    background: '苏轼中秋怀念弟弟苏辙而作，把个人离别放入宇宙和人生的变化中。',
    surfaceMeaning: '词人问月、想归天，又回到人间，最后祝愿亲人共享月光。',
    deeperMeaning: '从个人的离别扩大到普遍的人生缺憾，最后以旷达和祝愿收束。',
    theme: '中秋、思念、亲情、旷达',
  },
  'yu-lin-ling': {
    background: '柳永擅写羁旅行役和都市离别，此词写汴京离别时的难舍。',
    surfaceMeaning: '长亭送别，执手相看，想象酒醒后的孤舟残月。',
    deeperMeaning: '景物层层推进，把离别从眼前延长到未来的漫长岁月。',
    theme: '离别、爱情、秋景、羁旅',
  },
  'jiang-cheng-zi-yimao': {
    background: '苏轼梦见亡妻王弗后所作，以记梦形式写十年生死之隔。',
    surfaceMeaning: '梦中回到故乡，看见妻子梳妆，相对无言，只有泪水。',
    deeperMeaning: '梦境越清晰，现实越空旷；“无言”比直接抒情更沉重。',
    theme: '悼亡、爱情、梦、思念',
  },
  'tian-jing-sha-qiu-si': {
    background: '马致远散曲名篇，用密集意象写天涯游子的秋日羁旅。',
    surfaceMeaning: '枯藤、老树、昏鸦、小桥、流水、古道、西风、瘦马，最后是断肠人在天涯。',
    deeperMeaning: '前三句并置景物，最后一句突然点明抒情主体，形成强烈收束。',
    theme: '思乡、羁旅、秋景、苍凉',
  },
};

function endpointUrl(endpoint: string): string {
  const value = endpoint.trim();
  if (!value) return '';
  if (value.endsWith('/chat/completions')) return value;
  return `${value.replace(/\/+$/, '')}/chat/completions`;
}

function todayKey(workId: string): string {
  return `work_context_${workId}`;
}

export async function loadCachedContext(workId: string): Promise<WorkContext | null> {
  const local = LOCAL_CONTEXT[workId];
  if (local) return { ...local, source: 'local' };
  const raw = await getStoredValue(todayKey(workId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as WorkContext;
  } catch {
    return null;
  }
}

export async function loadOrCreateContext(settings: ApiSettings | null, work: Work): Promise<WorkContext> {
  const cached = await loadCachedContext(work.id);
  if (cached) return cached;
  if (!settings?.endpoint.trim() || !settings.model.trim()) {
    return {
      background: '这一段原文已收录，但背景与赏析还没有本地校订版本。',
      surfaceMeaning: work.intro || '逐句字面意思可点击每一句的“译文”查看。',
      deeperMeaning: '配置 API 后可以生成一版参考赏析，生成结果会保存在手机里。',
      theme: work.themes.length ? work.themes.join('、') : '待整理',
      source: 'local',
    };
  }

  const prompt = `你是古诗词赏析编辑。请根据给定篇目写出简洁、保守、可核对的背景与赏析。不要编造具体逸事，不确定就写“学界有不同说法”。只输出 JSON，字段为 background、surface_meaning、deeper_meaning、theme。每项不超过120字。`;
  const response = await fetch(endpointUrl(settings.endpoint), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.2,
      max_tokens: 700,
      response_format: settings.endpoint.includes('deepseek') ? { type: 'json_object' } : undefined,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: JSON.stringify({ title: work.title, author: work.author, dynasty: work.dynasty, lines: work.lines }, null, 2) },
      ],
    }),
  });
  if (!response.ok) throw new Error('背景赏析生成失败，请检查 API 设置。');
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('背景赏析返回为空。');
  const cleaned = content.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const parsed = JSON.parse(cleaned.slice(cleaned.indexOf('{'), cleaned.lastIndexOf('}') + 1)) as Record<string, string>;
  const result: WorkContext = {
    background: parsed.background || '暂无可靠的背景说明。',
    surfaceMeaning: parsed.surface_meaning || '暂无字面说明。',
    deeperMeaning: parsed.deeper_meaning || '暂无深层解读。',
    theme: parsed.theme || work.themes.join('、'),
    source: 'api',
  };
  await setStoredValue(todayKey(work.id), JSON.stringify(result));
  return result;
}
