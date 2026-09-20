import React, { useEffect, useMemo, useState } from 'react';
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
import { MoodRecommendSheet } from '../components/MoodRecommendSheet';
import { SealButton } from '../components/SealButton';
import { WORKS } from '../data/works';
import { ERA_ORDER, FilterState, QUICK_THEMES } from '../data/taxonomy';
import { loadApiSettings } from '../services/settings';
import { randomRecommendation, recommendForMood } from '../services/recommendation';
import { loadTodayRecommendation, saveTodayRecommendation } from '../services/recommendationStore';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings, DailyRecommendation, Work } from '../types';

interface Props {
  onOpenWork: (work: Work, lineIndex?: number) => void;
  onOpenSettings: () => void;
  onOpenComposition: () => void;
}

const EMPTY_FILTERS: FilterState = {
  eras: [],
  genres: [],
  collections: [],
  themes: [],
  moods: [],
};

function matchesDimension(selected: string[], values: string[]): boolean {
  return selected.length === 0 || selected.some((value) => values.includes(value));
}

export function HomeScreen({ onOpenWork, onOpenSettings, onOpenComposition }: Props) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [daily, setDaily] = useState<DailyRecommendation | null>(null);
  const [apiSettings, setApiSettings] = useState<ApiSettings | null>(null);
  const [moodVisible, setMoodVisible] = useState(false);
  const [moodText, setMoodText] = useState('');
  const [moodLoading, setMoodLoading] = useState(false);
  const [moodError, setMoodError] = useState('');

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
      const searchable = [
        work.title,
        work.author,
        work.dynasty,
        work.genre,
        ...work.collections,
        ...work.themes,
        ...work.moods,
        ...work.lines,
      ]
        .join(' ')
        .toLowerCase();
      return searchable.includes(needle);
    }).sort((a, b) => {
      const orderDelta = (a.order ?? 999) - (b.order ?? 999);
      if (orderDelta !== 0) return orderDelta;
      const eraDelta = (ERA_ORDER[a.dynasty] ?? 99) - (ERA_ORDER[b.dynasty] ?? 99);
      if (eraDelta !== 0) return eraDelta;
      return a.title.localeCompare(b.title, 'zh-CN');
    });
  }, [filters, query]);

  const selectedFilterText = [
    ...filters.eras,
    ...filters.genres,
    ...filters.collections,
    ...filters.themes,
    ...filters.moods,
  ];
  const hasFilters = selectedFilterText.length > 0 || query.trim().length > 0;
  useEffect(() => {
    loadApiSettings().then(setApiSettings);
    loadTodayRecommendation().then((saved) => {
      if (saved) {
        setDaily(saved);
        return;
      }
      const next = randomRecommendation(WORKS);
      setDaily(next);
      void saveTodayRecommendation(next);
    });
  }, []);

  const currentDailyWork = daily ? WORKS.find((work) => work.id === daily.workId) : null;

  const openDaily = () => {
    if (daily && currentDailyWork) onOpenWork(currentDailyWork, daily.lineIndex);
    else if (filteredWorks.length > 0) onOpenWork(filteredWorks[0], 0);
  };

  const drawRandom = async () => {
    const next = randomRecommendation(WORKS);
    setDaily(next);
    setMoodError('');
    await saveTodayRecommendation(next);
    setMoodVisible(false);
  };

  const recommendByMood = async () => {
    if (!apiSettings?.endpoint.trim() || !apiSettings.model.trim()) {
      setMoodError('请先在设置中填写 API 地址和模型名称。');
      return;
    }
    setMoodLoading(true);
    setMoodError('');
    try {
      const next = await recommendForMood(apiSettings, moodText, WORKS);
      setDaily(next);
      await saveTodayRecommendation(next);
      setMoodVisible(false);
      setMoodText('');
    } catch (error) {
      setMoodError(error instanceof Error ? error.message : '荐诗失败，请稍后再试。');
    } finally {
      setMoodLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>多维检索 · 手机端 API 直连</Text>
          <Text style={styles.title}>诗词背诵</Text>
        </View>
        <Pressable onPress={onOpenSettings} style={styles.settingsButton}>
          <Text style={styles.settingsText}>设置</Text>
        </Pressable>
      </View>

      <View style={styles.daily}>
        <View style={styles.dailyTop}>
          <Text style={styles.dailyLabel}>今日荐诗</Text>
          <SealButton label="开始学习" compact disabled={!daily} onPress={openDaily} />
        </View>
        {daily && currentDailyWork ? (
          <Pressable onPress={openDaily} style={styles.dailyPoem}>
            <Text style={styles.dailyQuote}>{daily.quote}</Text>
            <Text style={styles.dailyPoemMeta}>出自《{currentDailyWork.title}》· {currentDailyWork.author}</Text>
            <Text style={styles.dailyReason}>{daily.reason}</Text>
          </Pressable>
        ) : (
          <Text style={styles.dailyBody}>正在准备今天的篇目……</Text>
        )}
        <View style={styles.dailyActions}>
          <Pressable onPress={() => { setMoodError(''); setMoodVisible(true); }} style={styles.dailyAction}>
            <Text style={styles.dailyActionText}>说说今天，荐一首</Text>
          </Pressable>
          <Pressable onPress={drawRandom} style={styles.dailyAction}>
            <Text style={styles.dailyActionText}>随机换一篇</Text>
          </Pressable>
          <Pressable onPress={onOpenComposition} style={styles.dailyAction}>
            <Text style={styles.dailyActionText}>填诗·词·曲</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="搜篇名、作者、句子"
          placeholderTextColor={colors.muted}
          selectionColor={colors.vermilion}
          style={styles.searchInput}
        />
        <Pressable onPress={() => setFilterVisible(true)} style={styles.filterButton}>
          <Text style={styles.filterButtonText}>筛选</Text>
        </Pressable>
      </View>

      <View style={styles.quickRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickContent}>
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
        </ScrollView>
      </View>

      <View style={styles.resultHeader}>
        <View>
          <Text style={styles.sectionTitle}>{hasFilters ? '筛选结果' : '诗库篇目'}</Text>
          <Text style={styles.resultCount}>共 {filteredWorks.length.toLocaleString('zh-CN')} 篇 · 按朝代排列</Text>
        </View>
        {hasFilters ? (
          <Pressable onPress={() => { setFilters(EMPTY_FILTERS); setQuery(''); }}>
            <Text style={styles.clearText}>清除筛选</Text>
          </Pressable>
        ) : null}
      </View>

      {selectedFilterText.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.selectedContent}>
          {selectedFilterText.map((item) => (
            <Text key={item} style={styles.selectedText}>
              {item}
            </Text>
          ))}
        </ScrollView>
      ) : null}

      <FlatList
        data={filteredWorks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => {
          const previous = index > 0 ? filteredWorks[index - 1] : null;
          const showEra = !previous || previous.dynasty !== item.dynasty;
          return (
            <View>
              {showEra ? <Text style={styles.eraHeader}>{item.dynasty}</Text> : null}
              <Pressable onPress={() => onOpenWork(item, 0)} style={({ pressed }) => [styles.workRow, pressed && styles.workRowPressed]}>
                <View style={styles.workCopy}>
                  <Text style={styles.workTitle}>{item.title}</Text>
                  <Text style={styles.workMeta}>{item.author} · {item.genre} · {item.collections.join(' / ')}</Text>
                  <Text style={styles.workTags}>{item.themes.slice(0, 4).join(' · ')}</Text>
                  <Text style={styles.workIntro} numberOfLines={2}>{item.intro}</Text>
                </View>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>没有找到符合条件的篇目</Text>
            <Text style={styles.emptyText}>减少一个筛选条件，或者换一个关键词。</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              当前离线内容包共 {WORKS.length.toLocaleString('zh-CN')} 篇，其中全宋词 {WORKS.filter((work) => work.collections.includes('全宋词')).length.toLocaleString('zh-CN')} 篇。分类可继续扩充，检索结构不变。
            </Text>
          </View>
        }
      />

      <MoodRecommendSheet
        visible={moodVisible}
        text={moodText}
        loading={moodLoading}
        error={moodError}
        onChangeText={setMoodText}
        onClose={() => setMoodVisible(false)}
        onSubmit={recommendByMood}
        onRandom={drawRandom}
        onOpenSettings={onOpenSettings}
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
  container: {
    flex: 1,
    backgroundColor: colors.paper,
    paddingTop: Platform.OS === 'android' ? 28 : 50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 12,
  },
  eyebrow: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    letterSpacing: 2,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: 4,
    marginTop: 7,
  },
  settingsButton: {
    borderBottomWidth: 1,
    borderBottomColor: colors.inkSoft,
    paddingVertical: 5,
  },
  settingsText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  daily: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.paperDeep,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.vermilion,
  },
  dailyTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyLabel: {
    color: colors.vermilion,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 2,
  },
  dailyTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 23,
    fontWeight: '700',
    marginTop: 9,
  },
  dailyBody: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 7,
  },
  dailyPoem: {
    marginTop: 10,
  },
  dailyQuote: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 24,
    lineHeight: 36,
    fontWeight: '700',
  },
  dailyPoemMeta: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 13,
    marginTop: 8,
  },
  dailyReason: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  dailyActions: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 14,
  },
  dailyAction: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 3,
  },
  dailyActionText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    paddingVertical: 10,
  },
  filterButton: {
    borderLeftWidth: 1,
    borderLeftColor: colors.line,
    paddingLeft: 14,
    paddingVertical: 8,
  },
  filterButtonText: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 16,
    letterSpacing: 1,
  },
  quickRow: {
    marginTop: 12,
  },
  quickContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  quickChip: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingHorizontal: 2,
    paddingVertical: 5,
  },
  quickChipActive: {
    borderBottomColor: colors.vermilion,
  },
  quickText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 15,
  },
  quickTextActive: {
    color: colors.vermilion,
    fontWeight: '700',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: 4,
  },
  sectionTitle: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 3,
  },
  resultCount: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 5,
  },
  clearText: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  selectedContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    gap: 12,
  },
  selectedText: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.vermilion,
    paddingBottom: 2,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 50,
  },
  eraHeader: {
    color: colors.vermilion,
    fontFamily: fonts.title,
    fontSize: 21,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 3,
    letterSpacing: 2,
  },
  workRow: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  workRowPressed: {
    opacity: 0.55,
  },
  workCopy: {
    flex: 1,
    minWidth: 0,
  },
  workTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 23,
    fontWeight: '700',
  },
  workMeta: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 12,
    marginTop: 6,
  },
  workTags: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 11,
    marginTop: 6,
  },
  workIntro: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 7,
  },
  arrow: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 28,
  },
  empty: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 20,
    fontWeight: '700',
  },
  emptyText: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    marginTop: 8,
  },
  footer: {
    paddingTop: spacing.xl,
  },
  footerText: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    lineHeight: 18,
  },
});
