import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { loadWorksCatalog } from '../data/worksCatalog';
import { selectReciteWorks } from '../services/reciteSelection';
import { DailyGoal, loadDailyGoal, loadDueRecords, loadTodayRecords, saveDailyGoal, StudyRecord } from '../services/studyQueue';
import { workDisplayTitle } from '../services/workPresentation';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { Work } from '../types';

interface Props {
  onOpenFocus: (works: Work[], initialIndex?: number) => void;
  refreshToken?: number;
}

export function ReciteScreen({ onOpenFocus, refreshToken = 0 }: Props) {
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

  const catalogById = useMemo(() => new Map(catalog.map((work) => [work.id, work])), [catalog]);
  const doneCount = useMemo(
    () => todayRecords.filter((record) => record.status === 'done').length,
    [todayRecords],
  );
  const completedToday = useMemo(
    () => new Set(todayRecords.filter((record) => record.status === 'done').map((record) => record.workId)),
    [todayRecords],
  );
  const remainingTarget = Math.max(0, goal.target - doneCount);
  const pending = useMemo(
    () => records
      .filter((record) => record.status === 'pending')
      .map((record) => catalogById.get(record.workId))
      .filter((work): work is Work => Boolean(work)),
    [catalogById, records],
  );
  const review = useMemo(
    () => records
      .filter((record) => record.status === 'done' && record.dueAt && new Date(record.dueAt).getTime() <= Date.now())
      .map((record) => catalogById.get(record.workId))
      .filter((work): work is Work => Boolean(work)),
    [catalogById, records],
  );
  const attentionCount = pending.length + review.length;

  const focusQueue = useMemo(() => {
    const queue = new Map<string, Work>();
    review.forEach((work) => queue.set(work.id, work));
    pending.forEach((work) => queue.set(work.id, work));
    const minimum = Math.min(20, Math.max(attentionCount, remainingTarget));
    const ranked = selectReciteWorks(catalog, minimum, completedToday);
    for (const work of ranked) {
      if (queue.size >= minimum) break;
      queue.set(work.id, work);
    }
    return [...queue.values()].slice(0, minimum);
  }, [attentionCount, catalog, completedToday, pending, remainingTarget, review]);

  const taskQueue = focusQueue.slice(0, Math.max(remainingTarget, attentionCount));

  const openFocus = () => {
    if (focusQueue.length) onOpenFocus(focusQueue, 0);
  };

  const openTask = (item: Work) => {
    const index = focusQueue.findIndex((work) => work.id === item.id);
    if (index >= 0) onOpenFocus(focusQueue, index);
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>背诵计划</Text>
        <Text style={styles.title}>背诵</Text>
        <Text style={styles.subtitle}>今天想背几首，就按下面的清单完成。</Text>

        {loading ? <ActivityIndicator color={colors.vermilion} style={styles.loader} /> : (
          <View style={styles.taskCard}>
            <Text style={styles.taskValue}>今日背诵进度 {doneCount}/{goal.target} · {remainingTarget > 0 ? `还剩 ${remainingTarget} 首` : '已完成'}</Text>
            <Text style={styles.taskHint}>点任意一篇可直接进入背诵，也可以从头开始。</Text>

            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: (Math.min(100, (doneCount / Math.max(1, goal.target)) * 100)).toString() + '%' as any }]} />
            </View>

            <View style={styles.taskList}>
              {taskQueue.length ? taskQueue.map((item, index) => (
                <Pressable
                  key={item.id}
                  onPress={() => openTask(item)}
                  style={({ pressed }) => [styles.taskItem, pressed && styles.pressed]}
                >
                  <Text style={styles.taskIndex}>{index + 1}.</Text>
                  <View style={styles.taskCopy}>
                    <Text style={styles.taskTitle} numberOfLines={1}>{workDisplayTitle(item)}</Text>
                    <Text style={styles.taskMeta}>{item.author} · {item.dynasty}</Text>
                  </View>
                  <Text style={styles.taskStatus}>待背 ›</Text>
                </Pressable>
              )) : (
                <Text style={styles.taskEmpty}>今天的背诵目标已经完成，可以休息一下。</Text>
              )}
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

            <View style={[styles.startButtonShell, focusQueue.length === 0 && styles.disabled]}>
              <Text style={styles.startButtonText}>{focusQueue.length ? '从头开始背诵' : '今日已完成'}</Text>
              <Pressable disabled={focusQueue.length === 0} onPress={openFocus} style={styles.startButtonHit} />
            </View>
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
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: Platform.OS === 'android' ? 28 : 50 },
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
  taskEmpty: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 22, paddingVertical: 18 },
  goalTargets: { flexDirection: 'row', gap: 8, marginTop: 16 },
  goalTarget: { flex: 1, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.paper },
  goalTargetActive: { borderColor: colors.vermilion, backgroundColor: '#FBE9E7' },
  goalTargetText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 12 },
  goalTargetTextActive: { color: colors.vermilion, fontWeight: '800' },
  startButtonShell: { minHeight: 58, borderRadius: 16, backgroundColor: colors.vermilion, marginTop: 18, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  startButtonHit: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  startButtonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  startButtonText: { color: colors.white, fontFamily: fonts.body, fontSize: 18, fontWeight: '800', letterSpacing: 1.2 },
  startButtonArrow: { color: colors.white, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.65 },
  noteCard: { marginTop: spacing.lg, padding: spacing.md, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,255,255,0.65)' },
  noteTitle: { color: colors.ink, fontFamily: fonts.body, fontSize: 14, fontWeight: '700' },
  noteText: { color: colors.inkSoft, fontFamily: fonts.body, fontSize: 13, lineHeight: 22, marginTop: 6 },
});
