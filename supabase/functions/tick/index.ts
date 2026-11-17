// ============================================================
// KAIROS · Edge Function "tick" (giai đoạn 4): thông báo và nhắc việc
//
// Cách tạo: Supabase → Edge Functions → Deploy a new function → Via Editor
//           → đặt tên đúng là  tick  → xóa code mẫu, dán TOÀN BỘ file này → Deploy.
//           Sau đó tắt "Verify JWT" (giống function ai).
// Không bắt buộc secret nào. Tùy chọn:
//   VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY  (nếu muốn tự đặt cặp khóa; không có thì function tự tạo và lưu)
//   VAPID_SUBJECT                          (mailto:… hoặc https://…, mặc định là địa chỉ app)
//
// Function này làm 3 việc:
// 1. Cron gọi mỗi 15 phút (004_gd4.sql): tạo tóm tắt buổi sáng, nhắc deadline 7/3/1 ngày,
//    nhắc viết nhật ký, lưu vào bảng notifications (chuông trong app) và gửi Web Push.
// 2. App gọi (có đăng nhập): lấy khóa công khai, đăng ký / hủy thiết bị nhận thông báo, gửi thử.
// 3. Mở địa chỉ function bằng trình duyệt (GET): xem nhanh tình trạng cài đặt.
//
// Mọi nội dung thông báo làm bằng quy tắc, không dùng AI.
// Web Push được mã hóa theo chuẩn RFC 8291 (aes128gcm) + VAPID (RFC 8292) bằng WebCrypto,
// không cần thư viện ngoài.
// ============================================================

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = (Deno.env.get('SUPABASE_URL') ?? '').replace(/\/+$/, '');
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || secretFromJson(Deno.env.get('SUPABASE_SECRET_KEYS'));
const ENV_VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY')?.trim() ?? '';
const ENV_VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')?.trim() ?? '';
const ENV_VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')?.trim() ?? '';
const DEFAULT_TZ = 'Asia/Ho_Chi_Minh';

function secretFromJson(raw: string | undefined): string {
  try {
    const obj = JSON.parse(raw ?? '{}');
    return obj.default ?? Object.values(obj)[0] ?? '';
  } catch {
    return '';
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' } });
const text = (body: string, status = 200) => new Response(body, { status, headers: { ...CORS, 'Content-Type': 'text/plain; charset=utf-8' } });

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const cut = (s: string, max: number) => (s.length > max ? s.slice(0, max - 1).trimEnd() + '…' : s);

// ------------------------------------------------------------
// Ngày giờ theo múi giờ của từng người
// ------------------------------------------------------------
const WD_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];
const toDate = (iso: string) => new Date(iso + 'T00:00:00Z');
const addDays = (iso: string, n: number) => new Date(toDate(iso).getTime() + n * 86400000).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86400000);
const isoWeekday = (iso: string) => ((toDate(iso).getUTCDay() + 6) % 7) + 1;
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Ngày (yyyy-mm-dd) và số phút từ 0h ở múi giờ tz */
export function localNow(tz: string, now = new Date()): { date: string; min: number } {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  } catch {
    return localNow(DEFAULT_TZ, now);
  }
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, min: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

// ------------------------------------------------------------
// Cài đặt nhắc (profiles.settings.notify), có giá trị mặc định
// ------------------------------------------------------------
interface NotifySettings {
  morning: boolean;
  morning_min: number;
  journal: boolean;
  journal_min: number;
  deadline: boolean;
}
export function notifySettings(settings: unknown): NotifySettings {
  const n = isObj(settings) && isObj(settings.notify) ? settings.notify : {};
  const time = (v: unknown, def: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 1440 ? Math.round(v) : def);
  return {
    morning: n.morning !== false,
    morning_min: time(n.morning_min, 7 * 60),
    journal: n.journal !== false,
    journal_min: time(n.journal_min, 21 * 60 + 30),
    deadline: n.deadline !== false,
  };
}
/** Nhắc được gửi trong vòng 3 tiếng kể từ giờ đã chọn (phòng khi cron trễ), không qua nửa đêm */
const WINDOW_MIN = 180;
export const inWindow = (now: number, at: number) => now >= at && now < Math.min(1440, at + WINDOW_MIN);

