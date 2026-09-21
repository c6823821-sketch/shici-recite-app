import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { FavoriteFolder } from '../services/favorites';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  quote: string;
  folders: FavoriteFolder[];
  onClose: () => void;
  onSave: (name: string, tagsText: string, folderId: string | null, newFolder: string) => void;
}

export function FavoriteSheet({ visible, quote, folders, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [newFolder, setNewFolder] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>收藏这句话</Text>
        <Text style={styles.quote}>“{quote}”</Text>
        <Text style={styles.label}>给它起个名字</Text>
        <TextInput value={name} onChangeText={setName} placeholder="例如：写离别最好的一句" placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={styles.label}>标签</Text>
        <TextInput value={tags} onChangeText={setTags} placeholder="例如：离别, 宋词, 以后用" placeholderTextColor={colors.muted} style={styles.input} />
        <Text style={styles.label}>放进收藏夹</Text>
        <View style={styles.folderRow}>
          {folders.map((folder) => (
            <Pressable key={folder.id} onPress={() => setFolderId(folder.id)} style={[styles.folderChip, folderId === folder.id && styles.folderChipActive]}>
              <Text style={[styles.folderText, folderId === folder.id && styles.folderTextActive]}>{folder.name}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput value={newFolder} onChangeText={setNewFolder} placeholder="或者新建一个收藏夹，例如：最爱离别句" placeholderTextColor={colors.muted} style={styles.input} />
        <Pressable style={styles.save} onPress={() => { onSave(name.trim() || '未命名收藏', tags, folderId, newFolder); setName(''); setTags(''); setNewFolder(''); setFolderId(null); }}>
          <Text style={styles.saveText}>保存到我的收藏</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,20,0.42)' },
  sheet: { backgroundColor: colors.paperLight, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: spacing.lg, paddingBottom: 34 },
  handle: { width: 44, height: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 18 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 26, fontWeight: '800' },
  quote: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 16, lineHeight: 26, marginTop: 14 },
  label: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, marginTop: spacing.lg, marginBottom: 7 },
  input: { minHeight: 46, borderBottomWidth: 1, borderBottomColor: colors.line, color: colors.ink, fontFamily: fonts.body, fontSize: 16, paddingVertical: 8 },
  folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  folderChip: { minHeight: 36, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, justifyContent: 'center' },
  folderChipActive: { borderColor: colors.vermilion, backgroundColor: '#F4E2DC' },
  folderText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13 },
  folderTextActive: { color: colors.vermilion, fontWeight: '700' },
  save: { minHeight: 50, marginTop: spacing.xl, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontFamily: fonts.body, fontSize: 17, letterSpacing: 1 },
});
