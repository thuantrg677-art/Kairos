// Kho dữ liệu trung tâm của app (zustand).
// - Chế độ "cloud": dữ liệu nằm trên Supabase, app giữ một bản trong bộ nhớ và một bản lưu tạm để xem offline.
// - Chế độ "demo": dữ liệu mẫu chỉ nằm trên máy này (localStorage), không cần tài khoản.
// Mọi thay đổi hiện ngay trên màn hình rồi mới gửi lên server; nếu gửi lỗi thì tải lại từ server.

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { supabase } from './supabase';
import { addDays, toISO, todayISO } from './dates';
import { buildSeed, DEMO_USER, emptySnapshot } from './seed';
import { taskPoints } from './logic';
import { TABLE_NAMES, type Profile, type Snapshot, type TableName, type Tables, type Task } from './types';

const MODE_KEY = 'kairos-mode';
const DEMO_KEY = 'kairos-demo-v1';
const LAST_USER_KEY = 'kairos-last-user';
const cacheKey = (uid: string) => `kairos-cache-${uid}`;

export interface Toast {
  id: number;
  text: string;
  kind: 'info' | 'error' | 'success';
}

type Collections = { [K in TableName]: Tables[K][] };
type NewRow<T extends TableName> = Omit<Tables[T], 'id' | 'user_id' | 'created_at'>;

interface Store extends Collections {
  profile: Profile | null;
  status: 'loading' | 'signed-out' | 'ready' | 'error';
  mode: 'cloud' | 'demo' | null;
  userId: string | null;
  email: string | null;
  online: boolean;
  /** Đang hiển thị dữ liệu lưu tạm vì chưa tải được từ server */
  stale: boolean;
  /** Database đã có các cột của giai đoạn 3 (003_gd3.sql) chưa */
  gd3: boolean;
  toasts: Toast[];

  init: () => Promise<void>;
  enterDemo: () => void;
  resetDemo: (empty: boolean) => void;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;

  insert: <T extends TableName>(table: T, row: NewRow<T>) => Tables[T] | null;
  update: <T extends TableName>(table: T, id: string, patch: Partial<Tables[T]>) => void;
  remove: (table: TableName, id: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  /** Tick / bỏ tick một việc trong ngày. Trả về số 💧 nhận được (0 nếu bỏ tick). */
  toggleTask: (task: Task, date: string) => number;
  /** Lấy lịch sử tick và focus của một khoảng ngày (để xem các tháng cũ hơn phần đã tải sẵn) */
  loadRange: (from: string, to: string) => Promise<Pick<Snapshot, 'task_completions' | 'focus_sessions'>>;
  /** Chỉ tải lại thông báo (khi vừa có push tới) */
  refreshNotifications: () => Promise<void>;
  /** Đánh dấu đã đọc: một số thông báo, hoặc tất cả */
  markRead: (ids: string[] | 'all') => void;

  toast: (text: string, kind?: Toast['kind']) => void;
  dismissToast: (id: number) => void;
}

const EMPTY: Collections = {
  visions: [],
  cycles: [],
  goals: [],
  tasks: [],
  task_completions: [],
  fixed_events: [],
  schedule_blocks: [],
  inbox_items: [],
  focus_sessions: [],
  journals: [],
  weekly_reviews: [],
  notifications: [],
};

/** Số thông báo gần nhất được tải về (chuông trong app) */
const NOTIFICATION_LIMIT = 60;

/** Dữ liệu tick và focus được tải sẵn từ ngày này trở đi (cũ hơn thì tải khi cần) */
export const LOADED_DAYS = 100;
export const loadedSince = () => addDays(todayISO(), -LOADED_DAYS);

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* bộ nhớ đầy: bỏ qua */
  }
}

/** Tải toàn bộ dữ liệu của người dùng từ Supabase (RLS đảm bảo chỉ trả về dữ liệu của chính họ) */
async function loadCloud(uid: string): Promise<Snapshot> {
  const sb = supabase!;
  let { data: profile, error } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
  if (error) throw error;
  if (!profile) {
    const created = await sb.from('profiles').insert({ id: uid }).select().single();
    if (created.error) throw created.error;
    profile = created.data;
  }
  const since = loadedSince();
  const results = await Promise.all(
    TABLE_NAMES.map((t) => {
      let q = sb.from(t).select('*');
      if (t === 'task_completions') q = q.gte('date', since);
      if (t === 'schedule_blocks') q = q.gte('date', addDays(todayISO(), -14));
      if (t === 'focus_sessions') q = q.gte('started_at', since);
      if (t === 'journals') q = q.gte('date', addDays(todayISO(), -400));
      if (t === 'notifications') return q.gte('created_at', `${addDays(todayISO(), -30)}T00:00:00Z`).order('created_at', { ascending: false }).limit(NOTIFICATION_LIMIT);
      return q;
    }),
  );
  const snap = { profile } as Snapshot;
  results.forEach((res, i) => {
    if (res.error) throw res.error;
    (snap as unknown as Record<string, unknown>)[TABLE_NAMES[i]] = res.data ?? [];
  });
  return snap;
}

