import assert from 'node:assert/strict';
import http from 'node:http';
import { GENRE_FORMS } from '../src/data/composition';
import { precheckComposition } from '../src/services/prosody';
import { scoreComposition } from '../src/services/compositionScoring';
import { recommendForMood } from '../src/services/recommendation';
import { explainWithApi } from '../src/services/api';
import { lookupRemoteWork } from '../src/services/remoteLookup';
import { auditWork } from '../src/services/workAudit';
import { isLongText } from '../src/services/longText';
import { loadWholeTranslation } from '../src/services/wholeTranslation';
import { WORKS } from '../src/data/works';
import { CLASSICS } from '../src/data/classics';
import { splitClassicText, paginateClassicSegments } from '../src/services/classicText';
import { canonicalWorkKey, correctKnownImportedWork, CORRECTED_WORKS, JIANGCHENGZI_LINES, markIncompleteWork, normalizeWorkTitle, TANGDUOLING_LINES } from '../src/data/corrections';

assert.ok(WORKS.length >= 20000, '离线内容库应至少包含 20,000 篇');
assert.ok(WORKS.filter((work) => work.collections.includes('诗经')).length >= 300, '诗经应至少包含 300 篇');
assert.ok(WORKS.filter((work) => work.collections.includes('唐诗三百首')).length >= 300, '唐诗三百首应至少包含 300 篇');
assert.ok(WORKS.filter((work) => work.collections.includes('全宋词')).length >= 20000, '全宋词应至少包含 20,000 篇');
assert.equal(WORKS.filter((work) => work.author === '李煜').length, 61, '李煜五代十国作品应完整收录');
assert.ok(WORKS.length >= 23000, '总内容库应超过 23,000 篇');

const markedIncomplete = WORKS.filter((work) => /□|（下缺）|\(下缺\)|〔下缺〕/.test(work.lines.join('')));
assert.ok(markedIncomplete.length > 0, '应存在底本缺字或下缺作品');
assert.equal(markedIncomplete.every((work) => work.incomplete === true), true, '所有缺字或下缺作品都应标记为资料不全');
assert.equal(markIncompleteWork({ ...WORKS[0], lines: ['前句完好，', '后句□□□。'] }).incomplete, true, '缺字标记应触发资料不全状态');
assert.equal(CLASSICS.length, 9, '典籍与名句补充库应包含九项');
assert.ok(CLASSICS.some((item) => item.title === '师说' && item.sections.some((section) => section.text.includes('古之学者必有师') && section.text.includes('作《师说》以贻之'))), '师说应包含完整原文');
assert.ok(CLASSICS.some((item) => item.title === '陈情表' && item.sections.some((section) => section.text.includes('臣密言') && section.text.includes('谨拜表以闻'))), '陈情表应包含完整原文');
assert.ok(CLASSICS.some((item) => item.title === '美美与共' && item.author === '费孝通'), '应补充费孝通名句并纠正出处');
assert.ok(CLASSICS.some((item) => item.title === '卖油翁' && item.sections.some((section) => section.text.includes('惟手熟尔'))), '应补充卖油翁及惟手熟尔');
assert.ok(CLASSICS.some((item) => item.title === '道德经' && item.sections.length === 81), '道德经应包含81章');
assert.ok(CLASSICS.some((item) => item.title === '论语' && item.sections.length === 20), '论语应包含20篇');
const correctedTangDuoling = correctKnownImportedWork({
  ...CORRECTED_WORKS[0],
  id: 'legacy-tang-duoling',
  title: '糖多令·唐多令',
  lines: [
    '芦叶满汀洲，',
    '塞沙带浅流。',
    '故人今不在。',
  ],
});
assert.equal(correctedTangDuoling.title, '唐多令', '糖多令应修正为唐多令');
assert.equal(correctedTangDuoling.lines.includes('故人今在否？'), true, '应修正故人今在否');
assert.equal(correctedTangDuoling.lines.includes('塞沙带浅流。'), false, '应修正塞沙为寒沙');
assert.equal(canonicalWorkKey(correctedTangDuoling), canonicalWorkKey({ ...correctedTangDuoling, title: '糖多令·唐多令' }), '修正后的篇目应可去重');
assert.equal(WORKS.some((work) => normalizeWorkTitle(work.title) === '唐多令' && work.author === '刘过'), true, '内置库应包含校订后的唐多令');
assert.equal(WORKS.some((work) => work.title.includes('糖多令')), false, '内置库不应再出现糖多令');
assert.equal(WORKS.some((work) => work.lines.some((line) => line.includes('故人今不在'))), false, '全库不应再出现故人今不在');
assert.equal(WORKS.some((work) => work.lines.some((line) => line.includes('塞沙带浅流'))), false, '全库不应再出现塞沙带浅流');
assert.equal(WORKS.some((work) => work.lines.some((line) => line.includes('柳下系舟犹未稳'))), false, '全库不应再出现柳下系舟犹未稳');

