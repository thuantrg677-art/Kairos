// Đồng hồ Focus dùng chung cho cả app: vẫn chạy khi chuyển màn hình, tải lại trang hay đóng app rồi mở lại
// (vì tính theo mốc thời gian, lưu trong localStorage). Hết giờ focus thì ghi một dòng vào bảng focus_sessions.
// Phiên được ghi qua hàng chờ: lúc offline hoặc lúc app chưa tải xong dữ liệu thì chờ rồi ghi sau.

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useStore } from './store';
import { chime, hasActiveSound, unlockAudio, useSound } from './sound';
import type { FocusSession } from './types';

export type FocusPhase = 'idle' | 'focus' | 'break' | 'done';

export const PRESETS = [25, 50, 90] as const;
export const BREAKS = [5, 10, 15, 20] as const;
/** Phiên ngắn hơn 1 phút không được ghi lại */
const MIN_RECORD_SEC = 60;
const FOCUS_KEY = 'kairos-focus-v1';

/** Thời gian nghỉ gợi ý theo độ dài phiên */
export function defaultBreak(min: number): number {
  if (min <= 30) return 5;
  if (min <= 60) return 10;
  return 15;
}

type PendingSession = Omit<FocusSession, 'id' | 'created_at' | 'user_id'> & { user_id: string | null };

export interface FocusResult {
  sec: number;
  completed: boolean;
  taskId: string | null;
  planned: number;
  awayCount: number;
  recorded: boolean;
}

interface Persisted {
  phase: FocusPhase;
  planMin: number;
  breakMin: number;
  taskId: string | null;
  /** Lúc bắt đầu phiên focus (ISO) */
  startedAt: string | null;
  durationMs: number;
  /** Thời gian đã chạy trước lần tiếp tục gần nhất */
  accMs: number;
  /** Mốc bắt đầu chạy lại; null = đang tạm dừng */
  runStart: number | null;
  awayCount: number;
  leftAt: number | null;
  result: FocusResult | null;
  remindLeave: boolean;
  pending: PendingSession[];
}

interface FocusState extends Persisted {
  setPlan: (min: number) => void;
  setBreak: (min: number) => void;
  setTask: (id: string | null) => void;
  setRemindLeave: (on: boolean) => void;
  start: () => void;
  pause: () => void;
  resume: () => void;
  /** Dừng sớm: thời gian đã tập trung (từ 1 phút) vẫn được ghi */
  stop: () => void;
  startBreak: () => void;
  skipBreak: () => void;
  reset: () => void;
}

const DEFAULTS: Persisted = {
  phase: 'idle',
  planMin: 25,
  breakMin: 5,
  taskId: null,
  startedAt: null,
  durationMs: 0,
  accMs: 0,
  runStart: null,
  awayCount: 0,
  leftAt: null,
  result: null,
  remindLeave: true,
  pending: [],
};

function load(): Persisted {
  try {
    const raw = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null') as Partial<Persisted> | null;
    return { ...DEFAULTS, ...(raw ?? {}) };
  } catch {
    return DEFAULTS;
  }
}

export const elapsedMs = (s: Pick<Persisted, 'accMs' | 'runStart'>, now = Date.now()) =>
  s.accMs + (s.runStart ? now - s.runStart : 0);
export const remainingMs = (s: Pick<Persisted, 'accMs' | 'runStart' | 'durationMs'>, now = Date.now()) =>
  Math.max(0, s.durationMs - elapsedMs(s, now));

