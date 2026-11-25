// Focus (bản 2) là một "nghi thức" để bắt đầu tập trung, không tính điểm, không tưới cây:
//   1. Trước phiên: "Phiên này bạn làm gì?" (+ tùy chọn: AI gợi ý các bước)
//   2. Bấm Bắt đầu → đồng hồ đếm lên → bấm Dừng
//   3. Sau phiên: "Bạn học có hiệu quả không?" → lưu một dòng vào focus_sessions
// Trạng thái lưu trong localStorage nên vẫn chạy tiếp khi chuyển màn, tải lại trang hay đóng app rồi mở lại.
// Phiên được ghi qua hàng chờ: lúc offline hoặc lúc app chưa tải xong dữ liệu thì chờ rồi ghi sau.

import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { useStore } from './store';
import { hasActiveSound, unlockAudio, useSound } from './sound';
import type { FocusSession, FocusStep } from './types';

export type FocusPhase = 'idle' | 'running' | 'reflect';

/** Phiên ngắn hơn 1 phút không được ghi lại */
export const MIN_RECORD_SEC = 60;
const FOCUS_KEY = 'kairos-focus-v2';
const OLD_KEY = 'kairos-focus-v1';

type PendingSession = Omit<FocusSession, 'id' | 'created_at' | 'user_id'> & { user_id: string | null };

interface Persisted {
  phase: FocusPhase;
  /** Phiên này định làm gì */
  intention: string;
  taskId: string | null;
  steps: FocusStep[];
  /** Gợi ý ngắn của AI đi kèm các bước */
  tip: string;
  startedAt: string | null;
  endedAt: string | null;
  pending: PendingSession[];
}

interface FocusState extends Persisted {
  setIntention: (text: string) => void;
  /** Gắn phiên với một việc (điền sẵn tên việc vào ô "Phiên này bạn làm gì?") */
  setTask: (id: string | null, title?: string) => void;
  setSteps: (steps: FocusStep[], tip?: string) => void;
  toggleStep: (i: number) => void;
  start: () => void;
  stop: () => void;
  /** Lưu phiên kèm tự đánh giá (rating null = bỏ qua câu hỏi) */
  finish: (rating: number | null, reflection: string) => void;
  reset: () => void;
}

const DEFAULTS: Persisted = {
  phase: 'idle',
  intention: '',
  taskId: null,
  steps: [],
  tip: '',
  startedAt: null,
  endedAt: null,
  pending: [],
};

function load(): Persisted {
  try {
    const raw = JSON.parse(localStorage.getItem(FOCUS_KEY) ?? 'null') as Partial<Persisted> | null;
    const state = { ...DEFAULTS, ...(raw ?? {}) };
    // Phiên của bản cũ còn chờ ghi thì chuyển sang (không bỏ mất giờ đã tập trung)
    const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? 'null') as { pending?: PendingSession[] } | null;
    if (old?.pending?.length) state.pending = [...state.pending, ...old.pending];
    if (old) localStorage.removeItem(OLD_KEY);
    return state;
  } catch {
    return DEFAULTS;
  }
}

export const elapsedMs = (s: Pick<Persisted, 'startedAt' | 'endedAt'>, now = Date.now()) =>
  s.startedAt ? Math.max(0, (s.endedAt ? Date.parse(s.endedAt) : now) - Date.parse(s.startedAt)) : 0;

