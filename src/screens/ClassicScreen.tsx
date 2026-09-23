import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { CLASSICS } from '../data/classics';
import { translateClassicSection } from '../services/classicTranslation';
import { findDictionaryExplanation } from '../services/localDictionary';
import { explainWithApi } from '../services/api';
import { loadApiSettings } from '../services/settings';
import { ExplanationSheet } from '../components/ExplanationSheet';
import { Classic, Explanation, Work } from '../types';
import { colors, fonts, spacing } from '../theme';

interface Props {
  classic: Classic | null;
  sectionIndex?: number;
  onClassicChange: (classic: Classic | null) => void;
  onSectionChange: (sectionIndex?: number) => void;
  onBack: () => void;
}

function splitSentences(text: string): string[] {
  return (text.match(/[^。！？；]+[。！？；]?/g) ?? [text])
    .map((part) => part.trim())
    .filter(Boolean);
}

function calculateCharIndexes(line: string, start: number, end: number): { start: number; end: number } {
  return { start, end };
}

export function ClassicScreen({ classic, sectionIndex, onClassicChange, onSectionChange, onBack }: Props) {
  const [page, setPage] = useState(0);
  const [translations, setTranslations] = useState<Record<number, string>>({});
  const [translationLoading, setTranslationLoading] = useState<number | null>(null);
  const [translationError, setTranslationError] = useState<number | null>(null);
  const [settings, setSettings] = useState<Awaited<ReturnType<typeof loadApiSettings>>>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const section = classic && sectionIndex !== undefined ? classic.sections[sectionIndex] : null;
  const sentences = useMemo(() => section ? splitSentences(section.text) : [], [section]);
  const pageSize = 6;
  const pageCount = Math.max(1, Math.ceil(sentences.length / pageSize));
  const pageStart = page * pageSize;
  const visibleSentences = sentences.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(0);
    setTranslations({});
    setTranslationError(null);
    setExplanation(null);
    setSheetVisible(false);
    loadApiSettings().then(setSettings);
  }, [classic?.id, sectionIndex]);

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
    lines: sentences,
    translations: [],
    glossary: [],
  };

  const translateSentence = async (sentenceIndex: number) => {
    if (translations[sentenceIndex]) return;
    setTranslationLoading(sentenceIndex);
    setTranslationError(null);
    try {
      const result = await translateClassicSection(settings, `${classic.id}-${sectionIndex}-${sentenceIndex}`, `${classic.title}·${section.title}`, sentences[sentenceIndex]);
      setTranslations((current) => ({ ...current, [sentenceIndex]: result }));
    } catch (error) {
      setTranslationError(sentenceIndex);
    } finally {
      setTranslationLoading(null);
    }
  };

  const lookupCharacter = async (sentenceIndex: number, charIndex: number) => {
    setSheetVisible(true);
    setLookingUp(true);
    setLookupError('');
    setExplanation(null);
    const dictionary = findDictionaryExplanation(temporaryWork, sentenceIndex, charIndex, charIndex);
    if (!settings?.endpoint.trim() || !settings.model.trim()) {
      if (dictionary) setExplanation(dictionary);
      else setLookupError('这句字义暂未收录。请先在“我的 → API 设置”配置接口。');
      setLookingUp(false);
      return;
    }
    try {
      const result = await explainWithApi(settings, {
        work: temporaryWork,
        lineIndex: sentenceIndex,
        selectionStart: charIndex,
        selectionEnd: charIndex,
      });
      setExplanation(result);
    } catch (error) {
      if (dictionary) setExplanation(dictionary);
      else setLookupError(error instanceof Error ? error.message : '查字失败。');
    } finally {
      setLookingUp(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={classic.title} onBack={() => onSectionChange(undefined)} />
      <ScrollView contentContainerStyle={styles.reader}>
        <Text style={styles.readerTitle}>{section.title}</Text>
        <Text style={styles.readerMeta}>{classic.author} · {classic.kind === '名句' ? '名句补充' : `${classic.category}典籍`}</Text>
        {classic.note ? <Text style={styles.note}>{classic.note}</Text> : null}
        {visibleSentences.map((sentence, offset) => {
          const sentenceIndex = pageStart + offset;
          const chars = Array.from(sentence);
          const translation = translations[sentenceIndex];
          return (
            <View key={`${sentence}-${sentenceIndex}`} style={styles.sentenceBlock}>
              <View style={styles.charRow}>
                {chars.map((char, charIndex) => (
                  <Pressable key={`${char}-${charIndex}`} onPress={() => lookupCharacter(sentenceIndex, charIndex)} style={styles.charTouch}>
                    <Text style={styles.char}>{char}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => translateSentence(sentenceIndex)} style={styles.sentenceTranslate}>
                {translationLoading === sentenceIndex ? <ActivityIndicator size="small" color={colors.vermilion} /> : <Text style={styles.sentenceTranslateText}>{translation ? '收起白话' : '查看白话'}</Text>}
              </Pressable>
              {translation ? <Text style={styles.sentenceTranslation}>{translation}</Text> : null}
              {translationError === sentenceIndex ? <Text style={styles.translationError}>这句翻译失败，请检查 API 设置。</Text> : null}
            </View>
          );
        })}
        <View style={styles.pager}>
          <Pressable disabled={page === 0} onPress={() => setPage((value) => Math.max(0, value - 1))} style={[styles.pagerButton, page === 0 && styles.disabled]}>
            <Text style={styles.pagerText}>上一页</Text>
          </Pressable>
          <Text style={styles.pagerInfo}>{page + 1} / {pageCount}</Text>
          <Pressable disabled={page >= pageCount - 1} onPress={() => setPage((value) => Math.min(pageCount - 1, value + 1))} style={[styles.pagerButton, page >= pageCount - 1 && styles.disabled]}>
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
  sentenceBlock: { marginTop: spacing.lg, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  charRow: { flexDirection: 'row', flexWrap: 'wrap' },
  charTouch: { minWidth: 24, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  char: { color: colors.ink, fontFamily: fonts.body, fontSize: 20, lineHeight: 32 },
  sentenceTranslate: { alignSelf: 'flex-start', marginTop: 5, paddingVertical: 4 },
  sentenceTranslateText: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 12, borderBottomWidth: 1, borderBottomColor: colors.vermilion, paddingBottom: 2 },
  sentenceTranslation: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 25, marginTop: 8 },
  translationError: { color: colors.danger, fontFamily: fonts.sans, fontSize: 11, marginTop: 6 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 28 },
  pagerButton: { minWidth: 76, minHeight: 40, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  pagerText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  pagerInfo: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  disabled: { opacity: 0.3 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 18, marginTop: 36 },
});