export const useFocus = create<FocusState>((set, get) => ({
  ...(typeof window === 'undefined' ? DEFAULTS : load()),

  setPlan: (min) => {
    const m = Math.round(Math.min(180, Math.max(5, min)));
    set({ planMin: m, breakMin: defaultBreak(m) });
  },
  setBreak: (min) => set({ breakMin: min }),
  setTask: (taskId) => set({ taskId }),
  setRemindLeave: (on) => {
    set({ remindLeave: on });
    if (on && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
  },

  start: () => {
    unlockAudio();
    const now = Date.now();
    set({
      phase: 'focus',
      startedAt: new Date(now).toISOString(),
      durationMs: get().planMin * 60_000,
      accMs: 0,
      runStart: now,
      awayCount: 0,
      leftAt: null,
      result: null,
    });
    if (hasActiveSound()) useSound.getState().play();
    if (get().remindLeave && 'Notification' in window && Notification.permission === 'default') void Notification.requestPermission();
    ensureTicker();
  },

  pause: () => {
    const s = get();
    if (!s.runStart) return;
    set({ accMs: elapsedMs(s), runStart: null });
    if (s.phase === 'focus') useSound.getState().stop();
  },

  resume: () => {
    unlockAudio();
    if (get().runStart) return;
    set({ runStart: Date.now() });
    if (get().phase === 'focus' && hasActiveSound()) useSound.getState().play();
    ensureTicker();
  },

  stop: () => finishFocus(false),

  startBreak: () => {
    unlockAudio();
    set({ phase: 'break', durationMs: get().breakMin * 60_000, accMs: 0, runStart: Date.now() });
    ensureTicker();
  },

  skipBreak: () => set({ phase: 'idle', runStart: null, accMs: 0 }),

  reset: () => {
    if (get().phase === 'focus') useSound.getState().stop();
    set({ phase: 'idle', runStart: null, accMs: 0, result: null });
  },
}));

// ------------------------------------------------------------
// Kết thúc phiên và ghi dữ liệu
// ------------------------------------------------------------

function finishFocus(completed: boolean) {
  const s = useFocus.getState();
  if (s.phase !== 'focus' || !s.startedAt) return;
  const now = Date.now();
  const el = elapsedMs(s, now);
  const sec = completed ? Math.round(s.durationMs / 1000) : Math.floor(el / 1000);
  // Nếu app bị đóng lúc hết giờ thì mốc kết thúc là lúc đồng hồ thực sự về 0, không phải lúc mở lại
  const endedAt = new Date(completed ? now - Math.max(0, el - s.durationMs) : now).toISOString();
  const store = useStore.getState();
  const task = s.taskId ? store.tasks.find((t) => t.id === s.taskId) : undefined;
  const recorded = sec >= MIN_RECORD_SEC;
  const pending = [...s.pending];
  if (recorded) {
    pending.push({
      user_id: store.userId,
      task_id: s.taskId,
      goal_id: task?.goal_id ?? null,
      started_at: s.startedAt,
      ended_at: endedAt,
      planned_min: Math.round(s.durationMs / 60_000),
      actual_sec: sec,
      completed,
    });
  }
  useFocus.setState({
    phase: 'done',
    runStart: null,
    accMs: 0,
    leftAt: null,
    pending,
    result: { sec, completed, taskId: s.taskId, planned: Math.round(s.durationMs / 60_000), awayCount: s.awayCount, recorded },
  });
  useSound.getState().stop();
  if (completed) {
    chime();
    notifyIfHidden('Hết giờ focus 🌸', 'Mầm cây đã nở hoa. Nghỉ một chút rồi làm tiếp nhé.');
  } else if (!recorded) {
    store.toast('Phiên dưới 1 phút nên không được ghi lại.');
  }
  flushPending();
}

function finishBreak() {
  useFocus.setState({ phase: 'idle', runStart: null, accMs: 0 });
  chime(true);
  notifyIfHidden('Hết giờ nghỉ', 'Sẵn sàng cho phiên focus tiếp theo chưa?');
}

let flushing = false;
/** Ghi các phiên đang chờ khi app đã sẵn sàng và có mạng */
export function flushPending() {
  if (flushing) return;
  const st = useStore.getState();
  const { pending } = useFocus.getState();
  if (pending.length === 0 || st.status !== 'ready' || !st.userId) return;
  if (st.mode === 'cloud' && !st.online) return;
  flushing = true;
  const keep: PendingSession[] = [];
  for (const p of pending) {
    if (p.user_id && p.user_id !== st.userId) {
      // Phiên của tài khoản khác trên cùng máy: giữ lại tối đa 7 ngày chờ họ đăng nhập lại
      if (Date.now() - Date.parse(p.started_at) < 7 * 86_400_000) keep.push(p);
      continue;
    }
    const { user_id: _u, ...row } = p;
    // Việc/mục tiêu có thể đã bị xóa trong lúc chờ
    const task = row.task_id ? st.tasks.find((t) => t.id === row.task_id) : undefined;
    if (!task) row.task_id = null;
    else if (!row.goal_id) row.goal_id = task.goal_id;
    if (row.goal_id && !st.goals.some((g) => g.id === row.goal_id)) row.goal_id = null;
    if (!st.insert('focus_sessions', row)) keep.push(p);
  }
  useFocus.setState({ pending: keep });
  flushing = false;
}

// ------------------------------------------------------------
// Bộ đếm giờ chạy nền và nhắc khi rời app
// ------------------------------------------------------------

let ticker: ReturnType<typeof setInterval> | undefined;
const baseTitle = typeof document !== 'undefined' ? document.title : 'Kairos';

export const fmtClock = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

function tick() {
  const s = useFocus.getState();
  if (s.phase !== 'focus' && s.phase !== 'break') {
    clearInterval(ticker);
    ticker = undefined;
    document.title = baseTitle;
    return;
  }
  if (!s.runStart) {
    document.title = `⏸ ${fmtClock(remainingMs(s))} · Kairos`;
    return;
  }
  const left = remainingMs(s);
  if (left <= 0) {
    if (s.phase === 'focus') finishFocus(true);
    else finishBreak();
    document.title = baseTitle;
    return;
  }
  document.title = `${s.phase === 'focus' ? '🌱' : '☕'} ${fmtClock(left)} · Kairos`;
}

function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(tick, 500);
  tick();
}

