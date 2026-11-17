// Số liệu cho nhật ký ngày, nhìn lại tuần và lịch sử dạng lịch. Không phụ thuộc giao diện.

import type { Goal, Journal, Snapshot, Task, WeeklyReview } from './types';
import { addDays, isoWeekday, mondayOf, todayISO } from './dates';
import { itemsForDate } from './logic';
import { leverageSplit, sessionDate, type LeverageSplit } from './focusStats';
import { useStore } from './store';

type Data = Pick<Snapshot, 'cycles' | 'goals' | 'tasks' | 'task_completions' | 'schedule_blocks' | 'focus_sessions' | 'journals'>;

/** Mức năng lượng trong nhật ký: 1 … 5 */
export const ENERGY = [
  { v: 1, emoji: '😫', label: 'Kiệt sức' },
  { v: 2, emoji: '😕', label: 'Hơi mệt' },
  { v: 3, emoji: '😐', label: 'Bình thường' },
  { v: 4, emoji: '🙂', label: 'Khá tốt' },
  { v: 5, emoji: '🤩', label: 'Tràn đầy' },
] as const;
export const energyOf = (v: number | null | undefined) => ENERGY.find((e) => e.v === v) ?? null;

// ------------------------------------------------------------
// Một ngày
// ------------------------------------------------------------
export interface DaySummary {
  date: string;
  /** Lượt việc theo kế hoạch / đã làm (chỉ có nghĩa với ngày trong chu kỳ hiện tại) */
  planned: number;
  done: number;
  drops: number;
  focusMin: number;
  /** Các việc đã tick trong ngày */
  doneTasks: { task: Task | null; title: string; points: number }[];
  journal: Journal | null;
}

export function daySummary(d: Data, date: string, extra?: Pick<Snapshot, 'task_completions' | 'focus_sessions'>): DaySummary {
  const comps = (extra?.task_completions ?? d.task_completions).filter((c) => c.date === date);
  const sessions = (extra?.focus_sessions ?? d.focus_sessions).filter((f) => sessionDate(f) === date);
  const tasks = new Map(d.tasks.map((t) => [t.id, t]));
  const items = date <= todayISO() ? itemsForDate(d, date) : [];
  const doneTasks = comps.map((c) => {
    const task = tasks.get(c.task_id) ?? null;
    return { task, title: task?.title ?? 'Việc đã xóa', points: c.points };
  });
  doneTasks.sort((a, b) => b.points - a.points);
  return {
    date,
    planned: items.length,
    done: items.filter((i) => i.done).length,
    drops: comps.reduce((n, c) => n + c.points, 0),
    focusMin: sessions.reduce((n, f) => n + f.actual_sec / 60, 0),
    doneTasks,
    journal: d.journals.find((j) => j.date === date) ?? null,
  };
}

// ------------------------------------------------------------
// Một tuần
// ------------------------------------------------------------
export interface GoalWeek {
  goal: Goal;
  planned: number;
  done: number;
  drops: number;
}
export interface MissedTask {
  task: Task;
  goal: Goal | null;
  /** Số lượt bị bỏ lỡ trong tuần */
  missed: number;
}
export interface WeekReport {
  weekStart: string;
  /** Ngày cuối được tính (chủ nhật, hoặc hôm nay nếu tuần chưa hết) */
  until: string;
  planned: number;
  done: number;
  pct: number;
  drops: number;
  focusMin: number;
  split: LeverageSplit;
  goals: GoalWeek[];
  missedHigh: MissedTask[];
  days: { date: string; planned: number; done: number; drops: number; focusMin: number; journal: Journal | null; future: boolean }[];
  journals: Journal[];
}

/**
 * Tổng hợp một tuần. Cách đếm giống điểm thực thi tuần (weekStats):
 * việc lặp lại tính từng lượt; việc một lần tính một lần nếu đã xong, đã xếp vào một ngày, hoặc có hạn trong tuần.
 */
