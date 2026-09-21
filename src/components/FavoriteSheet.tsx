import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  quote: string;
  onClose: () => void;
  onSave: (name: string, tagsText: string) => void;
}

export function FavoriteSheet({ visible, quote, onClose, onSave }: Props) {
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
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
        <Pressable style={styles.save} onPress={() => { onSave(name.trim() || '未命名收藏', tags); setName(''); setTags(''); }}>
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
  save: { minHeight: 50, marginTop: spacing.xl, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontFamily: fonts.body, fontSize: 17, letterSpacing: 1 },
});
