import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ExplanationSheet } from '../components/ExplanationSheet';
import { PlanSheet } from '../components/PlanSheet';
import { SealButton } from '../components/SealButton';
import { explainWithApi } from '../services/api';
import { dueLabel, formatDue, loadCard, rateWork, ReviewRating } from '../services/fsrs';
import { estimatePlan, loadStudyPlan, saveStudyPlan, StudyPlan } from '../services/plan';
import { findLocalExplanation } from '../services/localGlossary';
import { loadApiSettings } from '../services/settings';
import { getSelection, toChars } from '../services/text';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings, Explanation, Work } from '../types';
import { Card } from 'ts-fsrs';

type Mode = 'read' | 'prompt' | 'recite';

interface Selection {
  start: number;
  end: number;
}

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
  const scrollRef = useRef<ScrollView>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [card, setCard] = useState<Card | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [planVisible, setPlanVisible] = useState(false);

  useEffect(() => {
    loadApiSettings().then(setSettings);
    loadCard(work.id).then(setCard);
    loadStudyPlan(work.id).then(setPlan);
  }, [work.id]);

  useEffect(() => {
    setLineIndex(initialLineIndex);
    setMode('read');
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: 300 + initialLineIndex * 55,
        animated: false,
      });
    }, 220);
    return () => clearTimeout(timer);
  }, [initialLineIndex, work.id]);

  const selectedText = useMemo(() => {
    if (!selection) return '';
    return getSelection(work.lines[lineIndex], selection.start, selection.end);
  }, [lineIndex, selection, work.lines]);

  const selectedLength = selectedText ? toChars(selectedText).length : 0;

  const lookup = async (
    targetLine: number,
    targetStart: number,
    targetEnd: number,
    openSheet = true,
  ) => {
    setLineIndex(targetLine);
    setSelection({ start: targetStart, end: targetEnd });
    if (openSheet) setSheetVisible(true);
    setLoading(true);
    setError('');
    setExplanation(null);

    const local = findLocalExplanation(work, targetLine, targetStart, targetEnd);
    if (local) {
      setExplanation(local);
      setLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      return;
    }

    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setError('本地没有这条注释。请先在设置里填写 API 地址和模型，再查冷门字词。');
      setLoading(false);
      return;
    }

    try {
      const result = await explainWithApi(settings, {
        work,
        lineIndex: targetLine,
        selectionStart: targetStart,
        selectionEnd: targetEnd,
      });
      setExplanation(result);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : '查询失败。');
    } finally {
      setLoading(false);
    }
  };

  const selectCharacter = (index: number) => {
    setLineIndex(lineIndex);
    setSelection({ start: index, end: index });
    setExplanation(null);
    setError('');
    Haptics.selectionAsync().catch(() => undefined);
  };

  const adjustSelection = (delta: number) => {
    if (!selection) return;
    const chars = toChars(work.lines[lineIndex]);
    if (delta > 0) {
      const nextEnd = Math.min(chars.length - 1, selection.end + 1);
      setSelection({ start: selection.start, end: nextEnd });
    } else {
      const nextEnd = Math.max(selection.start, selection.end - 1);
      setSelection({ start: selection.start, end: nextEnd });
    }
  };

  const selectWholeLine = () => {
    const chars = toChars(work.lines[lineIndex]);
    setSelection({ start: 0, end: chars.length - 1 });
  };

  const askSelected = () => {
    if (!selection) return;
    lookup(lineIndex, selection.start, selection.end);
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
    setReviewMessage(`已排期：${formatDue(next)}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={styles.headerSide}>
          <Text style={styles.headerAction}>‹ 篇目</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {work.title}
        </Text>
        <Pressable onPress={onOpenSettings} style={[styles.headerSide, styles.headerRight]}>
          <Text style={styles.headerAction}>设置</Text>
        </Pressable>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <Text style={styles.workTitle}>{work.title}</Text>
          <Text style={styles.workMeta}>
            {work.dynasty} · {work.author} · {work.genre}
          </Text>
          <Text style={styles.intro}>{work.intro}</Text>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.locationLabel}>系统已定位</Text>
          <Text style={styles.locationText}>第 {lineIndex + 1} 句</Text>
          <Text style={styles.locationHint}>
            {mode === 'read' ? '轻点选字，长按直接解释' : '轻点句子揭晓或定位'}
          </Text>
        </View>

        <View style={styles.modeRow}>
          {MODES.map((item) => (
            <Pressable
              key={item.key}
              onPress={() => {
                setMode(item.key);
                setSelection(null);
              }}
              style={styles.modeButton}
            >
              <Text style={[styles.modeText, mode === item.key && styles.modeTextActive]}>
                {item.label}
              </Text>
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
              selected={lineIndex === index ? selection : null}
              revealed={revealedLines.has(index)}
              glossarySurfaces={work.glossary
                .filter((item) => item.lineIndex === index)
                .map((item) => item.surface)}
              onSelect={selectCharacter}
              onLookup={(charIndex) => lookup(index, charIndex, charIndex)}
              onReveal={() => revealLine(index)}
            />
          ))}
        </View>

        <View style={styles.translationBlock}>
          <Text style={styles.translationLabel}>本句白话</Text>
          <Text style={styles.translationText}>
            {work.translations[lineIndex]?.trim() || '暂无内置逐句白话；点正文中的字或“整句”，再用朱印请求 API。'}
          </Text>
        </View>

        <View style={styles.reviewBlock}>
          <View style={styles.reviewHeading}>
            <Text style={styles.reviewTitle}>背完以后怎么评价</Text>
            <Text style={styles.reviewDue}>{card ? dueLabel(card) : '正在读取排期'}</Text>
          </View>
          <Text style={styles.reviewHint}>
            四档结果会交给 FSRS，不是固定“第 1、2、4、7 天”。
          </Text>
          <Pressable onPress={() => setPlanVisible(true)} style={styles.planButton}>
            <Text style={styles.planButtonText}>
              {plan
                ? `背诵计划：${plan.targetDays} 天 · 每天新学约 ${estimatePlan(plan, work.lines.length).linesPerDay} 句`
                : '安排背诵期限'}
            </Text>
          </Pressable>
          <View style={styles.ratingRow}>
            {[
              ['again', '忘了'],
              ['hard', '很难'],
              ['good', '记得'],
              ['easy', '太熟'],
            ].map(([key, label]) => (
              <Pressable
                key={key}
                style={styles.ratingButton}
                onPress={() => rate(key as ReviewRating)}
              >
                <Text style={styles.ratingText}>{label}</Text>
              </Pressable>
            ))}
          </View>
          {reviewMessage ? <Text style={styles.reviewMessage}>{reviewMessage}</Text> : null}
        </View>

        <Text style={styles.source}>文本来源：{work.source}</Text>
      </ScrollView>

      <View style={styles.toolbar}>
        {mode === 'read' && selection ? (
          <>
            <View style={styles.selectionCopy}>
              <Text style={styles.selectionLabel}>已选</Text>
              <Text style={styles.selectionText}>{selectedText}</Text>
            </View>
            <View style={styles.adjustRow}>
              <TextButton label="减" onPress={() => adjustSelection(-1)} disabled={selectedLength <= 1} />
              <TextButton label="加" onPress={() => adjustSelection(1)} />
              <TextButton label="整句" onPress={selectWholeLine} />
            </View>
            <SealButton label="释" compact onPress={askSelected} />
          </>
        ) : (
          <Text style={styles.toolbarHint}>
            {mode === 'read' ? '轻点一个字，再按朱印查意思' : '切换回“原文”可以选字查询'}
          </Text>
        )}
      </View>

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
        onRetry={selection ? askSelected : undefined}
      />
    </View>
  );
}

function TextButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.textButton}>
      <Text style={[styles.textButtonText, disabled && styles.textButtonDisabled]}>{label}</Text>
    </Pressable>
  );
}

function ReaderLine({
  line,
  index,
  current,
  mode,
  selected,
  revealed,
  glossarySurfaces,
  onSelect,
  onLookup,
  onReveal,
}: {
  line: string;
  index: number;
  current: boolean;
  mode: Mode;
  selected: Selection | null;
  revealed: boolean;
  glossarySurfaces: string[];
  onSelect: (index: number) => void;
  onLookup: (index: number) => void;
  onReveal: () => void;
}) {
  const chars = toChars(line);

  if (mode === 'recite' && !revealed) {
    return (
      <Pressable onPress={onReveal} style={[styles.line, current && styles.currentLine]}>
        <Text style={styles.lineNumber}>{index + 1}</Text>
        <View style={styles.reciteHidden}>
          <Text style={styles.dotLine}>· · · · · · ·</Text>
          <Text style={styles.revealHint}>轻触揭晓</Text>
        </View>
      </Pressable>
    );
  }

  if (mode === 'prompt') {
    const prompt = `${chars.slice(0, 2).join('')}……`;
    return (
      <View style={[styles.line, current && styles.currentLine]}>
        <Text style={styles.lineNumber}>{index + 1}</Text>
        <Text style={styles.promptLine}>{prompt}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.line, current && styles.currentLine]}>
      <Text style={styles.lineNumber}>{index + 1}</Text>
      <View style={styles.charRow}>
        {chars.map((char, charIndex) => {
          const isSelected =
            selected !== null && charIndex >= selected.start && charIndex <= selected.end;
          const hasNote = glossarySurfaces.some((surface) => surface.startsWith(char));
          const interactive = mode === 'read';
          return (
            <Pressable
              key={`${char}-${charIndex}`}
              disabled={!interactive}
              onPress={() => onSelect(charIndex)}
              onLongPress={() => onLookup(charIndex)}
              delayLongPress={360}
              style={styles.charTouch}
            >
              <Text style={[styles.char, isSelected && styles.charSelected]}>{char}</Text>
              {hasNote ? <View style={styles.noteDot} /> : null}
            </Pressable>
          );
        })}
      </View>
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
  headerSide: {
    width: 70,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerAction: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 170,
  },
  hero: {
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  workTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  workMeta: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 13,
    letterSpacing: 1.4,
    textAlign: 'center',
    marginTop: 12,
  },
  intro: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 25,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  locationRow: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  locationLabel: {
    color: colors.vermilion,
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 1,
  },
  locationText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  locationHint: {
    flex: 1,
    textAlign: 'right',
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 34,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  modeButton: {
    minWidth: 44,
    alignItems: 'center',
    paddingVertical: 8,
  },
  modeText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 16,
    letterSpacing: 2,
  },
  modeTextActive: {
    color: colors.ink,
    fontWeight: '700',
  },
  modeUnderline: {
    width: 22,
    height: 2,
    backgroundColor: colors.vermilion,
    marginTop: 6,
  },
  poem: {
    marginTop: spacing.lg,
  },
  line: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  currentLine: {
    borderLeftColor: colors.vermilion,
    backgroundColor: 'rgba(163, 52, 42, 0.035)',
  },
  lineNumber: {
    width: 30,
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    textAlign: 'center',
  },
  charRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  charTouch: {
    minWidth: 27,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  char: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 23,
    lineHeight: 36,
  },
  charSelected: {
    color: colors.vermilion,
    textDecorationLine: 'underline',
    textDecorationColor: colors.vermilion,
  },
  noteDot: {
    position: 'absolute',
    bottom: 3,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.vermilion,
  },
  promptLine: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 22,
    letterSpacing: 5,
  },
  reciteHidden: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dotLine: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 17,
    letterSpacing: 1,
  },
  revealHint: {
    color: colors.vermilion,
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  translationBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  translationLabel: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 2,
  },
  translationText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 28,
    marginTop: 9,
  },
  reviewBlock: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  reviewHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reviewTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 20,
    fontWeight: '700',
  },
  reviewDue: {
    color: colors.vermilion,
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  reviewHint: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 8,
  },
  planButton: {
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.vermilion,
    alignSelf: 'flex-start',
    paddingBottom: 3,
  },
  planButtonText: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 7,
    marginTop: spacing.md,
  },
  ratingButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 2,
    backgroundColor: colors.paperLight,
  },
  ratingText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  reviewMessage: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 13,
    marginTop: 10,
  },
  source: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 10,
    lineHeight: 17,
    marginTop: spacing.xl,
  },
  toolbar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 78,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    backgroundColor: colors.paperLight,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toolbarHint: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  selectionCopy: {
    minWidth: 46,
  },
  selectionLabel: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 10,
  },
  selectionText: {
    color: colors.vermilion,
    fontFamily: fonts.title,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 2,
  },
  adjustRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  textButton: {
    minWidth: 38,
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 3,
  },
  textButtonDisabled: {
    opacity: 0.3,
  },
});
