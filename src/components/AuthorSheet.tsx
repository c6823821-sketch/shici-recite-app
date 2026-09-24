import React from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AuthorInfo } from '../services/authorInfo';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  loading: boolean;
  error?: string;
  author?: AuthorInfo | null;
  onClose: () => void;
}

export function AuthorSheet({ visible, loading, error, author, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.vermilion} />
            <Text style={styles.loadingText}>{'\u6b63\u5728\u67e5\u8be2\u4f5c\u8005\u8d44\u6599\u2026'}</Text>
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.errorTitle}>{'\u8fd9\u6b21\u6ca1\u6709\u67e5\u5230'}</Text>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{'\u6536\u8d77'}</Text>
            </Pressable>
          </View>
        ) : author ? (
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.name}>{author.name}</Text>
            {author.dynasty ? <Text style={styles.dynasty}>{author.dynasty}</Text> : null}
            <View style={styles.bodyBox}>
              <Text style={styles.bodyLabel}>{'\u4f5c\u8005\u7b80\u4ecb'}</Text>
              <Text style={styles.body}>{author.bio}</Text>
            </View>
            {author.achievements.length ? (
              <View style={styles.bodyBox}>
                <Text style={styles.bodyLabel}>{'\u4ee3\u8868\u4f5c\u4e0e\u6210\u5c31'}</Text>
                {author.achievements.map((item) => (
                  <Text key={item} style={styles.bullet}>{'\u00b7 '}{item}</Text>
                ))}
              </View>
            ) : null}
            <Text style={styles.source}>
              {author.source === 'local' ? '\u5185\u7f6e\u8d44\u6599' : '\u0041\u0050\u0049 \u751f\u6210\u5e76\u5df2\u7f13\u5b58'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>{'\u6536\u8d77'}</Text>
            </Pressable>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31, 26, 20, 0.38)' },
  sheet: { maxHeight: '72%', minHeight: 300, backgroundColor: colors.paperLight, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderTopWidth: 1, borderColor: colors.line, paddingTop: 10 },
  handle: { width: 44, height: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 8 },
  center: { minHeight: 280, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
  loadingText: { color: colors.inkSoft, marginTop: spacing.md, fontFamily: fonts.body, fontSize: 16 },
  errorTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 24, fontWeight: '700' },
  errorText: { color: colors.danger, fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, textAlign: 'center', marginTop: spacing.md },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 34 },
  name: { color: colors.ink, fontFamily: fonts.title, fontSize: 30, fontWeight: '800', marginTop: 10 },
  dynasty: { color: colors.jade, fontFamily: fonts.sans, fontSize: 13, marginTop: 7 },
  bodyBox: { marginTop: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.vermilion, paddingLeft: 14 },
  bodyLabel: { color: colors.vermilion, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 2, marginBottom: 8 },
  body: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16, lineHeight: 27 },
  bullet: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 25, marginBottom: 5 },
  source: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: spacing.xl },
  closeButton: { marginTop: spacing.xl, alignSelf: 'center', borderBottomWidth: 1, borderBottomColor: colors.ink, paddingHorizontal: 4, paddingBottom: 3 },
  closeText: { color: colors.ink, fontFamily: fonts.body, fontSize: 17 },
});
