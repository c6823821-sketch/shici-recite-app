import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { StudyPlan } from '../services/plan';
import { colors, fonts, spacing } from '../theme';

interface Props {
  visible: boolean;
  workId: string;
  current: StudyPlan | null;
  lineCount: number;
  onClose: () => void;
  onSave: (plan: StudyPlan) => void;
}

const DAY_OPTIONS = [7, 14, 30, 60, 90];

export function PlanSheet({ visible, workId, current, lineCount, onClose, onSave }: Props) {
  const [days, setDays] = useState(current?.targetDays ?? 30);
  const [minutes, setMinutes] = useState(current?.minutesPerDay ?? 15);
  const linesPerDay = Math.max(1, Math.ceil(lineCount / days));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>安排背诵期限</Text>
        <Text style={styles.hint}>计划只决定每天引入多少新句；复习时间仍由 FSRS 根据你的记忆表现动态调整。</Text>
        <Text style={styles.sectionLabel}>目标天数</Text>
        <View style={styles.row}>
          {DAY_OPTIONS.map((day) => (
            <Pressable key={day} onPress={() => setDays(day)} style={[styles.chip, days === day && styles.chipActive]}>
              <Text style={[styles.chipText, days === day && styles.chipTextActive]}>{day} 天</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.sectionLabel}>每天可用时间</Text>
        <View style={styles.row}>
          {[10, 15, 20, 30, 45].map((value) => (
            <Pressable key={value} onPress={() => setMinutes(value)} style={[styles.chip, minutes === value && styles.chipActive]}>
              <Text style={[styles.chipText, minutes === value && styles.chipTextActive]}>{value} 分钟</Text>
            </Pressable>
          ))}
        </View>
        <View style={styles.estimate}>
          <Text style={styles.estimateTitle}>系统预估</Text>
          <Text style={styles.estimateText}>每天新学约 {linesPerDay} 句，至少安排 {Math.max(minutes, linesPerDay * 3)} 分钟。</Text>
          <Text style={styles.estimateText}>漏学后不会把所有内容一次堆积；程序会重新计算引入速度，但不会伪造记忆效果。</Text>
        </View>
        <View style={styles.actions}>
          <Pressable style={styles.secondary} onPress={onClose}><Text style={styles.secondaryText}>取消</Text></Pressable>
          <Pressable style={styles.primary} onPress={() => onSave({ workId, targetDays: days, minutesPerDay: minutes, startDate: new Date().toISOString() })}>
            <Text style={styles.primaryText}>保存计划</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(31,26,20,0.42)' },
  sheet: { backgroundColor: colors.paperLight, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: spacing.lg, paddingBottom: 32 },
  handle: { width: 44, height: 3, backgroundColor: colors.line, alignSelf: 'center', marginBottom: 18 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 27, fontWeight: '800' },
  hint: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14, lineHeight: 23, marginTop: 9 },
  sectionLabel: { color: colors.jade, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.5, marginTop: spacing.lg, marginBottom: 9 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 2, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.paper },
  chipActive: { borderColor: colors.vermilion, backgroundColor: colors.paperLight },
  chipText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 14 },
  chipTextActive: { color: colors.vermilion, fontWeight: '700' },
  estimate: { marginTop: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.vermilion, paddingLeft: 13 },
  estimateTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 16, fontWeight: '700' },
  estimateText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 21, marginTop: 6 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
  secondary: { flex: 1, minHeight: 48, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  secondaryText: { color: colors.ink, fontFamily: fonts.body, fontSize: 16 },
  primary: { flex: 1.4, minHeight: 48, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', borderRadius: 3 },
  primaryText: { color: colors.white, fontFamily: fonts.body, fontSize: 17 },
});
