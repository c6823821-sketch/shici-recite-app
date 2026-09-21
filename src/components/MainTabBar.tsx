import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';

export type MainTab = 'today' | 'library' | 'compose' | 'profile';

interface Props {
  active: MainTab;
  onChange: (tab: MainTab) => void;
}

const TABS: Array<{ key: MainTab; label: string; mark: string }> = [
  { key: 'today', label: '今日', mark: '今' },
  { key: 'library', label: '诗库', mark: '诗' },
  { key: 'compose', label: '创作', mark: '作' },
  { key: 'profile', label: '我的', mark: '我' },
];

export function MainTabBar({ active, onChange }: Props) {
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const selected = active === tab.key;
        return (
          <Pressable key={tab.key} onPress={() => onChange(tab.key)} style={styles.tab}>
            <View style={[styles.mark, selected && styles.markActive]}>
              <Text style={[styles.markText, selected && styles.markTextActive]}>{tab.mark}</Text>
            </View>
            <Text style={[styles.label, selected && styles.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.paperLight, borderTopWidth: 1, borderTopColor: colors.line, paddingBottom: 6 },
  tab: { flex: 1, minHeight: 62, alignItems: 'center', justifyContent: 'center' },
  mark: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 2 },
  markActive: { borderColor: colors.vermilion, backgroundColor: colors.vermilion },
  markText: { color: colors.muted, fontFamily: fonts.title, fontSize: 15, fontWeight: '700' },
  markTextActive: { color: colors.white },
  label: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 3 },
  labelActive: { color: colors.vermilion, fontWeight: '700' },
});
