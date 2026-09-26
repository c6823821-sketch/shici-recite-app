import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { FilterSheet } from '../components/FilterSheet';
import { CategoryBrowser, DimensionKey } from '../components/CategoryBrowser';
import { loadWorksCatalog } from '../data/worksCatalog';
import { CLASSICS } from '../data/classics';
import { loadImportedWorks, saveImportedWork } from '../services/importedWorks';
import { lookupRemoteWork } from '../services/remoteLookup';
import { canonicalWorkContentKey, canonicalWorkKey } from '../data/corrections';
import { splitClassicText } from '../services/classicText';
import { getStoredValue, loadApiSettings, setStoredValue } from '../services/settings';
import { ERA_ORDER, ERAS, FILTER_GROUPS, FilterKey, FilterState } from '../data/taxonomy';
import { colors, fonts, radius, spacing } from '../theme';
import { ApiSettings, Classic, ClassicSection, Work } from '../types';

interface Props {
  onOpenWork: (work: Work, lineIndex?: number) => void;
  onOpenClassic: (classic: Classic, sectionIndex?: number, segmentIndex?: number, fromSearch?: boolean) => void;
  onOpenSettings: () => void;
}

const EMPTY_FILTERS: FilterState = { eras: [], genres: [], collections: [], themes: [], moods: [] };
const SEARCH_HISTORY_KEY = 'search_history_v1';

type SearchTab = 'sentence' | 'work' | 'author';

type LibraryListItem =
  | { kind: 'work'; work: Work }
  | { kind: 'line'; work: Work; lineIndex: number; line: string }
  | { kind: 'classic'; classic: Classic; section: ClassicSection; sectionIndex: number; segmentIndex: number };

