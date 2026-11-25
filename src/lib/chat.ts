// Trò chuyện với Trợ lý AI (bản 2).
// - Tin nhắn lưu ở bảng chat_messages (cần 005_v2.sql). App ghi, server chỉ đọc nên không bị ghi chồng.
// - Mỗi lần gửi, app gửi kèm lịch 7 ngày tới, tiến độ cây và điểm tuần (tính bằng logic.ts giống màn Hôm nay);
//   server tự đọc mục tiêu, đầu việc, lịch cố định, nhật ký, phiên Focus và những điều AI đã ghi nhớ.
//   Nhờ vậy AI luôn biết rõ bối cảnh, mục tiêu và lịch của người dùng.
// - AI có thể đề xuất hành động (thêm mục tiêu, đầu việc, việc mỗi ngày, gắn nhãn 20/80, lịch cố định).
//   Người dùng chọn rồi bấm thêm thì app mới tạo (applyActions).

import { askAI, AIError } from './ai';
import { useStore } from './store';
import { addDays, mondayOf, todayISO } from './dates';
import { CYCLE_DAYS, getActiveCycle, itemsForDate, waterStreak, weekStats } from './logic';
import { livePlants, nextPlant, stageNames } from './garden';
import type { ChatAction, ChatMessage, ChatMeta, PlantSpecies } from './types';

export type ChatMode = 'onboarding' | 'free';

/** Số điều AI ghi nhớ tối đa (cũ nhất bị bỏ trước) */
const MEMORY_MAX = 40;

export function greetingFor(mode: ChatMode, name: string): { content: string; meta: ChatMeta } {
  const hi = name ? `Chào ${name}!` : 'Chào bạn!';
  if (mode === 'onboarding') {
    return {
      content: `${hi} Mình là Trợ lý Kairos 🌱

Mình sẽ cùng bạn lập một kế hoạch 12 tuần thật sát với cuộc sống của bạn, rồi mỗi ngày giúp bạn **phân việc 80/20** và **bám đúng lộ trình** tới mục tiêu.

Trước hết, kể mình nghe nhé: **3–5 năm nữa, bạn muốn mình trở thành người như thế nào, hay đạt được điều gì?** Cứ viết tự nhiên, chưa cần rõ ràng ngay đâu.`,
      meta: { quick_replies: ['Mình muốn đi du học', 'Có việc tốt khi ra trường', 'Mình chưa rõ lắm'] },
    };
  }
  return {
    content: `${hi} Mình là Trợ lý Kairos. Mình nắm các mục tiêu, đầu việc và lịch của bạn, nên cứ hỏi thẳng nhé.

Mình có thể giúp bạn:
- **Phân việc 80/20**: việc nào thật sự tạo kết quả, việc nào làm nhanh hoặc bỏ
- **Chia nhỏ một việc** thành các bước cụ thể cho từng ngày
- **Giữ lộ trình** khi bạn bị trễ hay mất động lực

Bạn cũng có thể gửi ảnh (thời khóa biểu, đề bài, ghi chú…) để mình xem cùng.`,
    meta: { quick_replies: ['Hôm nay nên làm gì trước?', 'Phân việc 80/20 giúp mình', 'Kể bối cảnh của mình'] },
  };
}

/** Thêm lời chào đầu tiên khi cuộc trò chuyện còn trống */
export function ensureGreeting(mode: ChatMode) {
  const st = useStore.getState();
  if (st.status !== 'ready' || st.chat_messages.length > 0) return;
  if (st.mode === 'cloud' && !st.gd5) return;
  const g = greetingFor(mode, st.profile?.display_name ?? '');
  st.insert('chat_messages', { role: 'ai', content: g.content, meta: g.meta });
}

// ------------------------------------------------------------
// Ảnh gửi kèm: thu nhỏ trên máy trước khi gửi
// ------------------------------------------------------------
export interface PreparedImage {
  /** Ảnh nhỏ (≤ 360px) để hiện trong cuộc trò chuyện */
  thumb: string;
  /** Ảnh gửi cho AI (≤ 1280px, JPEG) */
  mime: string;
  data: string;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Không đọc được ảnh'));
    };
    img.src = url;
  });
}

function scaled(img: HTMLImageElement, max: number, quality: number): string {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(1, Math.round(img.naturalWidth * k));
  const h = Math.max(1, Math.round(img.naturalHeight * k));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) throw new Error('Chỉ gửi được ảnh.');
  if (file.size > 25 * 1024 * 1024) throw new Error('Ảnh quá lớn (trên 25 MB).');
  const img = await loadImage(file);
  const big = scaled(img, 1280, 0.82);
  return { thumb: scaled(img, 360, 0.7), mime: 'image/jpeg', data: big.slice(big.indexOf(',') + 1) };
}

// ------------------------------------------------------------
// Gửi tin nhắn
// ------------------------------------------------------------

