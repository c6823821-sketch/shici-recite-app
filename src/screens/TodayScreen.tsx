import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MoodRecommendSheet } from '../components/MoodRecommendSheet';
import { WORKS } from '../data/works';
import { randomRecommendation, recommendForMood } from '../services/recommendation';
import { loadTodayRecommendation, saveTodayRecommendation } from '../services/recommendationStore';
import { loadApiSettings } from '../services/settings';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings, DailyRecommendation, Work } from '../types';

interface Props {
  onOpenWork: (work: Work, lineIndex?: number) => void;
  onOpenSettings: () => void;
  onOpenLibrary: () => void;
  onOpenComposition: () => void;
}

export function TodayScreen({ onOpenWork, onOpenSettings, onOpenLibrary, onOpenComposition }: Props) {
  const [daily, setDaily] = useState<DailyRecommendation | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [moodVisible, setMoodVisible] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadApiSettings().then(setSettings);
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

        <Text style={styles.sectionTitle}>今天想怎么学</Text>
        <View style={styles.actionGrid}>
          <ActionButton label="按心情推荐" detail="写下今天发生的事" onPress={() => { setError(''); setMoodVisible(true); }} />
          <ActionButton label="随机换一篇" detail="从离线诗库抽取" onPress={random} />
          <ActionButton label="去诗库搜索" detail={`${WORKS.length.toLocaleString('zh-CN')} 篇离线内容`} onPress={onOpenLibrary} />
          <ActionButton label="写诗填词" detail="本地预检 + 严格评分" onPress={onOpenComposition} />
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
  sectionTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 18, fontWeight: '700', marginTop: spacing.xl, marginBottom: spacing.md },
  actionGrid: { gap: 10 },
  actionButton: { minHeight: 72, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight, paddingHorizontal: 16, justifyContent: 'center' },
  actionLabel: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  actionDetail: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 5 },
});
