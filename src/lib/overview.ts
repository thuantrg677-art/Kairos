// Số liệu cho trang Tổng quan (giai đoạn 4): deadline sắp tới, giờ focus, chi tiết từng mục tiêu.

import type { Cycle, Goal, Snapshot, Task } from './types';
import { addDays, diffDays, isoWeekday, mondayOf, todayISO } from './dates';
import { getActiveCycle, goalGrowth, type Growth } from './logic';
import { goalHealth, type Health } from './garden';
import { inRange, leverageSplit, sessionDate, sessionMin, type LeverageSplit } from './focusStats';

type Data = Pick<Snapshot, 'cycles' | 'goals' | 'tasks' | 'task_completions' | 'schedule_blocks' | 'focus_sessions'>;

/** Việc có thuộc chu kỳ đang chạy không (chưa lưu trữ, mục tiêu còn sống). Trả về undefined nếu không. */
function liveGoal(task: Task, goals: Map<string, Goal>, cycle: Cycle | null): Goal | null | undefined {
  if (task.archived_at) return undefined;
  if (!task.goal_id) return null;
  const g = goals.get(task.goal_id);
  if (!g || g.status !== 'active' || (cycle && g.cycle_id !== cycle.id)) return undefined;
  return g;
}

export interface Deadline {
  task: Task;
  goal: Goal | null;
  /** Còn bao nhiêu ngày (âm = đã trễ) */
  days: number;
}

/** Việc một lần chưa xong có hạn trong `withinDays` ngày tới, kể cả việc đã trễ hạn */
export function upcomingDeadlines(d: Data, today = todayISO(), withinDays = 14): Deadline[] {
  const cycle = getActiveCycle(d.cycles);
  const goals = new Map(d.goals.map((g) => [g.id, g]));
  const limit = addDays(today, withinDays);
  const out: Deadline[] = [];
  for (const task of d.tasks) {
    // Việc mỗi ngày có ngày làm chứ không có hạn chót nên không tính là deadline
    if (task.kind !== 'once' || task.parent_id || task.done_at || !task.due_date || task.due_date > limit) continue;
    const goal = liveGoal(task, goals, cycle);
    if (goal === undefined) continue;
    out.push({ task, goal, days: diffDays(today, task.due_date) });
  }
  return out.sort((a, b) => a.days - b.days || (a.task.leverage === b.task.leverage ? 0 : a.task.leverage === 'high' ? -1 : 1));
}

export interface FocusSummary {
  weekMin: number;
  lastWeekMin: number;
  cycleMin: number;
  /** Tỉ lệ 20/80 trong cả chu kỳ */
  split: LeverageSplit;
  /** Số ngày có focus trong 7 ngày gần nhất */
  activeDays: number;
}

export function focusSummary(d: Data, cycle: Cycle | null, today = todayISO()): FocusSummary {
  const week = mondayOf(today);
  const sum = (from: string, to: string) => inRange(d.focus_sessions, from, to).reduce((n, f) => n + sessionMin(f), 0);
  const cycleSessions = cycle ? inRange(d.focus_sessions, cycle.start_date, today) : inRange(d.focus_sessions, addDays(today, -83), today);
  const days = new Set(inRange(d.focus_sessions, addDays(today, -6), today).map(sessionDate));
  return {
    weekMin: sum(week, today),
    lastWeekMin: sum(addDays(week, -7), addDays(week, -1)),
    cycleMin: cycleSessions.reduce((n, f) => n + sessionMin(f), 0),
    split: leverageSplit(cycleSessions, d.tasks),
    activeDays: days.size,
  };
}

/** Số 💧 đã tưới trong khoảng ngày [from, to] */
export function dropsBetween(d: Pick<Snapshot, 'task_completions'>, from: string, to: string): number {
  return d.task_completions.reduce((n, c) => (c.date >= from && c.date <= to ? n + c.points : n), 0);
}

// ------------------------------------------------------------
// Chi tiết một mục tiêu
// ------------------------------------------------------------
export interface TaskProgress {
  task: Task;
  /** Việc lặp lại: số lượt đã làm / số lượt đến hôm nay trong chu kỳ. Việc một lần: 1/1 hoặc 0/1. */
  done: number;
  planned: number;
  /** 💧 việc này đã mang về trong chu kỳ */
  drops: number;
}

