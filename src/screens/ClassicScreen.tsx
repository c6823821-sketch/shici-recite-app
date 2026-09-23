import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CLASSICS } from '../data/classics';
import { translateClassicSection } from '../services/classicTranslation';
import { splitClassicText, paginateClassicSegments } from '../services/classicText';
import { findDictionaryExplanation } from '../services/localDictionary';
import { explainWithApi } from '../services/api';
import { createFavorite, createFolder, FavoriteFolder, loadFolders, saveFavorite, saveFolder } from '../services/favorites';
import { loadApiSettings } from '../services/settings';
import { ExplanationSheet } from '../components/ExplanationSheet';
import { FavoriteSheet } from '../components/FavoriteSheet';
import { Classic, Explanation, Work } from '../types';
import { colors, fonts, spacing } from '../theme';

interface Props {
  classic: Classic | null;
  sectionIndex?: number;
  initialSegmentIndex?: number;
  onClassicChange: (classic: Classic | null) => void;
  onSectionChange: (sectionIndex?: number) => void;
  onBack: () => void;
}

interface CharacterSelection {
  segmentIndex: number;
  start: number;
  end: number;
}

function readableTranslationError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('还没有配置 API')) {
    return '还没有配置 API。请到“我的 → API 设置”配置后再生成白话。';
  }
  if (message.includes('Failed to fetch') || message.includes('Network request failed')) {
    return '网络请求失败，请检查手机网络和 API 地址。';
  }
  if (message.includes('返回为空')) return 'API 返回了空内容，请稍后重试。';
  return `白话生成失败：${message}`;
}

function selectedTextFor(line: string, selection: CharacterSelection): string {
  return Array.from(line).slice(selection.start, selection.end + 1).join('');
}

