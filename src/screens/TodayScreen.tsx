import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { MoodRecommendSheet } from '../components/MoodRecommendSheet';
import { loadWorksCatalog } from '../data/worksCatalog';
import { randomRecommendation, recommendForMood } from '../services/recommendation';
import { DailyDiscovery, loadDailyDiscovery, rotateDailyDiscovery } from '../services/dailyDiscovery';
import { loadTodayRecommendation, saveTodayRecommendation } from '../services/recommendationStore';
import { loadApiSettings } from '../services/settings';
import {
  DailyGoal,
  loadDailyGoal,
  loadDueRecords,
  loadTodayRecords,
  saveDailyGoal,
  StudyRecord,
} from '../services/studyQueue';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { ApiSettings, DailyRecommendation, Work } from '../types';

interface Props {
  onOpenWork: (work: Work, lineIndex?: number) => void;
  onOpenFocus: (works: Work[], initialIndex?: number) => void;
  onOpenSettings: () => void;
  refreshToken?: number;
}

export function TodayScreen({ onOpenWork, onOpenFocus, onOpenSettings, refreshToken = 0 }: Props) {
  const [daily, setDaily] = useState<DailyRecommendation | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [moodVisible, setMoodVisible] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [discovery, setDiscovery] = useState<DailyDiscovery | null>(null);
  const [discoveryLoading, setDiscoveryLoading] = useState(false);
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [todayRecords, setTodayRecords] = useState<StudyRecord[]>([]);
  const [goal, setGoal] = useState<DailyGoal>({ target: 1, date: '' });
  const [catalog, setCatalog] = useState<Work[]>([]);

  useEffect(() => {
    let alive = true;
    void loadWorksCatalog().then(async (catalogValue) => {
      if (!alive) return;
      setCatalog(catalogValue);
      const settingsValue = await loadApiSettings();
      if (!alive) return;
      setSettings(settingsValue);
      const discoveryValue = await loadDailyDiscovery(settingsValue, catalogValue);
      if (!alive) return;
      setDiscovery(discoveryValue);

      const saved = await loadTodayRecommendation();
      const seasonalItem = discoveryValue.items[0];
      const savedMatchesSeason = saved && discoveryValue.items.some(
        (item) => item.workId === saved.workId && item.lineIndex === saved.lineIndex,
      );
      const seasonal = seasonalItem
        ? {
            workId: seasonalItem.workId,
            lineIndex: seasonalItem.lineIndex,
            quote: seasonalItem.quote,
            reason: discoveryValue.reason,
            moodTags: discoveryValue.interests?.length ? discoveryValue.interests : [discoveryValue.title],
            confidence: 'high' as const,
            source: 'local' as const,
          }
        : null;
      const next = savedMatchesSeason && saved ? saved : seasonal ?? randomRecommendation(catalogValue);
      setDaily(next);
      if (!savedMatchesSeason && next) void saveTodayRecommendation(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    void Promise.all([loadDailyGoal(), loadDueRecords(), loadTodayRecords()]).then(([nextGoal, due, today]) => {
      if (!alive) return;
      setGoal(nextGoal);
      setRecords(due);
      setTodayRecords(today);
    });
    return () => {
      alive = false;
    };
  }, [refreshToken]);

  const currentWork = daily ? catalog.find((work) => work.id === daily.workId) ?? null : null;
  const doneCount = todayRecords.filter((record) => record.status === 'done').length;
  const pending = records
    .filter((record) => record.status === 'pending')
    .map((record) => catalog.find((work) => work.id === record.workId))
    .filter((work): work is Work => Boolean(work));
  const review = records
    .filter((record) => record.status === 'done' && record.dueAt && new Date(record.dueAt).getTime() <= Date.now())
    .map((record) => catalog.find((work) => work.id === record.workId))
    .filter((work): work is Work => Boolean(work));

  const focusQueue = useMemo(() => {
    const queue = new Map<string, Work>();
    const add = (work: Work | null | undefined) => {
      if (work) queue.set(work.id, work);
    };

    review.forEach(add);
    pending.forEach(add);
    add(currentWork);
    const minimum = Math.min(20, Math.max(1, goal.target, review.length + pending.length));
    for (const work of catalog) {
      if (queue.size >= minimum) break;
      if (!queue.has(work.id)) queue.set(work.id, work);
    }
    return [...queue.values()].slice(0, minimum);
  }, [catalog, currentWork, goal.target, pending, review]);

  const openDaily = () => {
    if (currentWork && daily) onOpenWork(currentWork, daily.lineIndex);
  };

  const openFocus = () => {
    if (focusQueue.length) onOpenFocus(focusQueue, 0);
  };

  const changeDiscovery = async () => {
    if (!discovery || discoveryLoading) return;
    setDiscoveryLoading(true);
    try {
      setDiscovery(await rotateDailyDiscovery(discovery, catalog));
    } finally {
      setDiscoveryLoading(false);
    }
  };

  const random = async () => {
    const next = randomRecommendation(catalog);
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
      const next = await recommendForMood(settings, moodText, catalog);
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
        <Text style={styles.eyebrow}>
          {new Date().toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
        </Text>
        <Text style={styles.title}>今日</Text>
        <Text style={styles.subtitle}>今日先读一句，再完成背诵。</Text>

        <View style={styles.recommendCard}>
          <ImageBackground
            source={require('../../assets/covers/cover-moon.png')}
            style={styles.recommendArt}
            imageStyle={styles.recommendArtImage}
          >
            <View style={styles.recommendArtShade} />
          </ImageBackground>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>今日荐诗</Text>
            <Pressable
              accessibilityLabel="换一换"
              onPress={() => void random()}
              style={({ pressed }) => [styles.changeButton, pressed && styles.pressed]}
            >
              <Text style={styles.changeIcon}>↻</Text>
              <Text style={styles.changeText}>换一换</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => { setError(''); setMoodVisible(true); }}
            style={({ pressed }) => [styles.moodPrompt, pressed && styles.pressed]}
          >
            <Text style={styles.moodSearchIcon}>⌕</Text>
            <Text style={styles.moodPromptText}>输入想法或心情，推荐一首诗词</Text>
            <View style={styles.moodSearchAction}><Text style={styles.moodSearchActionText}>推荐</Text></View>
          </Pressable>
          {daily && currentWork ? (
            <Pressable onPress={openDaily}>
              <Text style={styles.quote}>{daily.quote}</Text>
              <Text style={styles.poemMeta}>《{currentWork.title}》· {currentWork.author} · {currentWork.dynasty}</Text>
              <Text style={styles.reason}>{daily.reason}</Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={colors.vermilion} style={styles.loader} />
          )}
          <View style={styles.cardActions}>
            <Pressable onPress={openDaily} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryText}>进入阅读</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.taskCard}>
          <Text style={styles.taskValue}>今日背诵进度 {doneCount}/{goal.target}</Text>
          <Text style={styles.taskHint}>按顺序完成，背对后自动进入下一首。</Text>

          <View style={styles.goalProgressTrack}>
            <View
              style={[
                styles.goalProgressFill,
                { width: `${Math.min(100, (doneCount / Math.max(1, goal.target)) * 100)}%` },
              ]}
            />
          </View>

          <View style={styles.taskList}>
            {focusQueue.slice(0, Math.max(1, goal.target)).map((item, index) => {
              const record = todayRecords.find((entry) => entry.workId === item.id);
              const completed = record?.status === 'done';
              return (
                <Pressable
                  key={`task-${item.id}`}
                  onPress={() => onOpenWork(item, 0)}
                  style={({ pressed }) => [styles.taskItem, pressed && styles.pressed]}
                >
                  <Text style={styles.taskIndex}>{index + 1}.</Text>
                  <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={[styles.taskStatus, completed && styles.taskStatusDone]}>
                    {completed ? '已背' : '待背'}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.goalTargets}>
            {[1, 2, 3, 5].map((value) => (
              <Pressable
                key={value}
                onPress={async () => setGoal(await saveDailyGoal(value))}
                style={({ pressed }) => [
                  styles.goalTarget,
                  goal.target === value && styles.goalTargetActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.goalTargetText, goal.target === value && styles.goalTargetTextActive]}>
                  {value} 首
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            disabled={focusQueue.length === 0}
            onPress={openFocus}
            style={({ pressed }) => [
              styles.startButton,
              focusQueue.length === 0 && styles.disabled,
              pressed && styles.startButtonPressed,
            ]}
          >
            <Text style={styles.startButtonText}>开始背诵</Text>
            <Text style={styles.startButtonArrow}>→</Text>
          </Pressable>
        </View>

        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>今日复习</Text>
            <Text style={styles.sectionMeta}>{review.length ? `${review.length} 篇到期` : '暂无到期'}</Text>
          </View>
          {review.length ? review.slice(0, 5).map((work) => (
            <Pressable
              key={`review-${work.id}`}
              onPress={() => onOpenWork(work, 0)}
              style={({ pressed }) => [styles.reviewRow, pressed && styles.pressed]}
            >
              <View style={styles.reviewCopy}>
                <Text style={styles.reviewTitle}>{work.title}</Text>
                <Text style={styles.reviewMeta}>到期复习 · {work.author}</Text>
              </View>
              <Text style={styles.reviewAction}>复习</Text>
            </Pressable>
          )) : (
            <Text style={styles.emptyReview}>完成背诵后，系统会按记忆曲线把复习放回这里。</Text>
          )}
        </View>

        {discovery ? (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{discovery.title}</Text>
                <Text style={styles.sectionMeta}>时节与兴趣 · 每日轮换</Text>
              </View>
              <Pressable
                disabled={discoveryLoading}
                onPress={() => void changeDiscovery()}
                style={({ pressed }) => [styles.discoveryRefresh, pressed && styles.pressed, discoveryLoading && styles.disabled]}
              >
                {discoveryLoading ? <ActivityIndicator size="small" color={colors.vermilion} /> : <Text style={styles.discoveryRefreshText}>换一组</Text>}
              </Pressable>
            </View>
            <Text style={styles.discoveryReason}>{discovery.reason}</Text>
            {discovery.items.map((item, index) => {
              const work = catalog.find((candidate) => candidate.id === item.workId);
              if (!work) return null;
              return (
                <Pressable
                  key={item.workId + '-' + item.lineIndex}
                  onPress={() => onOpenWork(work, item.lineIndex)}
                  style={({ pressed }) => [styles.highlightRow, pressed && styles.pressed]}
                >
                  <View style={styles.highlightTop}>
                    <Text style={styles.highlightNumber}>应景句 {index + 1}</Text>
                    <Text style={styles.highlightTap}>点击卡片查看原诗</Text>
                  </View>
                  <View style={styles.highlightDivider} />
                  <Text style={styles.highlightQuote}>{item.quote}</Text>
                  <View style={styles.highlightFooter}>
                    <Text style={styles.highlightSource}>《{work.title}》· {work.author}</Text>
                    <Text style={styles.highlightAction}>查看原诗</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <MoodRecommendSheet
        visible={moodVisible}
        text={moodText}
        loading={loading}
        error={error}
        onChangeText={setMoodText}
        onClose={() => setMoodVisible(false)}
        onSubmit={recommend}
        onRandom={() => void random()}
        onOpenSettings={onOpenSettings}
      />
    </View>
  );
}

function readableError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('JSON') || message.includes('Unexpected end')) {
    return 'API 返回内容不完整，请换用支持长输出的模型，或稍后重试。';
  }
  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return '网络请求失败，请检查手机网络和 API 地址。';
  }
  return message;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 28 : 50 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 128 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 38, fontWeight: '800', letterSpacing: 4, marginTop: 6 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, marginTop: 8 },
  taskCard: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 20, backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.line, ...shadow },
  taskValue: { color: colors.ink, fontFamily: fonts.title, fontSize: 22, fontWeight: '800' },
  taskHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 6 },
  goalProgressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.paperDeep, marginTop: 14 },
  goalProgressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.vermilion },
  taskList: { marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  taskItem: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  taskIndex: { width: 24, color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  taskTitle: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 16, fontWeight: '700', paddingRight: 8 },
  taskStatus: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11 },
  taskStatusDone: { color: colors.jade },
  goalTargets: { flexDirection: 'row', gap: 8, marginTop: 14 },
  goalTarget: { flex: 1, minHeight: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  goalTargetActive: { borderColor: colors.vermilion, backgroundColor: '#FBE9E7' },
  goalTargetText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12 },
  goalTargetTextActive: { color: colors.vermilion, fontWeight: '800' },
  startButton: { minHeight: 58, borderRadius: 16, backgroundColor: colors.vermilion, marginTop: 18, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startButtonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  startButtonText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, fontWeight: '800', letterSpacing: 1.2 },
  startButtonArrow: { color: colors.white, fontFamily: fonts.sans, fontSize: 23 },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72 },
  recommendCard: { marginTop: spacing.lg, backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.line, borderRadius: 20, overflow: 'hidden', ...shadow },
  recommendArt: { width: '100%', height: 150, justifyContent: 'flex-end' },
  recommendArtImage: { resizeMode: 'cover' },
  recommendArtShade: { flex: 1, backgroundColor: 'rgba(249,247,242,0.12)' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  cardHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  changeButton: { minHeight: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: colors.paperLight },
  changeIcon: { color: colors.ink, fontFamily: fonts.sans, fontSize: 17 },
  changeText: { color: colors.ink, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  cardLabel: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 15, fontWeight: '800' },
  moodButton: { minHeight: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.vermilion, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF8F6' },
  moodButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  moodPrompt: { minHeight: 46, marginHorizontal: spacing.lg, marginTop: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: '#DED6C8', backgroundColor: '#F6F2EA', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  moodSearchIcon: { color: colors.muted, fontFamily: fonts.sans, fontSize: 20, marginRight: 8 },
  moodPromptText: { flex: 1, color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  moodSearchAction: { minHeight: 30, borderRadius: radius.pill, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.vermilion },
  moodSearchActionText: { color: colors.white, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  quote: { color: colors.ink, fontFamily: fonts.title, fontSize: 26, lineHeight: 42, marginTop: spacing.lg, marginHorizontal: spacing.lg, fontWeight: '700' },
  poemMeta: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 13, marginHorizontal: spacing.lg },
  reason: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 24, marginTop: 12, marginHorizontal: spacing.lg },
  loader: { marginVertical: 48 },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: spacing.lg, marginHorizontal: spacing.lg, marginBottom: spacing.lg },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.vermilion },
  primaryText: { color: colors.white, fontFamily: fonts.body, fontSize: 16, fontWeight: '800', letterSpacing: 1.2 },
  randomButton: { minHeight: 50, borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  randomButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
  sectionBlock: { marginTop: spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 19, fontWeight: '800' },
  sectionMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  emptyReview: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 22, paddingVertical: 8 },
  reviewRow: { minHeight: 70, marginBottom: 8, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.line, borderRadius: 16 },
  reviewCopy: { flex: 1 },
  reviewTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 18, fontWeight: '700' },
  reviewMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 4 },
  reviewAction: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  discoveryReason: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginBottom: 12 },
  discoveryRefresh: { minHeight: 34, minWidth: 72, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colors.paperLight },
  discoveryRefreshText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  highlightRow: { marginBottom: 16, padding: spacing.md, backgroundColor: colors.paperLight, borderWidth: 1, borderLeftWidth: 3, borderColor: '#CFC6B7', borderLeftColor: colors.vermilion, borderRadius: 16, shadowColor: '#333333', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 2 },
  highlightTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  highlightNumber: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  highlightTap: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10 },
  highlightDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line, marginTop: 10, marginBottom: 12 },
  highlightQuote: { color: colors.ink, fontFamily: fonts.title, fontSize: 18, lineHeight: 30 },
  highlightFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  highlightSource: { flex: 1, color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  highlightAction: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
});
