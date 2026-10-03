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
import { Card } from 'ts-fsrs';
import { ExplanationSheet } from '../components/ExplanationSheet';
import { AuthorSheet } from '../components/AuthorSheet';
import { FavoriteSheet } from '../components/FavoriteSheet';
import { explainWithApi } from '../services/api';
import { loadCard, rateWork } from '../services/fsrs';
import { findLocalExplanation } from '../services/localGlossary';
import { findDictionaryExplanation } from '../services/localDictionary';
import { createFavorite, createFolder, FavoriteFolder, loadFolders, saveFavorite, saveFolder } from '../services/favorites';
import { loadOrCreateContext, WorkContext } from '../services/context';
import { lookupRemoteWork } from '../services/remoteLookup';
import { saveImportedWork } from '../services/importedWorks';
import { auditWork, WorkAudit } from '../services/workAudit';
import { setStudyStatus } from '../services/studyQueue';
import { loadApiSettings } from '../services/settings';
import { AuthorInfo, loadAuthorInfo } from '../services/authorInfo';
import { loadCachedTranslation, saveCachedTranslation } from '../services/translationCache';
import { loadWholeTranslationCached } from '../services/wholeTranslationStore';
import { recordInteraction } from '../services/preference';
import { completeSentenceAroundLine, toChars } from '../services/text';
import { buildLineUnits, isLongText, unitContainingLine } from '../services/longText';
import { loadReadingProgress, markReadingUnitComplete, saveReadingProgress } from '../services/readingProgress';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings, Explanation, Work } from '../types';

type Mode = 'read' | 'prompt' | 'recite';

interface Props {
  work: Work;
  initialLineIndex?: number;
  onBack: () => void;
  onOpenSettings: () => void;
  onWorkUpdated?: (work: Work) => void;
}

const MODES: Array<{ key: Mode; label: string }> = [
  { key: 'read', label: '原文' },
  { key: 'prompt', label: '提示' },
  { key: 'recite', label: '默背' },
];

