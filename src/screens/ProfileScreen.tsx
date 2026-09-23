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
import { explainWithApi } from '../services/api';
import { FavoriteFolder, FavoriteLine, loadFavorites, loadFolders, removeFavorite } from '../services/favorites';
import { loadApiSettings, saveApiSettings } from '../services/settings';
import { checkForUpdate, downloadAndInstallUpdate, formatBytes, UpdateInfo } from '../services/updater';
import { colors, fonts, spacing } from '../theme';
import { ApiSettings } from '../types';

type Section = 'menu' | 'api' | 'favorites';

interface Props {
  onOpenFavorite: (favorite: FavoriteLine) => void;
}

const EMPTY: ApiSettings = { endpoint: '', apiKey: '', model: '' };

export function ProfileScreen({ onOpenFavorite }: Props) {
  const [section, setSection] = useState<Section>('menu');
  const [settings, setSettings] = useState<ApiSettings>(EMPTY);
  const [favorites, setFavorites] = useState<FavoriteLine[]>([]);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [message, setMessage] = useState('');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadApiSettings().then((value) => setSettings(value ?? EMPTY));
    loadFavorites().then(setFavorites);
    loadFolders().then(setFolders);
  }, []);

  const refreshFavorites = async () => {
    setFavorites(await loadFavorites());
    setFolders(await loadFolders());
  };

  const save = async () => {
    await saveApiSettings(settings);
    setMessage('API 设置已保存。');
  };

  const test = async () => {
    setMessage('正在测试 API…');
    try {
      const result = await explainWithApi(settings, { work: { id: 'test', title: '静夜思', author: '李白', dynasty: '唐', genre: '诗', intro: '', collections: [], themes: [], moods: [], lines: ['床前明月光，'], translations: [''], glossary: [], source: '' }, lineIndex: 0, selectionStart: 0, selectionEnd: 0 });
      setMessage(`连接成功：${result.meaningInContext}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '连接失败。');
    }
  };

  const checkUpdate = async () => {
    setChecking(true);
    setMessage('');
    setUpdateInfo(null);
    try {
      const next = await checkForUpdate();
      if (!next) setMessage('当前已经是最新版本。');
      else setUpdateInfo(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '检查更新失败。');
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!updateInfo) return;
    setInstalling(true);
    setProgress(0);
    try {
      await downloadAndInstallUpdate(updateInfo, setProgress);
      setMessage('已打开系统安装器。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '安装包处理失败。');
    } finally {
      setInstalling(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {section === 'menu' ? <View style={styles.headerSide} /> : (
          <Pressable onPress={() => setSection('menu')} style={styles.headerSide}>
            <Text style={styles.backText}>‹ 返回</Text>
          </Pressable>
        )}
        <Text style={styles.headerTitle}>我的</Text>
        <View style={styles.headerSide} />
      </View>

      {section === 'menu' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <MenuRow title="API 设置" detail="地址、Key、模型" onPress={() => { setMessage(''); setSection('api'); }} />
          <MenuRow title="我的收藏" detail={`${favorites.length} 条句子 · ${folders.length} 个收藏夹`} onPress={() => setSection('favorites')} />
          <MenuRow title="检查更新" detail={checking ? '正在检查…' : '应用内下载并安装新版'} onPress={checkUpdate} />
          {updateInfo ? (
            <View style={styles.updateBox}>
              <Text style={styles.updateTitle}>发现新版 v{updateInfo.version}</Text>
              <Text style={styles.updateMeta}>安装包 {formatBytes(updateInfo.size)}</Text>
              {installing ? <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} /></View> : null}
              <Pressable style={styles.installButton} onPress={installUpdate} disabled={installing}>
                <Text style={styles.installButtonText}>{installing ? `下载中 ${Math.round(progress * 100)}%` : '下载并安装'}</Text>
              </Pressable>
            </View>
          ) : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}
        </ScrollView>
      ) : section === 'api' ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.help}>API Key 只保存在手机安全存储中，不写入源码或 GitHub。</Text>
            <Field label="Chat Completions 完整地址" value={settings.endpoint} onChangeText={(value) => setSettings({ ...settings, endpoint: value })} placeholder="https://api.deepseek.com/chat/completions" />
            <Field label="API Key" value={settings.apiKey} onChangeText={(value) => setSettings({ ...settings, apiKey: value })} placeholder="只保存在当前手机" secureTextEntry />
            <Field label="模型名称" value={settings.model} onChangeText={(value) => setSettings({ ...settings, model: value })} placeholder="deepseek-chat" />
            <View style={styles.actions}>
              <Pressable style={styles.primary} onPress={save}><Text style={styles.primaryText}>保存设置</Text></Pressable>
              <Pressable style={styles.secondary} onPress={test}><Text style={styles.secondaryText}>测试接口</Text></Pressable>
            </View>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {favorites.length === 0 ? <Text style={styles.help}>还没有收藏。阅读时选中句子后点“☆ 收藏”。</Text> : null}
          {folders.map((folder) => {
            const items = favorites.filter((item) => item.folderId === folder.id);
            if (!items.length) return null;
            return (
              <View key={folder.id} style={styles.folderBlock}>
                <Text style={styles.folderTitle}>{folder.name}</Text>
                {items.map((item) => <FavoriteItem key={item.id} item={item} onDeleted={refreshFavorites} onOpen={() => onOpenFavorite(item)} />)}
              </View>
            );
          })}
          {favorites.some((item) => !item.folderId) ? <Text style={styles.folderTitle}>未分类</Text> : null}
          {favorites.filter((item) => !item.folderId).map((item) => <FavoriteItem key={item.id} item={item} onDeleted={refreshFavorites} onOpen={() => onOpenFavorite(item)} />)}
        </ScrollView>
      )}
    </View>
  );
}

function MenuRow({ title, detail, onPress }: { title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuCopy}>
        <Text style={styles.menuTitle}>{title}</Text>
        <Text style={styles.menuDetail}>{detail}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

function Field({ label, ...props }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput {...props} placeholderTextColor={colors.muted} selectionColor={colors.vermilion} style={styles.input} />
    </View>
  );
}

function FavoriteItem({ item, onDeleted, onOpen }: { item: FavoriteLine; onDeleted: () => void; onOpen: () => void }) {
  return (
    <View style={styles.favoriteItem}>
      <Pressable onPress={onOpen} style={styles.favoriteQuoteButton}>
        <Text style={styles.favoriteQuote}>“{item.quote}”</Text>
      </Pressable>
      <Pressable onPress={async () => { await removeFavorite(item.id); onDeleted(); }} style={styles.deleteButton}>
        <Text style={styles.delete}>删除</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 46 : 52 },
  flex: { flex: 1 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerSide: { width: 72 },
  backText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 22, fontWeight: '800' },
  content: { padding: spacing.lg, paddingBottom: 120 },
  menuRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, paddingVertical: 14 },
  menuCopy: { flex: 1 },
  menuTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 18, fontWeight: '700' },
  menuDetail: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  menuArrow: { color: colors.vermilion, fontFamily: fonts.body, fontSize: 28 },
  help: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, marginBottom: spacing.lg },
  field: { marginBottom: spacing.lg },
  label: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginBottom: 8 },
  input: { minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.line, color: colors.ink, fontFamily: fonts.sans, fontSize: 15, paddingVertical: 8 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  primary: { flex: 1, minHeight: 48, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.white, fontFamily: fonts.body, fontSize: 16 },
  secondary: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  message: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 10 },
  updateBox: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: colors.paperLight, borderWidth: 1, borderColor: colors.line },
  updateTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
  updateMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, marginTop: 6 },
  progressTrack: { height: 6, backgroundColor: colors.paperDeep, marginTop: 12 },
  progressFill: { height: 6, backgroundColor: colors.vermilion },
  installButton: { minHeight: 48, marginTop: 12, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  installButtonText: { color: colors.white, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
  folderBlock: { marginBottom: 18 },
  folderTitle: { color: colors.vermilion, fontFamily: fonts.title, fontSize: 20, fontWeight: '800', marginTop: 16, marginBottom: 8 },
  favoriteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  favoriteQuoteButton: { flex: 1, paddingRight: 10 },
  favoriteQuote: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, lineHeight: 26 },
  deleteButton: { minWidth: 48, minHeight: 40, alignItems: 'center', justifyContent: 'center' },
  delete: { color: colors.danger, fontFamily: fonts.sans, fontSize: 12 },
});
