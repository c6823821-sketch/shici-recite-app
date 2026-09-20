import React from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { Explanation } from '../types';

interface Props {
  visible: boolean;
  loading: boolean;
  error?: string;
  explanation?: Explanation | null;
  onClose: () => void;
  onRetry?: () => void;
}

function confidenceText(explanation: Explanation): string {
  if (explanation.confidence === 'high') return '把握较高';
  if (explanation.confidence === 'medium') return '有异说';
  if (explanation.confidence === 'low') return '把握较低';
  return '未标注把握';
}

function sourceText(explanation: Explanation): string {
  if (explanation.source === 'local') return '内置校订注释';
  if (explanation.source === 'api') return 'AI 上下文解释';
  return '基础提示';
}

function Section({ title, children }: { title: string; children?: string }) {
  if (!children) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

export function ExplanationSheet({ visible, loading, error, explanation, onClose, onRetry }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.vermilion} />
            <Text style={styles.loadingText}>正在结合上下文考据……</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>这次没有查成</Text>
            <Text style={styles.errorText}>{error}</Text>
            {onRetry ? (
              <Pressable style={styles.retry} onPress={onRetry}>
                <Text style={styles.retryText}>重试</Text>
              </Pressable>
            ) : null}
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>收起</Text>
            </Pressable>
          </View>
        ) : explanation ? (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <View style={styles.headingRow}>
              <View style={styles.selectionSeal}>
                <Text style={styles.selection}>{explanation.selection}</Text>
              </View>
              <View style={styles.headingMeta}>
                <Text style={styles.source}>{sourceText(explanation)}</Text>
                <Text style={styles.confidence}>{confidenceText(explanation)}</Text>
              </View>
            </View>

            {explanation.pinyin ? <Text style={styles.pinyin}>{explanation.pinyin}</Text> : null}
            <View style={styles.contextBlock}>
              <Text style={styles.contextLabel}>此处意思</Text>
              <Text style={styles.contextMeaning}>{explanation.meaningInContext}</Text>
            </View>

            <Section title="整句直译" children={explanation.literalTranslation} />
            <Section title="白话翻译" children={explanation.plainTranslation} />
            <Section title="语法与结构" children={explanation.grammar} />

            {explanation.notes.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>容易误解</Text>
                {explanation.notes.map((note) => (
                  <Text key={note} style={styles.bullet}>
                    · {note}
                  </Text>
                ))}
              </View>
            ) : null}

            {explanation.uncertainty ? (
              <View style={styles.uncertainty}>
                <Text style={styles.uncertaintyTitle}>需要留意</Text>
                <Text style={styles.uncertaintyText}>{explanation.uncertainty}</Text>
              </View>
            ) : null}

            {explanation.evidence.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>上下文依据</Text>
                {explanation.evidence.map((item) => (
                  <Text key={item} style={styles.evidence}>
                    {item}
                  </Text>
                ))}
              </View>
            ) : null}

            {explanation.source === 'api' ? (
              <Text style={styles.disclaimer}>
                AI 只负责提出解释。重点篇目的典故、人名和古地名仍要以后续校订注释为准。
              </Text>
            ) : null}

            <Pressable style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeText}>收起</Text>
            </Pressable>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 26, 20, 0.38)',
  },
  sheet: {
    maxHeight: '72%',
    minHeight: 270,
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
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: 8,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 34,
  },
  center: {
    minHeight: 250,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    color: colors.inkSoft,
    marginTop: spacing.md,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  errorTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 24,
    fontWeight: '700',
  },
  errorText: {
    color: colors.danger,
    fontFamily: fonts.sans,
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  retry: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.vermilion,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 2,
  },
  retryText: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: 10,
  },
  selectionSeal: {
    width: 68,
    height: 68,
    borderWidth: 3,
    borderColor: colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-3deg' }],
  },
  selection: {
    color: colors.vermilion,
    fontFamily: fonts.title,
    fontSize: 34,
    fontWeight: '700',
  },
  headingMeta: {
    gap: 6,
  },
  source: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 17,
  },
  confidence: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 13,
  },
  pinyin: {
    color: colors.vermilion,
    fontFamily: fonts.sans,
    fontSize: 16,
    marginTop: 12,
    letterSpacing: 1,
  },
  contextBlock: {
    borderLeftWidth: 3,
    borderLeftColor: colors.vermilion,
    paddingLeft: 14,
    marginTop: spacing.lg,
    marginBottom: 6,
  },
  contextLabel: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 2,
  },
  contextMeaning: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 22,
    lineHeight: 34,
    marginTop: 6,
  },
  section: {
    marginTop: spacing.lg,
  },
  sectionTitle: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 7,
  },
  sectionText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 28,
  },
  bullet: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 26,
  },
  uncertainty: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.vermilion,
    padding: 14,
    borderRadius: 3,
  },
  uncertaintyTitle: {
    color: colors.vermilion,
    fontFamily: fonts.body,
    fontSize: 16,
    fontWeight: '700',
  },
  uncertaintyText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 6,
  },
  evidence: {
    color: colors.muted,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 23,
    marginBottom: 5,
  },
  disclaimer: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 19,
    marginTop: spacing.xl,
  },
  closeButton: {
    marginTop: spacing.xl,
    alignSelf: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.ink,
    paddingHorizontal: 4,
    paddingBottom: 3,
  },
  closeText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 17,
  },
});
