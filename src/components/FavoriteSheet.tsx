import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <KeyboardAvoidingView style={styles.wrapper} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>收藏这句话</Text>
          <Text style={styles.quote}>“{quote}”</Text>
          <Text style={styles.label}>选择收藏夹</Text>
          <View style={styles.folderRow}>
            {folders.map((folder) => (
              <Pressable key={folder.id} onPress={() => setFolderId(folder.id)} style={[styles.folderChip, folderId === folder.id && styles.folderChipActive]}>
                <Text style={[styles.folderText, folderId === folder.id && styles.folderTextActive]}>{folder.name}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={newFolder}
            onChangeText={setNewFolder}
            placeholder="新建收藏夹，例如：我最喜欢的句子"
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Pressable style={styles.save} onPress={() => { onSave(folderId, newFolder); setNewFolder(''); setFolderId(null); }}>
            <Text style={styles.saveText}>保存到收藏夹</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,20,0.42)' },
  wrapper: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.paperLight, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: spacing.lg, paddingBottom: 34 },
  handle: { width: 44, height: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 18 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 27, fontWeight: '800' },
  quote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 17, lineHeight: 28, marginTop: 14 },
  label: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: spacing.lg, marginBottom: 9 },
  folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  folderChip: { minHeight: 42, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, justifyContent: 'center' },
  folderChipActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  folderText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  folderTextActive: { color: colors.vermilion, fontWeight: '700' },
  input: { minHeight: 48, marginTop: 12, borderBottomWidth: 1, borderBottomColor: colors.line, color: colors.ink, fontFamily: fonts.body, fontSize: 16, paddingVertical: 8 },
  save: { minHeight: 52, marginTop: spacing.xl, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontFamily: fonts.body, fontSize: 17, fontWeight: '700' },
});