export function ClassicScreen({ classic, sectionIndex, initialSegmentIndex, onClassicChange, onSectionChange, onBack }: Props) {
  const [page, setPage] = useState(0);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [openTranslations, setOpenTranslations] = useState<Set<number>>(new Set());
  const [translationLoading, setTranslationLoading] = useState<Set<number>>(new Set());
  const [translationErrors, setTranslationErrors] = useState<Record<number, string>>({});
  const [pageMessage, setPageMessage] = useState('');
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof loadApiSettings>>>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [selection, setSelection] = useState<CharacterSelection | null>(null);
  const [favoriteSegment, setFavoriteSegment] = useState<number | null>(null);
  const [favoriteFolders, setFavoriteFolders] = useState<FavoriteFolder[]>([]);
  const [favoriteMessage, setFavoriteMessage] = useState('');
  const selectionRef = useRef<CharacterSelection | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const section = classic && sectionIndex !== undefined ? classic.sections[sectionIndex] : null;
  const segments = useMemo(() => (section ? splitClassicText(section.text) : []), [section]);
  const pages = useMemo(() => paginateClassicSegments(segments), [segments]);
  const pageCount = Math.max(1, pages.length);
  const safePage = Math.min(page, pageCount - 1);
  const visibleSegments = pages[safePage] ?? [];
  const pageStart = useMemo(
    () => pages.slice(0, safePage).reduce((total, current) => total + current.length, 0),
    [pages, safePage],
  );
  const visibleIndexes = useMemo(
    () => visibleSegments.map((_, offset) => pageStart + offset),
    [pageStart, visibleSegments],
  );
  const visibleChars = visibleSegments.reduce((total, item) => total + item.text.length, 0);
  const allVisibleTranslationsOpen = visibleIndexes.length > 0
    && visibleIndexes.every((index) => openTranslations.has(index));
  const visibleTranslationLoading = visibleIndexes.some((index) => translationLoading.has(index));

  useEffect(() => {
    setPage(0);
    setTranslations({});
    setOpenTranslations(new Set());
    setTranslationErrors({});
    setPageMessage('');
    setSelection(null);
    selectionRef.current = null;
    setFavoriteSegment(null);
    setFavoriteMessage('');
    setExplanation(null);
    setSheetVisible(false);
    loadApiSettings().then(setSettings);
    loadFolders().then(setFavoriteFolders);
  }, [classic?.id, sectionIndex]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [page, classic?.id, sectionIndex]);

  useEffect(() => {
    if (initialSegmentIndex === undefined || pages.length === 0) return;
    let cursor = 0;
    for (let index = 0; index < pages.length; index += 1) {
      if (initialSegmentIndex < cursor + pages[index].length) {
        setPage(index);
        return;
      }
      cursor += pages[index].length;
    }
  }, [initialSegmentIndex, pages]);

  if (!classic) {
    return (
      <View style={styles.container}>
        <Header title="典籍补充" onBack={onBack} />
        <ScrollView contentContainerStyle={styles.list}>
          {CLASSICS.map((item) => (
            <Pressable key={item.id} onPress={() => onClassicChange(item)} style={styles.classicRow}>
              <Text style={styles.classicTitle}>{item.title}</Text>
              <Text style={styles.classicMeta}>{item.kind === '名句' ? '名句补充' : item.category} · {item.author} · {item.sections.length} 篇</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (sectionIndex === undefined || !section) {
    return (
      <View style={styles.container}>
        <Header title={classic.title} onBack={() => onClassicChange(null)} />
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.directoryHint}>{classic.kind === '名句' ? '名句补充' : `${classic.category}典籍`} · 选择篇目开始阅读</Text>
          {classic.sections.map((sectionItem, index) => (
            <Pressable key={`${classic.id}-${index}`} onPress={() => onSectionChange(index)} style={styles.chapterRow}>
              <Text style={styles.chapterTitle}>{sectionItem.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const temporaryWork: Work = {
    id: `classic-${classic.id}-${sectionIndex}`,
    title: `${classic.title}·${section.title}`,
    author: classic.author,
    dynasty: classic.category,
    genre: '典籍',
    collections: ['典籍', classic.title],
    themes: ['典籍', classic.category],
    moods: [],
    intro: '',
    source: classic.source,
    lines: segments.map((item) => item.text),
    translations: [],
    glossary: [],
  };

  const translateSegment = async (segmentIndex: number, show = true): Promise<boolean> => {
    const existing = translations[segmentIndex];
    if (existing) {
      if (show) setOpenTranslations((current) => new Set(current).add(segmentIndex));
      return true;
    }

    const activeSettings = settings ?? await loadApiSettings();
    if (!settings) setSettings(activeSettings);
    if (!activeSettings?.endpoint.trim() || !activeSettings.model.trim()) {
      setTranslationErrors((current) => ({
        ...current,
        [segmentIndex]: '还没有配置 API。请到“我的 → API 设置”配置后再生成白话。',
      }));
      return false;
    }

    setTranslationLoading((current) => new Set(current).add(segmentIndex));
    setTranslationErrors((current) => {
      const next = { ...current };
      delete next[segmentIndex];
      return next;
    });
    try {
      const result = await translateClassicSection(
        activeSettings,
        `${classic.id}-${sectionIndex}-${segmentIndex}`,
        `${classic.title}·${section.title}`,
        segments[segmentIndex].text,
      );
      setTranslations((current) => ({ ...current, [segmentIndex]: result }));
      if (show) setOpenTranslations((current) => new Set(current).add(segmentIndex));
      return true;
    } catch (error) {
      setTranslationErrors((current) => ({
        ...current,
        [segmentIndex]: readableTranslationError(error),
      }));
      return false;
    } finally {
      setTranslationLoading((current) => {
        const next = new Set(current);
        next.delete(segmentIndex);
        return next;
      });
    }
  };

  const toggleSegmentTranslation = async (segmentIndex: number) => {
    if (openTranslations.has(segmentIndex)) {
      setOpenTranslations((current) => {
        const next = new Set(current);
        next.delete(segmentIndex);
        return next;
      });
      return;
    }
    await translateSegment(segmentIndex, true);
  };

  const togglePageTranslations = async () => {
    setPageMessage('');
    if (allVisibleTranslationsOpen) {
      setOpenTranslations((current) => {
        const next = new Set(current);
        visibleIndexes.forEach((index) => next.delete(index));
        return next;
      });
      return;
    }

    const completed: number[] = [];
    for (const index of visibleIndexes) {
      const ok = await translateSegment(index, false);
      if (!ok) {
        setPageMessage('本页部分白话没有生成，请检查上面的提示后重试。');
        break;
      }
      completed.push(index);
    }
    if (completed.length > 0) {
      setOpenTranslations((current) => new Set([...current, ...completed]));
    }
  };

  const lookupRange = async (targetSegmentIndex: number, start: number, end: number) => {
    setSheetVisible(true);
    setLookingUp(true);
    setLookupError('');
    setExplanation(null);
    const dictionary = findDictionaryExplanation(temporaryWork, targetSegmentIndex, start, end);
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      if (dictionary) setExplanation(dictionary);
      else setLookupError('这处字义暂未收录。请先在“我的 → API 设置”配置接口。');
      setLookingUp(false);
      return;
    }
    try {
      const result = await explainWithApi(settings, {
        work: temporaryWork,
        lineIndex: targetSegmentIndex,
        selectionStart: start,
        selectionEnd: end,
      });
      setExplanation(result);
    } catch (error) {
      if (dictionary) setExplanation(dictionary);
      else setLookupError(error instanceof Error ? error.message : '查询失败。');
    } finally {
      setLookingUp(false);
    }
  };

  const selectCharacter = (segmentIndexValue: number, charIndex: number) => {
    const current = selectionRef.current;
    let next: CharacterSelection;

    if (current?.segmentIndex === segmentIndexValue && charIndex === current.start && charIndex === current.end) {
      next = current;
    } else if (
      current?.segmentIndex === segmentIndexValue
      && (charIndex === current.start - 1 || charIndex === current.end + 1)
    ) {
      next = {
        segmentIndex: segmentIndexValue,
        start: Math.min(current.start, charIndex),
        end: Math.max(current.end, charIndex),
      };
    } else {
      next = { segmentIndex: segmentIndexValue, start: charIndex, end: charIndex };
    }

    selectionRef.current = next;
    setSelection(next);
  };

  const clearSelection = () => {
    selectionRef.current = null;
    setSelection(null);
  };

  const favoriteQuote = favoriteSegment === null ? '' : segments[favoriteSegment]?.text ?? '';

  const saveFavoriteForSegment = async (selectedFolderId: string | null, newFolderName: string) => {
    if (favoriteSegment === null || !favoriteQuote) return;
    let folderId = selectedFolderId ?? undefined;
    if (newFolderName.trim()) {
      const folder = createFolder(newFolderName.trim());
      await saveFolder(folder);
      setFavoriteFolders((current) => [...current, folder]);
      folderId = folder.id;
    }
    await saveFavorite(createFavorite({
      workId: `classic-${classic.id}-${sectionIndex}`,
      workTitle: `${classic.title}\u00b7${section.title}`,
      lineIndex: favoriteSegment,
      quote: favoriteQuote,
      name: favoriteQuote.slice(0, 18),
      tags: [],
      folderId,
    }));
    setFavoriteSegment(null);
    setFavoriteMessage('\u5df2\u52a0\u5165\u6536\u85cf\u3002');
  };

  return (
    <View style={styles.container}>
      <Header title={classic.title} onBack={() => onSectionChange(undefined)} />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.reader} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.readerTitle}>{section.title}</Text>
          <Text style={styles.readerMeta}>{classic.author} · {classic.kind === '名句' ? '名句补充' : `${classic.category}典籍`}</Text>
          {classic.note ? <Text style={styles.note}>{classic.note}</Text> : null}
          <View style={styles.heroRule} />
          <View style={styles.pageToolbar}>
            <Pressable
              onPress={togglePageTranslations}
              disabled={visibleTranslationLoading}
              style={[styles.pageTranslateButton, visibleTranslationLoading && styles.disabled]}
            >
              {visibleTranslationLoading ? (
                <ActivityIndicator size="small" color={colors.vermilion} />
              ) : (
                <Text style={styles.pageTranslateText}>
                  {allVisibleTranslationsOpen ? '收起本页白话' : '一键本页白话'}
                </Text>
              )}
            </Pressable>
            <Text style={styles.pageMeta}>{visibleSegments.length} 段 · 本页 {visibleChars} 字</Text>
          </View>
          {pageMessage ? <Text style={styles.pageMessage}>{pageMessage}</Text> : null}
          {favoriteMessage ? <Text style={styles.favoriteMessage}>{favoriteMessage}</Text> : null}
        </View>

        {visibleSegments.map((segment, offset) => {
          const segmentIndex = pageStart + offset;
          const chars = Array.from(segment.text);
          const translation = translations[segmentIndex];
          const translationOpen = openTranslations.has(segmentIndex);
          const isLoading = translationLoading.has(segmentIndex);
          const isHighlighted = segment.highlights.length > 0;
          const selectionHere = selection?.segmentIndex === segmentIndex ? selection : null;

          return (
            <View key={`${sectionIndex}-${segmentIndex}-${segment.text.slice(0, 8)}`} style={[styles.segmentBlock, isHighlighted && styles.segmentHighlight]}>
              {isHighlighted ? (
                <Text style={styles.highlightLabel}>名句 · {segment.highlights[0]}</Text>
              ) : null}
              <View style={styles.charRow}>
                {chars.map((char, charIndex) => {
                  const selectable = /[\u3400-\u9FFF]/.test(char);
                  const selected = Boolean(
                    selectionHere
                    && charIndex >= selectionHere.start
                    && charIndex <= selectionHere.end,
                  );
                  if (!selectable) {
                    return <Text key={`${char}-${charIndex}`} style={styles.charPunctuation}>{char}</Text>;
                  }
                  return (
                    <Pressable
                      key={`${char}-${charIndex}`}
                      onPress={() => selectCharacter(segmentIndex, charIndex)}
                      style={[styles.charTouch, selected && styles.charTouchSelected]}
                    >
                      <Text style={[styles.char, selected && styles.charSelected]}>{char}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {selectionHere ? (
                <View style={styles.selectionBar}>
                  <Text style={styles.selectionText} numberOfLines={1}>已选：{selectedTextFor(segment.text, selectionHere)}</Text>
                  <View style={styles.selectionActions}>
                    <Pressable onPress={() => void lookupRange(segmentIndex, selectionHere.start, selectionHere.end)} style={styles.selectionAction}>
                      <Text style={styles.selectionActionText}>根据上下文解释</Text>
                    </Pressable>
                    <Pressable onPress={clearSelection} style={styles.selectionAction}>
                      <Text style={styles.selectionActionMuted}>取消</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              <View style={styles.segmentFooter}>
                <View style={styles.segmentActions}>
                  <Pressable onPress={() => void toggleSegmentTranslation(segmentIndex)} style={styles.sentenceTranslate}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color={colors.vermilion} />
                    ) : (
                      <Text style={styles.sentenceTranslateText}>{translationOpen ? '\u6536\u8d77\u767d\u8bdd' : '\u67e5\u770b\u767d\u8bdd'}</Text>
                    )}
                  </Pressable>
                  <Pressable onPress={() => setFavoriteSegment(segmentIndex)} style={styles.favoriteButton}>
                    <Text style={styles.favoriteButtonText}>{'\u6536\u85cf\u672c\u6bb5'}</Text>
                  </Pressable>
                </View>
                {translationOpen && translation ? (
                  <View style={styles.translationPanel}>
                    <Text style={styles.translationLabel}>{'\u767d\u8bdd'}</Text>
                    <Text style={styles.sentenceTranslation}>{translation}</Text>
                  </View>
                ) : null}
              </View>

              {translationErrors[segmentIndex] ? (
                <Text style={styles.translationError}>{translationErrors[segmentIndex]}</Text>
              ) : null}
            </View>
          );
        })}

        <View style={styles.pager}>
          <Pressable
            disabled={safePage === 0}
            onPress={() => setPage((value) => Math.max(0, value - 1))}
            style={[styles.pagerButton, safePage === 0 && styles.disabled]}
          >
            <Text style={styles.pagerText}>上一页</Text>
          </Pressable>
          <Text style={styles.pagerInfo}>{safePage + 1} / {pageCount}</Text>
          <Pressable
            disabled={safePage >= pageCount - 1}
            onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
            style={[styles.pagerButton, safePage >= pageCount - 1 && styles.disabled]}
          >
            <Text style={styles.pagerText}>下一页</Text>
          </Pressable>
        </View>
        <Text style={styles.source}>来源：{classic.source}</Text>
      </ScrollView>
      <ExplanationSheet
        visible={sheetVisible}
        loading={lookingUp}
        error={lookupError}
        explanation={explanation}
        onClose={() => setSheetVisible(false)}
      />
      <FavoriteSheet
        visible={favoriteSegment !== null}
        quote={favoriteQuote}
        folders={favoriteFolders}
        onClose={() => setFavoriteSegment(null)}
        onSave={saveFavoriteForSegment}
      />
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerSide}><Text style={styles.backText}>‹ 返回</Text></Pressable>
      <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
      <View style={styles.headerSide} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 46 : 54 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerSide: { width: 72 },
  backText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 21, fontWeight: '700' },
  list: { padding: spacing.lg, paddingBottom: 80 },
  classicRow: { minHeight: 84, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  classicTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 24, fontWeight: '700' },
  classicMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 7 },
  directoryHint: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, marginBottom: 12 },
  chapterRow: { minHeight: 58, justifyContent: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  chapterTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 18 },
  reader: { paddingHorizontal: spacing.lg, paddingBottom: 110 },
  hero: { paddingTop: spacing.lg, paddingBottom: 4 },
  readerTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 30, fontWeight: '800' },
  readerMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 9 },
  note: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 10 },
  heroRule: { height: 1, backgroundColor: colors.line, marginTop: 18 },
  pageToolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 14 },
  pageTranslateButton: { minHeight: 42, minWidth: 126, borderWidth: 1, borderColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: colors.paperLight },
  pageTranslateText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  pageMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  pageMessage: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 8 },
  segmentBlock: { marginTop: 24, paddingLeft: 14, paddingRight: 4, borderLeftWidth: 2, borderLeftColor: 'transparent' },
  segmentHighlight: { borderLeftColor: colors.vermilion, backgroundColor: '#F8F0E3', paddingTop: 13, paddingBottom: 13, paddingRight: 12 },
  highlightLabel: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.5, marginBottom: 9 },
  charRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end' },
  charTouch: { minWidth: 21, minHeight: 39, alignItems: 'center', justifyContent: 'center' },
  charTouchSelected: { backgroundColor: '#E8D6C7' },
  char: { color: colors.ink, fontFamily: fonts.body, fontSize: 20, lineHeight: 34 },
  charSelected: { color: colors.vermilionDark, fontWeight: '700' },
  charPunctuation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 18, lineHeight: 34 },
  selectionBar: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 9, marginTop: 8 },
  selectionText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  selectionActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  selectionAction: { minHeight: 36, minWidth: 86, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  selectionActionText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, fontWeight: '700' },
  selectionActionMuted: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  segmentFooter: { marginTop: 5 },
  segmentActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  favoriteButton: { minHeight: 34, justifyContent: 'center', paddingVertical: 3 },
  favoriteButtonText: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, borderBottomWidth: 1, borderBottomColor: colors.jade, paddingBottom: 2 },
  favoriteMessage: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 8 },
  sentenceTranslate: { alignSelf: 'flex-start', minHeight: 34, justifyContent: 'center', paddingVertical: 3 },
  sentenceTranslateText: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 12, borderBottomWidth: 1, borderBottomColor: colors.vermilion, paddingBottom: 2 },
  translationPanel: { marginTop: 10, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.line },
  translationLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 2, marginBottom: 5 },
  sentenceTranslation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 25 },
  translationError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 11, lineHeight: 18, marginTop: 7 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 34 },
  pagerButton: { minWidth: 82, minHeight: 42, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paperLight },
  pagerText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  pagerInfo: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  disabled: { opacity: 0.3 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 18, marginTop: 36 },
});
