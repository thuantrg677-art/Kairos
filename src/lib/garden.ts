// Sức khỏe của cây trong Vườn (héo / hồi phục), hiệu ứng khi cây đổi giai đoạn,
// và việc kết thúc chu kỳ 12 tuần để lưu cây vào Khu vườn kỷ niệm.

import type { Cycle, Goal, PlantSpecies, Snapshot, Task } from './types';
import { addDays, diffDays, mondayOf, todayISO } from './dates';
import { CYCLE_DAYS, dropsToNextStage, goalGrowth, STAGE_NAMES, STAGE_NAMES_TREE, taskPoints, weekStats, type Growth } from './logic';
import { loadedSince, useStore } from './store';

/** Bao nhiêu ngày liền không tưới thì cây hơi héo / héo rõ. Cây không bao giờ chết hẳn. */
export const WILT_DAYS = [3, 7] as const;

export type Wilt = 0 | 1 | 2;

export interface Health {
  /** Số ngày trọn vẹn đã trôi qua kể từ lần tưới gần nhất (không tính hôm nay) */
  dryDays: number;
  wilt: Wilt;
  /** Ngày tưới gần nhất (null = chưa tưới lần nào) */
  lastWatered: string | null;
}

/** Gợi ý loài cây chưa dùng để vườn đa dạng. Loài mới của bản 2 chỉ dùng khi đã chạy 005_v2.sql. */
export function nextPlant(goals: Goal[], used: PlantSpecies[] = []): PlantSpecies {
  const order: PlantSpecies[] = useStore.getState().gd5
    ? ['huong-duong', 'sen', 'hong', 'la-kim', 'linh-lan', 'dong-tien', 'tan-tron', 'xuong-rong', 'ly', 'thong']
    : ['sen', 'linh-lan', 'ly', 'tan-tron', 'thong'];
  const taken = new Set([...goals.filter((g) => g.status === 'active').map((g) => g.plant), ...used]);
  return order.find((p) => !taken.has(p)) ?? order[0];
}

/** Các loài là cây thân gỗ (giai đoạn cuối gọi là "Trưởng thành" thay vì "Nở hoa") */
const TREES = new Set(['tan-tron', 'thong', 'la-kim']);
export const stageNames = (g: Pick<Goal, 'plant'>) => (TREES.has(g.plant) ? STAGE_NAMES_TREE : STAGE_NAMES);

/**
 * Cây héo khi bị bỏ bê: tính số ngày liền không có việc nào của mục tiêu được tick.
 * Hôm nay chưa hết nên không tính. Ngày gieo hạt (tạo mục tiêu / đầu chu kỳ) được coi như một lần tưới.
 * Chỉ tính trong chu kỳ; chu kỳ đã hết thì dừng ở ngày cuối.
 */
export function goalHealth(goal: Goal, cycle: Cycle | null, s: Pick<Snapshot, 'tasks' | 'task_completions'>, today = todayISO()): Health {
  const ids = new Set(s.tasks.filter((t) => t.goal_id === goal.id).map((t) => t.id));
  let last: string | null = null;
  for (const c of s.task_completions) if (ids.has(c.task_id) && c.date <= today && (!last || c.date > last)) last = c.date;
  if (!cycle || today < cycle.start_date) return { dryDays: 0, wilt: 0, lastWatered: last };
  const planted = goal.created_at.slice(0, 10) > cycle.start_date ? goal.created_at.slice(0, 10) : cycle.start_date;
  const ref = last && last > planted ? last : planted;
  const until = today > cycle.end_date ? addDays(cycle.end_date, 1) : today;
  const dryDays = Math.max(0, diffDays(ref, until) - 1);
  const wilt: Wilt = dryDays >= WILT_DAYS[1] ? 2 : dryDays >= WILT_DAYS[0] ? 1 : 0;
  return { dryDays, wilt, lastWatered: last };
}

export function describeHealth(h: Health): string {
  if (h.wilt === 2) return `Héo rõ · ${h.dryDays} ngày chưa tưới`;
  if (h.wilt === 1) return `Hơi héo · ${h.dryDays} ngày chưa tưới`;
  return 'Tươi tốt';
}

export interface PlantState {
  goal: Goal;
  growth: Growth;
  health: Health;
}

/** Các cây đang lớn trong chu kỳ hiện tại */
export function livePlants(d: Pick<Snapshot, 'goals' | 'tasks' | 'task_completions'>, cycle: Cycle | null, today = todayISO()): PlantState[] {
  return d.goals
    .filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id))
    .sort((a, b) => a.sort - b.sort)
    .map((goal) => ({ goal, growth: goalGrowth(goal, cycle, d), health: goalHealth(goal, cycle, d, today) }));
}

