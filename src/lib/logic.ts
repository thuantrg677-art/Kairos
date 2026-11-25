// "Bộ não" của Kairos: việc nào thuộc ngày nào, thứ tự ưu tiên, điểm tưới cây,
// khung giờ trống và cách tự xếp việc. Không phụ thuộc giao diện nên dễ kiểm thử.

import type { Cycle, FixedEvent, Goal, Profile, ScheduleBlock, Snapshot, Task, TaskCompletion } from './types';
import { addDays, diffDays, isoWeekday } from './dates';

/**
 * Số giọt nước 💧 mỗi lần tick:
 * - Đầu việc: Việc 20% tưới 3 giọt, Việc 80% tưới 1 giọt.
 * - Việc mỗi ngày (việc nhỏ nằm dưới một đầu việc): 2 giọt nếu thuộc Việc 20%, 1 giọt nếu thuộc Việc 80%.
 * Việc nhỏ cỡ nào cũng tưới cây, nhưng việc đòn bẩy cao luôn tưới nhiều hơn.
 */
export const POINTS = { high: 3, normal: 1, stepHigh: 2, step: 1 } as const;
export const taskPoints = (t: Pick<Task, 'leverage' | 'parent_id'>) =>
  t.parent_id ? (t.leverage === 'high' ? POINTS.stepHigh : POINTS.step) : POINTS[t.leverage];

/** Việc mỗi ngày (có đầu việc cha) */
export const isStep = (t: Pick<Task, 'parent_id'>) => !!t.parent_id;

/** Việc mỗi ngày chưa làm mà đầu việc cha đã xong (hoặc đã bị xóa/lưu trữ) thì không còn tính nữa */
function orphanedStep(task: Task, byId: Map<string, Task>): boolean {
  if (!task.parent_id || task.done_at) return false;
  const parent = byId.get(task.parent_id);
  return !parent || !!parent.archived_at || !!parent.done_at;
}

export const CYCLE_DAYS = 84; // 12 tuần

export function getActiveCycle(cycles: Cycle[]): Cycle | null {
  const active = cycles.filter((c) => c.status === 'active').sort((a, b) => b.start_date.localeCompare(a.start_date));
  return active[0] ?? null;
}

/** Đang ở tuần thứ mấy của chu kỳ (1–12). 0 = chưa bắt đầu. */
export function cycleWeek(cycle: Cycle, today: string): number {
  const d = diffDays(cycle.start_date, today);
  if (d < 0) return 0;
  return Math.min(12, Math.floor(d / 7) + 1);
}

type Data = Pick<Snapshot, 'cycles' | 'goals' | 'tasks' | 'task_completions' | 'schedule_blocks'>;

export interface DayItem {
  task: Task;
  goal: Goal | null;
  done: boolean;
  block: ScheduleBlock | null;
  overdue: boolean;
}

/** Việc có đang "sống" không: chưa lưu trữ và mục tiêu của nó thuộc chu kỳ hiện tại */
function liveGoalOf(task: Task, goals: Map<string, Goal>, cycle: Cycle | null): Goal | null | undefined {
  if (task.archived_at) return undefined;
  if (!task.goal_id) return null;
  const goal = goals.get(task.goal_id);
  if (!goal || goal.status !== 'active') return undefined;
  if (cycle && goal.cycle_id !== cycle.id) return undefined;
  return goal;
}

