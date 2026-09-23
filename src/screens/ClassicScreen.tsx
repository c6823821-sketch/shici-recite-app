import React, { useEffect, useMemo, useState } from 'react';
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CLASSICS } from '../data/classics';
import { translateClassicSection } from '../services/classicTranslation';
import { loadApiSettings } from '../services/settings';
import { Classic } from '../types';
import { colors, fonts, spacing } from '../theme';

interface Props {
  initialClassic?: Classic | null;
  initialSectionIndex?: number;
  onBack: () => void;
}

function splitParagraphs(text: string): string[] {
  const lines = text.split(/\n+/).map((part) => part.trim()).filter(Boolean);
  const result: string[] = [];
  for (const line of lines) {
    if (line.length <= 180) {
      result.push(line);
    } else {
      const pieces = line.match(/[^。！？；]+[。！？；]?/g) ?? [line];
      result.push(...pieces.map((piece) => piece.trim()).filter(Boolean));
    }
  }
  return result;
}

function cleanText(text: string): string {
  return text
    .replace(/[①-⑳㉑-㉟]/g, '')
    .replace(/\\libcirc\{[^}]*\}/g, '')
    .replace(/\s+([，。！？；])/g, '$1');
}

export function ClassicScreen({ initialClassic, initialSectionIndex, onBack }: Props) {
  const [classic, setClassic] = useState<Classic | null>(initialClassic ?? null);
  const [sectionIndex, setSectionIndex] = useState<number | null>(initialClassic && initialSectionIndex != null ? initialSectionIndex : null);
  const [translation, setTranslation] = useState('');
  const [translationVisible, setTranslationVisible] = useState(false);
  const [translationLoading, setTranslationLoading] = useState(false);
  const [translationProgress, setTranslationProgress] = useState(0);
  const [translationError, setTranslationError] = useState('');

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sectionIndex !== null) {
        setSectionIndex(null);
        setTranslation('');
        setTranslationVisible(false);
        return true;
      }
      if (classic) {
        setClassic(null);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [classic, sectionIndex]);

  const section = classic && sectionIndex !== null ? classic.sections[sectionIndex] : null;
  const paragraphs = useMemo(() => section ? splitParagraphs(cleanText(section.text)) : [], [section]);

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
          <Text style={styles.directoryHint}>{classic.kind === '名句' ? '名句补充' : `${classic.category}典籍`} · 选择篇目开始阅读</Text>
          {classic.sections.map((sectionItem, index) => (
            <Pressable key={`${classic.id}-${index}`} onPress={() => { setSectionIndex(index); setTranslation(''); setTranslationVisible(false); }} style={styles.chapterRow}>
              <Text style={styles.chapterTitle}>{sectionItem.title}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  const toggleTranslation = async () => {
    if (!section) return;
    if (translationVisible) {
      setTranslationVisible(false);
      return;
    }
    setTranslationVisible(true);
    if (translation) return;
    setTranslationLoading(true);
    setTranslationError('');
    try {
      const settings = await loadApiSettings();
      const result = await translateClassicSection(settings, `${classic.id}-${sectionIndex}`, `${classic.title}·${section.title}`, cleanText(section.text), setTranslationProgress);
      setTranslation(result);
    } catch (error) {
      setTranslationError(error instanceof Error ? error.message : '翻译失败。');
    } finally {
      setTranslationLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={classic.title} onBack={() => setSectionIndex(null)} />
      <ScrollView contentContainerStyle={styles.reader}>
        <Text style={styles.readerTitle}>{section?.title}</Text>
        <Text style={styles.readerMeta}>{classic.author} · {classic.kind === '名句' ? '名句补充' : `${classic.category}典籍`}</Text>
        {classic.note ? <Text style={styles.note}>{classic.note}</Text> : null}
        <Pressable onPress={toggleTranslation} style={styles.translateButton}>
          <Text style={styles.translateButtonText}>{translationLoading ? `正在翻译 ${Math.round(translationProgress * 100)}%` : translationVisible ? '收起白话' : '查看白话翻译'}</Text>
        </Pressable>
        {translationError ? <Text style={styles.translationError}>{translationError}</Text> : null}
        {translationVisible && translation ? <Text style={styles.translation}>{translation}</Text> : null}
        {paragraphs.map((paragraph, index) => <Text key={`${paragraph}-${index}`} style={styles.readerText}>{paragraph}</Text>)}
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
  readerTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 28, fontWeight: '800' },
  readerMeta: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: 9 },
  note: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 10 },
  translateButton: { minHeight: 46, marginTop: spacing.lg, borderWidth: 1, borderColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  translateButtonText: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 15, fontWeight: '700' },
  translationError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 8 },
  translation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16, lineHeight: 28, marginTop: 14, padding: 14, backgroundColor: colors.paperDeep },
  readerText: { color: colors.ink, fontFamily: fonts.body, fontSize: 19, lineHeight: 34, marginTop: 18 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 18, marginTop: 36 },
});