export function weekReport(d: Data, weekStart: string, today = todayISO()): WeekReport {
  const end = addDays(weekStart, 6);
  const until = end < today ? end : today;
  const goalMap = new Map<string, GoalWeek>();
  const missed = new Map<string, MissedTask>();
  const counted = new Set<string>();
  const days: WeekReport['days'] = [];
  let planned = 0;
  let done = 0;

  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const future = date > until;
    let dp = 0;
    let dd = 0;
    if (!future) {
      for (const item of itemsForDate(d, date)) {
        const isOnce = item.task.kind === 'once';
        if (isOnce) {
          if (counted.has(item.task.id)) continue;
          if (!(item.done || item.block || (item.task.due_date && item.task.due_date <= end))) continue;
          counted.add(item.task.id);
        }
        dp++;
        if (item.done) dd++;
        if (item.goal) {
          const g = goalMap.get(item.goal.id) ?? { goal: item.goal, planned: 0, done: 0, drops: 0 };
          g.planned++;
          if (item.done) g.done++;
          goalMap.set(item.goal.id, g);
        }
        // Việc 20% bị bỏ lỡ: việc lặp lại của những ngày đã qua; việc một lần đã quá hạn
        const miss = isOnce ? !!item.task.due_date && item.task.due_date < today && item.task.due_date <= end : date < today;
        if (!item.done && item.task.leverage === 'high' && miss) {
          const m = missed.get(item.task.id) ?? { task: item.task, goal: item.goal, missed: 0 };
          m.missed++;
          missed.set(item.task.id, m);
        }
      }
    }
    planned += dp;
    done += dd;
    days.push({ date, planned: dp, done: dd, drops: 0, focusMin: 0, journal: d.journals.find((j) => j.date === date) ?? null, future });
  }

  // 💧 theo ngày và theo mục tiêu
  const taskGoal = new Map(d.tasks.map((t) => [t.id, t.goal_id]));
  let drops = 0;
  for (const c of d.task_completions) {
    if (c.date < weekStart || c.date > until) continue;
    drops += c.points;
    const day = days.find((x) => x.date === c.date);
    if (day) day.drops += c.points;
    const gid = taskGoal.get(c.task_id);
    const g = gid ? goalMap.get(gid) : undefined;
    if (g) g.drops += c.points;
  }

  const sessions = d.focus_sessions.filter((f) => {
    const date = sessionDate(f);
    return date >= weekStart && date <= until;
  });
  for (const f of sessions) {
    const day = days.find((x) => x.date === sessionDate(f));
    if (day) day.focusMin += f.actual_sec / 60;
  }

  // Mục tiêu đang sống nhưng tuần này không có lượt nào vẫn hiện (0/0) để thấy bị bỏ quên
  for (const g of d.goals) {
    const cycle = d.cycles.find((c) => c.id === g.cycle_id);
    if (g.status === 'active' && cycle?.status === 'active' && !goalMap.has(g.id)) goalMap.set(g.id, { goal: g, planned: 0, done: 0, drops: 0 });
  }

  return {
    weekStart,
    until,
    planned,
    done,
    pct: planned > 0 ? done / planned : 0,
    drops,
    focusMin: sessions.reduce((n, f) => n + f.actual_sec / 60, 0),
    split: leverageSplit(sessions, d.tasks),
    goals: [...goalMap.values()].sort((a, b) => a.goal.sort - b.goal.sort),
    missedHigh: [...missed.values()].sort((a, b) => b.missed - a.missed).slice(0, 5),
    days,
    journals: d.journals.filter((j) => j.date >= weekStart && j.date <= end).sort((a, b) => a.date.localeCompare(b.date)),
  };
}

/** Tuần nên nhìn lại mặc định: cuối tuần (T7, CN) thì tuần này, còn lại là tuần trước */
export function defaultReviewWeek(today = todayISO()): string {
  const mon = mondayOf(today);
  return isoWeekday(today) >= 6 ? mon : addDays(mon, -7);
}

// ------------------------------------------------------------
// Lưu (tạo mới hoặc cập nhật)
// ------------------------------------------------------------
type JournalFields = Pick<Journal, 'energy' | 'did' | 'improve'>;

export function saveJournal(date: string, fields: JournalFields): boolean {
  const st = useStore.getState();
  const existing = st.journals.find((j) => j.date === date);
  if (existing) {
    st.update('journals', existing.id, fields);
    return st.status === 'ready' && (st.mode !== 'cloud' || st.online);
  }
  return !!st.insert('journals', { date, ...fields });
}

type ReviewFields = Partial<Pick<WeeklyReview, 'planned' | 'done' | 'ai_review' | 'wins' | 'lessons' | 'next_focus'>>;

export function saveReview(weekStart: string, fields: ReviewFields): boolean {
  const st = useStore.getState();
  const patch: ReviewFields & { updated_at?: string } = { ...fields };
  if (st.gd3) patch.updated_at = new Date().toISOString();
  else {
    // Chưa chạy 003_gd3.sql: database chưa có các cột này
    delete patch.wins;
    delete patch.lessons;
    delete patch.next_focus;
  }
  const existing = st.weekly_reviews.find((r) => r.week_start === weekStart);
  if (existing) {
    st.update('weekly_reviews', existing.id, patch);
    return st.status === 'ready' && (st.mode !== 'cloud' || st.online);
  }
  return !!st.insert('weekly_reviews', { week_start: weekStart, planned: 0, done: 0, ai_review: null, ...patch });
}

// ------------------------------------------------------------
// Lịch sử dạng lịch
// ------------------------------------------------------------

/** Các ô của lịch tháng, bắt đầu từ thứ Hai; ô ngoài tháng là null */
export function monthGrid(month: string): (string | null)[] {
  const first = `${month}-01`;
  const lead = isoWeekday(first) - 1;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = first; d.slice(0, 7) === month; d = addDays(d, 1)) cells.push(d);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
}

export const MONTH_NAMES = ['Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'];
export const monthTitle = (month: string) => `${MONTH_NAMES[Number(month.slice(5, 7)) - 1]}, ${month.slice(0, 4)}`;

/** Độ đậm của ô lịch (0–4) theo số 💧 trong ngày, so với một ngày "rất tốt" của chính bạn */
export function heatLevel(drops: number, goodDay: number): number {
  if (drops <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((drops / Math.max(3, goodDay)) * 4)));
}

/** Một ngày "rất tốt" = mức 💧 mà 80% số ngày có làm việc không vượt quá */
export function goodDayDrops(byDate: Map<string, number>): number {
  const vals = [...byDate.values()].filter((v) => v > 0).sort((a, b) => a - b);
  if (!vals.length) return 6;
  return vals[Math.min(vals.length - 1, Math.floor(vals.length * 0.8))];
}
