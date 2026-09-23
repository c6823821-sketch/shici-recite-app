import React, { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CLASSICS } from '../data/classics';
import { Classic } from '../types';
import { colors, fonts, spacing } from '../theme';

interface Props {
  initialClassic?: Classic | null;
  initialSectionIndex?: number;
  onBack: () => void;
}

export function ClassicScreen({ initialClassic, initialSectionIndex, onBack }: Props) {
  const [classic, setClassic] = useState<Classic | null>(initialClassic ?? null);
  const [sectionIndex, setSectionIndex] = useState<number | null>(initialClassic && initialSectionIndex != null ? initialSectionIndex : null);

  if (!classic) {
    return (
      <View style={styles.container}>
        <Header title="典籍补充" onBack={onBack} />
        <ScrollView contentContainerStyle={styles.list}>
          {CLASSICS.map((item) => (
            <Pressable key={item.id} onPress={() => { setClassic(item); setSectionIndex(null); }} style={styles.classicRow}>
              <Text style={styles.classicTitle}>{item.title}</Text>
              <Text style={styles.classicMeta}>{item.kind === '名句' ? '名句补充' : item.category} · {item.author} · {item.sections.length} 篇</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (sectionIndex === null) {
    return (
      <View style={styles.container}>
        <Header title={classic.title} onBack={() => setClassic(null)} />
        <ScrollView contentContainerStyle={styles.list}>
          <Text style={styles.directoryHint}>{classic.category}典籍 · 选择篇目开始阅读</Text>
          {classic.sections.map((section, index) => (
            <Pressable key={`${classic.id}-${index}`} onPress={() => setSectionIndex(index)} style={styles.chapterRow}>
              <Text style={styles.chapterTitle}>{section.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const section = classic.sections[sectionIndex];
  return (
    <View style={styles.container}>
      <Header title={section.title} onBack={() => setSectionIndex(null)} />
      <ScrollView contentContainerStyle={styles.reader}>
        <Text style={styles.readerBook}>{classic.title}</Text>
        <Text style={styles.readerTitle}>{section.title}</Text>
        <Text style={styles.readerMeta}>{classic.author} · {classic.kind === '名句' ? '名句补充' : `${classic.category}典籍`}</Text>
        {classic.note ? <Text style={styles.note}>{classic.note}</Text> : null}
        <Text style={styles.readerText}>{section.text}</Text>
        <Text style={styles.source}>来源：{classic.source}</Text>
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.headerSide}><Text style={styles.backText}>‹ 返回</Text></Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
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
  reader: { padding: spacing.lg, paddingBottom: 100 },
  readerBook: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2 },
  readerTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 29, fontWeight: '800', marginTop: 12 },
  readerMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 10 },
  note: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 10 },
  readerText: { color: colors.ink, fontFamily: fonts.body, fontSize: 19, lineHeight: 34, marginTop: spacing.xl },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 18, marginTop: 36 },
});