function normalizeSearch(value: string): string {
  return value.replace(/[唯惟]/g, '惟').replace(/[\s，。！？；：、,.!?;:'"“”‘’《》〈〉()（）]/g, '');
}

function matchesDimension(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function LibraryScreen({ onOpenWork, onOpenClassic, onOpenSettings }: Props) {
  const [query, setQuery] = useState('');
  const [searchTab, setSearchTab] = useState<SearchTab>('sentence');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [dimension, setDimension] = useState<FilterKey>('themes');
  const [categoryVisible, setCategoryVisible] = useState(false);
  const [categoryMode, setCategoryMode] = useState<DimensionKey>('themes');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [importedWorks, setImportedWorks] = useState<Work[]>([]);
  const [catalog, setCatalog] = useState<Work[]>([]);
  const [catalogReady, setCatalogReady] = useState(false);
  const [settings, setSettings] = useState<ApiSettings | null>(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteMessage, setRemoteMessage] = useState('');
  const attemptedRemoteQuery = useRef('');

  useEffect(() => {
    loadImportedWorks().then(setImportedWorks);
    loadWorksCatalog().then((value) => { setCatalog(value); setCatalogReady(true); });
    loadApiSettings().then(setSettings);
    getStoredValue(SEARCH_HISTORY_KEY).then((raw) => {
      if (!raw) return;
      try { setSearchHistory(JSON.parse(raw) as string[]); } catch { /* ignore */ }
    });
  }, []);

  const allWorks = useMemo(() => {
    const seen = new Set<string>();
    const seenContent = new Set<string>();
    return [...catalog, ...importedWorks].filter((work) => {
      const key = canonicalWorkKey(work);
      const contentKey = canonicalWorkContentKey(work);
      if (seen.has(key) || seenContent.has(contentKey)) return false;
      seen.add(key);
      seenContent.add(contentKey);
      return true;
    });
  }, [catalog, importedWorks]);

  const filteredWorks = useMemo(() => {
    return allWorks.filter((work) => {
      const eraMatch = matchesDimension(filters.eras, [work.dynasty]);
      const genreMatch = matchesDimension(filters.genres, [work.genre, ...work.collections]);
      const collectionMatch = matchesDimension(filters.collections, work.collections);
      const themeMatch = matchesDimension(filters.themes, work.themes);
      const moodMatch = matchesDimension(filters.moods, work.moods);
      return eraMatch && genreMatch && collectionMatch && themeMatch && moodMatch;
    }).sort((a, b) => {
      const orderDelta = (a.order ?? 999) - (b.order ?? 999);
      if (orderDelta !== 0) return orderDelta;
      const eraDelta = (ERA_ORDER[a.dynasty] ?? 99) - (ERA_ORDER[b.dynasty] ?? 99);
      if (eraDelta !== 0) return eraDelta;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
  }, [allWorks, filters]);

  const normalizedQuery = useMemo(() => normalizeSearch(query.trim()), [query]);

  const matchedLines = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    const results: Array<{ work: Work; lineIndex: number; line: string }> = [];
    for (const work of filteredWorks) {
      for (let index = 0; index < work.lines.length; index += 1) {
        if (normalizeSearch(work.lines[index]).includes(normalizedQuery)) {
          results.push({ work, lineIndex: index, line: work.lines[index] });
          break;
        }
      }
      if (results.length >= 50) break;
    }
    return results;
  }, [filteredWorks, normalizedQuery]);

  const workMatches = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return filteredWorks.filter((work) => (
      [work.title, work.intro, ...work.collections]
        .some((value) => normalizeSearch(value).includes(normalizedQuery))
    ));
  }, [filteredWorks, normalizedQuery]);

  const authorMatches = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return filteredWorks.filter((work) => normalizeSearch(work.author).includes(normalizedQuery));
  }, [filteredWorks, normalizedQuery]);

  const matchedClassics = useMemo(() => {
    if (normalizedQuery.length < 2) return [];
    return CLASSICS.flatMap((classic) =>
      classic.sections
        .map((section, sectionIndex) => ({ section, sectionIndex }))
        .filter(({ section }) => normalizeSearch(classic.title).includes(normalizedQuery) || normalizeSearch(section.title).includes(normalizedQuery) || normalizeSearch(section.text).includes(normalizedQuery))
        .slice(0, 2)
        .map(({ section, sectionIndex }) => {
          const segments = splitClassicText(section.text);
          const segmentIndex = Math.max(0, segments.findIndex((segment) => normalizeSearch(segment.text).includes(normalizedQuery)));
          return { classic, section, sectionIndex, segmentIndex };
        }),
    ).slice(0, 10);
  }, [normalizedQuery]);

  const selected = [
    ...filters.eras,
    ...filters.genres,
    ...filters.collections,
    ...filters.themes,
    ...filters.moods,
  ];
  const hasFilters = selected.length > 0 || query.trim().length > 0;
  const activeEra = filters.eras.length === 1 ? filters.eras[0] : '??';

  const searchTabItems: Array<{ key: SearchTab; label: string; count: number }> = [
    { key: 'sentence', label: '句子', count: matchedLines.length },
    { key: 'work', label: '篇目', count: workMatches.length + matchedClassics.length },
    { key: 'author', label: '作者', count: authorMatches.length },
  ];

  const listItems = useMemo<LibraryListItem[]>(() => {
    if (!query.trim()) return filteredWorks.map((work) => ({ kind: 'work', work }));
    if (searchTab === 'sentence') {
      return matchedLines.map((result) => ({ kind: 'line', ...result }));
    }
    if (searchTab === 'work') {
      return [
        ...workMatches.map((work) => ({ kind: 'work' as const, work })),
        ...matchedClassics.map(({ classic, section, sectionIndex, segmentIndex }) => ({ kind: 'classic' as const, classic, section, sectionIndex, segmentIndex })),
      ];
    }
    return authorMatches.map((work) => ({ kind: 'work', work }));
  }, [authorMatches, filteredWorks, matchedClassics, matchedLines, query, searchTab, workMatches]);

  const resultTitle = !query.trim()
    ? (hasFilters ? '筛选结果' : '全部篇目')
    : searchTab === 'sentence'
      ? '匹配句子'
      : searchTab === 'work'
        ? '匹配篇目'
        : '匹配作者';
  const resultCount = listItems.length;

  const rememberSearch = async (value: string) => {
    const term = value.trim();
    if (term.length < 2) return;
    const next = [term, ...searchHistory.filter((item) => item !== term)].slice(0, 10);
    setSearchHistory(next);
    await setStoredValue(SEARCH_HISTORY_KEY, JSON.stringify(next));
  };

  const clearSearchHistory = async () => {
    setSearchHistory([]);
    await setStoredValue(SEARCH_HISTORY_KEY, JSON.stringify([]));
  };

  const remoteSearch = async (override?: string) => {
    const term = (override ?? query).trim();
    if (term.length < 2) {
      setRemoteMessage('请输入完整的诗句或关键词。');
      return;
    }
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      setRemoteMessage('请先到“我的 → API 设置”配置接口。');
      return;
    }
    setRemoteLoading(true);
    setRemoteMessage('');
    try {
      const work = await lookupRemoteWork(term, settings);
      await saveImportedWork(work);
      setImportedWorks(await loadImportedWorks());
      setRemoteMessage(`已补录《${work.title}》·${work.author}，会永久保存在本机。`);
      const normalizedTerm = normalizeSearch(term);
      const normalizedTitle = normalizeSearch(work.title);
      if (normalizedTitle.includes(normalizedTerm) || normalizedTerm.includes(normalizedTitle)) {
        setSearchTab('work');
      } else if (normalizeSearch(work.author).includes(normalizedTerm)) {
        setSearchTab('author');
      } else {
        setSearchTab('sentence');
      }
    } catch (error) {
      setRemoteMessage(error instanceof Error ? error.message : '联网补录失败。');
    } finally {
      setRemoteLoading(false);
    }
  };

  const listHeader = (
    <View>
        <View style={styles.header}>
          <Text style={styles.title}>诗库</Text>
          <Text style={styles.subtitle}>离线 {catalog.length.toLocaleString('zh-CN')} 篇 · 可组合筛选</Text>
        </View>

        <View style={styles.searchBlock}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => void rememberSearch(query)}
            onBlur={() => void rememberSearch(query)}
            placeholder="搜索篇名、作者或正文"
            placeholderTextColor={colors.muted}
            selectionColor={colors.vermilion}
            returnKeyType="search"
            style={styles.searchInput}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eraTabs}>
          {['全部', ...ERAS].map((era) => {
            const active = activeEra === era;
            return (
              <Pressable
                key={era}
                onPress={() => setFilters((current) => ({ ...current, eras: era === '全部' ? [] : [era] }))}
                style={[styles.eraTab, active && styles.eraTabActive]}
              >
                <Text style={[styles.eraTabText, active && styles.eraTabTextActive]}>{era}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.heroActions}>
          <Pressable onPress={() => { setCategoryMode('themes'); setCategoryVisible(true); }} style={styles.heroAction}>
            <Text style={styles.heroActionTitle}>{'分类浏览'}</Text>
            <Text style={styles.heroActionDetail}>{'多维度筛选'}</Text>
          </Pressable>
          <Pressable onPress={() => { setCategoryMode('fly'); setCategoryVisible(true); }} style={styles.heroAction}>
            <Text style={styles.heroActionTitle}>{'飞花令'}</Text>
            <Text style={styles.heroActionDetail}>{'按字找句'}</Text>
          </Pressable>
        </View>

        {query.trim() ? (
          <View style={styles.searchTabs}>
            {searchTabItems.map((tab) => {
              const active = searchTab === tab.key;
              return (
                <Pressable key={tab.key} onPress={() => setSearchTab(tab.key)} style={[styles.searchTab, active && styles.searchTabActive]}>
                  <Text style={[styles.searchTabText, active && styles.searchTabTextActive]}>{tab.label}</Text>
                  <Text style={[styles.searchTabCount, active && styles.searchTabTextActive]}>{tab.count}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {!query.trim() && searchHistory.length > 0 ? (
          <View style={styles.historyBlock}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyLabel}>{'最近搜索'}</Text>
              <Pressable onPress={() => void clearSearchHistory()}><Text style={styles.historyClear}>{'清除'}</Text></Pressable>
            </View>
            <View style={styles.historyRow}>
              {searchHistory.map((term) => (
                <Pressable key={term} onPress={() => setQuery(term)} style={styles.historyChip}>
                  <Text style={styles.historyText}>{term}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}


        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{resultTitle}</Text>
          <View style={styles.resultHeaderActions}>
            <Text style={styles.resultCount}>{resultCount.toLocaleString('zh-CN')} 项</Text>
            <Pressable onPress={() => setFilterVisible(true)} style={styles.filterPill}>
              <Text style={styles.filterPillText}>筛选</Text>
            </Pressable>
          </View>
        </View>

        {selected.length > 0 ? (
          <View style={styles.selectedGrid}>
            {selected.map((item) => <Text key={item} style={styles.selectedChip}>{item}</Text>)}
            <Pressable onPress={() => { setFilters(EMPTY_FILTERS); setQuery(''); }} style={styles.clearChip}>
                <Text style={styles.clearText}>清除筛选</Text>
            </Pressable>
          </View>
        ) : null}
    </View>
  );

  useEffect(() => {
    const term = query.trim();
    if (!catalogReady || term.length < 2 || matchedLines.length > 0 || workMatches.length > 0 || authorMatches.length > 0 || matchedClassics.length > 0 || !settings?.endpoint.trim()) return;
    if (attemptedRemoteQuery.current === term) return;
    const timer = setTimeout(() => {
      attemptedRemoteQuery.current = term;
      void remoteSearch(term);
    }, 1000);
    return () => clearTimeout(timer);
  }, [authorMatches.length, catalogReady, matchedClassics.length, matchedLines.length, query, settings, workMatches.length]);

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.listView}
        data={listItems}
        keyExtractor={(item) => item.kind === 'line' ? `${item.work.id}-${item.lineIndex}` : item.kind === 'classic' ? `${item.classic.id}-${item.sectionIndex}` : item.work.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          if (item.kind === 'line') {
            return (
              <Pressable onPress={() => onOpenWork(item.work, item.lineIndex)} style={styles.quoteRow}>
                <Text style={styles.quoteLine}>{item.line}</Text>
                <Text style={styles.quoteTitle}>《{item.work.title}》</Text>
                <Text style={styles.quoteAuthor}>{item.work.author}</Text>
                <View style={styles.resultActionRow}><Text style={styles.resultAction}>查看全文</Text></View>
              </Pressable>
            );
          }
          if (item.kind === 'classic') {
            return (
              <Pressable onPress={() => onOpenClassic(item.classic, item.sectionIndex, item.segmentIndex, true)} style={styles.classicResultRow}>
                <Text style={styles.classicResultTitle}>《{item.classic.title}》·{item.section.title}</Text>
                <Text style={styles.classicResultSnippet} numberOfLines={2}>{item.section.text}</Text>
                <Text style={styles.classicResultAuthor}>{item.classic.author}·{item.classic.kind === '名句' ? '名句补充' : `${item.classic.category}典籍`}</Text>
                <View style={styles.resultActionRow}><Text style={styles.resultAction}>查看全文</Text></View>
              </Pressable>
            );
          }
          const previousItem = index > 0 ? listItems[index - 1] : null;
          const cardTags = [...new Set([...item.work.themes, ...item.work.moods, item.work.genre].filter(Boolean))].slice(0, 4);
          const previous = previousItem?.kind === 'work' ? previousItem.work : null;
          const showEra = !previous || previous.dynasty !== item.work.dynasty;
          return (
            <View>
              {showEra ? <Text style={styles.eraHeader}>{item.work.dynasty}</Text> : null}
              <Pressable onPress={() => onOpenWork(item.work, 0)} style={({ pressed }) => [styles.workRow, pressed && styles.pressed]}>
                <View style={styles.workCopy}>
                  <Text style={styles.workTitle}>{item.work.title}</Text>
                  <Text style={styles.workAuthor}>{item.work.author}{item.work.imported ? ' · API补录待校对' : ''}</Text>
                  <Text style={styles.workMeta}>{item.work.dynasty} · {item.work.genre}</Text>
                  <View style={styles.tagRow}>
                    {(cardTags.length ? cardTags : ['原文篇目']).map((tag) => (
                      <View key={tag} style={styles.tagPill}><Text style={styles.tagText}>{tag}</Text></View>
                    ))}
                  </View>
                </View>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>本地没有找到符合条件的篇目</Text>
            <Pressable style={styles.remoteButton} onPress={() => remoteSearch()} disabled={remoteLoading}>
              <Text style={styles.remoteButtonText}>{remoteLoading ? '正在联网检索…' : '联网补录这篇'}</Text>
            </Pressable>
          </View>
        }
      />

      {categoryVisible ? (
        <View style={styles.categoryOverlay}>
          <CategoryBrowser key={categoryMode} initialDimension={categoryMode} works={allWorks} onOpenWork={onOpenWork} onClose={() => setCategoryVisible(false)} />
        </View>
      ) : null}

      <FilterSheet
        visible={filterVisible}
        filters={filters}
        resultCount={filteredWorks.length}
        onClose={() => setFilterVisible(false)}
        onChange={setFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 28 : 50 },
  header: { paddingHorizontal: 0, paddingBottom: spacing.md },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 34, fontWeight: '800', letterSpacing: 3 },
  subtitle: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 8 },
  searchBlock: { marginTop: spacing.md },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  searchInput: { minHeight: 44, borderRadius: radius.pill, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, paddingHorizontal: 16, backgroundColor: colors.paperDeep },
  categoryButton: { alignSelf: 'stretch', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.line, paddingHorizontal: 14 },
  categoryButtonText: { color: colors.jade, fontFamily: fonts.body, fontSize: 15 },
  categoryOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 120, elevation: 35, backgroundColor: colors.paper },
  filterButton: { alignSelf: 'stretch', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.line, paddingHorizontal: 18 },
  filterButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 16 },
  eraTabs: { paddingTop: 16, gap: 8 },
  eraTab: { minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  eraTabActive: { borderColor: colors.vermilion, backgroundColor: '#FBE9E7' },
  eraTabText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  eraTabTextActive: { color: colors.vermilion, fontWeight: '800' },
  heroActions: { flexDirection: 'row', gap: 10, marginHorizontal: 0, marginTop: 12 },
  heroAction: { flex: 1, minHeight: 68, borderWidth: 1, borderColor: colors.line, borderRadius: 16, backgroundColor: colors.paperLight, paddingHorizontal: 14, justifyContent: 'center', shadowColor: '#333333', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  heroActionTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
  heroActionDetail: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 4 },
  historyBlock: { paddingHorizontal: 0, paddingTop: spacing.sm },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  historyLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12 },
  historyClear: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  historyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  historyChip: { minHeight: 32, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: colors.paperLight },
  historyText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  dimensionTabs: { flexDirection: 'row', marginHorizontal: 0, marginTop: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  dimensionTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  dimensionTabActive: { borderBottomWidth: 2, borderBottomColor: colors.vermilion },
  dimensionTabText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  dimensionTabTextActive: { color: colors.vermilion, fontWeight: '700' },
  dimensionGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 0, paddingVertical: spacing.md, gap: 8 },
  dimensionChip: { minHeight: 34, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 11, justifyContent: 'center', backgroundColor: colors.paperLight },
  dimensionChipActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  dimensionChipText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  dimensionChipTextActive: { color: colors.vermilion, fontWeight: '700' },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 0, paddingVertical: spacing.md, gap: 8 },
  quickChip: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 2, paddingHorizontal: 13, backgroundColor: colors.paperLight },
  quickChipActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  quickText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  quickTextActive: { color: colors.vermilion, fontWeight: '700' },
  searchTabs: { flexDirection: 'row', marginHorizontal: 0, marginTop: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.paperLight },
  searchTab: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.line },
  searchTabActive: { backgroundColor: colors.paper },
  searchTabText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14 },
  searchTabTextActive: { color: colors.vermilion, fontWeight: '700' },
  searchTabCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11 },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: 0, marginTop: spacing.sm },
  resultTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  resultHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  resultCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  filterPill: { minHeight: 32, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paperLight },
  filterPillText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12, fontWeight: '700' },
  remotePanel: { marginHorizontal: 0, marginTop: 10 },
  remoteButton: { minHeight: 46, borderWidth: 1, borderColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  remoteButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  remoteMessage: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 8 },
  selectedGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 0, paddingTop: 10, gap: 8 },
  selectedChip: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderColor: colors.vermilion, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 6 },
  clearChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  clearText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  listView: { flex: 1 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 190 },
  classicStrip: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginHorizontal: 0, paddingTop: 4, paddingBottom: 8 },
  classicStripLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 11 },
  classicChip: { minHeight: 32, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 10, justifyContent: 'center' },
  classicChipText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  classicResults: { marginHorizontal: 0, marginTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  classicResultsTitle: { color: colors.jade, fontFamily: fonts.body, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  classicResultRow: { marginBottom: 12, padding: spacing.md, borderRadius: 16, backgroundColor: colors.paperLight, shadowColor: '#333333', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  classicResultTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
  classicResultSnippet: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 5 },
  classicResultAuthor: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 5 },
  resultActionRow: { marginTop: 10, alignItems: 'flex-end' },
  resultAction: { minHeight: 30, borderRadius: radius.pill, borderWidth: 1, borderColor: '#E0B9B2', paddingHorizontal: 12, color: colors.vermilion, fontFamily: fonts.body, fontSize: 12, fontWeight: '700', textAlignVertical: 'center' },
  quoteResults: { marginHorizontal: 0, marginTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  quoteResultsTitle: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  quoteRow: { marginBottom: 12, padding: spacing.md, borderRadius: 16, backgroundColor: colors.paperLight, shadowColor: '#333333', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 },
  quoteLine: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  quoteTitle: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, marginTop: 7 },
  quoteAuthor: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 3 },
  workAuthor: { color: colors.muted, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  eraHeader: { color: colors.ink, fontFamily: fonts.title, fontSize: 21, fontWeight: '800', marginTop: 24, marginBottom: 12 },
  workRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#DED6C8', borderRadius: 16, backgroundColor: colors.paperLight, padding: spacing.md, shadowColor: '#333333', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2 },
  pressed: { opacity: 0.55 },
  workCopy: { flex: 1, minWidth: 0 },
  workTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 18, fontWeight: '700' },
  workMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 4 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tagPill: { borderRadius: radius.pill, borderWidth: 1, borderColor: '#E6DED2', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: colors.paperDeep },
  tagText: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 11 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { color: colors.muted, fontFamily: fonts.body, fontSize: 15 },
});
