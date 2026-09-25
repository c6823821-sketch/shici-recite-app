import React, { useMemo, useState } from 'react';
import { FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FILTER_GROUPS, FilterKey } from '../data/taxonomy';
import { Work } from '../types';
import { colors, fonts, spacing } from '../theme';

type DimensionKey = FilterKey | 'fly';

const FLYING_CHARS = ['月', '花', '春', '秋', '风', '雨', '山', '水', '江', '云', '雪', '酒', '夜', '天', '人', '日', '草', '柳', '梅', '竹', '松', '菊', '鸟', '马', '舟', '海', '湖', '愁', '情', '心', '梦', '故', '归', '别', '相', '思', '君', '家', '国', '剑'];
const DIMENSIONS: Array<{ key: DimensionKey; label: string }> = [
  ...FILTER_GROUPS.map((group) => ({ key: group.key as DimensionKey, label: group.label })),
  { key: 'fly', label: '飞花令' },
];

interface Props {
  works: Work[];
  onOpenWork: (work: Work, lineIndex?: number) => void;
  onClose: () => void;
}

function valuesForDimension(dimension: DimensionKey): readonly string[] {
  if (dimension === 'fly') return FLYING_CHARS;
  return FILTER_GROUPS.find((group) => group.key === dimension)?.values ?? [];
}

function workMatchesDimension(work: Work, dimension: FilterKey, value: string): boolean {
  if (dimension === 'eras') return work.dynasty === value;
  if (dimension === 'genres') return work.genre === value || work.collections.includes(value);
  if (dimension === 'collections') return work.collections.includes(value);
  if (dimension === 'themes') return work.themes.includes(value) || work.moods.includes(value);
  return work.moods.includes(value);
}

function textMatches(work: Work, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [work.title, work.author, work.dynasty, work.genre, ...work.collections, ...work.themes, ...work.moods, ...work.lines]
    .join(' ')
    .toLowerCase()
    .includes(needle);
}

export function CategoryBrowser({ works, onOpenWork, onClose }: Props) {
  const [dimension, setDimension] = useState<DimensionKey>('themes');
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const categoryRows = useMemo(() => valuesForDimension(dimension), [dimension]);

  const detail = useMemo(() => {
    if (!category) return [];
    if (dimension === 'fly') {
      const needle = query.trim();
      const rows: Array<{ work: Work; lineIndex: number; line: string }> = [];
      for (const work of works) {
        for (let index = 0; index < work.lines.length; index += 1) {
          const line = work.lines[index];
          if (line.includes(category) && (!needle || line.includes(needle) || work.title.includes(needle) || work.author.includes(needle))) {
            rows.push({ work, lineIndex: index, line });
          }
          if (rows.length >= 200) break;
        }
        if (rows.length >= 200) break;
      }
      return rows;
    }
    const dimensionKey = dimension as FilterKey;
    return works
      .filter((work) => workMatchesDimension(work, dimensionKey, category) && textMatches(work, query))
      .slice(0, 300)
      .map((work) => ({ work }));
  }, [category, dimension, query, works]);

  const selectedDimension = DIMENSIONS.find((item) => item.key === dimension)!;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={category ? () => { setCategory(null); setQuery(''); } : onClose} style={styles.headerSide}>
          <Text style={styles.backText}>‹ 返回</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {category ? `${selectedDimension.label} · ${category}` : '分类浏览'}
        </Text>
        <Pressable onPress={onClose} style={[styles.headerSide, styles.headerRight]}>
          <Text style={styles.closeText}>关闭</Text>
        </Pressable>
      </View>

      {category ? (
        <FlatList
          data={detail}
          keyExtractor={(item: any) => item.work?.id ? `${item.work.id}-${item.lineIndex ?? 0}` : String(item)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={(
            <View>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={`在${category}中搜索`}
                placeholderTextColor={colors.muted}
                selectionColor={colors.vermilion}
                style={styles.searchInput}
              />
              <Text style={styles.resultCount}>{detail.length} 项</Text>
            </View>
          )}
          renderItem={({ item }: any) => (
            <Pressable onPress={() => onOpenWork(item.work, item.lineIndex ?? 0)} style={styles.resultRow}>
              {item.line ? <Text style={styles.quote}>{item.line}</Text> : <Text style={styles.workTitle}>{item.work.title}</Text>}
              <Text style={styles.meta}>{item.line ? `《${item.work.title}》· ${item.work.author}` : `${item.work.author} · ${item.work.dynasty} · ${item.work.genre}`}</Text>
              {!item.line && item.work.lines[0] ? <Text style={styles.snippet} numberOfLines={2}>{item.work.lines[0]}</Text> : null}
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.empty}>这个分类下暂时没有结果。</Text>}
        />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>分类维度</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dimensionTabs}>
            {DIMENSIONS.map((item) => {
              const active = item.key === dimension;
              return (
                <Pressable key={item.key} onPress={() => { setDimension(item.key); setCategory(null); setQuery(''); }} style={[styles.dimensionTab, active && styles.dimensionTabActive]}>
                  <Text style={[styles.dimensionTabText, active && styles.dimensionTabTextActive]}>{item.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <Text style={styles.hint}>{dimension === 'fly' ? '点一个字令，查看所有包含这个字的诗句。' : '每个分类独立一行，点进去后可继续搜索。'}</Text>
          {categoryRows.map((value) => (
            <Pressable key={value} onPress={() => setCategory(value)} style={styles.categoryRow}>
              <Text style={styles.categoryLabel}>{value}</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 42 : 50 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerSide: { width: 72 },
  headerRight: { alignItems: 'flex-end' },
  backText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  closeText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 15 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 21, fontWeight: '700' },
  content: { paddingBottom: 100 },
  sectionLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2, marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: 12 },
  dimensionTabs: { paddingHorizontal: spacing.lg, gap: 8 },
  dimensionTab: { minHeight: 40, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: colors.paperLight },
  dimensionTabActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  dimensionTabText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  dimensionTabTextActive: { color: colors.vermilion, fontWeight: '700' },
  hint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginHorizontal: spacing.lg, marginTop: 14, marginBottom: 10 },
  categoryRow: { minHeight: 58, marginHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  categoryLabel: { flex: 1, color: colors.ink, fontFamily: fonts.body, fontSize: 18 },
  arrow: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 26 },
  list: { paddingBottom: 100 },
  searchInput: { minHeight: 48, marginHorizontal: spacing.lg, marginTop: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, paddingHorizontal: 4 },
  resultCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginHorizontal: spacing.lg, marginTop: 10 },
  resultRow: { marginHorizontal: spacing.lg, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  quote: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, lineHeight: 26 },
  workTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 20, fontWeight: '700' },
  meta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 7 },
  snippet: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 22, marginTop: 6 },
  empty: { color: colors.muted, fontFamily: fonts.body, fontSize: 15, textAlign: 'center', marginTop: 50 },
});