/** Lịch 7 ngày tới, tiến độ cây và điểm tuần: gửi kèm để AI biết người dùng đang ở đâu trên lộ trình */
function planSnapshot() {
  const s = useStore.getState();
  const today = todayISO();
  const agenda = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(today, i);
    return {
      date,
      items: itemsForDate(s, date)
        .filter((it) => i === 0 || !it.done)
        .slice(0, 20)
        .map((it) => ({ title: it.task.title, done: it.done, start: it.block?.start_min ?? null, high: it.task.leverage === 'high', step: !!it.task.parent_id })),
    };
  });
  const cycle = getActiveCycle(s.cycles);
  const goals = livePlants(s, cycle, today).map((p) => ({ goal_id: p.goal.id, pct: Math.round(p.growth.pct * 100), stage: stageNames(p.goal)[p.growth.stage], dry_days: p.health.dryDays }));
  const week = weekStats(s, mondayOf(today), today);
  return { agenda, goals, stats: { week_done: week.done, week_planned: week.planned, streak: waterStreak(s.task_completions, today).days } };
}

export interface SendResult {
  ok: boolean;
  error?: AIError;
}

/**
 * Hỏi AI về tin nhắn người dùng vừa gửi (tin nhắn đã được lưu trước đó).
 * Thành công thì lưu câu trả lời, cập nhật những điều AI ghi nhớ.
 */
export async function askAssistant(userMsg: ChatMessage, mode: ChatMode, image: PreparedImage | null): Promise<SendResult> {
  const s = useStore.getState();
  const idx = s.chat_messages.findIndex((m) => m.id === userMsg.id);
  const history = s.chat_messages
    .slice(0, idx < 0 ? undefined : idx)
    .slice(-24)
    .map((m) => ({ role: m.role, content: m.content, image_note: m.meta?.image_note ?? '' }));
  try {
    const r = await askAI('chat', {
      mode,
      text: userMsg.content,
      image: image ? { mime: image.mime, data: image.data } : null,
      history,
      ...planSnapshot(),
    });
    const st = useStore.getState();
    if (r.image_note) st.update('chat_messages', userMsg.id, { meta: { ...userMsg.meta, image_note: r.image_note } });
    const known = new Set((st.profile?.ai_context ?? []).map((x) => x.toLowerCase()));
    const fresh = r.remember.filter((x) => !known.has(x.toLowerCase()));
    if (fresh.length) st.updateProfile({ ai_context: [...(st.profile?.ai_context ?? []), ...fresh].slice(-MEMORY_MAX) });
    st.insert('chat_messages', {
      role: 'ai',
      content: r.reply,
      meta: {
        actions: r.actions.length ? r.actions : undefined,
        actions_title: r.actions_title || undefined,
        quick_replies: r.quick_replies.length ? r.quick_replies : undefined,
        remembered: fresh.length ? fresh : undefined,
        ready: r.ready || undefined,
      },
    });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof AIError ? err : new AIError('failed', 'Trợ lý chưa trả lời được. Bạn thử lại sau nhé.') };
  }
}

/** Lưu tin nhắn của người dùng rồi hỏi AI */
export async function sendMessage(text: string, image: PreparedImage | null, mode: ChatMode): Promise<{ msg: ChatMessage | null } & SendResult> {
  const st = useStore.getState();
  const msg = st.insert('chat_messages', { role: 'user', content: text.trim().slice(0, 4000), meta: image ? { image: image.thumb } : {} });
  if (!msg) return { msg: null, ok: false };
  const res = await askAssistant(msg, mode, image);
  return { msg, ...res };
}

// ------------------------------------------------------------
// Thêm các đề xuất của AI vào kế hoạch
// ------------------------------------------------------------

/** Đề xuất nào cần đề xuất nào làm "cha" (để chọn con thì tự chọn cha, bỏ cha thì bỏ con) */
export function parentIndex(actions: ChatAction[], i: number): number {
  const p = actions[i]?.parent;
  if (!p || !/^new\d+$/.test(p)) return -1;
  return actions.findIndex((a) => a.ref === p);
}

export interface ApplySummary {
  visions: number;
  goals: number;
  tasks: number;
  steps: number;
  labels: number;
  events: number;
}

export function describeSummary(n: ApplySummary): string {
  const parts = [
    n.visions && `${n.visions} mục tiêu dài hạn`,
    n.goals && `${n.goals} mục tiêu 12 tuần`,
    n.tasks && `${n.tasks} đầu việc`,
    n.steps && `${n.steps} việc mỗi ngày`,
    n.labels && `${n.labels} nhãn 20/80`,
    n.events && `${n.events} lịch cố định`,
  ].filter(Boolean);
  return parts.join(', ');
}

