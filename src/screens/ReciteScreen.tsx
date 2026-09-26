import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadWorksCatalog } from '../data/worksCatalog';
import { DailyGoal, loadDailyGoal, loadDueRecords, loadTodayRecords, saveDailyGoal, StudyRecord } from '../services/studyQueue';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Work } from '../types';

interface Props {
  onOpenFocus: (works: Work[], initialIndex?: number) => void;
  onOpenWork: (work: Work, lineIndex?: number) => void;
  refreshToken?: number;
}

export function ReciteScreen({ onOpenFocus, onOpenWork, refreshToken = 0 }: Props) {
  const [catalog, setCatalog] = useState<Work[]>([]);
  const [goal, setGoal] = useState<DailyGoal>({ target: 1, date: '' });
  const [records, setRecords] = useState<StudyRecord[]>([]);
  const [todayRecords, setTodayRecords] = useState<StudyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorksCatalog().then(setCatalog).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    Promise.all([loadDailyGoal(), loadDueRecords(), loadTodayRecords()]).then(([nextGoal, due, today]) => {
      setGoal(nextGoal);
      setRecords(due);
      setTodayRecords(today);
    });
  }, [refreshToken]);

  const doneCount = todayRecords.filter((record) => record.status === 'done').length;
  const pending = records
    .filter((record) => record.status === 'pending')
    .map((record) => catalog.find((work) => work.id === record.workId))
    .filter((work): work is Work => Boolean(work));
  const review = records
    .filter((record) => record.status === 'done' && record.dueAt && new Date(record.dueAt).getTime() <= Date.now())
    .map((record) => catalog.find((work) => work.id === record.workId))
    .filter((work): work is Work => Boolean(work));

  const focusQueue = useMemo(() => {
    const queue = new Map<string, Work>();
    const add = (work: Work | undefined) => {
      if (work) queue.set(work.id, work);
    };
    review.forEach(add);
    pending.forEach(add);
    const minimum = Math.min(20, Math.max(1, goal.target, review.length + pending.length));
    for (const work of catalog) {
      if (queue.size >= minimum) break;
      if (!queue.has(work.id)) queue.set(work.id, work);
    }
    return [...queue.values()].slice(0, minimum);
  }, [catalog, goal.target, pending, review]);

  const openFocus = () => {
    if (focusQueue.length) onOpenFocus(focusQueue, 0);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>背诵计划</Text>
        <Text style={styles.title}>背诵</Text>
        <Text style={styles.subtitle}>今天想背几首，就按下面的清单完成。</Text>

        {loading ? <ActivityIndicator color={colors.vermilion} style={styles.loader} /> : (
          <View style={styles.taskCard}>
            <Text style={styles.taskValue}>今日背诵进度 {doneCount}/{goal.target}</Text>
            <Text style={styles.taskHint}>逐首完成，背对后自动安排下一次复习。</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: (Math.min(100, (doneCount / Math.max(1, goal.target)) * 100)).toString() + '%' as any }]} />
            </View>

            <View style={styles.taskList}>
              {focusQueue.slice(0, Math.max(1, goal.target)).map((item, index) => {
                const record = todayRecords.find((entry) => entry.workId === item.id);
                const completed = record?.status === 'done';
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => onOpenWork(item, 0)}
                    style={({ pressed }) => [styles.taskItem, pressed && styles.pressed]}
                  >
                    <Text style={styles.taskIndex}>{index + 1}.</Text>
                    <View style={styles.taskCopy}>
                      <Text style={styles.taskTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.taskMeta}>{item.author} · {item.dynasty}</Text>
                    </View>
                    <Text style={[styles.taskStatus, completed && styles.taskStatusDone]}>
                      {completed ? '已背' : '待背'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.goalTargets}>
              {[1, 2, 3, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={async () => setGoal(await saveDailyGoal(value))}
                  style={({ pressed }) => [styles.goalTarget, goal.target === value && styles.goalTargetActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.goalTargetText, goal.target === value && styles.goalTargetTextActive]}>{value} 首</Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              disabled={focusQueue.length === 0}
              onPress={openFocus}
              style={({ pressed }) => [styles.startButton, focusQueue.length === 0 && styles.disabled, pressed && styles.startButtonPressed]}
            >
              <Text style={styles.startButtonText}>开始背诵</Text>
              <Text style={styles.startButtonArrow}>开始</Text>
            </Pressable>
          </View>
        )}

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>背过之后去哪看？</Text>
          <Text style={styles.noteText}>进入底部“我的” → “背诵记录”，可以看到已背诗词和后续复习日期。</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper, paddingTop: Platform.OS === 'android' ? 28 : 50 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 128 },
  eyebrow: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.title, fontSize: 38, fontWeight: '800', letterSpacing: 4, marginTop: 6 },
  subtitle: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 15, lineHeight: 24, marginTop: 8 },
  loader: { marginTop: 60 },
  taskCard: { marginTop: spacing.lg, padding: spacing.lg, borderRadius: 20, borderWidth: 1, borderColor: '#DED6C8', backgroundColor: colors.paperLight, ...shadow },
  taskValue: { color: colors.ink, fontFamily: fonts.title, fontSize: 23, fontWeight: '800' },
  taskHint: { color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginTop: 6 },
  progressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.paperDeep, marginTop: 16 },
  progressFill: { height: 6, borderRadius: radius.pill, backgroundColor: colors.vermilion },
  taskList: { marginTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  taskItem: { minHeight: 64, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, paddingVertical: 8 },
  taskIndex: { width: 24, color: colors.muted, fontFamily: fonts.sans, fontSize: 12 },
  taskCopy: { flex: 1, minWidth: 0 },
  taskTitle: { color: colors.ink, fontFamily: fonts.title, fontSize: 17, fontWeight: '700' },
  taskMeta: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, marginTop: 4 },
  taskStatus: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, marginLeft: 8 },
  taskStatusDone: { color: colors.jade },
  goalTargets: { flexDirection: 'row', gap: 8, marginTop: 16 },
  goalTarget: { flex: 1, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  goalTargetActive: { borderColor: colors.vermilion, backgroundColor: '#FBE9E7' },
  goalTargetText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12 },
  goalTargetTextActive: { color: colors.vermilion, fontWeight: '800' },
  startButton: { minHeight: 58, borderRadius: 16, backgroundColor: colors.vermilion, marginTop: 18, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  startButtonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  startButtonText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, fontWeight: '800', letterSpacing: 1.2 },
  startButtonArrow: { color: colors.white, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  noteCard: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.65)' },
  noteTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  noteText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 22, marginTop: 6 },
});
