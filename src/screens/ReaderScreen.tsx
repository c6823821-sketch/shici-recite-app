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
import { FavoriteSheet } from '../components/FavoriteSheet';
import { explainWithApi } from '../services/api';
import { loadCard, rateWork } from '../services/fsrs';
import { findLocalExplanation } from '../services/localGlossary';
import { findDictionaryExplanation } from '../services/localDictionary';
import { createFavorite, createFolder, FavoriteFolder, loadFolders, saveFavorite, saveFolder } from '../services/favorites';
import { loadOrCreateContext, WorkContext } from '../services/context';
import { setStudyStatus } from '../services/studyQueue';
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
  const [lastLookup, setLastLookup] = useState<{ line: number; start: number; end: number } | null>(null);
  const [lastCharIndex, setLastCharIndex] = useState<number | null>(null);
  const [pendingWordStart, setPendingWordStart] = useState<number | null>(null);
  const [card, setCard] = useState<Card | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [favoriteLine, setFavoriteLine] = useState<number | null>(null);
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolder[]>([]);
  const [context, setContext] = useState<WorkContext | null>(null);
  const [contextVisible, setContextVisible] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadApiSettings().then(setSettings);
    loadCard(work.id).then(setCard);
    loadFolders().then(setFavoriteFolders);
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
    setLastLookup({ line: targetLine, start, end });
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

    const dictionary = findDictionaryExplanation(work, targetLine, start, end);
    if (dictionary) {
      setExplanation(dictionary);
      setLoading(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
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

  const scrollToLine = (index: number) => {
    scrollRef.current?.scrollTo({ y: 215 + index * 82, animated: true });
  };

  const handleCharPress = (index: number) => {
    setLastCharIndex(index);
    if (pendingWordStart !== null) {
      const start = Math.min(pendingWordStart, index);
      const end = Math.max(pendingWordStart, index);
      setPendingWordStart(null);
      void lookup(lineIndex, start, end);
      return;
    }
    void lookup(lineIndex, index, index);
  };

  const goToLine = (index: number) => {
    const next = Math.max(0, Math.min(work.lines.length - 1, index));
    setLineIndex(next);
    setPendingWordStart(null);
    setLastCharIndex(null);
    scrollToLine(next);
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

  const markStudy = async (done: boolean) => {
    await setStudyStatus(work.id, done ? 'done' : 'pending');
    const next = await rateWork(work.id, done ? 'good' : 'again');
    setCard(next);
    setReviewMessage(done ? '已完成，进入复习队列。' : '已加入待背清单，下次继续。');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  };

  const toggleContext = async () => {
    if (contextVisible) {
      setContextVisible(false);
      return;
    }
    setContextVisible(true);
    if (context) return;
    setContextLoading(true);
    setContextError('');
    try {
      const next = await loadOrCreateContext(settings, work);
      setContext(next);
    } catch (contextFailure) {
      setContextError(contextFailure instanceof Error ? contextFailure.message : '背景赏析加载失败。');
    } finally {
      setContextLoading(false);
    }
  };

  const handleFavorite = async (
    name: string,
    tagsText: string,
    selectedFolderId: string | null,
    newFolderName: string,
  ) => {
    if (favoriteLine === null) return;
    let folderId = selectedFolderId ?? undefined;
    if (newFolderName.trim()) {
      const folder = createFolder(newFolderName.trim());
      await saveFolder(folder);
      setFavoriteFolders((current) => [...current, folder]);
      folderId = folder.id;
    }
    await saveFavorite(createFavorite({
      workId: work.id,
      workTitle: work.title,
      lineIndex: favoriteLine,
      quote: work.lines[favoriteLine],
      name,
      tags: tagsText.split(/[,，\s]+/).filter(Boolean),
      folderId,
    }));
    setFavoriteLine(null);
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

        <Pressable onPress={toggleContext} style={styles.contextToggle}>
          <Text style={styles.contextToggleText}>{contextVisible ? '收起背景与赏析' : '背景 · 主旨 · 赏析'}</Text>
        </Pressable>
        {contextVisible ? (
          <View style={styles.contextBox}>
            {contextLoading ? <ActivityIndicator color={colors.vermilion} /> : null}
            {context ? (
              <>
                <Text style={styles.contextLabel}>写作背景</Text>
                <Text style={styles.contextText}>{context.background}</Text>
                <Text style={styles.contextLabel}>表面意思</Text>
                <Text style={styles.contextText}>{context.surfaceMeaning}</Text>
                <Text style={styles.contextLabel}>深层含义</Text>
                <Text style={styles.contextText}>{context.deeperMeaning}</Text>
                <Text style={styles.contextLabel}>主题</Text>
                <Text style={styles.contextText}>{context.theme}</Text>
              </>
            ) : null}
            {contextError ? <Text style={styles.contextError}>{contextError}</Text> : null}
          </View>
        ) : null}

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
              onSelect={(charIndex) => handleCharPress(charIndex)}
              onReveal={() => revealLine(index)}
              onToggleTranslation={() => toggleTranslation(index)}
              onFavorite={() => setFavoriteLine(index)}
            />
          ))}
        </View>

        <View style={styles.reviewBlock}>
          <Text style={styles.reviewTitle}>这一首背得怎么样？</Text>
          <Text style={styles.reviewHint}>完成就打勾；没背完就放进待背清单，下次继续。</Text>
          <View style={styles.ratingRow}>
            <Pressable style={[styles.ratingButton, styles.doneButton]} onPress={() => markStudy(true)}>
              <Text style={styles.doneText}>✓ 完成背诵</Text>
            </Pressable>
            <Pressable style={styles.ratingButton} onPress={() => markStudy(false)}>
              <Text style={styles.ratingText}>加入待背清单</Text>
            </Pressable>
          </View>
          {reviewMessage ? <Text style={styles.reviewMessage}>{reviewMessage}</Text> : null}
        </View>

        <Text style={styles.source}>文本来源：{work.source}</Text>
      </ScrollView>

      <View style={styles.lineToolbar}>
        <Pressable style={styles.lineToolbarButton} onPress={() => goToLine(lineIndex - 1)}>
          <Text style={styles.lineToolbarText}>上一句</Text>
        </Pressable>
        <Pressable style={styles.lineToolbarButton} onPress={() => lookup(lineIndex, 0, Math.max(0, toChars(work.lines[lineIndex]).length - 1))}>
          <Text style={styles.lineToolbarText}>整句释义</Text>
        </Pressable>
        <Pressable
          style={[styles.lineToolbarButton, pendingWordStart !== null && styles.lineToolbarActive]}
          onPress={() => setPendingWordStart(lastCharIndex ?? 0)}
        >
          <Text style={[styles.lineToolbarText, pendingWordStart !== null && styles.lineToolbarActiveText]}>
            {pendingWordStart === null ? '选两个字' : '再点一个字'}
          </Text>
        </Pressable>
        <Pressable style={styles.lineToolbarButton} onPress={() => goToLine(lineIndex + 1)}>
          <Text style={styles.lineToolbarText}>下一句</Text>
        </Pressable>
      </View>

      <FavoriteSheet
        visible={favoriteLine !== null}
        quote={favoriteLine === null ? '' : work.lines[favoriteLine]}
        folders={favoriteFolders}
        onClose={() => setFavoriteLine(null)}
        onSave={handleFavorite}
      />

      <ExplanationSheet
        visible={sheetVisible}
        loading={loading}
        error={error}
        explanation={explanation}
        onClose={() => setSheetVisible(false)}
        onRetry={lastLookup ? () => lookup(lastLookup.line, lastLookup.start, lastLookup.end) : undefined}
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
  onFavorite,
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
  onFavorite: () => void;
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

      <View style={styles.lineActions}>
        <Pressable onPress={onToggleTranslation} style={styles.translationToggle}>
          {translationLoading ? <ActivityIndicator size="small" color={colors.vermilion} /> : (
            <Text style={styles.translationToggleText}>{expanded ? '收起译文' : translation ? '查看译文' : '生成译文'}</Text>
          )}
        </Pressable>
        <Pressable onPress={onFavorite} style={styles.favoriteButton}>
          <Text style={styles.favoriteText}>☆ 收藏</Text>
        </Pressable>
      </View>
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
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 150 },
  hero: { paddingTop: spacing.xl, paddingBottom: spacing.md },
  workTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 31, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  workMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.3, textAlign: 'center', marginTop: 10 },
  contextToggle: { alignSelf: 'center', marginTop: 6, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line },
  contextToggleText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
  contextBox: { marginTop: 10, padding: 14, backgroundColor: colors.paperDeep },
  contextLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, marginTop: 10 },
  contextText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 5 },
  contextError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 8 },
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
  lineActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 30, marginTop: 2, gap: 18 },
  translationToggle: { paddingVertical: 4, paddingHorizontal: 2 },
  favoriteButton: { paddingVertical: 4, paddingHorizontal: 2 },
  translationToggleText: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11, borderBottomWidth: 1, borderBottomColor: colors.vermilion, paddingBottom: 2 },
  favoriteText: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, borderBottomWidth: 1, borderBottomColor: colors.jade, paddingBottom: 2 },
  translationText: { marginLeft: 30, marginTop: 6, color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23 },
  translationError: { marginLeft: 30, marginTop: 6, color: colors.danger, fontFamily: fonts.sans, fontSize: 11, lineHeight: 18 },
  lineToolbar: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8, backgroundColor: colors.paperLight, borderTopWidth: 1, borderTopColor: colors.line },
  lineToolbarButton: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paper },
  lineToolbarActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  lineToolbarText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  lineToolbarActiveText: { color: colors.vermilion, fontWeight: '700' },
  reviewBlock: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  reviewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 20, fontWeight: '700' },
  reviewHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, marginTop: 8 },
  planButton: { marginTop: 12, borderBottomWidth: 1, borderBottomColor: colors.vermilion, alignSelf: 'flex-start', paddingBottom: 3 },
  planButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
  ratingRow: { flexDirection: 'row', gap: 7, marginTop: spacing.md },
  ratingButton: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 2, backgroundColor: colors.paperLight },
  ratingText: { color: colors.ink, fontFamily: fonts.body, fontSize: 15 },
  doneButton: { backgroundColor: colors.vermilion, borderColor: colors.vermilion },
  doneText: { color: colors.white, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  reviewMessage: { color: colors.jade, fontFamily: fonts.sans, fontSize: 13, marginTop: 10 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 17, marginTop: spacing.xl },
});