/** Kiểm tra đã chạy 003_gd3.sql chưa (có cột mới chưa). Lỗi mạng thì coi như đã chạy. */
async function probeGd3(): Promise<boolean> {
  const sb = supabase!;
  const [a, b] = await Promise.all([
    sb.from('weekly_reviews').select('wins').limit(1),
    sb.from('goals').select('final_stage').limit(1),
  ]);
  const missing = (e: { code?: string; message?: string } | null) => !!e && (e.code === '42703' || e.code === 'PGRST204' || /column/i.test(e.message ?? ''));
  return !missing(a.error) && !missing(b.error);
}

// Các lệnh ghi được gửi lần lượt theo đúng thứ tự (vd tạo mục tiêu xong mới tạo việc của nó)
let writeQueue: Promise<unknown> = Promise.resolve();
let toastId = 0;
let lastLoad = 0;
let authListening = false;

export const useStore = create<Store>((set, get) => {
  const applySnapshot = (snap: Snapshot, extra: Partial<Store> = {}) => {
    const { profile, ...rest } = snap;
    set({ ...EMPTY, ...rest, profile, status: 'ready', ...extra });
  };

  const queueWrite = (op: () => PromiseLike<{ error: unknown }>) => {
    if (get().mode !== 'cloud') return;
    writeQueue = writeQueue
      .then(() => op())
      .then((res) => {
        if (res.error) throw res.error;
      })
      .catch((err) => {
        console.error('[Kairos] Lỗi lưu dữ liệu:', err);
        get().toast('Không lưu được thay đổi. Mình đang tải lại dữ liệu…', 'error');
        void get().refresh();
      });
  };

  /** Chỉ cho ghi khi có mạng (chế độ cloud). Offline thì báo nhẹ nhàng. */
  const canWrite = () => {
    const s = get();
    if (s.status !== 'ready') return false;
    if (s.mode === 'cloud' && !s.online) {
      s.toast('Bạn đang offline nên chỉ xem được. Có mạng lại là chỉnh sửa được ngay.', 'info');
      return false;
    }
    return true;
  };

  const startCloud = async (uid: string, email: string | null) => {
    localStorage.setItem(LAST_USER_KEY, uid);
    set({ userId: uid, email, mode: 'cloud' });
    const cached = readJSON<Snapshot>(cacheKey(uid));
    if (cached) applySnapshot(cached, { stale: true });
    try {
      const [snap, gd3] = await Promise.all([loadCloud(uid), probeGd3().catch(() => true)]);
      lastLoad = Date.now();
      applySnapshot(snap, { stale: false, gd3 });
    } catch (err) {
      console.error('[Kairos] Lỗi tải dữ liệu:', err);
      if (!cached) set({ status: 'error' });
    }
  };

  return {
    ...EMPTY,
    profile: null,
    status: 'loading',
    mode: null,
    userId: null,
    email: null,
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    stale: false,
    gd3: true,
    toasts: [],

    init: async () => {
      window.addEventListener('online', () => {
        set({ online: true });
        void get().refresh();
      });
      window.addEventListener('offline', () => set({ online: false }));
      document.addEventListener('visibilitychange', () => {
        // Quay lại app sau hơn 1 phút thì đồng bộ lại (để thấy thay đổi từ thiết bị khác)
        if (document.visibilityState === 'visible' && Date.now() - lastLoad > 60_000) void get().refresh();
      });

      if (localStorage.getItem(MODE_KEY) === 'demo') {
        get().enterDemo();
        return;
      }
      if (!supabase) {
        set({ status: 'signed-out' });
        return;
      }
      if (!authListening) {
        authListening = true;
        supabase.auth.onAuthStateChange((event, session) => {
          // Không gọi Supabase trực tiếp trong hàm này (dễ bị treo), nên dùng setTimeout
          setTimeout(() => {
            if (event === 'SIGNED_OUT') {
              set({ ...EMPTY, profile: null, status: 'signed-out', mode: null, userId: null, email: null });
            } else if (session && session.user.id !== get().userId && get().mode !== 'demo') {
              void startCloud(session.user.id, session.user.email ?? null);
            }
          }, 0);
        });
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          if (get().userId !== data.session.user.id) await startCloud(data.session.user.id, data.session.user.email ?? null);
        } else set({ status: 'signed-out' });
      } catch {
        // Mất mạng lúc mở app: dùng dữ liệu lưu tạm của lần đăng nhập gần nhất
        const uid = localStorage.getItem(LAST_USER_KEY);
        const cached = uid ? readJSON<Snapshot>(cacheKey(uid)) : null;
        if (uid && cached) {
          set({ userId: uid, mode: 'cloud' });
          applySnapshot(cached, { stale: true });
        } else set({ status: 'signed-out' });
      }
    },

    enterDemo: () => {
      localStorage.setItem(MODE_KEY, 'demo');
      const snap = readJSON<Snapshot>(DEMO_KEY) ?? buildSeed();
      set({ mode: 'demo', userId: DEMO_USER, email: null, stale: false, gd3: true });
      applySnapshot(snap);
    },

    resetDemo: (empty) => {
      const snap = empty ? emptySnapshot(DEMO_USER) : buildSeed();
      if (empty && get().profile) {
        snap.profile.theme = get().profile!.theme;
        snap.profile.dark_mode = get().profile!.dark_mode;
      }
      applySnapshot(snap);
    },

    signOut: async () => {
      const { mode } = get();
      localStorage.removeItem(MODE_KEY);
      if (mode === 'cloud' && supabase) {
        await supabase.auth.signOut().catch(() => undefined);
      }
      set({ ...EMPTY, profile: null, status: 'signed-out', mode: null, userId: null, email: null });
    },

    refresh: async () => {
      const { mode, userId, online } = get();
      if (mode !== 'cloud' || !userId || !online) return;
      try {
        await writeQueue; // chờ các lệnh ghi đang dở xong đã
        const [snap, gd3] = await Promise.all([loadCloud(userId), probeGd3().catch(() => get().gd3)]);
        lastLoad = Date.now();
        applySnapshot(snap, { stale: false, gd3 });
      } catch (err) {
        console.error('[Kairos] Lỗi đồng bộ:', err);
      }
    },

    insert: (table, row) => {
      if (!canWrite()) return null;
      const full = {
        ...row,
        id: crypto.randomUUID(),
        user_id: get().userId!,
        created_at: new Date().toISOString(),
      } as unknown as Tables[typeof table];
      set((s) => ({ [table]: [...s[table], full] }) as unknown as Partial<Store>);
      queueWrite(() => supabase!.from(table).insert(full));
      return full;
    },

    update: (table, id, patch) => {
      if (!canWrite()) return;
      set(
        (s) =>
          ({
            [table]: (s[table] as { id: string }[]).map((r) => (r.id === id ? { ...r, ...patch } : r)),
          }) as unknown as Partial<Store>,
      );
      queueWrite(() => supabase!.from(table).update(patch as Record<string, unknown>).eq('id', id));
    },

    remove: (table, id) => {
      if (!canWrite()) return;
      set((s) => {
        const next = { [table]: (s[table] as { id: string }[]).filter((r) => r.id !== id) } as unknown as Partial<Store>;
        // Xóa kèm dữ liệu phụ thuộc (database cũng tự xóa theo nhờ "on delete cascade")
        const dropTasks = (ids: Set<string>) => {
          next.task_completions = s.task_completions.filter((c) => !ids.has(c.task_id));
          next.schedule_blocks = s.schedule_blocks.filter((b) => !ids.has(b.task_id));
          next.inbox_items = s.inbox_items.map((i) => (i.task_id && ids.has(i.task_id) ? { ...i, task_id: null } : i));
          // Phiên focus vẫn giữ (để còn thống kê), chỉ bỏ liên kết tới việc đã xóa
          next.focus_sessions = (next.focus_sessions ?? s.focus_sessions).map((f) => (f.task_id && ids.has(f.task_id) ? { ...f, task_id: null } : f));
        };
        if (table === 'tasks') dropTasks(new Set([id]));
        if (table === 'goals') {
          const ids = new Set(s.tasks.filter((t) => t.goal_id === id).map((t) => t.id));
          next.tasks = s.tasks.filter((t) => t.goal_id !== id);
          next.focus_sessions = s.focus_sessions.map((f) => (f.goal_id === id ? { ...f, goal_id: null } : f));
          dropTasks(ids);
        }
        return next;
      });
      queueWrite(() => supabase!.from(table).delete().eq('id', id));
    },

    updateProfile: (patch) => {
      const { profile } = get();
      if (!profile || !canWrite()) return;
      set({ profile: { ...profile, ...patch } });
      queueWrite(() => supabase!.from('profiles').update(patch).eq('id', profile.id));
    },

    toggleTask: (task, date) => {
      const s = get();
      const existing =
        task.kind === 'recurring'
          ? s.task_completions.find((c) => c.task_id === task.id && c.date === date)
          : s.task_completions.find((c) => c.task_id === task.id);
      if (existing) {
        s.remove('task_completions', existing.id);
        if (task.kind === 'once') s.update('tasks', task.id, { done_at: null });
        return 0;
      }
      const points = taskPoints(task);
      const row = s.insert('task_completions', { task_id: task.id, date, points });
      if (!row) return 0;
      if (task.kind === 'once') s.update('tasks', task.id, { done_at: new Date().toISOString() });
      return points;
    },

    loadRange: async (from, to) => {
      const s = get();
      const local = {
        task_completions: s.task_completions.filter((c) => c.date >= from && c.date <= to),
        focus_sessions: s.focus_sessions.filter((f) => {
          const d = toISO(new Date(f.started_at));
          return d >= from && d <= to;
        }),
      };
      // Khoảng đã nằm trong phần tải sẵn, hoặc đang xem thử / offline: dùng dữ liệu có sẵn
      if (s.mode !== 'cloud' || !s.online || !supabase || from >= loadedSince()) return local;
      const [c, f] = await Promise.all([
        supabase.from('task_completions').select('*').gte('date', from).lte('date', to),
        supabase.from('focus_sessions').select('*').gte('started_at', `${addDays(from, -1)}T00:00:00Z`).lte('started_at', `${addDays(to, 1)}T23:59:59Z`),
      ]);
      if (c.error || f.error) throw c.error ?? f.error;
      return {
        task_completions: c.data ?? [],
        focus_sessions: (f.data ?? []).filter((x) => {
          const d = toISO(new Date(x.started_at));
          return d >= from && d <= to;
        }),
      };
    },

    refreshNotifications: async () => {
      const { mode, userId, online } = get();
      if (mode !== 'cloud' || !userId || !online || !supabase) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .gte('created_at', `${addDays(todayISO(), -30)}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(NOTIFICATION_LIMIT);
      if (!error && data) set({ notifications: data });
    },

    markRead: (ids) => {
      const s = get();
      const now = new Date().toISOString();
      const target = new Set(ids === 'all' ? s.notifications.filter((n) => !n.read_at).map((n) => n.id) : ids);
      if (!target.size || s.status !== 'ready') return;
      // Đánh dấu đã đọc không cần báo lỗi khi offline: lần sau có mạng sẽ đọc lại từ server
      set({ notifications: s.notifications.map((n) => (target.has(n.id) && !n.read_at ? { ...n, read_at: now } : n)) });
      if (s.mode !== 'cloud' || !s.online || !supabase) return;
      const sb = supabase;
      queueWrite(() => (ids === 'all' ? sb.from('notifications').update({ read_at: now }).is('read_at', null) : sb.from('notifications').update({ read_at: now }).in('id', [...target])));
    },

    toast: (text, kind = 'info') => {
      const id = ++toastId;
      set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }));
      setTimeout(() => get().dismissToast(id), kind === 'error' ? 6000 : 3500);
    },
    dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

// Lưu tạm dữ liệu xuống máy mỗi khi có thay đổi: để xem offline (cloud) hoặc để giữ dữ liệu mẫu (demo)
let saveTimer: ReturnType<typeof setTimeout> | undefined;
function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = undefined;
  const s = useStore.getState();
  if (s.status !== 'ready' || !s.profile || !s.userId) return;
  const snap = { profile: s.profile } as Record<string, unknown>;
  for (const t of TABLE_NAMES) snap[t] = s[t];
  writeJSON(s.mode === 'demo' ? DEMO_KEY : cacheKey(s.userId), snap);
}
useStore.subscribe(() => {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 200);
});
// Đóng app hoặc chuyển sang app khác thì lưu ngay, không chờ
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', saveNow);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && saveNow());
}

/** Lấy toàn bộ dữ liệu người dùng để tính toán trong các màn hình */
export const useData = () =>
  useStore(
    useShallow((s) => ({
      profile: s.profile,
      visions: s.visions,
      cycles: s.cycles,
      goals: s.goals,
      tasks: s.tasks,
      task_completions: s.task_completions,
      fixed_events: s.fixed_events,
      schedule_blocks: s.schedule_blocks,
      inbox_items: s.inbox_items,
      focus_sessions: s.focus_sessions,
      journals: s.journals,
      weekly_reviews: s.weekly_reviews,
    })),
  );
