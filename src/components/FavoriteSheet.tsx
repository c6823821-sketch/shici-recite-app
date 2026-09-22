import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { FavoriteFolder } from '../services/favorites';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  quote: string;
  folders: FavoriteFolder[];
  onClose: () => void;
  onSave: (folderId: string | null, newFolder: string) => void;
}

export function FavoriteSheet({ visible, quote, folders, onClose, onSave }: Props) {
  const [folderId, setFolderId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState('');
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.back}><Text style={styles.backText}>‹ 返回</Text></Pressable>
          <Text style={styles.headerTitle}>收藏到收藏夹</Text>
          <View style={styles.back} />
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <Text style={styles.quote}>“{quote}”</Text>
          <Text style={styles.label}>选择收藏夹</Text>
          <View style={styles.folderRow}>
            {folders.map((folder) => (
              <Pressable key={folder.id} onPress={() => setFolderId(folder.id)} style={[styles.folderChip, folderId === folder.id && styles.folderChipActive]}>
                <Text style={[styles.folderText, folderId === folder.id && styles.folderTextActive]}>{folder.name}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>新建收藏夹</Text>
          <TextInput
            value={newFolder}
            onChangeText={setNewFolder}
            autoFocus
            placeholder="例如：雨夜、离别、以后写作用"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable style={styles.save} onPress={() => { onSave(folderId, newFolder); setNewFolder(''); setFolderId(null); }}>
            <Text style={styles.saveText}>保存到收藏夹</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 110, elevation: 30, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 46 : 54 },
  container: { flex: 1 },
  header: { height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  back: { width: 76 },
  backText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16 },
  headerTitle: { flex: 1, textAlign: 'center', color: colors.ink, fontFamily: fonts.title, fontSize: 20, fontWeight: '700' },
  content: { padding: spacing.lg, paddingBottom: 80 },
  quote: { color: colors.ink, fontFamily: fonts.body, fontSize: 18, lineHeight: 30 },
  label: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: spacing.xl, marginBottom: 9 },
  folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  folderChip: { minHeight: 44, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, justifyContent: 'center' },
  folderChipActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  folderText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15 },
  folderTextActive: { color: colors.vermilion, fontWeight: '700' },
  input: { minHeight: 50, borderBottomWidth: 1, borderBottomColor: colors.line, color: colors.ink, fontFamily: fonts.body, fontSize: 16, paddingVertical: 8 },
  save: { minHeight: 52, marginTop: 30, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
});