export function applyActions(msg: ChatMessage, picked: number[]): ApplySummary | null {
  const st = useStore.getState();
  if (!st.gd5 && st.mode === 'cloud') {
    st.toast('Chủ app cần chạy file 005_v2.sql trong Supabase trước.', 'error');
    return null;
  }
  const actions = msg.meta.actions ?? [];
  const today = todayISO();
  const created = new Map<string, string>();
  const sum: ApplySummary = { visions: 0, goals: 0, tasks: 0, steps: 0, labels: 0, events: 0 };
  const done: number[] = [];
  const usedPlants: PlantSpecies[] = [];

  // Có mục tiêu 12 tuần mà chưa có chu kỳ thì mở chu kỳ bắt đầu từ thứ Hai tuần này
  let cycle = getActiveCycle(st.cycles);
  if (!cycle && picked.some((i) => actions[i]?.type === 'goal')) {
    const start = mondayOf(today);
    cycle = st.insert('cycles', { start_date: start, end_date: addDays(start, CYCLE_DAYS - 1), status: 'active' });
  }

  const idOf = (ref: string, table: 'visions' | 'goals' | 'tasks'): string | null => {
    if (!ref) return null;
    if (created.has(ref)) return created.get(ref)!;
    const s = useStore.getState();
    const rows = s[table] as { id: string }[];
    return rows.some((r) => r.id === ref) ? ref : null;
  };

  for (const i of [...picked].sort((a, b) => a - b)) {
    const a = actions[i];
    if (!a || msg.meta.applied?.includes(i)) continue;
    const s = useStore.getState();
    if (a.type === 'vision') {
      const row = s.insert('visions', { title: a.title, area: a.area, description: a.detail, sort: s.visions.length });
      if (row) {
        if (a.ref) created.set(a.ref, row.id);
        sum.visions++;
        done.push(i);
      }
    } else if (a.type === 'goal') {
      const visionId = idOf(a.parent, 'visions');
      if (!visionId || !cycle) continue;
      let due = a.date ?? cycle.end_date;
      if (due > cycle.end_date || due < cycle.start_date) due = cycle.end_date;
      const plant = nextPlant(s.goals, usedPlants);
      usedPlants.push(plant);
      const row = s.insert('goals', { cycle_id: cycle.id, vision_id: visionId, title: a.title, measure: a.detail, due_date: due, plant, status: 'active', sort: s.goals.length });
      if (row) {
        if (a.ref) created.set(a.ref, row.id);
        sum.goals++;
        done.push(i);
      }
    } else if (a.type === 'task') {
      const goalId = a.parent ? idOf(a.parent, 'goals') : null;
      if (a.parent && !goalId) continue;
      const row = s.insert('tasks', {
        goal_id: goalId,
        title: a.title,
        kind: a.kind,
        weekdays: a.kind === 'recurring' ? a.weekdays : [],
        due_date: a.kind === 'once' ? a.date : null,
        estimate_min: a.estimate_min || 30,
        leverage: a.leverage,
        leverage_reason: a.reason,
        leverage_source: 'ai',
        important: false,
        done_at: null,
        archived_at: null,
      });
      if (row) {
        if (a.ref) created.set(a.ref, row.id);
        sum.tasks++;
        done.push(i);
      }
    } else if (a.type === 'step') {
      const parentId = idOf(a.parent, 'tasks');
      const parent = parentId ? useStore.getState().tasks.find((t) => t.id === parentId) : undefined;
      if (!parent) continue;
      const row = s.insert('tasks', {
        goal_id: parent.goal_id,
        parent_id: parent.id,
        title: a.title,
        kind: 'once',
        weekdays: [],
        due_date: a.date && a.date >= today ? a.date : today,
        estimate_min: a.estimate_min || 25,
        leverage: parent.leverage,
        leverage_reason: '',
        leverage_source: 'ai',
        important: false,
        done_at: null,
        archived_at: null,
      });
      if (row) {
        sum.steps++;
        done.push(i);
      }
    } else if (a.type === 'label') {
      const task = s.tasks.find((t) => t.id === a.parent);
      if (!task) continue;
      s.update('tasks', task.id, { leverage: a.leverage, leverage_reason: a.reason, leverage_source: 'ai' });
      for (const c of s.tasks.filter((t) => t.parent_id === task.id)) s.update('tasks', c.id, { leverage: a.leverage });
      sum.labels++;
      done.push(i);
    } else if (a.type === 'event') {
      let n = 0;
      for (const wd of a.weekdays) {
        const dup = useStore.getState().fixed_events.some((e) => e.weekday === wd && e.start_min === a.start_min && e.title.toLowerCase() === a.title.toLowerCase());
        if (dup) continue;
        if (s.insert('fixed_events', { title: a.title, weekday: wd, start_min: a.start_min, end_min: a.end_min, color: /làm|ca|việc|thực tập/i.test(a.title) ? 'orange' : 'blue' })) n++;
      }
      sum.events++;
      done.push(i);
      void n;
    }
  }

  if (done.length) {
    const fresh = useStore.getState().chat_messages.find((m) => m.id === msg.id) ?? msg;
    st.update('chat_messages', msg.id, { meta: { ...fresh.meta, applied: [...new Set([...(fresh.meta.applied ?? []), ...done])] } });
  }
  const skipped = picked.length - done.length;
  if (skipped > 0) st.toast(`Có ${skipped} mục chưa thêm được vì thiếu mục cha (hãy chọn cả mục tiêu/đầu việc chứa nó).`);
  return sum;
}