// ------------------------------------------------------------
// Nhớ lần cuối người dùng nhìn thấy mỗi cây (để biết cây vừa lên giai đoạn hay vừa hồi phục)
// ------------------------------------------------------------
type Seen = Record<string, { s: number; w: number; e?: number }>;
const seenKey = () => `kairos-garden-seen-${useStore.getState().userId ?? 'x'}`;

export function readSeen(): Seen {
  try {
    return JSON.parse(localStorage.getItem(seenKey()) ?? '{}') as Seen;
  } catch {
    return {};
  }
}
export function writeSeen(plants: PlantState[]) {
  const seen: Seen = {};
  for (const p of plants) seen[p.goal.id] = { s: p.growth.stage, w: p.health.wilt, e: p.growth.earned };
  try {
    localStorage.setItem(seenKey(), JSON.stringify(seen));
  } catch {
    /* bỏ qua */
  }
}

export type PlantEvent = 'grew' | 'revived' | 'watered';

/** So với lần xem trước: cây nào vừa lên giai đoạn, vừa tươi lại, hay vừa được tưới thêm */
export function plantEvents(plants: PlantState[], seen: Seen): Map<string, PlantEvent> {
  const out = new Map<string, PlantEvent>();
  for (const p of plants) {
    const before = seen[p.goal.id];
    if (!before) continue;
    if (p.growth.stage > before.s) out.set(p.goal.id, 'grew');
    else if (before.w > 0 && p.health.wilt === 0) out.set(p.goal.id, 'revived');
    else if (before.e !== undefined && p.growth.earned > before.e) out.set(p.goal.id, 'watered');
  }
  return out;
}

/**
 * Gọi ngay sau khi tick một việc: báo nếu cây vừa lên giai đoạn mới hoặc vừa hồi phục.
 * `before` là trạng thái cây chụp lại trước khi tick.
 */
export function plantSnapshot(goalId: string | null): PlantState | null {
  if (!goalId) return null;
  const s = useStore.getState();
  const goal = s.goals.find((g) => g.id === goalId);
  if (!goal || goal.status !== 'active') return null;
  const cycle = s.cycles.find((c) => c.id === goal.cycle_id) ?? null;
  return { goal, growth: goalGrowth(goal, cycle, s), health: goalHealth(goal, cycle, s) };
}
const CHEERS_STEP = ['Một bước nhỏ, một giọt nước', 'Từng chút một, cây đang lớn', 'Làm được rồi, cứ giữ nhịp này', 'Việc nhỏ hôm nay, kết quả lớn ngày mai', 'Thêm một việc xong'];
const CHEERS_HIGH = ['Việc đòn bẩy cao', 'Đúng việc 20% rồi', 'Đây mới là việc tạo kết quả'];
const CHEERS_NORMAL = ['Xong thêm một việc', 'Gọn gàng', 'Tốt lắm'];
const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
const cut = (t: string, n = 32) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t);

/**
 * Gọi ngay sau khi tick một việc: việc nhỏ cỡ nào cũng có lời khen và cho thấy cây tiến thêm được bao nhiêu
 * (còn mấy 💧 nữa thì lên giai đoạn mới). Lên giai đoạn hoặc vừa hồi phục thì báo riêng.
 * `before` là trạng thái cây chụp lại trước khi tick.
 */
export function celebrateTick(task: Task, before: PlantState | null, points: number) {
  const st = useStore.getState();
  const cheer = task.parent_id ? pick(CHEERS_STEP) : task.leverage === 'high' ? pick(CHEERS_HIGH) : pick(CHEERS_NORMAL);
  const after = before ? plantSnapshot(before.goal.id) : null;
  if (!before || !after) {
    st.toast(`💧 +${points} · ${cheer}!`, 'success');
  } else if (after.growth.stage > before.growth.stage) {
    st.toast(`🌱 Cây "${cut(after.goal.title)}" vừa lên giai đoạn ${stageNames(after.goal)[after.growth.stage]}!`, 'success');
  } else if (before.health.wilt > 0 && after.health.wilt === 0) {
    st.toast(`🌿 +${points} 💧 · Cây "${cut(after.goal.title)}" đã tươi lại nhờ lần tưới này.`, 'success');
  } else {
    const left = dropsToNextStage(after.growth);
    const next = left !== null ? ` · còn ${left} 💧 nữa là ${stageNames(after.goal)[after.growth.stage + 1]}` : '';
    st.toast(`💧 +${points} cho "${cut(after.goal.title, 26)}"${next}. ${cheer}!`, 'success');
  }
  // Xong hết việc nhỏ của một đầu việc làm một lần: nhắc tick đầu việc đó
  if (task.parent_id) {
    const s = useStore.getState();
    const parent = s.tasks.find((t) => t.id === task.parent_id);
    const siblings = s.tasks.filter((t) => t.parent_id === task.parent_id);
    if (parent && parent.kind === 'once' && !parent.done_at && siblings.length > 1 && siblings.every((t) => t.done_at)) {
      setTimeout(() => st.toast(`✅ Xong hết việc nhỏ của "${cut(parent.title)}". Hoàn thành đầu việc này thì tick nó để nhận thêm +${taskPoints(parent)} 💧.`), 900);
    }
  }
}