export function ReaderScreen({ work, initialLineIndex = 0, onBack, onOpenSettings, onWorkUpdated }: Props) {
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
  const [authorVisible, setAuthorVisible] = useState(false);
  const [authorLoading, setAuthorLoading] = useState(false);
  const [authorError, setAuthorError] = useState('');
  const [authorInfo, setAuthorInfo] = useState<AuthorInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastLookup, setLastLookup] = useState<{ line: number; start: number; end: number } | null>(null);
  const [selection, setSelection] = useState<{ line: number; start: number; end: number } | null>(null);
  const [unitIndex, setUnitIndex] = useState(0);
  const [completedUnits, setCompletedUnits] = useState<Set<number>>(new Set());
  const [progressReady, setProgressReady] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [reviewMessage, setReviewMessage] = useState('');
  const [favoriteLine, setFavoriteLine] = useState<number | null>(null);
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolder[]>([]);
  const [context, setContext] = useState<WorkContext | null>(null);
  const [contextVisible, setContextVisible] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [contextError, setContextError] = useState('');
  const [auditVisible, setAuditVisible] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState('');
  const [auditResult, setAuditResult] = useState<WorkAudit | null>(null);
  const [completing, setCompleting] = useState(false);
  const [applyingCorrection, setApplyingCorrection] = useState(false);
  const [wholeTranslations, setWholeTranslations] = useState<string[]>([]);
  const [wholeVisible, setWholeVisible] = useState(false);
  const [wholeLoading, setWholeLoading] = useState(false);
  const [wholeProgress, setWholeProgress] = useState(0);
  const [wholeError, setWholeError] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  const units = useMemo(() => buildLineUnits(work.lines, 72, 120, 6), [work.lines]);
  const longText = useMemo(() => work.genre !== '词' && isLongText(work.lines), [work.genre, work.lines]);
  const paginatedText = longText && units.length > 1;
  const activeUnit = paginatedText ? (units[unitIndex] ?? units[0]) : undefined;
  const progressKey = `work:${work.id}`;

  useEffect(() => {
    loadApiSettings().then(setSettings);
    loadCard(work.id).then(setCard);
    loadFolders().then(setFavoriteFolders);
    setWholeTranslations([]);
    setWholeVisible(false);
    setWholeTranslations([]);
    setWholeError('');
    setAuthorVisible(false);
    setAuthorError('');
    setAuthorInfo(null);
  }, [work.id]);

  useEffect(() => {
    const startedAt = Date.now();
    return () => { void recordInteraction(work, 'view', Date.now() - startedAt); };
  }, [lineIndex, work.id]);

  useEffect(() => {
    let alive = true;
    setMode('read');
    setProgressReady(false);
    void loadReadingProgress(progressKey).then((progress) => {
      if (!alive) return;
      const requested = initialLineIndex > 0 ? initialLineIndex : progress?.lineIndex ?? 0;
      const nextLine = Math.max(0, Math.min(work.lines.length - 1, requested));
      setLineIndex(nextLine);
      setUnitIndex(unitContainingLine(units, nextLine));
      setCompletedUnits(new Set(progress?.completedUnits ?? []));
      setProgressReady(true);
    });
    return () => { alive = false; };
  }, [initialLineIndex, progressKey, units, work.id, work.lines.length]);

  useEffect(() => {
    if (!progressReady) return;
    void saveReadingProgress(progressKey, { unitIndex, lineIndex, charIndex: 0 });
  }, [lineIndex, progressKey, progressReady, unitIndex]);

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
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      if (dictionary) {
        setExplanation(dictionary);
        setLoading(false);
        return;
      }
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
      if (dictionary) {
        setExplanation(dictionary);
      } else {
        setError(readableError(lookupError, '查词失败'));
      }
    } finally {
      setLoading(false);
    }
  };

  const scrollToLine = (index: number) => {
    const localIndex = Math.max(0, index - (activeUnit?.lineStart ?? 0));
    scrollRef.current?.scrollTo({ y: 235 + localIndex * 82, animated: true });
  };

  const selectCharacter = (targetLine: number, index: number) => {
    setLineIndex(targetLine);
    setSelection((current) => {
      if (current && current.line === targetLine && (index === current.start - 1 || index === current.end + 1)) {
        return { line: targetLine, start: Math.min(current.start, index), end: Math.max(current.end, index) };
      }
      if (current && current.line === targetLine && index >= current.start && index <= current.end && current.start === current.end) {
        void lookup(targetLine, index, index);
      }
      return { line: targetLine, start: index, end: index };
    });
  };

  const goToLine = (index: number) => {
    const next = Math.max(0, Math.min(work.lines.length - 1, index));
    setUnitIndex(unitContainingLine(units, next));
    setLineIndex(next);
    setSelection(null);
    scrollToLine(next);
  };

  const goToUnit = (nextIndex: number) => {
    const safeIndex = Math.max(0, Math.min(units.length - 1, nextIndex));
    const unit = units[safeIndex];
    if (!unit) return;
    setUnitIndex(safeIndex);
    setLineIndex(unit.lineStart);
    setSelection(null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const markCurrentUnitDone = async () => {
    await markReadingUnitComplete(progressKey, unitIndex);
    setCompletedUnits((current) => new Set([...current, unitIndex]));
    setReviewMessage(`第 ${unitIndex + 1} 节已标记为已背。`);
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

  const openAuthor = async () => {
    setAuthorVisible(true);
    setAuthorLoading(true);
    setAuthorError('');
    setAuthorInfo(null);
    try {
      const activeSettings = settings ?? await loadApiSettings();
      if (!settings) setSettings(activeSettings);
      setAuthorInfo(await loadAuthorInfo(activeSettings, work.author));
    } catch {
      setAuthorInfo({
        name: work.author,
        dynasty: work.dynasty,
        bio: `${work.author}的生平资料较少，生卒年及主要事迹多不可考。`,
        achievements: [],
        confidence: 'low',
        source: 'local',
      });
    } finally {
      setAuthorLoading(false);
    }
  };

  const markStudy = async (done: boolean) => {
    const next = await rateWork(work.id, done ? 'good' : 'again');
    setCard(next);
    await setStudyStatus(work.id, done ? 'done' : 'pending', next.due.toISOString());
    await recordInteraction(work, done ? 'completed' : 'pending');
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

  const runAudit = async () => {
    if (auditVisible) {
      setAuditVisible(false);
      return;
    }
    setAuditVisible(true);
    setAuditError('');
    if (auditResult || auditLoading) return;
    setAuditLoading(true);
    try {
      const activeSettings = settings ?? { endpoint: '', apiKey: '', model: '' };
      setAuditResult(await auditWork(activeSettings, work));
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : '校对失败。');
    } finally {
      setAuditLoading(false);
    }
  };

  const applyAuditCorrection = async () => {
    const canonical = auditResult?.canonical;
    if (!canonical) {
      setAuditError('????????????????????');
      return;
    }
    setApplyingCorrection(true);
    setAuditError('');
    try {
      const corrected: Work = {
        ...work,
        title: canonical.title || work.title,
        author: canonical.author || work.author,
        dynasty: canonical.dynasty || work.dynasty,
        genre: canonical.genre || work.genre,
        lines: canonical.lines,
        translations: [],
        glossary: [],
        titleFromFirstLine: false,
        incomplete: false,
        source: '???? ? API ???',
      };
      await saveImportedWork(corrected);
      onWorkUpdated?.(corrected);
      setAuditResult(null);
      setAuditVisible(false);
      setReviewMessage('????????????????');
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : '???????');
    } finally {
      setApplyingCorrection(false);
    }
  };

  const completeFullText = async () => {
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setAuditError('请先在“我的 → API 设置”配置接口。');
      return;
    }
    setCompleting(true);
    setAuditError('');
    try {
      const full = await lookupRemoteWork(work.title, settings);
      await saveImportedWork(full);
      onWorkUpdated?.(full);
      setAuditResult(null);
      setAuditVisible(false);
    } catch (error) {
      setAuditError(error instanceof Error ? error.message : '全文补全失败。');
    } finally {
      setCompleting(false);
    }
  };

  const toggleWholeTranslation = async () => {
    if (wholeVisible) {
      setWholeVisible(false);
      setExpandedLines(new Set());
      return;
    }
    setWholeVisible(false);
    setWholeLoading(true);
    setWholeProgress(0);
    setWholeError('');
    try {
      const result = await loadWholeTranslationCached(settings, work, setWholeProgress);
      const next: Record<number, string> = {};
      result.forEach((value, index) => { if (value?.trim()) next[index] = value.trim(); });
      if (Object.keys(next).length === 0) {
        setWholeError(settings?.endpoint.trim()
          ? 'API 没有返回有效译文，请检查模型设置或稍后重试。'
          : '还没有配置 API，暂时无法生成全篇译文。请到“我的 → API 设置”里配置。');
        return;
      }
      setTranslations((current) => ({ ...current, ...next }));
      setExpandedLines(new Set(Object.keys(next).map(Number)));
      setWholeVisible(true);
      if (Object.keys(next).length < work.lines.length) {
        setWholeError(`已生成 ${Object.keys(next).length} / ${work.lines.length} 句，其余句子可以稍后重试。`);
      }
    } catch (error) {
      setWholeError(error instanceof Error ? error.message : '全篇译文生成失败。');
    } finally {
      setWholeLoading(false);
    }
  };

  const handleFavorite = async (
    selectedFolderId: string | null,
    newFolderName: string,
  ) => {
    if (favoriteLine === null) return;
    const quote = completeSentenceAroundLine(work.lines, favoriteLine).text || work.lines[favoriteLine];
    let folderId = selectedFolderId ?? undefined;
    if (newFolderName.trim()) {
      const folder = createFolder(newFolderName.trim());
      await saveFolder(folder);
      setFavoriteFolders((current) => [...current, folder]);
      folderId = folder.id;
    }
    await recordInteraction(work, 'favorite');
    await saveFavorite(createFavorite({
      workId: work.id,
      workTitle: work.title,
      lineIndex: favoriteLine,
      quote,
      name: quote.slice(0, 18),
      tags: [],
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

      <ScrollView ref={scrollRef} contentContainerStyle={[styles.scroll, selection && styles.scrollWithSelection]} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.workTitle}>{work.title}</Text>
          <View style={styles.workMetaRow}>
            <Text style={styles.workMeta}>{work.dynasty} · </Text>
            <Pressable onPress={() => void openAuthor()}><Text style={styles.authorLink}>{work.author}</Text></Pressable>
            <Text style={styles.workMeta}> · {work.genre}</Text>
          </View>
          {work.incomplete ? <Text style={styles.incompleteNotice}>底本有缺字或“下缺”标记，当前不是完整全文。</Text> : null}
          <Pressable onPress={() => void runAudit()} style={styles.auditFloatingButton}>
            <Text style={styles.auditFloatingText}>校</Text>
          </Pressable>
        </View>
        {auditVisible ? (
          <View style={styles.auditBox}>
            {auditLoading ? <ActivityIndicator color={colors.vermilion} /> : null}
            {auditError ? <Text style={styles.auditError}>{auditError}</Text> : null}
            {auditResult ? (
              <>
                <Text style={styles.auditSummary}>{auditResult.correct ? '已与通行本逐句核对一致' : !auditResult.canonicalCompared && auditResult.issues.length === 0 ? '未获得可核对底本，无法判定' : '发现以下可疑问题'}</Text>
                <Text style={styles.auditScope}>校对范围：本地硬规则；API 返回完整通行本时，软件再逐句比对。API 未返回完整底本时不会宣称全文正确。</Text>
                {auditResult.issues.map((issue, index) => (
                  <View key={issue.field + '-' + index} style={styles.auditIssue}>
                    <Text style={styles.auditIssueField}>{issue.field === 'title' ? '题目' : issue.field === 'author' ? '作者' : '正文'}{issue.line ? ' · 第 ' + issue.line + ' 句' : ''}</Text>
                    <Text style={styles.auditIssueText}>{issue.problem}</Text>
                    {issue.suggestion ? <Text style={styles.auditSuggestion}>建议：{issue.suggestion}</Text> : null}
                  </View>
                ))}
                {auditResult.issues.length === 0 ? <Text style={styles.auditIssueText}>{auditResult.summary}</Text> : null}
                {auditResult.canonical && auditResult.issues.length > 0 ? (
                  <Pressable onPress={() => void applyAuditCorrection()} disabled={applyingCorrection} style={styles.auditCompleteButton}>
                    <Text style={styles.auditCompleteText}>{applyingCorrection ? '???????' : '???????'}</Text>
                  </Pressable>
                ) : null}
                {auditResult.incomplete ? (
                  <Pressable onPress={() => void completeFullText()} disabled={completing} style={styles.auditCompleteButton}>
                    <Text style={styles.auditCompleteText}>{completing ? '?????' : '????'}</Text>
                  </Pressable>
                ) : null}
                <Text style={styles.auditConfidence}>把握度：{auditResult.confidence}</Text>
              </>
            ) : null}
          </View>
        ) : null}

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

        <Pressable onPress={toggleWholeTranslation} style={styles.contextToggle}>
          <Text style={styles.contextToggleText}>
            {wholeLoading ? `正在生成全篇译文 ${Math.round(wholeProgress * 100)}%` : wholeVisible ? '收起全篇译文' : '一键显示全篇译文'}
          </Text>
        </Pressable>
        {wholeError ? <Text style={styles.wholeError}>{wholeError}</Text> : null}

        {work.genre !== '典籍' ? (
        <View style={styles.modeRow}>
          {MODES.map((item) => (
            <Pressable key={item.key} onPress={() => setMode(item.key)} style={styles.modeButton}>
              <Text style={[styles.modeText, mode === item.key && styles.modeTextActive]}>{item.label}</Text>
              {mode === item.key ? <View style={styles.modeUnderline} /> : null}
            </Pressable>
          ))}
        </View>
        ) : (
          <Text style={styles.classicNotice}>典籍补充阅读 · 不计入诗词背诵统计</Text>
        )}

        {paginatedText && activeUnit ? (
          <View style={styles.unitToolbar}>
            <View style={styles.unitInfo}>
              <Text style={styles.unitTitle}>第 {unitIndex + 1}/{units.length} 节</Text>
              <Text style={styles.unitMeta}>{completedUnits.has(unitIndex) ? '本节已背' : '本节待背'} · 自动保存进度</Text>
            </View>
            <View style={styles.unitActions}>
              <Pressable onPress={() => goToUnit(unitIndex - 1)} disabled={unitIndex <= 0} style={[styles.unitAction, unitIndex <= 0 && styles.disabled]}>
                <Text style={styles.unitActionText}>上一节</Text>
              </Pressable>
              <Pressable onPress={() => goToUnit(unitIndex + 1)} disabled={unitIndex >= units.length - 1} style={[styles.unitAction, unitIndex >= units.length - 1 && styles.disabled]}>
                <Text style={styles.unitActionText}>下一节</Text>
              </Pressable>
              <Pressable onPress={() => void markCurrentUnitDone()} style={styles.unitActionStrong}>
                <Text style={styles.unitActionStrongText}>{completedUnits.has(unitIndex) ? '已完成' : '标记已背'}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        <View style={styles.poem}>
          {work.lines.map((line, index) => {
            if (activeUnit && (index < activeUnit.lineStart || index > activeUnit.lineEnd)) return null;
            return (
            <React.Fragment key={`${work.id}-${index}`}>
              {work.sectionBreaks?.includes(index) ? (
                <View style={styles.sectionBreak}>
                  <View style={styles.sectionLine} />
                  <Text style={styles.sectionLabel}>下阕</Text>
                  <View style={styles.sectionLine} />
                </View>
              ) : null}
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
              selection={selection?.line === index ? selection : null}
              onSelect={(charIndex) => selectCharacter(index, charIndex)}
              onLookup={(charIndex) => lookup(index, charIndex, charIndex)}
              onLookupRange={(start, end) => lookup(index, start, end)}
              onWholeLine={() => lookup(index, 0, Math.max(0, toChars(line).length - 1))}
              onClearSelection={() => setSelection(null)}
              onLinePress={() => goToLine(index)}
              onReveal={() => revealLine(index)}
              onToggleTranslation={() => toggleTranslation(index)}
              onFavorite={() => setFavoriteLine(index)}
            />
            </React.Fragment>
            );
          })}
        </View>

        {work.genre !== '典籍' ? <View style={styles.reviewBlock}>
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
          <Text style={styles.reviewExplanation}>
            完成表示今天能独立背出，系统会把它加入复习队列，之后根据你的记忆状态安排复习；没背完则进入待背清单。
          </Text>
        </View> : null}

        <Text style={styles.source}>文本来源：{work.source}</Text>
      </ScrollView>

      {selection ? (
        <View style={styles.fixedSelectionBar}>
          <Text style={styles.fixedSelectionText} numberOfLines={1}>已选 {getSelectedText(work.lines[selection.line] ?? '', selection)}</Text>
          <View style={styles.fixedSelectionActions}>
            <Pressable onPress={() => void lookup(selection.line, selection.start, selection.end)} style={styles.fixedSelectionAction}>
              <Text style={styles.fixedSelectionActionText}>解释所选</Text>
            </Pressable>
            <Pressable onPress={() => { const end = Math.max(0, toChars(work.lines[selection.line] ?? '').length - 1); setSelection({ line: selection.line, start: 0, end }); void lookup(selection.line, 0, end); }} style={styles.fixedSelectionAction}>
              <Text style={styles.fixedSelectionActionText}>整句</Text>
            </Pressable>
            <Pressable onPress={() => setSelection(null)} style={styles.fixedSelectionAction}>
              <Text style={styles.fixedSelectionActionText}>取消</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <FavoriteSheet
        visible={favoriteLine !== null}
        quote={favoriteLine === null ? '' : (completeSentenceAroundLine(work.lines, favoriteLine).text || work.lines[favoriteLine])}
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
      <AuthorSheet
        visible={authorVisible}
        loading={authorLoading}
        error={authorError}
        author={authorInfo}
        onClose={() => setAuthorVisible(false)}
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

function getSelectedText(line: string, selection: { start: number; end: number }): string {
  return Array.from(line).slice(selection.start, selection.end + 1).join('');
}

function ReaderLine({
  line,
  index,
  current,
  mode,
  selection,
  revealed,
  expanded,
  translation,
  translationLoading,
  translationError,
  glossarySurfaces,
  onSelect,
  onLookup,
  onLookupRange,
  onWholeLine,
  onClearSelection,
  onLinePress,
  onReveal,
  onToggleTranslation,
  onFavorite,
}: {
  line: string;
  index: number;
  current: boolean;
  mode: Mode;
  selection: { start: number; end: number } | null;
  revealed: boolean;
  expanded: boolean;
  translation: string;
  translationLoading: boolean;
  translationError: boolean;
  glossarySurfaces: string[];
  onSelect: (index: number) => void;
  onLookup: (index: number) => void;
  onLookupRange: (start: number, end: number) => void;
  onWholeLine: () => void;
  onClearSelection: () => void;
  onLinePress: () => void;
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
        <Pressable onPress={onLinePress} style={styles.lineMain}>
          <Text style={styles.lineNumber}>{index + 1}</Text>
          <View style={styles.charRow}>
            {chars.map((char, charIndex) => {
              const hasNote = glossarySurfaces.some((surface) => surface.startsWith(char));
              const selected = selection && charIndex >= selection.start && charIndex <= selection.end;
              return (
                <Pressable
                  key={`${char}-${charIndex}`}
                  onPress={(event) => { event.stopPropagation(); onSelect(charIndex); }}
                  onLongPress={(event) => { event.stopPropagation(); onLookup(charIndex); }}
                  delayLongPress={380}
                  style={styles.charTouch}
                >
                  <Text style={[styles.char, selected && styles.charSelected]}>{char}</Text>
                  {hasNote ? <View style={styles.noteDot} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
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
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? 46 : 54 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerSide: { width: 70 },
  headerRight: { alignItems: 'flex-end' },
  headerAction: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 19, fontWeight: '700' },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: 70 },
  scrollWithSelection: { paddingBottom: 190 },
  unitToolbar: { marginTop: 18, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#D8CFC0', backgroundColor: '#FAF6EE' },
  unitInfo: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  unitTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 18, fontWeight: '800' },
  unitMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 5 },
  unitActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  unitAction: { flex: 1, minHeight: 36, borderRadius: 8, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paperLight },
  unitActionText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12 },
  unitActionStrong: { flex: 1.25, minHeight: 36, borderRadius: 8, backgroundColor: colors.jade, alignItems: 'center', justifyContent: 'center' },
  unitActionStrongText: { color: colors.white, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  fixedSelectionBar: { position: 'absolute', left: 14, right: 14, bottom: 14, borderRadius: 14, padding: 12, backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.vermilion, shadowColor: '#333333', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 },
  fixedSelectionText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  fixedSelectionActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  fixedSelectionAction: { flex: 1, minHeight: 42, borderRadius: 9, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  fixedSelectionActionText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
  hero: { position: 'relative', paddingTop: spacing.xl, paddingBottom: spacing.md },
  workTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 31, fontWeight: '800', letterSpacing: 2, textAlign: 'center' },
  workMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  workMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.3 },
  authorLink: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, borderBottomWidth: 1, borderBottomColor: colors.vermilion, paddingBottom: 1 },
  auditFloatingButton: { position: 'absolute', right: spacing.lg, bottom: 0, width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight, alignItems: 'center', justifyContent: 'center' },
  auditFloatingText: { color: colors.jade, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  auditBox: { marginHorizontal: spacing.lg, marginTop: 12, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight },
  auditSummary: { color: colors.ink, fontFamily: fonts.body, fontSize: 15, fontWeight: '700', marginBottom: 8 },
  auditScope: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, lineHeight: 18, marginBottom: 4 },
  auditError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  auditIssue: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  auditIssueField: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11, fontWeight: '700' },
  auditIssueText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 4 },
  auditSuggestion: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 4 },
  auditCompleteButton: { minHeight: 40, borderRadius: 12, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  auditCompleteText: { color: colors.white, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  auditConfidence: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 10 },
  contextToggle: { alignSelf: 'center', marginTop: 6, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line },
  contextToggleText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
  contextBox: { marginTop: 10, padding: 14, backgroundColor: colors.paperDeep },
  contextLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, marginTop: 10 },
  contextText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 5 },
  contextError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 8 },
  wholeTranslationBox: { marginTop: 10, padding: 14, backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.line },
  wholeError: { color: colors.danger, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginBottom: 12 },
  wholeProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  wholeProgressText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
  wholeLine: { paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  wholeOriginal: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, lineHeight: 25 },
  wholePlain: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginTop: 5 },
  modeRow: { flexDirection: 'row', justifyContent: 'center', gap: 34, marginTop: spacing.lg, marginBottom: spacing.sm },
  modeButton: { minWidth: 48, alignItems: 'center', paddingVertical: 10 },
  modeText: { color: colors.muted, fontFamily: fonts.body, fontSize: 16, letterSpacing: 2 },
  modeTextActive: { color: colors.ink, fontWeight: '700' },
  modeUnderline: { width: 24, height: 2, backgroundColor: colors.vermilion, marginTop: 6 },
  poem: { marginTop: spacing.md },
  sectionBreak: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, marginBottom: 10, paddingHorizontal: 10 },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  sectionLabel: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, letterSpacing: 3 },
  classicNotice: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, textAlign: 'center', marginVertical: 18 },
  incompleteNotice: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 10, marginHorizontal: spacing.lg },
  lineBlock: { marginVertical: 3, paddingVertical: 8, paddingHorizontal: 8, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  currentLineBlock: { borderLeftColor: colors.vermilion, backgroundColor: 'rgba(163, 52, 42, 0.035)' },
  lineMain: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 46 },
  lineNumber: { width: 30, color: colors.muted, fontFamily: fonts.sans, fontSize: 11, textAlign: 'center', marginTop: 8 },
  charRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  charTouch: { minWidth: 28, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  char: { color: colors.ink, fontFamily: fonts.body, fontSize: 22, lineHeight: 36 },
  charSelected: { color: colors.vermilion, backgroundColor: '#F4E2DC' },
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
  selectionActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginLeft: 30, marginTop: 8 },
  selectionText: { width: '100%', color: colors.vermilion, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  selectionAction: { flexGrow: 1, minWidth: '28%', minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.vermilion, paddingHorizontal: 8 },
  selectionActionText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 14 },
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
  reviewExplanation: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, marginTop: 9 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 17, marginTop: spacing.xl },
});

