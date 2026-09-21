import React, { useEffect, useState } from 'react';
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
import { WORKS } from '../data/works';
import { explainWithApi } from '../services/api';
import { loadApiSettings, saveApiSettings } from '../services/settings';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings } from '../types';

interface Props {
  onBack: () => void;
}

const EMPTY: ApiSettings = { endpoint: '', apiKey: '', model: '' };

export function SettingsScreen({ onBack }: Props) {
  const [settings, setSettings] = useState<ApiSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadApiSettings()
      .then((value) => setSettings(value ?? EMPTY))
      .finally(() => setLoading(false));
  }, []);

  const update = (key: keyof ApiSettings, value: string) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const save = async () => {
    await saveApiSettings(settings);
    setMessage('已保存到手机安全存储。');
  };

  const test = async () => {
    setTesting(true);
    setMessage('');
    try {
      const result = await explainWithApi(settings, {
        work: WORKS[0],
        lineIndex: 0,
        selectionStart: 0,
        selectionEnd: 0,
      });
      setMessage(`连接成功：${result.meaningInContext}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '连接失败。');
    } finally {
      setTesting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <View style={styles.backButton} />
        <Text style={styles.headerTitle}>我的</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.intro}>
          这里管理 API 设置和数据。Key 只保存在本机安全存储中，不写入源码、GitHub 或聊天记录。
        </Text>

        <Field
          label="Chat Completions 完整地址"
          hint="例如 https://api.deepseek.com/chat/completions"
          value={settings.endpoint}
          onChangeText={(value) => update('endpoint', value)}
          autoCapitalize="none"
        />
        <Field
          label="API Key"
          hint="只保存在当前手机"
          value={settings.apiKey}
          onChangeText={(value) => update('apiKey', value)}
          secureTextEntry
          autoCapitalize="none"
        />
        <Field
          label="模型名称"
          hint="例如 deepseek-chat"
          value={settings.model}
          onChangeText={(value) => update('model', value)}
          autoCapitalize="none"
        />

        <View style={styles.actions}>
          <Pressable style={styles.primary} onPress={save} disabled={loading}>
            <Text style={styles.primaryText}>保存设置</Text>
          </Pressable>
          <Pressable style={styles.secondary} onPress={test} disabled={testing || loading}>
            {testing ? (
              <ActivityIndicator color={colors.ink} />
            ) : (
              <Text style={styles.secondaryText}>测试接口</Text>
            )}
          </Pressable>
        </View>

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <View style={styles.note}>
          <Text style={styles.noteTitle}>为什么还需要本地注释</Text>
          <Text style={styles.noteText}>
            AI 适合解决临时问题，但古文训诂容易在典故、人名和通假字上出错。程序会优先使用
            内置校订注释；查不到时才请求 API。AI 结果会显示“把握程度”和上下文依据。
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  hint,
  ...props
}: {
  label: string;
  hint: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        placeholder={hint}
        placeholderTextColor={colors.muted}
        style={styles.input}
        selectionColor={colors.vermilion}
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
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  backButton: {
    width: 70,
  },
  backText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 17,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: fonts.title,
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: 2,
  },
  headerSpacer: {
    width: 70,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 120,
  },
  intro: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 25,
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  fieldLabel: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 12,
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 14,
    paddingVertical: 9,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  primary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.vermilion,
    borderRadius: 3,
  },
  primaryText: {
    color: colors.white,
    fontFamily: fonts.body,
    fontSize: 17,
    letterSpacing: 2,
  },
  secondary: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 3,
  },
  secondaryText: {
    color: colors.ink,
    fontFamily: fonts.body,
    fontSize: 17,
    letterSpacing: 2,
  },
  message: {
    color: colors.jade,
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 21,
    marginTop: spacing.md,
  },
  note: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  noteTitle: {
    color: colors.vermilion,
    fontFamily: fonts.title,
    fontSize: 19,
    fontWeight: '700',
  },
  noteText: {
    color: colors.inkSoft,
    fontFamily: fonts.body,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 10,
  },
});
