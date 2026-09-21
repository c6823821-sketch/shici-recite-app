import { getStoredValue, setStoredValue } from './settings';

export interface StudyRecord {
  workId: string;
  status: 'done' | 'pending';
  date: string;
  updatedAt: string;
}

export interface DailyGoal {
  target: number;
  date: string;
}

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export async function loadStudyRecords(): Promise<StudyRecord[]> {
  const raw = await getStoredValue('study_records_v1');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StudyRecord[];
  } catch {
    return [];
  }
}

export async function loadTodayRecords(): Promise<StudyRecord[]> {
  const records = await loadStudyRecords();
  return records.filter((record) => record.date === today());
}

export async function setStudyStatus(workId: string, status: StudyRecord['status']): Promise<void> {
  const records = await loadStudyRecords();
  const next: StudyRecord = { workId, status, date: today(), updatedAt: new Date().toISOString() };
  const filtered = records.filter((record) => !(record.workId === workId && record.date === today()));
  await setStoredValue('study_records_v1', JSON.stringify([...filtered, next]));
}

export async function loadDailyGoal(): Promise<DailyGoal> {
  const raw = await getStoredValue('daily_goal_v1');
  if (!raw) return { target: 1, date: today() };
  try {
    const parsed = JSON.parse(raw) as DailyGoal;
    return parsed.date === today() ? parsed : { target: parsed.target || 1, date: today() };
  } catch {
    return { target: 1, date: today() };
  }
}

export async function saveDailyGoal(target: number): Promise<DailyGoal> {
  const goal = { target, date: today() };
  await setStoredValue('daily_goal_v1', JSON.stringify(goal));
  return goal;
}