/** Danh sách việc của một ngày, đã xếp theo thứ tự ưu tiên */
export function itemsForDate(s: Data, date: string): DayItem[] {
  const cycle = getActiveCycle(s.cycles);
  const goals = new Map(s.goals.map((g) => [g.id, g]));
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  const wd = isoWeekday(date);
  const items: DayItem[] = [];

  for (const task of s.tasks) {
    const goal = liveGoalOf(task, goals, cycle);
    if (goal === undefined) continue;
    if (orphanedStep(task, byId)) continue;
    const block = s.schedule_blocks.find((b) => b.task_id === task.id && b.date === date) ?? null;

    if (task.kind === 'recurring') {
      if (!task.weekdays.includes(wd) && !block) continue;
      if (date < task.created_at.slice(0, 10)) continue;
      if (cycle && goal && (date < cycle.start_date || date > cycle.end_date)) continue;
      const done = s.task_completions.some((c) => c.task_id === task.id && c.date === date);
      items.push({ task, goal, done, block, overdue: false });
    } else {
      const done = !!task.done_at;
      if (done) {
        // Việc một lần đã xong chỉ hiện trong ngày nó được tick
        const comp = s.task_completions.find((c) => c.task_id === task.id);
        if (!comp || comp.date !== date) continue;
      } else {
        // Chưa xong: hiện nếu đã được xếp vào hôm nay, hoặc hạn là hôm nay/ngày mai/đã trễ.
        // Việc mỗi ngày chỉ hiện đúng ngày định làm (chưa làm thì hôm sau vẫn hiện, ghi là trễ).
        const dueSoon = !!task.due_date && task.due_date <= (task.parent_id ? date : addDays(date, 1));
        if (!block && !dueSoon) continue;
      }
      items.push({ task, goal, done, block, overdue: !done && !!task.due_date && task.due_date < date });
    }
  }
  return items.sort(compareItems);
}

/** Thứ tự ưu tiên: chưa xong trước → việc 20% trước → hạn gần trước → giờ đã xếp → tên */
function compareItems(a: DayItem, b: DayItem): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.task.leverage !== b.task.leverage) return a.task.leverage === 'high' ? -1 : 1;
  const da = a.task.due_date ?? '9999';
  const db = b.task.due_date ?? '9999';
  if (da !== db) return da.localeCompare(db);
  const ta = a.block?.start_min ?? 9999;
  const tb = b.block?.start_min ?? 9999;
  if (ta !== tb) return ta - tb;
  return a.task.title.localeCompare(b.task.title, 'vi');
}

/** Các việc một lần chưa xong và chưa nằm trong ngày này (để người dùng kéo thêm vào hôm nay) */
export function otherOpenTasks(s: Data, date: string): { task: Task; goal: Goal | null }[] {
  const cycle = getActiveCycle(s.cycles);
  const goals = new Map(s.goals.map((g) => [g.id, g]));
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  const today = new Set(itemsForDate(s, date).map((i) => i.task.id));
  const out: { task: Task; goal: Goal | null }[] = [];
  for (const task of s.tasks) {
    if (task.kind !== 'once' || task.done_at || today.has(task.id)) continue;
    if (orphanedStep(task, byId)) continue;
    const goal = liveGoalOf(task, goals, cycle);
    if (goal === undefined) continue;
    out.push({ task, goal });
  }
  return out.sort((a, b) => (a.task.due_date ?? '9999').localeCompare(b.task.due_date ?? '9999'));
}

// ------------------------------------------------------------
// Cây lớn lên thế nào
// ------------------------------------------------------------

export const STAGE_NAMES = ['Hạt giống', 'Nảy mầm', 'Cây non', 'Ra nụ', 'Nở hoa'];
export const STAGE_NAMES_TREE = ['Hạt giống', 'Nảy mầm', 'Cây non', 'Lớn dần', 'Trưởng thành'];
/** Ngưỡng % giọt nước để lên giai đoạn 1, 2, 3, 4 */
const STAGE_THRESHOLDS = [0.03, 0.2, 0.45, 0.75];

export interface Growth {
  earned: number;
  total: number;
  pct: number;
  stage: number;
}

/** Đếm số lần một việc lặp lại sẽ xuất hiện trong khoảng [from, to] */
function countOccurrences(weekdays: number[], from: string, to: string): number {
  const days = diffDays(from, to) + 1;
  if (days <= 0) return 0;
  let n = Math.floor(days / 7) * weekdays.length;
  for (let i = 0; i < days % 7; i++) {
    if (weekdays.includes(isoWeekday(addDays(from, i)))) n++;
  }
  return n;
}

