import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { loadOrCreateContext, WorkContext } from '../services/context';
import { rateWork } from '../services/fsrs';
import { loadApiSettings } from '../services/settings';
import { setStudyStatus } from '../services/studyQueue';
import { workDisplayTitle } from '../services/workPresentation';
import { loadWholeTranslationCached } from '../services/wholeTranslationStore';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { ApiSettings, Work } from '../types';

interface Props {
  works: Work[];
  initialIndex?: number;
  onBack: () => void;
  onOpenSettings: () => void;
}

interface ReciteCard {
  workIndex: number;
  lineIndex: number;
}

function cardKey(workId: string, lineIndex: number): string {
  return `${workId}:${lineIndex}`;
}

function maskedLine(line: string): string {
  const chars = Array.from(line.replace(/[\s\u3000，。！？；：、,.!?;:"“”‘’（）()《》〈〉·—\-]/g, ''));
  if (!chars.length) return '……';
  return `${chars[0]}${'○'.repeat(Math.max(1, Math.min(12, chars.length - 1)))}`;
}

export function FocusReciteScreen({ works, initialIndex = 0, onBack, onOpenSettings }: Props) {
  const safeInitialIndex = Math.max(0, Math.min(initialIndex, Math.max(0, works.length - 1)));
  const [workIndex, setWorkIndex] = useState(safeInitialIndex);
  const [lineIndex, setLineIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'again' | null>(null);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [infoLoading, setInfoLoading] = useState(false);
  const [infoError, setInfoError] = useState('');
  const [context, setContext] = useState<WorkContext | null>(null);
  const [translation, setTranslation] = useState('');
  const revealOpacity = useRef(new Animated.Value(0)).current;
  const cardOffset = useRef(new Animated.Value(0)).current;
  const cardOpacity = useRef(new Animated.Value(1)).current;
  const feedbackOpacity = useRef(new Animated.Value(0)).current;
  const feedbackScale = useRef(new Animated.Value(0.8)).current;
  const retryQueueRef = useRef<ReciteCard[]>([]);
  const missedKeysRef = useRef(new Set<string>());
  const masteredKeysRef = useRef(new Set<string>());
  const resolvedWorksRef = useRef(new Set<string>());
  const advanceAfterInfoRef = useRef(false);

  const activeWork = works[workIndex] ?? works[0];
  const activeLine = activeWork?.lines[lineIndex] ?? '';
  const activeKey = activeWork ? cardKey(activeWork.id, lineIndex) : '';
  const totalLines = useMemo(() => works.reduce((total, work) => total + work.lines.length, 0), [works]);

  useEffect(() => {
    void loadApiSettings().then(setSettings);
  }, []);

  useEffect(() => {
    Animated.timing(revealOpacity, {
      toValue: revealed ? 1 : 0,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [revealed, revealOpacity]);

  useEffect(() => {
    setRevealed(false);
    setInfoVisible(false);
    setContext(null);
    setTranslation('');
    setInfoError('');
    cardOffset.setValue(0);
    cardOpacity.setValue(1);
  }, [activeWork?.id, lineIndex, cardOffset, cardOpacity]);

  const updateMastery = (key: string, mastered: boolean) => {
    if (mastered) masteredKeysRef.current.add(key);
    else masteredKeysRef.current.delete(key);
    setMasteredCount(masteredKeysRef.current.size);
  };

  const animateMove = (direction: number, commit: () => void) => {
    Animated.parallel([
      Animated.timing(cardOpacity, { toValue: 0.2, duration: 120, useNativeDriver: true }),
      Animated.timing(cardOffset, { toValue: direction > 0 ? -24 : 24, duration: 160, useNativeDriver: true }),
    ]).start(() => {
      commit();
      setRevealed(false);
      cardOffset.setValue(direction > 0 ? 24 : -24);
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(cardOffset, { toValue: 0, damping: 18, stiffness: 180, mass: 0.8, useNativeDriver: true }),
      ]).start();
    });
  };

  const advance = (force = false) => {
    if (!activeWork || (busy && !force)) return;
    let nextLine = lineIndex + 1;
    while (nextLine < activeWork.lines.length && masteredKeysRef.current.has(cardKey(activeWork.id, nextLine))) {
      nextLine += 1;
    }
    if (nextLine < activeWork.lines.length) {
      animateMove(1, () => setLineIndex(nextLine));
      return;
    }

    const retry = retryQueueRef.current.shift();
    if (retry && works[retry.workIndex]) {
      setRetryCount(retryQueueRef.current.length);
      animateMove(1, () => {
        setWorkIndex(retry.workIndex);
        setLineIndex(retry.lineIndex);
      });
      return;
    }

    if (workIndex + 1 < works.length) {
      animateMove(1, () => {
        setWorkIndex(workIndex + 1);
        setLineIndex(0);
      });
      return;
    }

    setFinished(true);
  };

  const move = (delta: number, force = false) => {
    if (!activeWork || (busy && !force)) return;
    if (delta > 0) {
      advance(force);
      return;
    }
    if (lineIndex > 0) {
      animateMove(-1, () => setLineIndex(lineIndex - 1));
      return;
    }
    if (workIndex > 0) {
      const previous = works[workIndex - 1];
      animateMove(-1, () => {
        setWorkIndex(workIndex - 1);
        setLineIndex(Math.max(0, previous.lines.length - 1));
      });
    }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx < -50) move(1);
      if (gesture.dx > 50) move(-1);
    },
  }), [activeWork, busy, lineIndex, workIndex, works, finished]);

  const runFeedback = (next: 'correct' | 'again') => {
    setFeedback(next);
    feedbackOpacity.setValue(0);
    feedbackScale.setValue(0.8);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(feedbackOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(feedbackScale, { toValue: 1.08, damping: 9, stiffness: 190, mass: 0.7, useNativeDriver: true }),
      ]),
      Animated.delay(340),
      Animated.timing(feedbackOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setFeedback(null));
  };

  const resolveWork = async (work: Work) => {
    if (resolvedWorksRef.current.has(work.id)) return;
    resolvedWorksRef.current.add(work.id);
    try {
      const next = await rateWork(work.id, 'good');
      await setStudyStatus(work.id, 'done', next.due.toISOString());
    } catch (error) {
      resolvedWorksRef.current.delete(work.id);
      throw error;
    }
  };

  const openInfo = async () => {
    if (!activeWork) return;
    setInfoVisible(true);
    if (context || infoLoading) return;
    setInfoLoading(true);
    setInfoError('');
    try {
      const [nextContext, nextTranslation] = await Promise.all([
        loadOrCreateContext(settings, activeWork),
        loadWholeTranslationCached(settings, activeWork).then((items) => items[lineIndex] ?? '').catch(() => ''),
      ]);
      setContext(nextContext);
      setTranslation(nextTranslation);
    } catch (error) {
      setInfoError(error instanceof Error ? error.message : '释义加载失败。');
    } finally {
      setInfoLoading(false);
    }
  };

  const closeInfo = () => {
    setInfoVisible(false);
    if (advanceAfterInfoRef.current) {
      advanceAfterInfoRef.current = false;
      setTimeout(() => advance(true), 80);
    }
  };

  const mark = async (correct: boolean) => {
    if (!activeWork || busy) return;
    setBusy(true);
    try {
      void Haptics.impactAsync(
        correct ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      ).catch(() => undefined);

      if (!correct) {
        const wasMissed = missedKeysRef.current.has(activeKey);
        missedKeysRef.current.add(activeKey);
        resolvedWorksRef.current.delete(activeWork.id);
        updateMastery(activeKey, false);
        retryQueueRef.current.push({ workIndex, lineIndex });
        setRetryCount(retryQueueRef.current.length);
        if (!wasMissed) {
          const next = await rateWork(activeWork.id, 'again');
          await setStudyStatus(activeWork.id, 'pending', next.due.toISOString());
        }
        setRevealed(true);
        runFeedback('again');
        setBusy(false);
        advanceAfterInfoRef.current = true;
        void openInfo();
        return;
      }

      updateMastery(activeKey, true);
      missedKeysRef.current.delete(activeKey);
      const workHasMiss = activeWork.lines.some((_, index) => missedKeysRef.current.has(cardKey(activeWork.id, index)))
        || retryQueueRef.current.some((card) => card.workIndex === workIndex);
      if (!workHasMiss) await resolveWork(activeWork);

      runFeedback('correct');
      setTimeout(() => {
        advance(true);
        setBusy(false);
      }, 520);
    } catch {
      setBusy(false);
    }
  };

  if (!activeWork) return null;

  if (finished) {
    return (
      <View style={styles.container}>
        <View style={styles.finishedWrap}>
          <Text style={styles.finishedTitle}>这一轮背完了</Text>
          <Text style={styles.finishedText}>没背出的句子已经全部重新答对，记录会按记忆状态安排复习。</Text>
          <Pressable onPress={onBack} style={({ pressed }) => [styles.finishedButton, pressed && styles.actionPressed]}>
            <Text style={styles.finishedButtonText}>返回背诵清单</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const overallProgress = totalLines
    ? Math.min(100, (masteredCount / totalLines) * 100)
    : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
          <Text style={styles.headerText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle}>第 {workIndex + 1} / {works.length} 首</Text>
        <Pressable onPress={onOpenSettings} style={({ pressed }) => [styles.headerButton, styles.headerRight, pressed && styles.pressed]}>
          <Text style={styles.headerText}>设置</Text>
        </Pressable>
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
      </View>

      <Pressable style={styles.focusArea} onPress={() => setRevealed((value) => !value)} {...panResponder.panHandlers}>
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateX: cardOffset }], alignItems: 'center' }}>
          <Text style={styles.focusMeta}>{activeWork.dynasty} · {activeWork.author}</Text>
          <Text style={styles.focusTitle} numberOfLines={2}>{workDisplayTitle(activeWork)}</Text>
          <View style={styles.lineStage}>
            <Text style={[styles.maskedLine, revealed && styles.maskedLineHidden]}>{maskedLine(activeLine)}</Text>
            <Animated.Text style={[styles.focusLine, { opacity: revealOpacity }]}>{activeLine}</Animated.Text>
          </View>
          <Text style={styles.tapHint}>
            {revealed ? '轻触隐藏原句' : '轻触翻开记忆'} · 左右滑动切换
          </Text>
          <Text style={styles.lineMeta}>
            第 {lineIndex + 1} / {activeWork.lines.length} 句{retryCount > 0 ? ` · 待重背 ${retryCount} 句` : ''}
          </Text>
        </Animated.View>
      </Pressable>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.feedbackOverlay,
          feedback === 'correct' ? styles.feedbackCorrect : styles.feedbackAgain,
          { opacity: feedbackOpacity, transform: [{ scale: feedbackScale }] },
        ]}
      >
        <Text style={styles.feedbackIcon}>{feedback === 'correct' ? '✓' : '✕'}</Text>
        <Text style={styles.feedbackText}>{feedback === 'correct' ? '记住了' : '已加入重背'}</Text>
      </Animated.View>

      <View style={styles.actionDock}>
        <Pressable
          disabled={busy}
          onPress={(event) => { event.stopPropagation(); void mark(false); }}
          style={({ pressed }) => [styles.actionButton, styles.againButton, pressed && styles.actionPressed, busy && styles.disabled]}
        >
          <Text style={styles.againText}>✕ 没背出</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={(event) => { event.stopPropagation(); void openInfo(); }}
          style={({ pressed }) => [styles.actionButton, styles.infoButton, pressed && styles.actionPressed, busy && styles.disabled]}
        >
          <Text style={styles.infoText}>📖 释义</Text>
        </Pressable>
        <Pressable
          disabled={busy}
          onPress={(event) => { event.stopPropagation(); void mark(true); }}
          style={({ pressed }) => [styles.actionButton, styles.goodButton, pressed && styles.actionPressed, busy && styles.disabled]}
        >
          <Text style={styles.goodText}>✓ 背对了</Text>
        </Pressable>
      </View>

      <Modal visible={infoVisible} transparent animationType="slide" onRequestClose={closeInfo}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeInfo} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <ScrollView contentContainerStyle={styles.sheetContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.sheetTitle}>{workDisplayTitle(activeWork)}</Text>
              <Text style={styles.sheetMeta}>{activeWork.dynasty} · {activeWork.author}</Text>
              <Text style={styles.sheetLabel}>本句原句</Text>
              <Text style={styles.sheetQuote}>{activeLine}</Text>
              {infoLoading ? <ActivityIndicator color={colors.vermilion} style={styles.sheetLoader} /> : null}
              {infoError ? <Text style={styles.sheetError}>{infoError}</Text> : null}
              {translation ? (
                <>
                  <Text style={styles.sheetLabel}>本句译文</Text>
                  <Text style={styles.sheetBody}>{translation}</Text>
                </>
              ) : null}
              {context ? (
                <>
                  <Text style={styles.sheetLabel}>写作背景</Text>
                  <Text style={styles.sheetBody}>{context.background}</Text>
                  <Text style={styles.sheetLabel}>表面意思</Text>
                  <Text style={styles.sheetBody}>{context.surfaceMeaning}</Text>
                  <Text style={styles.sheetLabel}>深层含义</Text>
                  <Text style={styles.sheetBody}>{context.deeperMeaning}</Text>
                  <Text style={styles.sheetLabel}>主题</Text>
                  <Text style={styles.sheetBody}>{context.theme}</Text>
                </>
              ) : null}
              {!infoLoading && !context && !translation && !infoError ? (
                <Text style={styles.sheetBody}>暂无可展示释义，请检查 API 设置后重试。</Text>
              ) : null}
              <Pressable onPress={closeInfo} style={styles.sheetClose}>
                <Text style={styles.sheetCloseText}>知道了，稍后再背</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? 42 : 54 },
  header: { height: 52, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  headerButton: { width: 76, minHeight: 44, justifyContent: 'center' },
  headerRight: { alignItems: 'flex-end' },
  headerText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.sans, fontSize: 13 },
  progressTrack: { height: 3, marginHorizontal: spacing.lg, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.line },
  progressFill: { height: 3, borderRadius: radius.pill, backgroundColor: colors.vermilion },
  focusArea: { flex: 1, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  focusMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2 },
  focusTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 28, fontWeight: '800', marginTop: 12, textAlign: 'center' },
  lineStage: { minHeight: 178, width: '100%', alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  maskedLine: { color: colors.muted, fontFamily: fonts.body, fontSize: 28, letterSpacing: 7, position: 'absolute' },
  maskedLineHidden: { opacity: 0 },
  focusLine: { color: colors.ink, fontFamily: fonts.title, fontSize: 28, lineHeight: 50, textAlign: 'center', position: 'absolute', paddingHorizontal: 8 },
  tapHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 18 },
  lineMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, marginTop: 8, letterSpacing: 1 },
  feedbackOverlay: { position: 'absolute', left: 0, right: 0, top: '35%', alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 40, borderRadius: 32, alignSelf: 'center' },
  feedbackCorrect: { backgroundColor: 'rgba(74,103,91,0.94)' },
  feedbackAgain: { backgroundColor: 'rgba(198,40,40,0.94)' },
  feedbackIcon: { color: colors.white, fontFamily: fonts.sans, fontSize: 50, fontWeight: '800' },
  feedbackText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, marginTop: 4, fontWeight: '700' },
  actionDock: { flexDirection: 'row', gap: 7, margin: spacing.md, padding: 7, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: colors.line, ...shadow },
  actionButton: { flex: 1, minHeight: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  actionPressed: { transform: [{ scale: 0.96 }] },
  againButton: { backgroundColor: '#FBE9E7' },
  goodButton: { backgroundColor: '#E8F3EC' },
  infoButton: { backgroundColor: '#F0ECE3' },
  againText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 16, fontWeight: '800' },
  goodText: { color: colors.jade, fontFamily: fonts.body, fontSize: 16, fontWeight: '800' },
  infoText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15 },
  disabled: { opacity: 0.52 },
  pressed: { opacity: 0.72 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(31,26,20,0.34)' },
  sheet: { maxHeight: '82%', backgroundColor: colors.paperLight, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: colors.line },
  sheetHandle: { width: 44, height: 3, borderRadius: radius.pill, backgroundColor: colors.line, alignSelf: 'center', marginTop: 10 },
  sheetContent: { padding: spacing.lg, paddingBottom: 36 },
  sheetTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 26, fontWeight: '800' },
  sheetMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 7 },
  sheetQuote: { color: colors.ink, fontFamily: fonts.title, fontSize: 22, lineHeight: 34, fontWeight: '700' },
  sheetLoader: { marginTop: 24 },
  sheetError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13, lineHeight: 21, marginTop: 16 },
  sheetLabel: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2, marginTop: 22, marginBottom: 7 },
  sheetBody: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16, lineHeight: 29 },
  sheetClose: { minHeight: 56, borderRadius: 14, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center', marginTop: 28 },
  sheetCloseText: { color: colors.white, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  finishedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  finishedTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 32, fontWeight: '800', textAlign: 'center' },
  finishedText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16, lineHeight: 28, textAlign: 'center', marginTop: 16 },
  finishedButton: { minHeight: 58, minWidth: 220, borderRadius: 16, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', marginTop: 32, paddingHorizontal: spacing.lg },
  finishedButtonText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, fontWeight: '800' },
});