// ------------------------------------------------------------
// Việc của một ngày (giống itemsForDate trong src/lib/logic.ts)
// ------------------------------------------------------------
interface Cycle { id: string; user_id: string; start_date: string; end_date: string; status: string }
interface Goal { id: string; user_id: string; cycle_id: string; title: string; status: string }
interface Task {
  id: string; user_id: string; goal_id: string | null; title: string; kind: 'recurring' | 'once'; weekdays: number[];
  due_date: string | null; leverage: 'high' | 'normal'; important: boolean; done_at: string | null; archived_at: string | null; created_at: string;
}
interface Completion { task_id: string; user_id: string; date: string }
interface Block { task_id: string; user_id: string; date: string; start_min: number | null }
interface UserData { cycle: Cycle | null; goals: Map<string, Goal>; tasks: Task[]; completions: Completion[]; blocks: Block[] }
interface DayItem { task: Task; goal: Goal | null; done: boolean; start: number | null; overdue: boolean }

function liveGoal(task: Task, d: UserData): Goal | null | undefined {
  if (task.archived_at) return undefined;
  if (!task.goal_id) return null;
  const g = d.goals.get(task.goal_id);
  if (!g || g.status !== 'active') return undefined;
  if (d.cycle && g.cycle_id !== d.cycle.id) return undefined;
  return g;
}

function dayItems(d: UserData, date: string): DayItem[] {
  const wd = isoWeekday(date);
  const out: DayItem[] = [];
  for (const task of d.tasks) {
    const goal = liveGoal(task, d);
    if (goal === undefined) continue;
    const block = d.blocks.find((b) => b.task_id === task.id && b.date === date) ?? null;
    if (task.kind === 'recurring') {
      if (!(task.weekdays ?? []).includes(wd) && !block) continue;
      if (date < task.created_at.slice(0, 10)) continue;
      if (d.cycle && goal && (date < d.cycle.start_date || date > d.cycle.end_date)) continue;
      const done = d.completions.some((c) => c.task_id === task.id && c.date === date);
      out.push({ task, goal, done, start: block?.start_min ?? null, overdue: false });
    } else {
      const done = !!task.done_at;
      if (done) {
        if (!d.completions.some((c) => c.task_id === task.id && c.date === date)) continue;
      } else if (!block && !(task.due_date && task.due_date <= addDays(date, 1))) continue;
      out.push({ task, goal, done, start: block?.start_min ?? null, overdue: !done && !!task.due_date && task.due_date < date });
    }
  }
  return out.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.task.leverage !== b.task.leverage) return a.task.leverage === 'high' ? -1 : 1;
    const da = a.task.due_date ?? '9999';
    const db = b.task.due_date ?? '9999';
    if (da !== db) return da.localeCompare(db);
    return (a.start ?? 9999) - (b.start ?? 9999);
  });
}

// ------------------------------------------------------------
// Nội dung từng loại thông báo
// ------------------------------------------------------------
interface NewNote { user_id: string; kind: string; title: string; body: string; url: string; dedupe_key: string }

export function morningNote(uid: string, d: UserData, date: string): NewNote {
  const items = dayItems(d, date);
  const open = items.filter((i) => !i.done);
  const highs = open.filter((i) => i.task.leverage === 'high').length;
  const dueToday = open.filter((i) => i.task.kind === 'once' && i.task.due_date === date).length;
  const overdue = open.filter((i) => i.overdue).length;
  const base = { user_id: uid, kind: 'morning', url: '/', dedupe_key: `morning:${date}` };
  if (open.length === 0) {
    return {
      ...base,
      title: '☀️ Chào buổi sáng',
      body: items.length ? 'Việc hôm nay đã xong hết rồi. Một ngày nhẹ nhàng nhé!' : 'Hôm nay chưa có việc nào trong kế hoạch. Mở Kairos chọn 1–2 việc 20% để bắt đầu nhé.',
    };
  }
  // Gợi ý việc đầu tiên: việc đã xếp giờ sớm nhất, không có thì việc ưu tiên nhất
  const timed = open.filter((i) => i.start != null).sort((a, b) => a.start! - b.start!);
  const first = timed[0] ?? open[0];
  const parts = [`Bắt đầu với “${cut(first.task.title, 60)}”${first.start != null ? ` lúc ${hm(first.start)}` : ''}.`];
  if (dueToday) parts.push(`${dueToday} việc hạn hôm nay.`);
  if (overdue) parts.push(`${overdue} việc đã trễ hạn.`);
  return {
    ...base,
    title: `☀️ Hôm nay có ${open.length} việc${highs ? ` · ${highs} việc 20%` : ''}`,
    body: parts.join(' '),
  };
}