/**
 * Tiến độ của một mục tiêu = số 💧 đã nhận ÷ tổng số 💧 có thể nhận trong cả chu kỳ.
 * Việc 20% đáng 3 💧 nên làm chúng thì cây lớn nhanh gấp 3.
 */
export function goalGrowth(goal: Goal, cycle: Cycle | null, s: Pick<Snapshot, 'tasks' | 'task_completions'>): Growth {
  const byId = new Map(s.tasks.map((t) => [t.id, t]));
  const tasks = s.tasks.filter((t) => t.goal_id === goal.id && !t.archived_at && !orphanedStep(t, byId));
  const ids = new Set(tasks.map((t) => t.id));
  let total = 0;
  for (const t of tasks) {
    if (t.kind === 'once') total += taskPoints(t);
    else if (cycle) {
      const created = t.created_at.slice(0, 10);
      const from = created > cycle.start_date ? created : cycle.start_date;
      total += countOccurrences(t.weekdays, from, cycle.end_date) * taskPoints(t);
    }
  }
  let earned = 0;
  for (const c of s.task_completions) if (ids.has(c.task_id)) earned += c.points;
  const pct = total > 0 ? Math.min(1, earned / total) : 0;
  let stage = 0;
  for (const th of STAGE_THRESHOLDS) if (pct >= th) stage++;
  return { earned, total, pct, stage };
}

/** Còn bao nhiêu 💧 nữa thì cây lên giai đoạn tiếp theo (null = đã nở hoa / trưởng thành) */
export function dropsToNextStage(g: Growth): number | null {
  if (g.stage >= STAGE_THRESHOLDS.length || g.total <= 0) return null;
  return Math.max(1, Math.ceil(STAGE_THRESHOLDS[g.stage] * g.total - g.earned));
}

// ------------------------------------------------------------
// Phần thưởng cho từng việc nhỏ: bình tưới hôm nay và chuỗi ngày tưới cây
// ------------------------------------------------------------

/** Số 💧 đã tưới trong một ngày */
export const dropsOn = (completions: Pick<TaskCompletion, 'date' | 'points'>[], date: string) =>
  completions.reduce((n, c) => (c.date === date ? n + c.points : n), 0);

/**
 * Bình tưới hôm nay: đầy khi làm hết các việc trong ngày.
 * capacity = tổng 💧 của mọi việc hôm nay (tối thiểu 3 để ngày ít việc vẫn có cái để lấp đầy).
 */
export function waterCan(items: DayItem[], completions: Pick<TaskCompletion, 'date' | 'points'>[], date: string): { drops: number; capacity: number; pct: number } {
  const drops = dropsOn(completions, date);
  const planned = items.reduce((n, i) => n + taskPoints(i.task), 0);
  const capacity = Math.max(3, planned, drops);
  return { drops, capacity, pct: Math.min(1, drops / capacity) };
}

/**
 * Chuỗi ngày liên tiếp có tưới cây (tick ít nhất một việc). Hôm nay chưa tick thì chuỗi tính tới hôm qua
 * và vẫn còn giữ được (today = false).
 */
export function waterStreak(completions: Pick<TaskCompletion, 'date'>[], today: string): { days: number; today: boolean } {
  const dates = new Set(completions.map((c) => c.date));
  const has = dates.has(today);
  let days = 0;
  for (let d = has ? today : addDays(today, -1); dates.has(d); d = addDays(d, -1)) days++;
  return { days, today: has };
}

// ------------------------------------------------------------
// Điểm thực thi tuần (12 Week Year): % việc đã làm so với kế hoạch
// ------------------------------------------------------------

export interface WeekStats {
  planned: number;
  done: number;
  pct: number;
}

