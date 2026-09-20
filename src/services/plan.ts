import { getStoredValue, setStoredValue } from './settings';

export interface StudyPlan {
  workId: string;
  targetDays: number;
  minutesPerDay: number;
  startDate: string;
}

export interface PlanEstimate {
  linesPerDay: number;
  estimatedMinutes: number;
  projectedDate: Date;
  overdue: boolean;
}

export async function loadStudyPlan(workId: string): Promise<StudyPlan | null> {
  const raw = await getStoredValue(`study_plan_${workId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StudyPlan;
  } catch {
    return null;
  }
}

export async function saveStudyPlan(plan: StudyPlan): Promise<void> {
  await setStoredValue(`study_plan_${plan.workId}`, JSON.stringify(plan));
}

export function estimatePlan(plan: StudyPlan, lineCount: number): PlanEstimate {
  const linesPerDay = Math.max(1, Math.ceil(lineCount / Math.max(1, plan.targetDays)));
  const estimatedMinutes = Math.max(plan.minutesPerDay, linesPerDay * 3);
  const projectedDate = new Date(plan.startDate);
  projectedDate.setDate(projectedDate.getDate() + plan.targetDays);
  return {
    linesPerDay,
    estimatedMinutes,
    projectedDate,
    overdue: Date.now() > projectedDate.getTime(),
  };
}
