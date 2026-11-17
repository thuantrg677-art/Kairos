// Thống kê giờ focus: theo ngày, theo tuần, theo mục tiêu và tỉ lệ thời gian cho việc 20% so với 80%.

import type { Cycle, FocusSession, Goal, Task } from './types';
import { addDays, diffDays, mondayOf, toISO } from './dates';

/** Ngày (giờ máy) mà phiên bắt đầu */
export const sessionDate = (f: FocusSession) => toISO(new Date(f.started_at));
export const sessionMin = (f: FocusSession) => f.actual_sec / 60;

/** 25 → "25p", 90 → "1,5g", 120 → "2g" */
export function fmtMinShort(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m}p`;
  const h = Math.round((m / 60) * 10) / 10;
  return `${String(h).replace('.', ',')}g`;
}

export interface Bucket {
  key: string;
  label: string;
  sub?: string;
  min: number;
  current?: boolean;
}

export function inRange(sessions: FocusSession[], from: string, to: string): FocusSession[] {
  return sessions.filter((f) => {
    const d = sessionDate(f);
    return d >= from && d <= to;
  });
}

/** Số phút focus từng ngày trong `days` ngày gần nhất (tính cả hôm nay) */
export function byDay(sessions: FocusSession[], today: string, days = 7): Bucket[] {
  const WD = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const out: Bucket[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(today, -i);
    const [, m, dd] = d.split('-');
    out.push({ key: d, label: i === 0 ? 'Nay' : WD[new Date(`${d}T12:00:00`).getDay()], sub: `${dd}/${m}`, min: 0, current: i === 0 });
  }
  const idx = new Map(out.map((b, i) => [b.key, i]));
  for (const f of sessions) {
    const i = idx.get(sessionDate(f));
    if (i !== undefined) out[i].min += sessionMin(f);
  }
  return out;
}

/** Số phút focus từng tuần: các tuần của chu kỳ 12 tuần (tới tuần hiện tại), không có chu kỳ thì 8 tuần gần nhất */
export function byWeek(sessions: FocusSession[], today: string, cycle: Cycle | null): Bucket[] {
  const out: Bucket[] = [];
  if (cycle && cycle.start_date <= today) {
    const weeks = Math.min(12, Math.floor(diffDays(cycle.start_date, today) / 7) + 1);
    for (let i = 0; i < weeks; i++) out.push({ key: addDays(cycle.start_date, i * 7), label: `T${i + 1}`, min: 0, current: i === weeks - 1 });
  } else {
    const mon = mondayOf(today);
    for (let i = 7; i >= 0; i--) {
      const start = addDays(mon, -7 * i);
      const [, m, d] = start.split('-');
      out.push({ key: start, label: `${d}/${m}`, min: 0, current: i === 0 });
    }
  }
  for (const f of sessions) {
    const d = sessionDate(f);
    const b = out.find((w) => d >= w.key && d <= addDays(w.key, 6));
    if (b) b.min += sessionMin(f);
  }
  return out;
}

export interface GoalBucket {
  goal: Goal | null;
  min: number;
}

/** Số phút focus theo mục tiêu (gồm cả nhóm "không gắn mục tiêu"), nhiều nhất trước */
export function byGoal(sessions: FocusSession[], goals: Goal[]): GoalBucket[] {
  const map = new Map<string, number>();
  for (const f of sessions) {
    const k = f.goal_id && goals.some((g) => g.id === f.goal_id) ? f.goal_id : '';
    map.set(k, (map.get(k) ?? 0) + sessionMin(f));
  }
  return [...map.entries()]
    .map(([k, min]) => ({ goal: goals.find((g) => g.id === k) ?? null, min }))
    .sort((a, b) => (a.goal ? 0 : 1) - (b.goal ? 0 : 1) || b.min - a.min);
}

export interface LeverageSplit {
  high: number;
  normal: number;
  none: number;
  total: number;
}

/** Bao nhiêu phút dành cho việc 20%, việc 80% và thời gian không gắn việc */
export function leverageSplit(sessions: FocusSession[], tasks: Task[]): LeverageSplit {
  const lev = new Map(tasks.map((t) => [t.id, t.leverage]));
  const out: LeverageSplit = { high: 0, normal: 0, none: 0, total: 0 };
  for (const f of sessions) {
    const m = sessionMin(f);
    const l = f.task_id ? lev.get(f.task_id) : undefined;
    if (l === 'high') out.high += m;
    else if (l === 'normal') out.normal += m;
    else out.none += m;
    out.total += m;
  }
  return out;
}
