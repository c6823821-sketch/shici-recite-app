import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CompositionForm, CompositionGenre, GENRE_FORMS } from '../data/composition';
import { scoreComposition, CATEGORY_LABELS, CompositionScore } from '../services/compositionScoring';
import { LocalPrecheck, precheckComposition } from '../services/prosody';
import { loadApiSettings } from '../services/settings';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings } from '../types';

interface Props {
  onBack: () => void;
  onOpenSettings: () => void;
}

const GENRES: CompositionGenre[] = ['诗', '词', '曲'];
const CATEGORY_ORDER = ['rules', 'rhyme', 'tone', 'structure', 'parallelism', 'language', 'imagery', 'coherence', 'originality'];

export function CompositionScreen({ onBack, onOpenSettings }: Props) {
  const [genre, setGenre] = useState<CompositionGenre>('诗');
  const [form, setForm] = useState<CompositionForm>(GENRE_FORMS.诗[0]);
  const [text, setText] = useState('');
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [score, setScore] = useState<CompositionScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiSettings().then(setSettings);
  }, []);

  const precheck = useMemo<LocalPrecheck>(() => precheckComposition(text, form), [form, text]);

  const changeGenre = (next: CompositionGenre) => {
    setGenre(next);
    setForm(GENRE_FORMS[next][0]);
    setScore(null);
    setError('');
  };

  const runScore = async () => {
    if (!text.trim()) {
      setError('先写正文，再评分。');
      return;
    }
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setError('请先在设置中填写 API 地址和模型名称。');
      return;
    }
    setLoading(true);
    setError('');
    setScore(null);
    try {
      const result = await scoreComposition(settings, form, text, precheck);
      setScore(result);
    } catch (scoreError) {
      setError(readableScoreError(scoreError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <Text style={styles.headerTitle}>创作</Text>
        <Pressable onPress={onOpenSettings} style={[styles.headerSide, styles.headerRight]}>
          <Text style={styles.headerAction}>设置</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          先选体裁和格例，再写正文。本地先查字数、句数、押韵和平仄；API 按硬性规则逐项扣分，不恭维、不抬分。
        </Text>

        <View style={styles.genreRow}>
          {GENRES.map((item) => (
            <Pressable key={item} onPress={() => changeGenre(item)} style={styles.genreButton}>
              <Text style={[styles.genreText, genre === item && styles.genreTextActive]}>{item}</Text>
              {genre === item ? <View style={styles.genreUnderline} /> : null}
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionLabel}>{genre === '诗' ? '选择诗体' : genre === '词' ? '选择词牌' : '选择曲牌'}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.formRow}>
          {GENRE_FORMS[genre].map((item) => {
            const active = form.id === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => { setForm(item); setScore(null); setError(''); }}
                style={[styles.formChip, active && styles.formChipActive]}
              >
                <Text style={[styles.formChipText, active && styles.formChipTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.reference}>
          <Text style={styles.referenceTitle}>{form.label}</Text>
          <Text style={styles.referenceMeta}>
            {form.charCount ? `${form.charCount} 字` : '字数随句式'} · {form.rhymeBook} · {form.source}
          </Text>
          <Text style={styles.referenceHint}>{form.hint}</Text>
          {form.patternLines?.length ? (
            <View style={styles.patternBox}>
              <Text style={styles.patternLabel}>常见格例</Text>
              {form.patternLines.slice(0, 4).map((line, index) => (
                <Text key={`${line}-${index}`} style={styles.patternLine}>{index + 1}. {line}</Text>
              ))}
              {form.patternLines.length > 4 ? (
                <Text style={styles.patternMore}>……共 {form.patternLines.length} 句，API 会按完整词谱复核</Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <Text style={styles.sectionLabel}>正文</Text>
        <TextInput
          value={text}
          onChangeText={(value) => { setText(value); setScore(null); setError(''); }}
          multiline
          placeholder="每句换行输入。标点可以保留，本地预检会自动忽略标点。"
          placeholderTextColor={colors.muted}
          selectionColor={colors.vermilion}
          style={styles.editor}
          textAlignVertical="top"
        />

        <View style={[styles.precheck, precheck.passed ? styles.precheckPass : styles.precheckFail]}>
          <View style={styles.precheckHeader}>
            <Text style={styles.precheckTitle}>本地预检 · {precheck.passed ? '未发现硬性错误' : '发现硬性错误'}</Text>
            <Text style={styles.precheckCount}>{precheck.charCount} 字 / {precheck.lineCount} 句</Text>
          </View>
          <Text style={styles.precheckMeta}>
            平仄匹配 {precheck.toneChecked ? `${precheck.toneMatched}/${precheck.toneChecked}` : '待 API 复核'} · 押韵问题 {precheck.rhymeChecked}
          </Text>
          {precheck.issues.length === 0 ? (
            <Text style={styles.precheckEmpty}>本地结构检查通过。这并不代表作品合格，仍需 API 做句读、对仗、语言和章法复核。</Text>
          ) : (
            precheck.issues.slice(0, 8).map((issue, index) => (
              <Text
                key={`${issue.area}-${index}`}
                style={issue.severity === 'error' ? styles.issueError : styles.issueWarning}
              >
                [{issue.area}] {issue.message}
              </Text>
            ))
          )}
        </View>

        <Pressable style={[styles.scoreButton, loading && styles.disabled]} onPress={runScore} disabled={loading}>
          {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.scoreButtonText}>严格评分</Text>}
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {score ? <ScoreCard score={score} /> : null}
      </ScrollView>
    </View>
  );
}

function readableScoreError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('JSON') || message.includes('Unexpected end')) {
    return '评分结果被截断。请重新点击“严格评分”；如果连续出现，请换用支持长输出的模型。';
  }
  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return '网络请求失败，请检查手机网络和 API 地址。';
  }
  if (message.includes('API 请求失败')) return message;
  return `评分失败：${message}`;
}

function ScoreCard({ score }: { score: CompositionScore }) {
  return (
    <View style={styles.result}>
      <View style={styles.scoreTop}>
        <View>
          <Text style={styles.scoreLabel}>严格评分</Text>
          <Text style={styles.verdict}>{score.verdict}</Text>
          <Text style={styles.level}>{score.level} · API 自评把握：{score.confidence}</Text>
        </View>
        <Text style={styles.scoreNumber}>{score.overallScore}</Text>
      </View>
      <Text style={styles.summary}>{score.summary}</Text>

      <Text style={styles.resultSectionTitle}>分项得分</Text>
      {CATEGORY_ORDER.map((key) => (
        <View key={key} style={styles.categoryRow}>
          <Text style={styles.categoryName}>{CATEGORY_LABELS[key]}</Text>
          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${score.categoryScores[key]}%` }]} />
          </View>
          <Text style={styles.categoryScore}>{score.categoryScores[key]}</Text>
        </View>
      ))}

      <Text style={styles.resultSectionTitle}>问题清单</Text>
      {score.issues.length === 0 ? (
        <Text style={styles.resultText}>没有列出具体问题。仍应人工复核词谱、韵书和典故。</Text>
      ) : (
        score.issues.map((issue, index) => (
          <View key={`${issue.problem}-${index}`} style={styles.issueBlock}>
            <Text style={styles.issueTitle}>[{issue.severity}] {issue.category}{issue.line ? ` · 第 ${issue.line} 句` : ''}</Text>
            {issue.quote ? <Text style={styles.quote}>“{issue.quote}”</Text> : null}
            <Text style={styles.issueProblem}>{issue.problem}</Text>
            <Text style={styles.issueSuggestion}>修改：{issue.suggestion}</Text>
          </View>
        ))
      )}

      <Text style={styles.resultSectionTitle}>有证据的优点</Text>
      {score.strengths.length ? score.strengths.map((item) => <Text key={item} style={styles.resultText}>· {item}</Text>) : (
        <Text style={styles.resultText}>未列出明确优点，先解决硬性问题。</Text>
      )}

      <Text style={styles.resultSectionTitle}>修改顺序</Text>
      {score.revisionPlan.map((item, index) => (
        <Text key={`${item}-${index}`} style={styles.resultText}>{index + 1}. {item}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingTop: Platform.OS === 'android' ? 28 : 50,
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  headerSide: { width: 70 },
  headerRight: { alignItems: 'flex-end' },
  headerAction: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 17, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  intro: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 25 },
  genreRow: { flexDirection: 'row', gap: 34, marginTop: spacing.lg },
  genreButton: { minWidth: 40, alignItems: 'center', paddingVertical: 8 },
  genreText: { color: colors.muted, fontFamily: fonts.title, fontSize: 22 },
  genreTextActive: { color: colors.ink, fontWeight: '800' },
  genreUnderline: { width: 26, height: 2, backgroundColor: colors.vermilion, marginTop: 6 },
  sectionLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2, marginTop: spacing.xl, marginBottom: 10 },
  formRow: { gap: 8, paddingBottom: 3 },
  formChip: { borderWidth: 1, borderColor: colors.line, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.paperLight },
  formChipActive: { borderColor: colors.vermilion, backgroundColor: colors.paper },
  formChipText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  formChipTextActive: { color: colors.vermilion, fontWeight: '700' },
  reference: { marginTop: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.vermilion, paddingLeft: 14 },
  referenceTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 22, fontWeight: '700' },
  referenceMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, marginTop: 6 },
  referenceHint: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 8 },
  patternBox: { marginTop: 12, padding: 12, backgroundColor: colors.paperDeep },
  patternLabel: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11, marginBottom: 5 },
  patternLine: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23 },
  patternMore: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 5 },
  editor: { minHeight: 250, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight, padding: 14, color: colors.ink, fontFamily: fonts.body, fontSize: 19, lineHeight: 34, borderRadius: 3 },
  precheck: { marginTop: spacing.lg, padding: 14, borderLeftWidth: 3 },
  precheckPass: { borderLeftColor: colors.jade, backgroundColor: 'rgba(64,88,76,0.06)' },
  precheckFail: { borderLeftColor: colors.vermilion, backgroundColor: 'rgba(163,52,42,0.06)' },
  precheckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  precheckTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  precheckCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  precheckMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 6 },
  precheckEmpty: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 8 },
  issueError: { color: colors.danger, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 6 },
  issueWarning: { color: '#8A6328', fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 6 },
  scoreButton: { minHeight: 52, marginTop: spacing.lg, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  scoreButtonText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, letterSpacing: 2 },
  disabled: { opacity: 0.5 },
  error: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13, lineHeight: 21, marginTop: 10 },
  result: { marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: spacing.lg },
  scoreTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  scoreLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 2 },
  verdict: { color: colors.ink, fontFamily: fonts.title, fontSize: 22, fontWeight: '800', marginTop: 7 },
  level: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, marginTop: 7 },
  scoreNumber: { color: colors.vermilion, fontFamily: fonts.title, fontSize: 56, fontWeight: '800' },
  summary: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16, lineHeight: 27, marginTop: 14 },
  resultSectionTitle: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: 10 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  categoryName: { width: 70, color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  scoreTrack: { flex: 1, height: 5, backgroundColor: colors.paperDeep },
  scoreFill: { height: 5, backgroundColor: colors.vermilion },
  categoryScore: { width: 28, textAlign: 'right', color: colors.ink, fontFamily: fonts.sans, fontSize: 12 },
  issueBlock: { borderLeftWidth: 3, borderLeftColor: colors.line, paddingLeft: 12, marginBottom: 16 },
  issueTitle: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, fontWeight: '700' },
  quote: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, marginTop: 7 },
  issueProblem: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 5 },
  issueSuggestion: { color: colors.jade, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 5 },
  resultText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 24, marginBottom: 6 },
});