const correctedLiuGuo = WORKS.find((work) => normalizeWorkTitle(work.title) === '唐多令' && work.author === '刘过' && work.lines[0]?.includes('芦叶满汀洲'));
assert.ok(correctedLiuGuo, '内置库应包含刘过的唐多令');
assert.deepEqual(correctedLiuGuo.lines, TANGDUOLING_LINES, '刘过唐多令应使用校订文本');
const importedLongCi = correctKnownImportedWork({ ...CORRECTED_WORKS[0], id: 'section-break-test', title: '长调测试', author: '测试作者', genre: '词', sectionBreaks: undefined });
assert.deepEqual(importedLongCi.sectionBreaks, [Math.ceil(importedLongCi.lines.length / 2)], '导入长调应自动补上下阕分隔');

const correctedJiangChengZi = correctKnownImportedWork({
  ...CORRECTED_WORKS[0],
  id: 'legacy-jiang-cheng-zi',
  title: '江神子·江城子',
  author: '苏轼',
  dynasty: '宋',
  lines: [...JIANGCHENGZI_LINES],
});
assert.equal(correctedJiangChengZi.title, '江城子·乙卯正月二十日夜记梦', '江神子名称应校订为江城子题名');
assert.deepEqual(correctedJiangChengZi.lines, JIANGCHENGZI_LINES, '江城子正文应使用校订文本');
const correctedDieLianHua = WORKS.filter((work) => work.lines.join('').includes('槛菊愁烟兰泣露') && work.lines.join('').includes('欲寄彩笺兼尺素'));
assert.equal(correctedDieLianHua.length, 1, '蝶恋花重复记录应合并为一条');
assert.equal(correctedDieLianHua[0]?.author, '晏殊', '蝶恋花作者应为晏殊');
assert.equal(normalizeWorkTitle(correctedDieLianHua[0]?.title ?? '').includes('蝶恋花'), true, '蝶恋花题目应保留词牌名');
assert.equal(correctedDieLianHua[0]?.lines.some((line) => line.includes('燕子双飞去')), true, '蝶恋花正文应校订为燕子双飞去');
assert.equal(correctedDieLianHua[0]?.lines.some((line) => line.includes('凋碧树')), true, '蝶恋花正文应校订为凋碧树');

const correctedYiJianMei = WORKS.find((work) => work.lines.join('').includes('红藕香残玉簟秋'));
if (!correctedYiJianMei) throw new Error('缺少李清照一剪梅');
assert.equal(correctedYiJianMei.title, '一剪梅·红藕香残玉簟秋', '一剪梅篇题应保留词牌并接首句');
assert.equal(isLongText(correctedYiJianMei.lines), false, '十二个短句的一剪梅不应按行数判成长文');

const correctedYuanWangSun = WORKS.find((work) => work.lines.join('').includes('湖上风来波浩渺'));
if (!correctedYuanWangSun) throw new Error('缺少李清照怨王孙');
assert.equal(correctedYuanWangSun.title, '怨王孙·湖上风来波浩渺', '怨王孙篇题不应拼入忆王孙别名');
assert.equal(isLongText(correctedYuanWangSun.lines), false, '短篇怨王孙不应分节');

const correctedTianZiChouNuer = WORKS.find((work) => work.lines.join('').includes('窗前谁种芭蕉树'));
if (!correctedTianZiChouNuer) throw new Error('缺少李清照添字丑奴儿');
assert.equal(correctedTianZiChouNuer.title, '添字丑奴儿·窗前谁种芭蕉树', '添字丑奴儿篇题应使用通行篇名');
assert.equal(isLongText(correctedTianZiChouNuer.lines), false, '短篇添字丑奴儿不应分节');
assert.equal(isLongText(Array.from({ length: 24 }, () => '一二三四五六七八九十')), true, '达到字数阈值的真正长文仍应分节');

const ciTuneNames = new Set(WORKS
  .filter((work) => work.genre === '词')
  .map((work) => work.title.split(/[·・]/)[0]?.trim())
  .filter((name): name is string => Boolean(name)));
const unresolvedCiAliasTitles = WORKS.filter((work) => {
  if (work.genre !== '词') return false;
  const parts = work.title.split(/[·・]/).map((part) => part.trim()).filter(Boolean);
  if (parts.length !== 2 || parts[0] === parts[1] || !ciTuneNames.has(parts[1])) return false;
  const firstLine = (work.lines[0] ?? '').replace(/[，。！？；：、,.!?;:]+$/g, '');
  return parts[1] !== firstLine;
});
assert.equal(unresolvedCiAliasTitles.length, 0, '全库不应再保留词牌名拼别的词牌别名作副题');





