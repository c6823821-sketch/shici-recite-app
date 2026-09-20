import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FILTER_GROUPS, FilterKey, FilterState } from '../data/taxonomy';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  filters: FilterState;
  resultCount: number;
  onClose: () => void;
  onChange: (next: FilterState) => void;
}

export function FilterSheet({ visible, filters, resultCount, onClose, onChange }: Props) {
  const toggle = (key: FilterKey, value: string) => {
    const current = filters[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    onChange({ ...filters, [key]: next });
  };

  const clear = (key: FilterKey) => onChange({ ...filters, [key]: [] });
  const clearAll = () => {
    onChange({
      eras: [],
      genres: [],
      collections: [],
      themes: [],
      moods: [],
    });
  };

  const hasFilters = Object.values(filters).some((values) => values.length > 0);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>分类检索</Text>
            <Text style={styles.subtitle}>同一栏可多选，不同栏之间同时满足</Text>
          </View>
          <View style={styles.countBox}>
            <Text style={styles.countNumber}>{resultCount}</Text>
            <Text style={styles.countLabel}>篇</Text>
          </View>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          {FILTER_GROUPS.map((group) => (
            <View key={group.key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>{group.label}</Text>
                {filters[group.key].length > 0 ? (
                  <Pressable onPress={() => clear(group.key)}>
                    <Text style={styles.clearText}>清除本栏</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.chips}>
                {group.values.map((value) => {
                  const active = filters[group.key].includes(value);
                  return (
                    <Pressable
                      key={value}
                      onPress={() => toggle(group.key, value)}
                      style={[styles.chip, active && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          {hasFilters ? (
            <Pressable onPress={clearAll} style={styles.reset}>
              <Text style={styles.resetText}>全部清除</Text>
            </Pressable>
          ) : (
            <Text style={styles.emptyHint}>当前显示全部篇目</Text>
          )}
          <Pressable onPress={onClose} style={styles.done}>
            <Text style={styles.doneText}>查看结果</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 26, 20, 0.4)',
  },
  sheet: {
    height: '86%',
    backgroundColor: colors.paperLight,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: colors.line,
    paddingTop: 10,
  },
  handle: {
    width: 44,
    height: 3,
    alignSelf: 'center',
    backgroundColor: colors.line,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
    marginTop: 5,
  },
  countBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  countNumber: {
    color: colors.vermilion,
    fontFamily: fonts.title,
    fontSize: 28,
    fontWeight: '800',
  },
  countLabel: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 30,
  },
  group: {
    marginBottom: 24,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  groupTitle: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1,
  },
  clearText: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 11,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: colors.paper,
  },
  chipActive: {
    borderColor: colors.vermilion,
    backgroundColor: colors.paperLight,
  },
  chipText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
  },
  chipTextActive: {
    color: colors.vermilion,
    fontWeight: '700',
  },
  footer: {
    minHeight: 76,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  reset: {
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
    paddingBottom: 3,
  },
  resetText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  emptyHint: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
  },
  done: {
    minWidth: 126,
    minHeight: 48,
    backgroundColor: colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  doneText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 17,
    letterSpacing: 2,
  },
});