export interface GoalDetail {
  goal: Goal;
  growth: Growth;
  health: Health;
  weekDone: number;
  weekPlanned: number;
  focusMin: number;
  tasks: TaskProgress[];
}

/** Đếm số ngày trong [from, to] rơi vào các thứ trong tuần đã chọn */
function occurrences(weekdays: number[], from: string, to: string): number {
  let n = 0;
  for (let x = from; x <= to; x = addDays(x, 1)) if (weekdays.includes(isoWeekday(x))) n++;
  return n;
}

export function goalDetail(goal: Goal, cycle: Cycle | null, d: Data, today = todayISO()): GoalDetail {
  const all = d.tasks.filter((t) => t.goal_id === goal.id && !t.archived_at);
  // Bảng chỉ liệt kê đầu việc; 💧 của việc mỗi ngày được cộng vào đầu việc chứa nó
  const tasks = all.filter((t) => !t.parent_id);
  const steps = all.filter((t) => t.parent_id);
  const from = cycle?.start_date ?? addDays(today, -83);
  const until = cycle && cycle.end_date < today ? cycle.end_date : today;
  const week = mondayOf(today);

  let weekDone = 0;
  let weekPlanned = 0;
  for (const st of steps) {
    const doneThisWeek = d.task_completions.some((c) => c.task_id === st.id && c.date >= week);
    if (doneThisWeek || (!st.done_at && st.due_date && st.due_date >= week && st.due_date <= addDays(week, 6))) {
      weekPlanned++;
      if (doneThisWeek) weekDone++;
    }
  }
  const rows: TaskProgress[] = tasks.map((task) => {
    const comps = d.task_completions.filter((c) => c.task_id === task.id && c.date >= from);
    const kids = new Set(steps.filter((x) => x.parent_id === task.id).map((x) => x.id));
    const drops = comps.reduce((n, c) => n + c.points, 0) + d.task_completions.reduce((n, c) => (kids.has(c.task_id) && c.date >= from ? n + c.points : n), 0);
    if (task.kind === 'recurring') {
      const created = task.created_at.slice(0, 10);
      const start = created > from ? created : from;
      const planned = occurrences(task.weekdays, start, until);
      const weekStart = start > week ? start : week;
      weekPlanned += occurrences(task.weekdays, weekStart, until);
      weekDone += comps.filter((c) => c.date >= week && c.date <= until).length;
      return { task, done: comps.filter((c) => c.date <= until).length, planned, drops };
    }
    const done = task.done_at ? 1 : 0;
    const doneThisWeek = comps.some((c) => c.date >= week);
    if (doneThisWeek || (task.due_date && task.due_date >= week && task.due_date <= addDays(week, 6))) {
      weekPlanned++;
      if (doneThisWeek) weekDone++;
    }
    return { task, done, planned: 1, drops };
  });

  // Việc chưa xong lên trước; trong đó việc 20% trước, rồi việc lặp lại, rồi theo hạn
  rows.sort((a, b) => {
    const aOpen = a.task.kind === 'recurring' || !a.task.done_at;
    const bOpen = b.task.kind === 'recurring' || !b.task.done_at;
    if (aOpen !== bOpen) return aOpen ? -1 : 1;
    if (a.task.leverage !== b.task.leverage) return a.task.leverage === 'high' ? -1 : 1;
    if (a.task.kind !== b.task.kind) return a.task.kind === 'recurring' ? -1 : 1;
    return (a.task.due_date ?? '9999').localeCompare(b.task.due_date ?? '9999');
  });

  const focusMin = inRange(d.focus_sessions, from, today)
    .filter((f) => f.goal_id === goal.id)
    .reduce((n, f) => n + sessionMin(f), 0);

  return {
    goal,
    growth: goalGrowth(goal, cycle, d),
    health: goalHealth(goal, cycle, d, today),
    weekDone,
    weekPlanned,
    focusMin,
    tasks: rows,
  };
}