export function weekStats(s: Data, weekStart: string, upto: string): WeekStats {
  const end = addDays(weekStart, 6) < upto ? addDays(weekStart, 6) : upto;
  let planned = 0;
  let done = 0;
  const counted = new Set<string>();
  for (let d = weekStart; d <= end; d = addDays(d, 1)) {
    for (const item of itemsForDate(s, d)) {
      if (item.task.kind === 'recurring') {
        planned++;
        if (item.done) done++;
      } else if (!counted.has(item.task.id) && (item.done || item.block || (item.task.due_date && item.task.due_date <= end))) {
        // Việc một lần tính vào kế hoạch tuần nếu: đã xong, đã được xếp vào một ngày, hoặc có hạn trong tuần
        counted.add(item.task.id);
        planned++;
        if (item.done) done++;
      }
    }
  }
  return { planned, done, pct: planned > 0 ? done / planned : 0 };
}

// ------------------------------------------------------------
// Dòng thời gian: khung bận, khung trống, tự xếp việc
// ------------------------------------------------------------

export interface Interval {
  start: number;
  end: number;
}

export function dayRange(profile: Profile | null, fixed: FixedEvent[] = []): Interval {
  let start = profile?.settings.day_start_min ?? 6 * 60;
  let end = profile?.settings.day_end_min ?? 23 * 60;
  for (const e of fixed) {
    start = Math.min(start, Math.floor(e.start_min / 60) * 60);
    end = Math.max(end, Math.ceil(e.end_min / 60) * 60);
  }
  return { start, end };
}

/** Gộp các khoảng chồng lên nhau */
export function mergeIntervals(list: Interval[]): Interval[] {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: Interval[] = [];
  for (const it of sorted) {
    const last = out[out.length - 1];
    if (last && it.start <= last.end) last.end = Math.max(last.end, it.end);
    else out.push({ ...it });
  }
  return out;
}

/** Khung trống = cả ngày trừ đi các khoảng đã bận */
export function freeSlots(range: Interval, occupied: Interval[]): Interval[] {
  const out: Interval[] = [];
  let cursor = range.start;
  for (const o of mergeIntervals(occupied)) {
    if (o.end <= range.start || o.start >= range.end) continue;
    if (o.start > cursor) out.push({ start: cursor, end: Math.min(o.start, range.end) });
    cursor = Math.max(cursor, o.end);
  }
  if (cursor < range.end) out.push({ start: cursor, end: range.end });
  return out;
}

export const sumIntervals = (list: Interval[]) => list.reduce((n, i) => n + (i.end - i.start), 0);

export interface Placement {
  task_id: string;
  start_min: number;
  duration_min: number;
}

/**
 * Tự xếp việc vào khung trống theo quy tắc (không cần AI):
 * việc ưu tiên cao nhất được chọn khung sớm nhất, chừa 5 phút nghỉ giữa các việc,
 * việc nào không còn chỗ thì để lại chứ không nhồi quá tải.
 * Ở giai đoạn 2, AI sẽ xếp thông minh hơn; hàm này là phương án dự phòng.
 */
export function autoArrange(items: DayItem[], free: Interval[], fromMin: number): { placed: Placement[]; left: Task[] } {
  const slots = free
    .map((s) => ({ start: Math.ceil(Math.max(s.start, fromMin) / 5) * 5, end: s.end }))
    .filter((s) => s.end - s.start >= 10);
  const placed: Placement[] = [];
  const left: Task[] = [];
  for (const item of items) {
    if (item.done || item.block?.start_min != null) continue;
    const dur = Math.min(240, Math.max(10, item.task.estimate_min || 30));
    const slot = slots.find((s) => s.end - s.start >= dur);
    if (!slot) {
      left.push(item.task);
      continue;
    }
    placed.push({ task_id: item.task.id, start_min: slot.start, duration_min: dur });
    slot.start += dur + 5;
  }
  return { placed, left };
}
