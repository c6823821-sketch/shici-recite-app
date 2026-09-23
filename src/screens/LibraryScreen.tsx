import React, { useMemo, useState } from 'react';
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
import { WORKS } from '../data/works';
import { ERA_ORDER, FilterState, QUICK_THEMES } from '../data/taxonomy';
import { colors, fonts, spacing } from '../theme';
import { Work } from '../types';

interface Props {
  onOpenWork: (work: Work, lineIndex?: number) => void;
}

const EMPTY_FILTERS: FilterState = { eras: [], genres: [], collections: [], themes: [], moods: [] };

function matchesDimension(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function LibraryScreen({ onOpenWork }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const filteredWorks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return WORKS.filter((work) => {
      const eraMatch = matchesDimension(filters.eras, [work.dynasty]);
      const genreMatch = matchesDimension(filters.genres, [work.genre, ...work.collections]);
      const collectionMatch = matchesDimension(filters.collections, work.collections);
      const themeMatch = matchesDimension(filters.themes, work.themes);
      const moodMatch = matchesDimension(filters.moods, work.moods);
      if (!(eraMatch && genreMatch && collectionMatch && themeMatch && moodMatch)) return false;
      if (!needle) return true;
      return [work.title, work.author, work.dynasty, work.genre, ...work.collections, ...work.themes, ...work.lines]
        .join(' ')
        .toLowerCase()
        .includes(needle);
    }).sort((a, b) => {
      const orderDelta = (a.order ?? 999) - (b.order ?? 999);
      if (orderDelta !== 0) return orderDelta;
      const eraDelta = (ERA_ORDER[a.dynasty] ?? 99) - (ERA_ORDER[b.dynasty] ?? 99);
      if (eraDelta !== 0) return eraDelta;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
  }, [filters, query]);

  const matchedLines = useMemo(() => {
    const needle = query.trim();
    if (needle.length < 2) return [];
    const results: Array<{ work: Work; lineIndex: number; line: string }> = [];
    for (const work of WORKS) {
      for (let index = 0; index < work.lines.length; index += 1) {
        if (work.lines[index].includes(needle)) {
          results.push({ work, lineIndex: index, line: work.lines[index] });
          break;
        }
      }
      if (results.length >= 30) break;
    }
    return results;
  }, [query]);

  const selected = [
    ...filters.eras,
    ...filters.genres,
    ...filters.collections,
    ...filters.themes,
    ...filters.moods,
  ];
  const hasFilters = selected.length > 0 || query.trim().length > 0;

  const listHeader = (
    <View>
        <View style={styles.header}>
          <Text style={styles.title}>诗库</Text>
          <Text style={styles.subtitle}>离线 {WORKS.length.toLocaleString('zh-CN')} 篇 · 可组合筛选</Text>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="搜索篇名、作者或正文"
            placeholderTextColor={colors.muted}
            selectionColor={colors.vermilion}
            style={styles.searchInput}
          />
          <Pressable onPress={() => setFilterVisible(true)} style={styles.filterButton}>
            <Text style={styles.filterButtonText}>筛选</Text>
          </Pressable>
        </View>

        <View style={styles.quickGrid}>
          {QUICK_THEMES.map((theme) => {
            const active = filters.themes.includes(theme);
            return (
                <Pressable
                  key={theme}
                  onPress={() => {
                    const nextThemes = active
                        ? filters.themes.filter((item) => item !== theme)
                        : [...filters.themes, theme];
                    setFilters({ ...filters, themes: nextThemes });
                  }}
                  style={[styles.quickChip, active && styles.quickChipActive]}
                >
                  <Text style={[styles.quickText, active && styles.quickTextActive]}>{theme}</Text>
                </Pressable>
            );
          })}
        </View>

        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{hasFilters ? '筛选结果' : '全部篇目'}</Text>
          <Text style={styles.resultCount}>{filteredWorks.length.toLocaleString('zh-CN')} 篇</Text>
        </View>

        {selected.length > 0 ? (
          <View style={styles.selectedGrid}>
            {selected.map((item) => <Text key={item} style={styles.selectedChip}>{item}</Text>)}
            <Pressable onPress={() => { setFilters(EMPTY_FILTERS); setQuery(''); }} style={styles.clearChip}>
                <Text style={styles.clearText}>清除筛选</Text>
            </Pressable>
          </View>
        ) : null}
          {matchedLines.length > 0 ? (
            <View style={styles.quoteResults}>
              <Text style={styles.quoteResultsTitle}>匹配句子 · 点进去直接定位</Text>
              {matchedLines.map((result) => (
                <Pressable key={`${result.work.id}-${result.lineIndex}`} onPress={() => onOpenWork(result.work, result.lineIndex)} style={styles.quoteRow}>
                  <Text style={styles.quoteLine}>{result.line}</Text>
                  <Text style={styles.quoteTitle}>《{result.work.title}》</Text>
                  <Text style={styles.quoteAuthor}>{result.work.author}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        style={styles.listView}
        data={filteredWorks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={listHeader}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const previous = index > 0 ? filteredWorks[index - 1] : null;
          const showEra = !previous || previous.dynasty !== item.dynasty;
          return (
            <View>
              {showEra ? <Text style={styles.eraHeader}>{item.dynasty}</Text> : null}
              <Pressable onPress={() => onOpenWork(item, 0)} style={({ pressed }) => [styles.workRow, pressed && styles.pressed]}>
                <View style={styles.workCopy}>
                  <Text style={styles.workTitle}>{item.title}</Text>
                  <Text style={styles.workAuthor}>{item.author}</Text>
                  <Text style={styles.workMeta}>{item.dynasty} · {item.genre} · {item.collections.slice(0, 2).join(' / ')}</Text>
                  <Text style={styles.workTags}>{item.themes.slice(0, 4).join(' · ') || '原文篇目'}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>没有找到符合条件的篇目</Text>}
      />

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
  header: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 34, fontWeight: '800', letterSpacing: 3 },
  subtitle: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 8 },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.lg, marginTop: spacing.md, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.paperLight },
  searchInput: { flex: 1, minHeight: 48, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, paddingHorizontal: 12 },
  filterButton: { alignSelf: 'stretch', justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: colors.line, paddingHorizontal: 18 },
  filterButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 16 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: 8 },
  quickChip: { minHeight: 38, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 2, paddingHorizontal: 13, backgroundColor: colors.paperLight },
  quickChipActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  quickText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  quickTextActive: { color: colors.vermilion, fontWeight: '700' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginHorizontal: spacing.lg, marginTop: spacing.sm },
  resultTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  resultCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  selectedGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.lg, paddingTop: 10, gap: 8 },
  selectedChip: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, borderWidth: 1, borderColor: colors.vermilion, borderRadius: 2, paddingHorizontal: 10, paddingVertical: 6 },
  clearChip: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 6 },
  clearText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13 },
  listView: { flex: 1 },
  list: { paddingBottom: 130 },
  quoteResults: { marginHorizontal: spacing.lg, marginTop: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  quoteResultsTitle: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 16, fontWeight: '700', marginBottom: 8 },
  quoteRow: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  quoteLine: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, lineHeight: 25 },
  quoteTitle: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, marginTop: 7 },
  quoteAuthor: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 3 },
  workAuthor: { color: colors.jade, fontFamily: fonts.body, fontSize: 13, marginTop: 6 },
  eraHeader: { marginHorizontal: spacing.lg, color: colors.vermilion, fontFamily: fonts.title, fontSize: 21, fontWeight: '800', marginTop: 18, marginBottom: 4 },
  workRow: { minHeight: 94, marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, paddingVertical: 12 },
  pressed: { opacity: 0.55 },
  workCopy: { flex: 1, minWidth: 0 },
  workTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 23, fontWeight: '700' },
  workMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  workTags: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 11, marginTop: 6 },
  arrow: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 28 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center', paddingVertical: 60 },
});
