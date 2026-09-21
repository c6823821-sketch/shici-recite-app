import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView
          style={styles.wrapper}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.handle} />
          <Text style={styles.title}>今天发生了什么</Text>
          <Text style={styles.hint}>
            写心情、事情或一句近况都可以。AI 只会从 App 现有篇目里挑选，并返回原句。
          </Text>
          <TextInput
            value={text}
            onChangeText={onChangeText}
            multiline
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
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(31, 26, 20, 0.42)',
  },
  wrapper: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '78%',
    backgroundColor: colors.paperLight,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 34 : spacing.lg,
  },
  handle: {
    width: 44,
    height: 3,
    alignSelf: 'center',
    backgroundColor: colors.line,
    marginBottom: 18,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 26,
    fontWeight: '800',
  },
  hint: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 23,
    marginTop: 9,
  },
  input: {
    minHeight: 132,
    marginTop: spacing.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 17,
    lineHeight: 27,
    backgroundColor: colors.paper,
  },
  error: {
    color: colors.danger,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 10,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  secondary: {
    flex: 1,
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 16,
  },
  primary: {
    flex: 1.45,
    minHeight: 50,
    backgroundColor: colors.vermilion,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 3,
  },
  primaryText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 16,
    letterSpacing: 1,
  },
  settingsLink: {
    alignSelf: 'center',
    marginTop: spacing.md,
    padding: 5,
  },
  settingsLinkText: {
    color: colors.muted,
    fontFamily: fonts.sans,
    fontSize: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 2,
  },
});


