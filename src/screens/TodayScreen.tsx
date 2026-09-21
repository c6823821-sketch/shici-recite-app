import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MoodRecommendSheet } from '../components/MoodRecommendSheet';
import { WORKS } from '../data/works';
import { randomRecommendation, recommendForMood } from '../services/recommendation';
import { loadTodayRecommendation, saveTodayRecommendation } from '../services/recommendationStore';
import { loadApiSettings } from '../services/settings';
import { DailyGoal, loadDailyGoal, loadTodayRecords, saveDailyGoal, StudyRecord } from '../services/studyQueue';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings, DailyRecommendation, Work } from '../types';

interface Props {
  onOpenWork: (work: Work, lineIndex?: number) => void;
  onOpenSettings: () => void;
}

export function TodayScreen({ onOpenWork, onOpenSettings }: Props) {
  const [daily, setDaily] = useState<DailyRecommendation | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [moodVisible, setMoodVisible] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [goal, setGoal] = useState<DailyGoal>({ target: 1, date: '' });

  useEffect(() => {
    loadApiSettings().then(setSettings);
    loadDailyGoal().then(setGoal);
    loadTodayRecords().then(setRecords);
    loadTodayRecommendation().then((saved) => {
      if (saved) {
        setDaily(saved);
      } else {
        const next = randomRecommendation(WORKS);
        setDaily(next);
        void saveTodayRecommendation(next);
      }
    });
  }, []);

  const currentWork = daily ? WORKS.find((work) => work.id === daily.workId) : null;
  const doneCount = records.filter((record) => record.status === 'done').length;
  const pending = records
    .filter((record) => record.status === 'pending')
    .map((record) => WORKS.find((work) => work.id === record.workId))
    .filter((work): work is Work => Boolean(work));

  const highlights = useMemo(() => {
    const now = new Date();
    const key = `${now.getMonth() + 1}-${now.getDate()}`;
    const holidays: Record<string, { title: string; themes: string[]; keywords: string[] }> = {
      '1-1': { title: '元旦', themes: ['哲理', '励志'], keywords: ['新', '春', '日'] },
      '5-1': { title: '劳动节', themes: ['民生', '田园'], keywords: ['农', '田', '工'] },
      '9-10': { title: '教师节', themes: ['读书', '励志'], keywords: ['师', '学', '桃李'] },
      '10-1': { title: '国庆', themes: ['爱国', '怀古'], keywords: ['国', '山河', '神州'] },
      '12-22': { title: '冬至', themes: ['冬', '思乡'], keywords: ['冬', '雪', '寒'] },
    };
    const month = now.getMonth() + 1;
    const season = month >= 3 && month <= 5
      ? { title: '春日精选', themes: ['春'], keywords: ['春', '花', '东风'] }
      : month >= 6 && month <= 8
        ? { title: '夏日精选', themes: ['夏'], keywords: ['夏', '荷', '雨'] }
        : month >= 9 && month <= 11
          ? { title: '秋日精选', themes: ['秋'], keywords: ['秋', '月', '西风', '落叶'] }
          : { title: '冬日精选', themes: ['冬', '雪'], keywords: ['冬', '雪', '寒'] };
    const theme = holidays[key] ?? season;
    const results: Array<{ work: Work; lineIndex: number; quote: string }> = [];
    for (const work of WORKS) {
      const lineIndex = work.lines.findIndex((line) =>
        theme.keywords.some((keyword) => line.includes(keyword)) ||
        theme.themes.some((item) => work.themes.includes(item)),
      );
      if (lineIndex >= 0) {
        results.push({ work, lineIndex, quote: work.lines[lineIndex] });
      }
      if (results.length >= 3) break;
    }
    return { title: theme.title, items: results };
  }, []);
  const openDaily = () => {
    if (currentWork && daily) onOpenWork(currentWork, daily.lineIndex);
  };
  const random = async () => {
    const next = randomRecommendation(WORKS);
    setDaily(next);
    await saveTodayRecommendation(next);
    setMoodVisible(false);
  };
  const recommend = async () => {
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setError('请先在“我的”里填写 API 地址和模型名称。');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const next = await recommendForMood(settings, moodText, WORKS);
      setDaily(next);
      await saveTodayRecommendation(next);
      setMoodVisible(false);
    } catch (recommendError) {
      setError(readableError(recommendError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}</Text>
        <Text style={styles.title}>今日</Text>
        <Text style={styles.subtitle}>先读一句，再决定今天背什么。</Text>

        <View style={styles.recommendCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>今日荐诗</Text>
            <Text style={styles.cardSource}>{daily?.source === 'api' ? '按心情推荐' : '随机推荐'}</Text>
          </View>
          {daily && currentWork ? (
            <Pressable onPress={openDaily}>
              <Text style={styles.quote}>{daily.quote}</Text>
              <Text style={styles.poemMeta}>《{currentWork.title}》· {currentWork.author} · {currentWork.dynasty}</Text>
              <Text style={styles.reason}>{daily.reason}</Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={colors.vermilion} style={styles.loader} />
          )}
          <Pressable onPress={openDaily} style={styles.primaryButton}>
            <Text style={styles.primaryText}>开始学习</Text>
          </Pressable>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View>
              <Text style={styles.goalLabel}>今日目标</Text>
              <Text style={styles.goalValue}>{doneCount} / {goal.target} 首</Text>
            </View>
            <View style={styles.goalButtons}>
              {[1, 2, 3, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={async () => setGoal(await saveDailyGoal(value))}
                  style={[styles.goalButton, goal.target === value && styles.goalButtonActive]}
                >
                  <Text style={[styles.goalButtonText, goal.target === value && styles.goalButtonTextActive]}>{value} 首</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(100, (doneCount / Math.max(1, goal.target)) * 100)}%` }]} /></View>
        </View>

        {pending.length > 0 ? (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionTitle}>待背清单</Text>
            {pending.slice(0, 6).map((work) => (
              <Pressable key={work.id} onPress={() => onOpenWork(work, 0)} style={styles.pendingRow}>
                <View style={styles.pendingCopy}>
                  <Text style={styles.pendingTitle}>{work.title}</Text>
                  <Text style={styles.pendingMeta}>{work.author} · {work.dynasty}</Text>
                </View>
                <Text style={styles.pendingAction}>继续</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.highlightSection}>
          <Text style={styles.sectionTitle}>{highlights.title}</Text>
          {highlights.items.map((item) => (
            <Pressable key={`${item.work.id}-${item.lineIndex}`} onPress={() => onOpenWork(item.work, item.lineIndex)} style={styles.highlightRow}>
              <Text style={styles.highlightQuote}>{item.quote}</Text>
              <Text style={styles.highlightSource}>《{item.work.title}》· {item.work.author}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.sectionTitle}>今天想怎么学</Text>
        <View style={styles.actionGrid}>
          <ActionButton label="按心情推荐" detail="写下今天发生的事" onPress={() => { setError(''); setMoodVisible(true); }} />
          <ActionButton label="随机换一篇" detail="从离线诗库抽取" onPress={random} />
        </View>
      </ScrollView>

      <MoodRecommendSheet
        visible={moodVisible}
        text={moodText}
        loading={loading}
        error={error}
        onChangeText={setMoodText}
        onClose={() => setMoodVisible(false)}
        onSubmit={recommend}
        onRandom={random}
        onOpenSettings={onOpenSettings}
      />
    </View>
  );
}

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('JSON') || message.includes('Unexpected end')) return 'API 返回内容不完整，请换用支持长输出的模型，或稍后重试。';
  if (message.includes('Failed to fetch') || message.includes('Network request failed')) return '网络请求失败，请检查手机网络和 API 地址。';
  return message;
}

function ActionButton({ label, detail, onPress }: { label: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.actionButton}>
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 28 : 50 },
  content: { padding: spacing.lg, paddingBottom: 120 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 38, fontWeight: '800', letterSpacing: 4, marginTop: 6 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, marginTop: 8 },
  recommendCard: { marginTop: spacing.xl, backgroundColor: colors.paperDeep, borderLeftWidth: 4, borderLeftColor: colors.vermilion, padding: spacing.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
  cardSource: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  quote: { color: colors.ink, fontFamily: fonts.title, fontSize: 25, lineHeight: 38, marginTop: spacing.lg, fontWeight: '700' },
  poemMeta: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14, marginTop: 13 },
  reason: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 25, marginTop: 12 },
  loader: { marginVertical: 40 },
  primaryButton: { minHeight: 52, marginTop: spacing.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.vermilion },
  primaryText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, letterSpacing: 2 },
  goalCard: { marginTop: spacing.xl, padding: spacing.lg, backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.line },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' },
  goalLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12 },
  goalValue: { color: colors.ink, fontFamily: fonts.title, fontSize: 25, fontWeight: '800', marginTop: 5 },
  goalButtons: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 6, flex: 1, minWidth: 210 },
  goalButton: { minWidth: 48, minHeight: 36, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  goalButtonActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  goalButtonText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12 },
  goalButtonTextActive: { color: colors.vermilion, fontWeight: '700' },
  progressTrack: { height: 6, backgroundColor: colors.paperDeep, marginTop: 16 },
  progressFill: { height: 6, backgroundColor: colors.vermilion },
  highlightSection: { marginTop: spacing.lg },
  highlightRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  highlightQuote: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, lineHeight: 26 },
  highlightSource: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, marginTop: 6 },
  pendingSection: { marginTop: spacing.lg },
  pendingRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  pendingCopy: { flex: 1 },
  pendingTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 18, fontWeight: '700' },
  pendingMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 4 },
  pendingAction: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  actionGrid: { gap: 10 },
  actionButton: { minHeight: 72, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight, paddingHorizontal: 16, justifyContent: 'center' },
  actionLabel: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  actionDetail: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 5 },
});