// ------------------------------------------------------------
// Khu vườn kỷ niệm
// ------------------------------------------------------------
export interface MemorialPlant {
  goal: Goal;
  stage: number;
  earned: number;
  total: number;
  pct: number;
}

/** Cây của một chu kỳ đã kết thúc: dùng "ảnh chụp" lúc kết thúc; chưa có thì tính lại từ dữ liệu đang có */
export function memorialPlants(cycle: Cycle, d: Pick<Snapshot, 'goals' | 'tasks' | 'task_completions'>): MemorialPlant[] {
  return d.goals
    .filter((g) => g.cycle_id === cycle.id && g.status !== 'dropped')
    .sort((a, b) => a.sort - b.sort)
    .map((goal) => {
      if (goal.final_stage != null) {
        const total = goal.final_total ?? 0;
        const earned = goal.final_earned ?? 0;
        return { goal, stage: goal.final_stage, earned, total, pct: total > 0 ? Math.min(1, earned / total) : 0 };
      }
      const g = goalGrowth(goal, cycle, d);
      return { goal, stage: g.stage, earned: g.earned, total: g.total, pct: g.pct };
    });
}

export const pastCycles = (cycles: Cycle[]) => cycles.filter((c) => c.status === 'done').sort((a, b) => b.start_date.localeCompare(a.start_date));

/** Điểm thực thi trung bình các tuần của chu kỳ (tới hôm nay hoặc hết chu kỳ) */
export function cycleScore(cycle: Cycle, d: Parameters<typeof weekStats>[0], today = todayISO()): { pct: number; planned: number; done: number } {
  const until = today < cycle.end_date ? today : cycle.end_date;
  let planned = 0;
  let done = 0;
  for (let w = cycle.start_date; w <= until; w = addDays(w, 7)) {
    const s = weekStats(d, w, until);
    planned += s.planned;
    done += s.done;
  }
  return { planned, done, pct: planned > 0 ? done / planned : 0 };
}

/**
 * Kết thúc chu kỳ: chụp lại từng cây, đưa vào Khu vườn kỷ niệm, rồi mở chu kỳ 12 tuần mới
 * bắt đầu từ thứ Hai tuần này (hoặc ngay sau ngày cuối chu kỳ cũ nếu muộn hơn).
 * Mục tiêu dài hạn được giữ nguyên để đặt mục tiêu 12 tuần mới.
 */
export async function closeCycle(cycle: Cycle): Promise<boolean> {
  const st = useStore.getState();
  if (st.mode === 'cloud' && !st.online) {
    st.toast('Bạn đang offline. Có mạng lại rồi kết thúc chu kỳ nhé.');
    return false;
  }
  let completions = st.task_completions;
  if (cycle.start_date < loadedSince()) {
    try {
      completions = (await st.loadRange(cycle.start_date, cycle.end_date)).task_completions;
    } catch {
      st.toast('Chưa tải được lịch sử của chu kỳ. Bạn thử lại sau nhé.', 'error');
      return false;
    }
  }
  const data = { tasks: st.tasks, task_completions: completions };
  const today = todayISO();
  // Kết thúc sớm: ngày kết thúc ghi là hôm nay, còn cây giữ đúng giai đoạn bạn đang thấy (tính trên cả 12 tuần)
  const early = today < cycle.end_date;
  const endDate = early ? (today > cycle.start_date ? today : addDays(cycle.start_date, 1)) : cycle.end_date;
  for (const g of st.goals.filter((x) => x.cycle_id === cycle.id && x.status === 'active')) {
    const growth = goalGrowth(g, cycle, data);
    st.update('goals', g.id, {
      status: 'done',
      ...(st.gd3 ? { final_stage: growth.stage, final_earned: growth.earned, final_total: growth.total } : {}),
    });
  }
  st.update('cycles', cycle.id, early ? { status: 'done', end_date: endDate } : { status: 'done' });
  const start = mondayOf(today);
  st.insert('cycles', { start_date: start, end_date: addDays(start, CYCLE_DAYS - 1), status: 'active' });
  return true;
}