const classicalQuote = splitClassicText(
  '曾子曰：“以能问于不能，以多问于寡；有若无，实若虚，犯而不校。昔者吾友尝从事于斯矣。”'
);
assert.equal(classicalQuote.length, 1, '完整引语不应被分号拆碎');
assert.equal(classicalQuote[0].text.startsWith('曾子曰'), true, '不应留下孤立前引号');
assert.equal(classicalQuote[0].text.endsWith('。'), true, '应以完整句意收束');
assert.ok(splitClassicText('子曰：“见贤思齐焉，见不贤而内自省也。”')[0].highlights.includes('见贤思齐焉'), '应标注见贤思齐名句');
assert.ok(splitClassicText('曾子曰：“士不可以不弘毅，任重而道远。”')[0].highlights.includes('士不可以不弘毅'), '应标注士不可以不弘毅名句');
const longClassicSegments = splitClassicText('甲。'.repeat(120));
assert.ok(longClassicSegments.length > 1, '超长段落应按完整句意继续分组');
for (const classic of CLASSICS) {
  for (const section of classic.sections) {
    const parsed = splitClassicText(section.text);
    assert.ok(parsed.length > 0, `${classic.title}·${section.title} 不应解析为空`);
    for (const segment of parsed) {
      assert.equal(segment.text.startsWith('"'), false, `${classic.title}·${section.title} 不应留下孤立引号`);
      assert.equal(segment.text.startsWith('“'), false, `${classic.title}·${section.title} 不应留下孤立引号`);
      assert.equal(segment.text.endsWith('；'), false, `${classic.title}·${section.title} 不应按分号截断`);
    }
  }
}
assert.ok(paginateClassicSegments(longClassicSegments, 120, 3).length > 1, '分页应按字符预算而不是固定碎句数');

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
assert.equal(invalidRhyme.passed, true, '变体和拗体不应被本地预检硬性拒绝');
assert.ok(invalidRhyme.issues.length > 0, '不同韵脚仍应作为风险提醒列出');

const yijiangnan = GENRE_FORMS.词.find((item) => item.label === '忆江南')!;
if (!yijiangnan) throw new Error('缺少忆江南词谱');
assert.ok((yijiangnan.variants?.length ?? 0) >= 3, '忆江南应包含多个可选格例');

const validCi = precheckComposition(
  '江南好\n风景旧曾谙\n日出江花红胜火\n春来江水绿如蓝\n能不忆江南',
  yijiangnan,
);
assert.equal(validCi.charCount, 27, '忆江南应为 27 字');
assert.equal(validCi.toneChecked, 27, '忆江南应完成 27 字平仄检查');
assert.equal(validCi.passed, true, '示例忆江南应通过本地预检');
assert.ok(validCi.matchedVariantLabel, '应记录匹配的词牌格例变体');
assert.equal(validCi.issues.some((issue) => issue.severity === 'error'), false, '本地预检不应把变体当硬伤');

async function testApiServices() {
  const legacyAudit = await auditWork({ endpoint: '', apiKey: '', model: '' }, {
    ...correctedYiJianMei!,
    id: 'legacy-yijianmei-audit',
    title: '一剪梅·一翦梅',
  });
  assert.equal(legacyAudit.correct, false, '旧拼题应被本地校对明确判错');
  assert.equal(legacyAudit.issues.some((issue) => issue.field === 'title'), true, '旧拼题应报告题目问题');

  const server = http.createServer((request, response) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      const isRemote = request.url?.includes('/remote') ?? false;
      const isTranslation = request.url?.includes('/translate') ?? false;
      const explanation = isRemote
        ? {
            found: true,
            title: '卖炭翁',
            author: '白居易',
            dynasty: '唐',
            genre: '诗',
            lines: ['卖炭翁，伐薪烧炭南山中。', '可怜身上衣正单，心忧炭贱愿天寒。'],
            matched_line_index: 1,
            confidence: 'high',
            note: '测试补录',
          }
        : isTranslation
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

  const remote = await lookupRemoteWork('可怜身上衣正单', {
    ...settings,
    endpoint: `${settings.endpoint.replace('/chat/completions', '')}/remote/chat/completions`,
  });
  assert.equal(remote.title, '卖炭翁');
  assert.equal(remote.imported, true);

  const recommendation = await recommendForMood(settings, '今天很安静', WORKS);
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

