import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  text: string;
  loading: boolean;
  error: string;
  onChangeText: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRandom: () => void;
  onOpenSettings: () => void;
}

export function MoodRecommendSheet({
  visible,
  text,
  loading,
  error,
  onChangeText,
  onClose,
  onSubmit,
  onRandom,
  onOpenSettings,
}: Props) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.backButton}>
            <Text style={styles.backText}>‹ 返回</Text>
          </Pressable>
          <Text style={styles.headerTitle}>按心情推荐</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>今天发生了什么</Text>
          <Text style={styles.hint}>
            写心情、事情或一句近况都可以。AI 只会从 App 现有篇目里挑选，并返回原句。
          </Text>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            multiline
            autoFocus
            placeholder="例如：今天和朋友告别，心里有点舍不得……"
            placeholderTextColor={colors.muted}
            selectionColor={colors.vermilion}
            style={styles.input}
            textAlignVertical="top"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={styles.actions}>
            <Pressable style={styles.secondary} onPress={onRandom} disabled={loading}>
              <Text style={styles.secondaryText}>随机一篇</Text>
            </Pressable>
            <Pressable style={styles.primary} onPress={onSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color={colors.white} /> : <Text style={styles.primaryText}>请 AI 荐诗</Text>}
            </Pressable>
          </View>
          <Pressable onPress={onOpenSettings} style={styles.settingsLink}>
            <Text style={styles.settingsLinkText}>还没有配置 API？去设置</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, elevation: 20, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 46 : 54 },
  container: { flex: 1 },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  backButton: { width: 80 },
  backText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 20, fontWeight: '700' },
  headerSpacer: { width: 80 },
  content: { padding: spacing.lg, paddingBottom: 80 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 29, fontWeight: '800' },
  hint: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 10 },
  input: { minHeight: 170, marginTop: spacing.lg, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 3, color: colors.ink, fontFamily: fonts.body, fontSize: 18, lineHeight: 29, backgroundColor: colors.paperLight },
  error: { color: colors.danger, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, marginTop: 10 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  secondary: { flex: 1, minHeight: 50, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  primary: { flex: 1.45, minHeight: 50, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontFamily: fonts.body, fontSize: 16, letterSpacing: 1 },
  settingsLink: { alignSelf: 'center', marginTop: spacing.lg, padding: 6 },
  settingsLinkText: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 2 },
});