const DEADLINE_DAYS = [7, 3, 1];
export function deadlineNotes(uid: string, d: UserData, date: string): NewNote[] {
  const out: NewNote[] = [];
  for (const task of d.tasks) {
    if (!task.important || task.kind !== 'once' || task.done_at || !task.due_date) continue;
    const goal = liveGoal(task, d);
    if (goal === undefined) continue;
    const n = diffDays(date, task.due_date);
    if (!DEADLINE_DAYS.includes(n)) continue;
    const extra = [
      `Hạn ${WD_LONG[isoWeekday(task.due_date) - 1]}, ${dm(task.due_date)}.`,
      task.leverage === 'high' ? 'Đây là việc 20%.' : '',
      goal ? `Mục tiêu: ${cut(goal.title, 60)}.` : '',
    ].filter(Boolean);
    out.push({
      user_id: uid,
      kind: 'deadline',
      title: n === 1 ? `⏰ Ngày mai hết hạn: ${cut(task.title, 60)}` : `⏰ Còn ${n} ngày: ${cut(task.title, 60)}`,
      body: extra.join(' '),
      url: '/muc-tieu',
      dedupe_key: `deadline:${task.id}:${task.due_date}:${n}`,
    });
  }
  return out;
}

export function journalNote(uid: string, date: string, askReview: boolean): NewNote {
  return {
    user_id: uid,
    kind: 'journal',
    title: '🌙 Hôm nay của bạn thế nào?',
    body: 'Dành 1 phút ghi lại năng lượng, việc đã làm được và điều muốn làm tốt hơn ngày mai.' + (askReview ? ' Cuối tuần rồi, nhìn lại tuần luôn nhé.' : ''),
    url: askReview ? '/tong-quan/tuan' : '/tong-quan/nhat-ky',
    dedupe_key: `journal:${date}`,
  };
}

// ------------------------------------------------------------
// base64url và Web Push (RFC 8291 + RFC 8292) bằng WebCrypto
// ------------------------------------------------------------
const enc = new TextEncoder();
type Bytes = Uint8Array<ArrayBuffer>;
function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64u(s: string): Bytes {
  const t = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, len: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

/** Mã hóa nội dung theo aes128gcm (một bản ghi) cho thiết bị có khóa p256dh + auth */
export async function encryptPush(p256dh: string, authSecret: string, payload: Uint8Array): Promise<Bytes> {
  const uaPublic = unb64u(p256dh);
  const auth = unb64u(authSecret);
  if (uaPublic.length !== 65 || auth.length < 16) throw new Error('Khóa thiết bị không hợp lệ');
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256));
  const ikm = await hkdf(auth, shared, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, concat(payload, new Uint8Array([2]))));
  const header = new Uint8Array(16 + 4 + 1 + asPublic.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, 4096);
  header[20] = asPublic.length;
  header.set(asPublic, 21);
  return concat(header, cipher);
}

export interface Vapid {
  publicKey: string;
  key: CryptoKey;
  subject: string;
}

/** Tạo cặp khóa VAPID mới (P-256). Trả về khóa công khai dạng thô 65 byte và khóa bí mật d, đều base64url. */
export async function generateVapid(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return { publicKey: b64u(raw), privateKey: jwk.d! };
}

