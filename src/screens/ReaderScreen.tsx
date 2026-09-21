import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Card } from 'ts-fsrs';
import { ExplanationSheet } from '../components/ExplanationSheet';
import { PlanSheet } from '../components/PlanSheet';
import { explainWithApi } from '../services/api';
import { dueLabel, formatDue, loadCard, rateWork, ReviewRating } from '../services/fsrs';
import { findLocalExplanation } from '../services/localGlossary';
import { estimatePlan, loadStudyPlan, saveStudyPlan, StudyPlan } from '../services/plan';
import { loadApiSettings } from '../services/settings';
import { loadCachedTranslation, saveCachedTranslation } from '../services/translationCache';
import { toChars } from '../services/text';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings, Explanation, Work } from '../types';

type Mode = 'read' | 'prompt' | 'recite';

interface Props {
  work: Work;
  initialLineIndex?: number;
  onBack: () => void;
  onOpenSettings: () => void;
}

const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'read', label: '原文' },
  { key: 'prompt', label: '提示' },
  { key: 'recite', label: '默背' },
];

export function ReaderScreen({ work, initialLineIndex = 0, onBack, onOpenSettings }: Props) {
  const [mode, setMode] = useState<Mode>('read');
  const [lineIndex, setLineIndex] = useState(initialLineIndex);
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translationLoading, setTranslationLoading] = useState<number | null>(null);
  const [translationError, setTranslationError] = useState<number | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [planVisible, setPlanVisible] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadApiSettings().then(setSettings);
    loadCard(work.id).then(setCard);
    loadStudyPlan(work.id).then(setPlan);
  }, [work.id]);

  useEffect(() => {
    setLineIndex(initialLineIndex);
    setMode('read');
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: 235 + initialLineIndex * 82, animated: false });
    }, 180);
    return () => clearTimeout(timer);
  }, [initialLineIndex, work.id]);

  const lookup = async (targetLine: number, start: number, end: number) => {
    setLineIndex(targetLine);
    setSheetVisible(true);
    setLoading(true);
    setError('');
    setExplanation(null);

    const local = findLocalExplanation(work, targetLine, start, end);
    if (local) {
      setExplanation(local);
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return;
    }

    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setError('这条注释暂未收录。你可以在“我的”里配置 API 后继续查询。');
      setLoading(false);
      return;
    }

    try {
      const result = await explainWithApi(settings, {
        work,
        lineIndex: targetLine,
        selectionStart: start,
        selectionEnd: end,
      });
      setExplanation(result);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } catch (lookupError) {
      setError(readableError(lookupError, '查词失败'));
    } finally {
      setLoading(false);
    }
  };

  const translationFor = (index: number): string => {
    return translations[index] || work.translations[index] || '';
  };

  const toggleTranslation = async (index: number) => {
    setLineIndex(index);
    const existing = translationFor(index);
    if (existing && expandedLines.has(index)) {
      setExpandedLines((current) => {
        const next = new Set(current);
        next.delete(index);
        return next;
      });
      return;
    }
    if (existing) {
      setExpandedLines((current) => new Set(current).add(index));
      return;
    }

    const cached = await loadCachedTranslation(work.id, index);
    if (cached) {
      setTranslations((current) => ({ ...current, [index]: cached }));
      setExpandedLines((current) => new Set(current).add(index));
      return;
    }
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setTranslationError(index);
      return;
    }

    setTranslationLoading(index);
    setTranslationError(null);
    try {
      const chars = toChars(work.lines[index]);
      const result = await explainWithApi(settings, {
        work,
        lineIndex: index,
        selectionStart: 0,
        selectionEnd: Math.max(0, chars.length - 1),
      });
      const translation = result.plainTranslation || result.literalTranslation || result.meaningInContext;
      setTranslations((current) => ({ ...current, [index]: translation }));
      setExpandedLines((current) => new Set(current).add(index));
      await saveCachedTranslation(work.id, index, translation);
    } catch (translationFailure) {
      setTranslationError(index);
    } finally {
      setTranslationLoading(null);
    }
  };

  const revealLine = (index: number) => {
    setLineIndex(index);
    setRevealedLines((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const rate = async (rating: ReviewRating) => {
    const next = await rateWork(work.id, rating);
    setCard(next);
    setReviewMessage(`已安排下次复习：${formatDue(next)}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerSide}>
          <Text style={styles.headerAction}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{work.title}</Text>
        <Pressable onPress={onOpenSettings} style={[styles.headerSide, styles.headerRight]}>
          <Text style={styles.headerAction}>我的</Text>
        </Pressable>
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.workTitle}>{work.title}</Text>
          <Text style={styles.workMeta}>{work.dynasty} · {work.author} · {work.genre}</Text>
        </View>

        <View style={styles.modeRow}>
          {MODES.map((item) => (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={styles.modeButton}>
              <Text style={[styles.modeText, mode === item.key && styles.modeTextActive]}>{item.label}</Text>
              {mode === item.key ? <View style={styles.modeUnderline} /> : null}
            </Pressable>
          ))}
        </View>

        <View style={styles.poem}>
          {work.lines.map((line, index) => (
            <ReaderLine
              key={`${work.id}-${index}`}
              line={line}
              index={index}
              current={lineIndex === index}
              mode={mode}
              revealed={revealedLines.has(index)}
              expanded={expandedLines.has(index)}
              translation={translationFor(index)}
              translationLoading={translationLoading === index}
              translationError={translationError === index}
              glossarySurfaces={work.glossary.filter((item) => item.lineIndex === index).map((item) => item.surface)}
              onSelect={(charIndex) => lookup(index, charIndex, charIndex)}
              onReveal={() => revealLine(index)}
              onToggleTranslation={() => toggleTranslation(index)}
            />
          ))}
        </View>

        <View style={styles.reviewBlock}>
          <View style={styles.reviewHeading}>
            <Text style={styles.reviewTitle}>背诵评价</Text>
            <Text style={styles.reviewDue}>{card ? dueLabel(card) : '正在读取排期'}</Text>
          </View>
          <Text style={styles.reviewHint}>评价会交给 FSRS，不采用固定“第 1、2、4、7 天”。</Text>
          <Pressable onPress={() => setPlanVisible(true)} style={styles.planButton}>
            <Text style={styles.planButtonText}>
              {plan
                ? `计划：${plan.targetDays} 天 · 每天约 ${estimatePlan(plan, work.lines.length).linesPerDay} 句`
                : '设置背诵期限'}
            </Text>
          </Pressable>
          <View style={styles.ratingRow}>
            {[
              ['again', '忘了'],
              ['hard', '很难'],
              ['good', '记得'],
              ['easy', '很熟'],
            ].map(([key, label]) => (
              <Pressable key={key} style={styles.ratingButton} onPress={() => rate(key as ReviewRating)}>
                <Text style={styles.ratingText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {reviewMessage ? <Text style={styles.reviewMessage}>{reviewMessage}</Text> : null}
        </View>

        <Text style={styles.source}>文本来源：{work.source}</Text>
      </ScrollView>

      <PlanSheet
        visible={planVisible}
        workId={work.id}
        current={plan}
        lineCount={work.lines.length}
        onClose={() => setPlanVisible(false)}
        onSave={async (next) => {
          setPlan(next);
          await saveStudyPlan(next);
          setPlanVisible(false);
        }}
      />

      <ExplanationSheet
        visible={sheetVisible}
        loading={loading}
        error={error}
        explanation={explanation}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

function readableError(error: unknown, prefix: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('JSON') || message.includes('Unexpected end')) {
    return `${prefix}返回内容不完整，请再试一次。若反复出现，请在设置中换用支持长输出的模型。`;
  }
  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return '网络请求失败，请检查手机网络和 API 地址。';
  }
  return `${prefix}失败：${message}`;
}

function ReaderLine({
  line,
  index,
  current,
  mode,
  revealed,
  expanded,
  translation,
  translationLoading,
  translationError,
  glossarySurfaces,
  onSelect,
  onReveal,
  onToggleTranslation,
}: {
  line: string;
  index: number;
  current: boolean;
  mode: Mode;
  revealed: boolean;
  expanded: boolean;
  translation: string;
  translationLoading: boolean;
  translationError: boolean;
  glossarySurfaces: string[];
  onSelect: (index: number) => void;
  onReveal: () => void;
  onToggleTranslation: () => void;
}) {
  const chars = toChars(line);

  return (
    <View style={[styles.lineBlock, current && styles.currentLineBlock]}>
      {mode === 'recite' && !revealed ? (
        <Pressable onPress={onReveal} style={styles.lineMain}>
          <Text style={styles.lineNumber}>{index + 1}</Text>
          <View style={styles.reciteHidden}>
            <Text style={styles.dotLine}>· · · · · · ·</Text>
            <Text style={styles.revealHint}>轻触揭晓</Text>
          </View>
        </Pressable>
      ) : mode === 'prompt' ? (
        <Pressable onPress={onReveal} style={styles.lineMain}>
          <Text style={styles.lineNumber}>{index + 1}</Text>
          <Text style={styles.promptLine}>{chars.slice(0, 2).join('')}……</Text>
        </Pressable>
      ) : (
        <View style={styles.lineMain}>
          <Text style={styles.lineNumber}>{index + 1}</Text>
          <View style={styles.charRow}>
            {chars.map((char, charIndex) => {
              const hasNote = glossarySurfaces.some((surface) => surface.startsWith(char));
              return (
                <Pressable
                  key={`${char}-${charIndex}`}
                  onPress={() => onSelect(charIndex)}
                  onLongPress={() => onSelect(charIndex)}
                  delayLongPress={300}
                  style={styles.charTouch}
                >
                  <Text style={styles.char}>{char}</Text>
                  {hasNote ? <View style={styles.noteDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Pressable onPress={onToggleTranslation} style={styles.translationToggle}>
        {translationLoading ? <ActivityIndicator size="small" color={colors.vermilion} /> : (
          <Text style={styles.translationToggleText}>{expanded ? '收起译文' : translation ? '查看译文' : '生成译文'}</Text>
        )}
      </Pressable>
      {expanded && translation ? <Text style={styles.translationText}>{translation}</Text> : null}
      {expanded && translationError ? <Text style={styles.translationError}>暂时无法生成译文，请检查网络或 API 设置。</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 28 : 50 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerSide: { width: 70 },
  headerRight: { alignItems: 'flex-end' },
  headerAction: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 19, fontWeight: '700' },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 70 },
  hero: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  workTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 31, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  workMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.3, textAlign: 'center', marginTop: 10 },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 34, marginTop: spacing.lg, marginBottom: spacing.sm },
  modeButton: { minWidth: 48, alignItems: 'center', paddingVertical: 10 },
  modeText: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, letterSpacing: 2 },
  modeTextActive: { color: colors.ink, fontWeight: '700' },
  modeUnderline: { width: 24, height: 2, backgroundColor: colors.vermilion, marginTop: 6 },
  poem: { marginTop: spacing.md },
  lineBlock: { marginVertical: 3, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  currentLineBlock: { borderLeftColor: colors.vermilion, backgroundColor: 'rgba(163, 52, 42, 0.035)' },
  lineMain: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 46 },
  lineNumber: { width: 30, color: colors.muted, fontFamily: fonts.sans, fontSize: 11, textAlign: 'center', marginTop: 8 },
  charRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  charTouch: { minWidth: 28, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  char: { color: colors.ink, fontFamily: fonts.body, fontSize: 22, lineHeight: 36 },
  noteDot: { position: 'absolute', bottom: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: colors.vermilion },
  promptLine: { color: colors.ink, fontFamily: fonts.body, fontSize: 22, letterSpacing: 5 },
  reciteHidden: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dotLine: { color: colors.muted, fontFamily: fonts.sans, fontSize: 17 },
  revealHint: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11 },
  translationToggle: { alignSelf: 'flex-start', marginLeft: 30, marginTop: 2, paddingVertical: 4, paddingHorizontal: 2 },
  translationToggleText: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11, borderBottomWidth: 1, borderBottomColor: colors.vermilion, paddingBottom: 2 },
  translationText: { marginLeft: 30, marginTop: 6, color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23 },
  translationError: { marginLeft: 30, marginTop: 6, color: colors.danger, fontFamily: fonts.sans, fontSize: 11, lineHeight: 18 },
  reviewBlock: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  reviewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 20, fontWeight: '700' },
  reviewDue: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 12 },
  reviewHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, marginTop: 8 },
  planButton: { marginTop: 12, borderBottomWidth: 1, borderBottomColor: colors.vermilion, alignSelf: 'flex-start', paddingBottom: 3 },
  planButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
  ratingRow: { flexDirection: 'row', gap: 7, marginTop: spacing.md },
  ratingButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 2, backgroundColor: colors.paperLight },
  ratingText: { color: colors.ink, fontFamily: fonts.body, fontSize: 15 },
  reviewMessage: { color: colors.jade, fontFamily: fonts.sans, fontSize: 13, marginTop: 10 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 17, marginTop: spacing.xl },
});