async function notifyIfHidden(title: string, body: string) {
  if (document.visibilityState === 'visible') return;
  await showNotification(title, body);
}

async function showNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const options: NotificationOptions = { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: 'kairos-focus' };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
  } catch {
    /* một số trình duyệt không cho tạo thông báo theo cách này */
  }
}

async function closeNotifications() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const list = (await reg?.getNotifications({ tag: 'kairos-focus' })) ?? [];
    list.forEach((n) => n.close());
  } catch {
    /* bỏ qua */
  }
}

let leaveTimer: ReturnType<typeof setTimeout> | undefined;

function onVisibility() {
  const s = useFocus.getState();
  const running = s.phase === 'focus' && !!s.runStart;
  if (document.visibilityState === 'hidden') {
    if (!running) return;
    useFocus.setState({ leftAt: Date.now() });
    if (s.remindLeave) {
      clearTimeout(leaveTimer);
      // Chờ vài giây để không làm phiền khi chỉ lướt qua app khác
      leaveTimer = setTimeout(() => {
        const now = useFocus.getState();
        if (document.visibilityState === 'hidden' && now.phase === 'focus' && now.runStart) {
          void showNotification('Mầm cây đang chờ bạn 🌱', `Còn ${fmtClock(remainingMs(now))} của phiên focus. Quay lại Kairos để cây tiếp tục lớn nhé.`);
        }
      }, 5000);
    }
    return;
  }
  // Quay lại app
  clearTimeout(leaveTimer);
  void closeNotifications();
  tick();
  const after = useFocus.getState();
  if (after.leftAt) {
    const away = Date.now() - after.leftAt;
    useFocus.setState({ leftAt: null });
    if (after.phase === 'focus' && away > 5000) {
      useFocus.setState({ awayCount: after.awayCount + 1 });
      const mins = Math.round(away / 60_000);
      useStore.getState().toast(`Bạn vừa rời Kairos ${mins >= 1 ? `${mins} phút` : 'một lúc'}. Đồng hồ vẫn chạy, quay lại việc thôi! 🌱`);
    }
  }
}

// ------------------------------------------------------------
// Khởi động khi tải module
// ------------------------------------------------------------

if (typeof window !== 'undefined') {
  // Lưu trạng thái (trừ các giá trị không đổi) mỗi khi có thay đổi
  useFocus.subscribe((s) => {
    const data: Persisted = {
      phase: s.phase,
      planMin: s.planMin,
      breakMin: s.breakMin,
      taskId: s.taskId,
      startedAt: s.startedAt,
      durationMs: s.durationMs,
      accMs: s.accMs,
      runStart: s.runStart,
      awayCount: s.awayCount,
      leftAt: s.leftAt,
      result: s.result,
      remindLeave: s.remindLeave,
      pending: s.pending,
    };
    try {
      localStorage.setItem(FOCUS_KEY, JSON.stringify(data));
    } catch {
      /* bỏ qua */
    }
  });
  document.addEventListener('visibilitychange', onVisibility);
  // Có dữ liệu/có mạng trở lại thì ghi các phiên đang chờ
  useStore.subscribe((st, prev) => {
    if (st.status !== prev.status || st.online !== prev.online || st.userId !== prev.userId) flushPending();
  });
  const s = useFocus.getState();
  if (s.phase === 'focus' || s.phase === 'break') {
    // Mở lại app giữa chừng: nếu đã qua lúc rời app thì xem như vừa quay lại
    if (s.leftAt) useFocus.setState({ leftAt: null });
    ensureTicker();
  }
}

// ------------------------------------------------------------
// Hook cho giao diện
// ------------------------------------------------------------

/** Thời gian còn lại và tiến độ (0–1) của phiên đang chạy, cập nhật 4 lần mỗi giây */
export function useFocusClock() {
  const s = useFocus();
  const active = (s.phase === 'focus' || s.phase === 'break') && !!s.runStart;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [active]);
  const t = active ? now : Date.now();
  const remaining = s.phase === 'focus' || s.phase === 'break' ? remainingMs(s, t) : s.planMin * 60_000;
  const progress = s.durationMs > 0 && (s.phase === 'focus' || s.phase === 'break') ? Math.min(1, elapsedMs(s, t) / s.durationMs) : 0;
  return { remaining, progress };
}