export async function importVapid(publicKey: string, privateKey: string, subject: string): Promise<Vapid> {
  const raw = unb64u(publicKey);
  if (raw.length !== 65 || raw[0] !== 4) throw new Error('VAPID_PUBLIC_KEY không hợp lệ');
  const key = await crypto.subtle.importKey(
    'jwk',
    { kty: 'EC', crv: 'P-256', x: b64u(raw.slice(1, 33)), y: b64u(raw.slice(33, 65)), d: privateKey, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  return { publicKey, key, subject };
}

const jwtCache = new Map<string, { value: string; exp: number }>();
export async function vapidHeader(endpoint: string, v: Vapid): Promise<string> {
  const aud = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  const hit = jwtCache.get(aud + v.publicKey);
  if (hit && hit.exp - now > 3600) return `vapid t=${hit.value}, k=${v.publicKey}`;
  const exp = now + 12 * 3600;
  const unsigned = `${b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))}.${b64u(enc.encode(JSON.stringify({ aud, exp, sub: v.subject })))}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, v.key, enc.encode(unsigned)));
  const value = `${unsigned}.${b64u(sig)}`;
  jwtCache.set(aud + v.publicKey, { value, exp });
  return `vapid t=${value}, k=${v.publicKey}`;
}

// Chỉ gửi tới máy chủ push thật của các trình duyệt (không cho gửi tới địa chỉ lạ)
const PUSH_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)mozilla\.com$/, /(^|\.)mozaws\.net$/, /(^|\.)notify\.windows\.com$/];
export function validEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

interface Sub { id: string; user_id: string; endpoint: string; p256dh: string; auth: string }
interface PushResult { ok: boolean; status: number; gone: boolean }

async function sendPush(sub: Sub, payload: Obj, v: Vapid, ttl: number): Promise<PushResult> {
  if (!validEndpoint(sub.endpoint)) return { ok: false, status: 0, gone: true };
  try {
    const body = await encryptPush(sub.p256dh, sub.auth, enc.encode(JSON.stringify(payload)));
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidHeader(sub.endpoint, v),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        TTL: String(ttl),
        Urgency: 'normal',
      },
      body,
      signal: ctrl.signal,
    }).finally(() => clearTimeout(timer));
    await res.body?.cancel();
    return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
  } catch (err) {
    console.error('[tick] push lỗi', sub.endpoint.slice(0, 60), err);
    return { ok: false, status: 0, gone: false };
  }
}

// ------------------------------------------------------------
// Cấu hình server (bảng kairos_config, 004_gd4.sql)
// ------------------------------------------------------------
interface Config {
  tick_secret: string;
  base_url: string | null;
  app_url: string | null;
  vapid_public: string | null;
  vapid_private: string | null;
  last_tick_at: string | null;
  last_tick_note: string;
}

class SetupError extends Error {}

async function readConfig(db: SupabaseClient): Promise<Config> {
  const { data, error } = await db.from('kairos_config').select('*').eq('id', true).maybeSingle();
  if (error || !data) {
    console.error('[tick] đọc kairos_config', error);
    throw new SetupError('Chưa chạy file SQL 004_gd4.sql trong Supabase.');
  }
  return data as Config;
}

/** Ghi địa chỉ project (để cron gọi được) và địa chỉ app (làm "người gửi" thông báo) nếu còn thiếu */
async function register(db: SupabaseClient, cfg: Config, origin: string | null) {
  const patch: Obj = {};
  if (SUPABASE_URL.startsWith('https://') && cfg.base_url !== SUPABASE_URL) patch.base_url = SUPABASE_URL;
  if (!cfg.app_url && origin && /^https:\/\/[^/]+$/.test(origin)) patch.app_url = origin;
  if (Object.keys(patch).length) {
    await db.from('kairos_config').update(patch).eq('id', true);
    Object.assign(cfg, patch);
  }
}

let vapidCache: Vapid | null = null;
async function getVapid(db: SupabaseClient, cfg: Config): Promise<Vapid> {
  if (vapidCache) return vapidCache;
  const subject = ENV_VAPID_SUBJECT || cfg.app_url || SUPABASE_URL || 'mailto:kairos@localhost';
  if (ENV_VAPID_PUBLIC && ENV_VAPID_PRIVATE) {
    vapidCache = await importVapid(ENV_VAPID_PUBLIC, ENV_VAPID_PRIVATE, subject);
    return vapidCache;
  }
  if (!cfg.vapid_public || !cfg.vapid_private) {
    // Lần đầu: tự tạo cặp khóa. Chỉ ghi khi chưa có (hai lời gọi cùng lúc cũng không ghi đè nhau).
    const k = await generateVapid();
    await db.from('kairos_config').update({ vapid_public: k.publicKey, vapid_private: k.privateKey }).eq('id', true).is('vapid_public', null);
    const fresh = await readConfig(db);
    cfg.vapid_public = fresh.vapid_public;
    cfg.vapid_private = fresh.vapid_private;
  }
  vapidCache = await importVapid(cfg.vapid_public!, cfg.vapid_private!, subject);
  return vapidCache;
}

// ------------------------------------------------------------
// Lưu thông báo vào chuông trong app rồi gửi tới các thiết bị
// ------------------------------------------------------------
const TTL: Record<string, number> = { morning: 3 * 3600, journal: 3 * 3600, deadline: 12 * 3600, test: 600 };

async function deliver(db: SupabaseClient, v: Vapid | null, notes: NewNote[]) {
  const stats = { created: 0, sent: 0, failed: 0, removed: 0 };
  if (!notes.length) return stats;
  // Mỗi dedupe_key chỉ tạo một lần (cột unique), lần sau bị bỏ qua: không bao giờ nhắc trùng
  const { data: created, error } = await db
    .from('notifications')
    .upsert(notes, { onConflict: 'user_id,dedupe_key', ignoreDuplicates: true })
    .select('id,user_id,kind,title,body,url,dedupe_key');
  if (error) throw error;
  stats.created = created?.length ?? 0;
  if (!created?.length || !v) return stats;

  const users = [...new Set(created.map((n) => n.user_id))];
  const { data: subs, error: subErr } = await db.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth').in('user_id', users);
  if (subErr) throw subErr;
  const gone: string[] = [];
  await Promise.all(
    created.flatMap((n) =>
      (subs ?? [])
        .filter((s) => s.user_id === n.user_id)
        .map(async (s) => {
          const r = await sendPush(s, { id: n.id, title: n.title, body: n.body, url: n.url, tag: n.dedupe_key, kind: n.kind }, v, TTL[n.kind] ?? 3600);
          if (r.ok) stats.sent++;
          else {
            stats.failed++;
            if (r.gone) gone.push(s.id);
            else console.warn('[tick] máy chủ push trả về', r.status, s.endpoint.slice(0, 60));
          }
        }),
    ),
  );
  if (gone.length) {
    await db.from('push_subscriptions').delete().in('id', [...new Set(gone)]);
    stats.removed = new Set(gone).size;
  }
  return stats;
}

// ------------------------------------------------------------
// Nhịp 15 phút
// ------------------------------------------------------------
async function inChunks<T>(ids: string[], q: (chunk: string[]) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await q(ids.slice(i, i + 100));
    if (error) throw error;
    out.push(...(data ?? []));
  }
  return out;
}

export async function runTick(db: SupabaseClient, cfg: Config) {
  const now = new Date();
  const { data: profiles, error } = await db.from('profiles').select('id,timezone,settings').not('onboarded_at', 'is', null);
  if (error) throw error;

  const morningUsers: { id: string; date: string; deadline: boolean; morning: boolean }[] = [];
  const journalUsers: { id: string; date: string }[] = [];
  for (const p of profiles ?? []) {
    const s = notifySettings(p.settings);
    const { date, min } = localNow(p.timezone || DEFAULT_TZ, now);
    if ((s.morning || s.deadline) && inWindow(min, s.morning_min)) morningUsers.push({ id: p.id, date, morning: s.morning, deadline: s.deadline });
    if (s.journal && inWindow(min, s.journal_min)) journalUsers.push({ id: p.id, date });
  }

  // Những nhắc hôm nay đã gửi rồi thì bỏ qua (đỡ phải tải dữ liệu)
  const keys = [...morningUsers.map((u) => `morning:${u.date}`), ...journalUsers.map((u) => `journal:${u.date}`)];
  const ids = [...new Set([...morningUsers, ...journalUsers].map((u) => u.id))];
  const sent = new Set<string>();
  if (ids.length) {
    const rows = await inChunks<{ user_id: string; dedupe_key: string }>(ids, (c) =>
      db.from('notifications').select('user_id,dedupe_key').in('user_id', c).in('dedupe_key', [...new Set(keys)]),
    );
    for (const r of rows) sent.add(`${r.user_id}|${r.dedupe_key}`);
  }
  // Tóm tắt sáng mỗi ngày một lần; deadline vẫn được xét suốt khung giờ sáng
  // (việc vừa bật "Deadline quan trọng" sau giờ tóm tắt vẫn được nhắc, mỗi mốc 7/3/1 một lần)
  const mUsers = morningUsers
    .map((u) => ({ ...u, morning: u.morning && !sent.has(`${u.id}|morning:${u.date}`) }))
    .filter((u) => u.morning || u.deadline);
  const jUsers = journalUsers.filter((u) => !sent.has(`${u.id}|journal:${u.date}`));
  const notes: NewNote[] = [];

  // Tóm tắt sáng + deadline: cần việc, mục tiêu, chu kỳ, lịch hôm nay
  if (mUsers.length) {
    const mIds = mUsers.map((u) => u.id);
    const dates = mUsers.map((u) => u.date).sort();
    const [cycles, goals, tasks, comps, blocks] = await Promise.all([
      inChunks<Cycle>(mIds, (c) => db.from('cycles').select('id,user_id,start_date,end_date,status').in('user_id', c).eq('status', 'active')),
      inChunks<Goal>(mIds, (c) => db.from('goals').select('id,user_id,cycle_id,title,status').in('user_id', c).eq('status', 'active')),
      inChunks<Task>(mIds, (c) =>
        db.from('tasks').select('id,user_id,goal_id,title,kind,weekdays,due_date,leverage,important,done_at,archived_at,created_at').in('user_id', c).is('archived_at', null),
      ),
      inChunks<Completion>(mIds, (c) => db.from('task_completions').select('task_id,user_id,date').in('user_id', c).gte('date', dates[0]).lte('date', dates[dates.length - 1])),
      inChunks<Block>(mIds, (c) => db.from('schedule_blocks').select('task_id,user_id,date,start_min').in('user_id', c).gte('date', dates[0]).lte('date', dates[dates.length - 1])),
    ]);
    for (const u of mUsers) {
      const cycle = cycles.filter((c) => c.user_id === u.id).sort((a, b) => b.start_date.localeCompare(a.start_date))[0] ?? null;
      const d: UserData = {
        cycle,
        goals: new Map(goals.filter((g) => g.user_id === u.id).map((g) => [g.id, g])),
        tasks: tasks.filter((t) => t.user_id === u.id),
        completions: comps.filter((c) => c.user_id === u.id),
        blocks: blocks.filter((b) => b.user_id === u.id),
      };
      if (u.morning) notes.push(morningNote(u.id, d, u.date));
      if (u.deadline) notes.push(...deadlineNotes(u.id, d, u.date));
    }
  }

  // Nhắc nhật ký: chỉ khi hôm nay chưa viết. Chủ nhật nhắc thêm nhìn lại tuần nếu chưa làm.
  if (jUsers.length) {
    const jIds = jUsers.map((u) => u.id);
    const dates = jUsers.map((u) => u.date).sort();
    const [journals, reviews] = await Promise.all([
      inChunks<{ user_id: string; date: string }>(jIds, (c) => db.from('journals').select('user_id,date').in('user_id', c).gte('date', dates[0]).lte('date', dates[dates.length - 1])),
      inChunks<{ user_id: string; week_start: string; ai_review: unknown }>(jIds, (c) =>
        db.from('weekly_reviews').select('user_id,week_start,ai_review').in('user_id', c).gte('week_start', addDays(dates[0], -7)),
      ),
    ]);
    for (const u of jUsers) {
      if (journals.some((j) => j.user_id === u.id && j.date === u.date)) continue;
      const sunday = isoWeekday(u.date) === 7;
      const monday = addDays(u.date, 1 - isoWeekday(u.date));
      const reviewed = reviews.some((r) => r.user_id === u.id && r.week_start === monday);
      notes.push(journalNote(u.id, u.date, sunday && !reviewed));
    }
  }

  let vapid: Vapid | null = null;
  try {
    if (notes.length) vapid = await getVapid(db, cfg);
  } catch (err) {
    console.error('[tick] khóa VAPID lỗi, chỉ lưu vào chuông trong app', err);
  }
  const stats = await deliver(db, vapid, notes);
  const note = `${profiles?.length ?? 0} người dùng · ${stats.created} thông báo mới · gửi được ${stats.sent}${stats.failed ? `, lỗi ${stats.failed}` : ''}${stats.removed ? `, bỏ ${stats.removed} thiết bị cũ` : ''}`;
  await db.from('kairos_config').update({ last_tick_at: now.toISOString(), last_tick_note: note }).eq('id', true);
  return { ...stats, users: profiles?.length ?? 0, note };
}

// ------------------------------------------------------------
// Các yêu cầu từ app (đã đăng nhập)
// ------------------------------------------------------------
const tickHealthy = (cfg: Config) => !!cfg.last_tick_at && Date.now() - new Date(cfg.last_tick_at).getTime() < 40 * 60_000;

async function handleApp(db: SupabaseClient, cfg: Config, uid: string, body: Obj) {
  const action = body.action;

  if (action === 'config') {
    const v = await getVapid(db, cfg);
    return { publicKey: v.publicKey, lastTick: cfg.last_tick_at, tickOk: tickHealthy(cfg) };
  }

  if (action === 'subscribe') {
    const sub = isObj(body.subscription) ? body.subscription : {};
    const keys = isObj(sub.keys) ? sub.keys : {};
    const endpoint = str(sub.endpoint, 1000);
    const p256dh = str(keys.p256dh, 200);
    const auth = str(keys.auth, 100);
    if (!validEndpoint(endpoint) || !p256dh || !auth) return { error: 'Thiết bị này không hỗ trợ thông báo của Kairos.' };
    // Cùng một thiết bị chuyển sang tài khoản khác: dòng cũ được chuyển cho tài khoản mới
    const { error } = await db
      .from('push_subscriptions')
      .upsert({ user_id: uid, endpoint, p256dh, auth, user_agent: str(body.ua, 300) }, { onConflict: 'endpoint' });
    if (error) throw error;
    const { count } = await db.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    return { devices: count ?? 1 };
  }

  if (action === 'unsubscribe') {
    const endpoint = str(body.endpoint, 1000);
    if (endpoint) await db.from('push_subscriptions').delete().eq('user_id', uid).eq('endpoint', endpoint);
    return { removed: true };
  }

  if (action === 'test') {
    const v = await getVapid(db, cfg);
    const { count } = await db.from('push_subscriptions').select('id', { count: 'exact', head: true }).eq('user_id', uid);
    const minute = new Date().toISOString().slice(0, 16);
    const stats = await deliver(db, v, [
      {
        user_id: uid,
        kind: 'test',
        title: '🌱 Kairos đã kết nối',
        body: 'Thông báo hoạt động rồi. Tóm tắt buổi sáng, nhắc nhật ký và nhắc deadline sẽ đến theo giờ bạn đã chọn.',
        url: '/cai-dat',
        dedupe_key: `test:${minute}`,
      },
    ]);
    if (!stats.created) return { error: 'Bạn vừa gửi thử rồi, chờ một phút rồi thử lại nhé.' };
    return { devices: count ?? 0, sent: stats.sent, failed: stats.failed };
  }

  return { error: 'Yêu cầu không hợp lệ.' };
}

// ------------------------------------------------------------
// Trang tình trạng (mở bằng trình duyệt)
// ------------------------------------------------------------
async function statusPage(db: SupabaseClient): Promise<string> {
  const lines = ['Kairos · Edge Function "tick" (giai đoạn 4)', ''];
  let cfg: Config;
  try {
    cfg = await readConfig(db);
  } catch {
    return [...lines, '✗ Chưa chạy file SQL 004_gd4.sql. Chạy file đó trong SQL Editor rồi tải lại trang này.'].join('\n');
  }
  await register(db, cfg, null);
  lines.push('✓ Đã chạy 004_gd4.sql');
  lines.push(cfg.base_url ? `✓ Cron sẽ gọi: ${cfg.base_url}/functions/v1/tick` : '✗ Chưa ghi được địa chỉ project');
  try {
    const v = await getVapid(db, cfg);
    lines.push(`✓ Khóa VAPID: ${ENV_VAPID_PUBLIC ? 'lấy từ Secrets' : 'function tự tạo và lưu trong kairos_config'} (${v.publicKey.slice(0, 12)}…)`);
  } catch (err) {
    lines.push(`✗ Khóa VAPID lỗi: ${err instanceof Error ? err.message : err}`);
  }
  if (cfg.last_tick_at) {
    const ago = Math.round((Date.now() - new Date(cfg.last_tick_at).getTime()) / 60_000);
    lines.push(`${tickHealthy(cfg) ? '✓' : '✗'} Cron chạy lần gần nhất ${ago} phút trước: ${cfg.last_tick_note}`);
    if (!tickHealthy(cfg)) lines.push('  → Quá 40 phút chưa chạy: kiểm tra Integrations → Cron → job "kairos-tick".');
  } else lines.push('… Cron chưa chạy lần nào. Chờ tối đa 15 phút rồi tải lại trang này.');
  const { count } = await db.from('push_subscriptions').select('id', { count: 'exact', head: true });
  lines.push(`• Số thiết bị đã bật thông báo: ${count ?? 0}`);
  return lines.join('\n');
}

// ------------------------------------------------------------
// Điểm vào
// ------------------------------------------------------------
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (!SERVICE_KEY) return json({ ok: false, code: 'not_setup', message: 'Function thiếu khóa Supabase của server.' });
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  if (req.method === 'GET') return text(await statusPage(db));
  if (req.method !== 'POST') return json({ ok: false, code: 'bad_request', message: 'Chỉ nhận GET hoặc POST.' }, 405);

  let cfg: Config;
  try {
    cfg = await readConfig(db);
  } catch (err) {
    return json({ ok: false, code: 'not_setup', message: err instanceof Error ? err.message : 'Chưa cài đặt xong.' });
  }

  // 1. Cron (có mã bí mật trong header)
  const tickSecret = req.headers.get('x-kairos-tick');
  if (tickSecret !== null) {
    if (tickSecret !== cfg.tick_secret) return json({ ok: false, code: 'auth', message: 'Sai mã cron.' }, 401);
    await register(db, cfg, null);
    try {
      const result = await runTick(db, cfg);
      return json({ ok: true, data: result });
    } catch (err) {
      console.error('[tick] lỗi', err);
      await db.from('kairos_config').update({ last_tick_at: new Date().toISOString(), last_tick_note: `Lỗi: ${err instanceof Error ? err.message : String(err)}`.slice(0, 300) }).eq('id', true);
      return json({ ok: false, code: 'failed', message: 'Nhịp nhắc gặp lỗi.' }, 500);
    }
  }

  // 2. App (cần đăng nhập)
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: userData, error: authErr } = token ? await db.auth.getUser(token) : { data: { user: null }, error: null };
  const uid = userData?.user?.id;
  if (authErr || !uid) return json({ ok: false, code: 'auth', message: 'Phiên đăng nhập đã hết hạn. Bạn đăng nhập lại nhé.' }, 401);

  let body: Obj;
  try {
    const parsed = await req.json();
    body = isObj(parsed) ? parsed : {};
  } catch {
    return json({ ok: false, code: 'bad_request', message: 'Yêu cầu không hợp lệ.' }, 400);
  }

  try {
    await register(db, cfg, req.headers.get('Origin'));
    const data = (await handleApp(db, cfg, uid, body)) as Obj;
    if (typeof data.error === 'string') return json({ ok: false, code: 'bad_request', message: data.error });
    return json({ ok: true, data });
  } catch (err) {
    console.error('[tick]', body.action, err);
    return json({ ok: false, code: 'failed', message: 'Máy chủ thông báo gặp lỗi. Bạn thử lại sau nhé.' });
  }
});
