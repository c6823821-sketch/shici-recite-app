import assert from 'node:assert/strict';
import http from 'node:http';
import { GENRE_FORMS } from '../src/data/composition';
import { precheckComposition } from '../src/services/prosody';
import { scoreComposition } from '../src/services/compositionScoring';
import { recommendForMood } from '../src/services/recommendation';
import { explainWithApi } from '../src/services/api';
import { loadWholeTranslation } from '../src/services/wholeTranslation';
import { WORKS } from '../src/data/works';

assert.ok(WORKS.length >= 20000, '离线内容库应至少包含 20,000 篇');
assert.ok(WORKS.filter((work) => work.collections.includes('诗经')).length >= 300, '诗经应至少包含 300 篇');
assert.ok(WORKS.filter((work) => work.collections.includes('唐诗三百首')).length >= 300, '唐诗三百首应至少包含 300 篇');
assert.ok(WORKS.filter((work) => work.collections.includes('全宋词')).length >= 20000, '全宋词应至少包含 20,000 篇');
assert.equal(WORKS.filter((work) => work.author === '李煜').length, 61, '李煜五代十国作品应完整收录');
assert.ok(WORKS.length >= 23000, '总内容库应超过 23,000 篇');

const wuyan = GENRE_FORMS.诗.find((item) => item.label === '五言绝句')!;
if (!wuyan) throw new Error('缺少五言绝句格式');

const validPoem = precheckComposition(
  '床前明月光\n疑是地上霜\n举头望明月\n低头思故乡',
  wuyan,
);
assert.equal(validPoem.passed, true, '《静夜思》应通过本地结构预检');

const invalidRhyme = precheckComposition(
  '床前明月光\n疑是地上霜\n举头望明月\n低头思故人',
  wuyan,
);
assert.equal(invalidRhyme.passed, false, '错误韵脚必须被本地预检拒绝');

const yijiangnan = GENRE_FORMS.词.find((item) => item.label === '忆江南')!;
if (!yijiangnan) throw new Error('缺少忆江南词谱');

const validCi = precheckComposition(
  '江南好\n风景旧曾谙\n日出江花红胜火\n春来江水绿如蓝\n能不忆江南',
  yijiangnan,
);
assert.equal(validCi.charCount, 27, '忆江南应为 27 字');
assert.equal(validCi.toneChecked, 27, '忆江南应完成 27 字平仄检查');
assert.equal(validCi.issues.length, 0, '示例忆江南不应有本地格律问题');

async function testApiServices() {
  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const isTranslation = request.url?.includes('/translate') ?? false;
      const explanation = isTranslation
        ? '这是测试用白话翻译。'
        : body.includes('古诗文训诂')
        ? {
            selection: '扈',
            meaning_in_context: '披、佩带',
            plain_translation: '披着江离与白芷。',
            confidence: 'high',
          }
        : body.includes('荐读助手')
          ? {
              work_id: 'jing-ye-si',
              line_index: 0,
              quote: '床前明月光，',
              reason: '月光与安静的夜晚适合整理今天的心情。',
              mood_tags: ['安静'],
              confidence: 'high',
            }
          : {
              overall_score: 63,
              level: '仍需修改',
              verdict: '押韵和句法仍需修改。',
              summary: '硬性规则存在明显问题，不能视为合格定稿。',
              category_scores: {
                rules: 55,
                rhyme: 60,
                tone: 62,
                structure: 70,
                language: 68,
                imagery: 72,
                coherence: 65,
                originality: 66,
              },
              issues: [
                {
                  severity: 'major',
                  category: '押韵',
                  line: 2,
                  quote: '霜',
                  problem: '与全诗韵部不一致。',
                  suggestion: '换用同韵部字。',
                },
              ],
              strengths: ['首句意象明确。'],
              revision_plan: ['先统一韵部。', '再调整句法。'],
              confidence: 'high',
            };
      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(explanation) } }] }));
    });
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('mock server failed');
  const endpoint = `http://127.0.0.1:${address.port}/chat/completions`;
  const settings = { endpoint, apiKey: 'test', model: 'test-model' };

  const explanation = await explainWithApi(settings, {
    work: WORKS[0],
    lineIndex: 0,
    selectionStart: 0,
    selectionEnd: 0,
  });
  assert.equal(explanation.meaningInContext, '披、佩带');

  const whole = await loadWholeTranslation({ ...settings, endpoint: `${settings.endpoint.replace('/chat/completions', '')}/translate/chat/completions` }, {
    ...WORKS[0],
    id: 'whole-test',
    translations: [],
    lines: ['床前明月光，', '疑是地上霜。'],
  });
  assert.equal(whole[0], '这是测试用白话翻译。');
  assert.equal(whole[1], '这是测试用白话翻译。');

  const recommendation = await recommendForMood(settings, '今天很安静');
  assert.equal(recommendation.workId, 'jing-ye-si');
  assert.equal(recommendation.quote, '床前明月光，');

  const strictScore = await scoreComposition(settings, wuyan, '床前明月光', invalidRhyme);
  assert.equal(strictScore.overallScore, 63);
  assert.equal(strictScore.issues[0]?.severity, 'major');

  await new Promise<void>((resolve) => server.close(() => resolve()));
}

testApiServices()
  .then(() => console.log('core and API service checks passed'))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