export const useFocus = create<FocusState>((set, get) => ({
  ...(typeof window === 'undefined' ? DEFAULTS : load()),

  setIntention: (intention) => set({ intention: intention.slice(0, 300) }),
  setTask: (taskId, title) => {
    const s = get();
    // Đổi việc thì bỏ các bước cũ (của việc khác)
    set({ taskId, intention: title ?? s.intention, ...(taskId !== s.taskId ? { steps: [], tip: '' } : {}) });
  },
  setSteps: (steps, tip = '') => set({ steps: steps.slice(0, 8), tip }),
  toggleStep: (i) => set({ steps: get().steps.map((x, k) => (k === i ? { ...x, done: !x.done } : x)) }),

  start: () => {
    unlockAudio();
    set({ phase: 'running', startedAt: new Date().toISOString(), endedAt: null });
    if (hasActiveSound()) useSound.getState().play();
    ensureTicker();
  },

  stop: () => {
    const s = get();
    if (s.phase !== 'running') return;
    useSound.getState().stop();
    const endedAt = new Date().toISOString();
    if (elapsedMs({ startedAt: s.startedAt, endedAt }) < MIN_RECORD_SEC * 1000) {
      useStore.getState().toast('Phiên dưới 1 phút nên không được ghi lại. Khi sẵn sàng thì bắt đầu lại nhé.');
      set({ phase: 'idle', startedAt: null, endedAt: null, steps: s.steps.map((x) => ({ ...x, done: false })) });
      return;
    }
    set({ phase: 'reflect', endedAt });
  },

  finish: (rating, reflection) => {
    const s = get();
    if (s.phase !== 'reflect' || !s.startedAt || !s.endedAt) return;
    const store = useStore.getState();
    const task = s.taskId ? store.tasks.find((t) => t.id === s.taskId) : undefined;
    const sec = Math.round(elapsedMs(s) / 1000);
    const row: PendingSession = {
      user_id: store.userId,
      task_id: s.taskId,
      goal_id: task?.goal_id ?? null,
      started_at: s.startedAt,
      ended_at: s.endedAt,
      planned_min: 0,
      actual_sec: sec,
      completed: true,
      intention: s.intention.trim() || task?.title || '',
      steps: s.steps,
      rating,
      reflection: reflection.trim().slice(0, 1000),
    };
    set({ ...DEFAULTS, pending: [...s.pending, row] });
    flushPending();
  },

  reset: () => {
    if (get().phase === 'running') useSound.getState().stop();
    set({ ...DEFAULTS, pending: get().pending });
  },
}));

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
// Đồng hồ trên tiêu đề tab
// ------------------------------------------------------------

let ticker: ReturnType<typeof setInterval> | undefined;
const baseTitle = typeof document !== 'undefined' ? document.title : 'Kairos';

/** 754000 → "12:34", 4000000 → "1:06:40" */
export const fmtClock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

function tick() {
  const s = useFocus.getState();
  if (s.phase !== 'running') {
    clearInterval(ticker);
    ticker = undefined;
    document.title = baseTitle;
    return;
  }
  document.title = `🎯 ${fmtClock(elapsedMs(s))} · Kairos`;
}

function ensureTicker() {
  if (ticker) return;
  ticker = setInterval(tick, 1000);
  tick();
}

// ------------------------------------------------------------
// Khởi động khi tải module
// ------------------------------------------------------------

if (typeof window !== 'undefined') {
  useFocus.subscribe((s) => {
    const data: Persisted = {
      phase: s.phase,
      intention: s.intention,
      taskId: s.taskId,
      steps: s.steps,
      tip: s.tip,
      startedAt: s.startedAt,
      endedAt: s.endedAt,
      pending: s.pending,
    };
    try {
      localStorage.setItem(FOCUS_KEY, JSON.stringify(data));
    } catch {
      /* bỏ qua */
    }
  });
  // Có dữ liệu/có mạng trở lại thì ghi các phiên đang chờ
  useStore.subscribe((st, prev) => {
    if (st.status !== prev.status || st.online !== prev.online || st.userId !== prev.userId) flushPending();
  });
  if (useFocus.getState().phase === 'running') ensureTicker();
}

// ------------------------------------------------------------
// Hook cho giao diện
// ------------------------------------------------------------

/** Thời gian đã tập trung của phiên đang chạy (cập nhật mỗi giây) */
export function useFocusElapsed(): number {
  const s = useFocus();
  const running = s.phase === 'running';
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return elapsedMs(s, running ? now : Date.now());
}
