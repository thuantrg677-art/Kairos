// Web Push (giai đoạn 4): bật / tắt thông báo trên thiết bị này, gửi thử.
// Server là Edge Function "tick" (supabase/functions/tick). Khóa VAPID công khai lấy từ server,
// nên không phải cấu hình thêm biến môi trường nào trên Vercel.

import { create } from 'zustand';
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useStore } from './store';
import { isIOS, isStandalone } from './pwa';

/**
 * - demo: đang xem thử (cần tài khoản)
 * - dev: đang chạy "npm run dev" (không có service worker)
 * - unsupported: trình duyệt không hỗ trợ
 * - ios-install: iPhone/iPad chưa cài app vào màn hình chính
 * - denied: người dùng đã chặn thông báo
 * - not-setup: server chưa có function "tick" hoặc chưa chạy 004_gd4.sql
 * - off / on: thiết bị này chưa bật / đã bật
 */
export type PushState = 'checking' | 'demo' | 'dev' | 'unsupported' | 'ios-install' | 'denied' | 'not-setup' | 'offline' | 'off' | 'on';

interface PushStore {
  state: PushState;
  busy: boolean;
  /** Cron 15 phút có đang chạy không (null = chưa biết) */
  tickOk: boolean | null;
  message: string;
  check: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  test: () => Promise<void>;
}

const KEY_STORE = 'kairos-push-key';
const SYNC_STORE = 'kairos-push-sync';

class PushError extends Error {
  constructor(
    public code: 'not_setup' | 'offline' | 'auth' | 'failed' | 'bad_request',
    message: string,
  ) {
    super(message);
  }
}

interface Reply<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
}

async function callTick<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new PushError('not_setup', 'Chưa nối Supabase.');
  if (!navigator.onLine) throw new PushError('offline', 'Bạn đang offline.');
  const { data, error } = await supabase.functions.invoke('tick', { body: { action, ...payload } });
  let reply: Reply<T> | null = data as Reply<T> | null;
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const res = error.context as Response;
      reply = await res.json().catch(() => null);
      if (!reply && res.status === 404) throw new PushError('not_setup', 'Chưa tạo Edge Function "tick" trong Supabase.');
    } else if (error instanceof FunctionsRelayError || error instanceof FunctionsFetchError) {
      throw new PushError(navigator.onLine ? 'not_setup' : 'offline', navigator.onLine ? 'Không gọi được máy chủ thông báo.' : 'Bạn đang offline.');
    }
    if (!reply) throw new PushError('failed', 'Máy chủ thông báo chưa trả lời. Bạn thử lại sau nhé.');
  }
  if (!reply?.ok) throw new PushError((reply?.code as PushError['code']) ?? 'failed', reply?.message ?? 'Máy chủ thông báo gặp lỗi.');
  return reply.data as T;
}

/** Khóa VAPID dạng base64url → mảng byte (để đăng ký với trình duyệt) */
function keyBytes(b64: string): Uint8Array<ArrayBuffer> {
  const t = b64.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(t + '='.repeat((4 - (t.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function supported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

/** Chờ service worker sẵn sàng (tối đa 8 giây) */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  return Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 8000))]);
}

/** Tên ngắn của thiết bị để server dễ nhận biết (không chứa thông tin cá nhân) */
function deviceLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua) || isIOS() ? 'iOS' : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Khác';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Trình duyệt';
  return `${os} · ${br}${isStandalone() ? ' · app đã cài' : ''}`;
}

const syncTag = (endpoint: string) => `${useStore.getState().userId}|${endpoint}|${new Date().toISOString().slice(0, 10)}`;

async function sendSubscription(sub: PushSubscription, publicKey: string) {
  await callTick('subscribe', { subscription: sub.toJSON(), ua: deviceLabel() });
  localStorage.setItem(KEY_STORE, publicKey);
  localStorage.setItem(SYNC_STORE, syncTag(sub.endpoint));
}

const pushMessage = (state: PushState): string =>
  ({
    checking: '',
    demo: 'Thông báo cần đăng nhập tài khoản. Ở chế độ xem thử, chuông trong app có vài thông báo mẫu.',
    dev: 'Thông báo đẩy chỉ chạy ở bản đã deploy (Vercel) hoặc "npm run preview".',
    unsupported: 'Trình duyệt này chưa hỗ trợ thông báo đẩy. Bạn vẫn xem được thông báo ở biểu tượng chuông trong app.',
    'ios-install': 'Trên iPhone/iPad, cần cài Kairos vào màn hình chính (mục "Cài Kairos như một app" bên trên), rồi mở app từ biểu tượng đó để bật thông báo. Cần iOS 16.4 trở lên.',
    denied: 'Bạn đã chặn thông báo của Kairos. Mở cài đặt trang web (biểu tượng ổ khóa cạnh địa chỉ) hoặc cài đặt điện thoại để cho phép lại.',
    'not-setup': 'Máy chủ thông báo chưa được bật. Chủ app cần làm theo hướng dẫn giai đoạn 4. Bạn vẫn dùng app bình thường.',
    offline: 'Bạn đang offline. Có mạng lại là bật được.',
    off: 'Nhận tóm tắt buổi sáng, nhắc nhật ký và nhắc deadline ngay cả khi không mở app.',
    on: 'Thiết bị này đang nhận thông báo.',
  })[state];

export const usePush = create<PushStore>((set, get) => {
  const setState = (state: PushState, extra: Partial<PushStore> = {}) => set({ state, message: pushMessage(state), ...extra });

  const fail = (err: unknown) => {
    const e = err instanceof PushError ? err : new PushError('failed', 'Chưa bật được thông báo. Bạn thử lại sau nhé.');
    if (!(err instanceof PushError)) console.error('[Kairos] Push:', err);
    if (e.code === 'not_setup') setState('not-setup');
    useStore.getState().toast(e.message, e.code === 'failed' ? 'error' : 'info');
  };

  return {
    state: 'checking',
    busy: false,
    tickOk: null,
    message: '',

    check: async () => {
      const s = useStore.getState();
      if (s.mode !== 'cloud') return setState('demo');
      if (!supported()) return setState(isIOS() && !isStandalone() ? 'ios-install' : 'unsupported');
      if (!import.meta.env.PROD) return setState('dev');
      if (Notification.permission === 'denied') return setState('denied');
      const reg = await registration();
      const sub = reg ? await reg.pushManager.getSubscription().catch(() => null) : null;
      if (!s.online) return setState(sub ? 'on' : 'offline');
      try {
        const cfg = await callTick<{ publicKey: string; tickOk: boolean }>('config');
        set({ tickOk: cfg.tickOk });
        if (sub && Notification.permission === 'granted') {
          const knownKey = localStorage.getItem(KEY_STORE);
          if (knownKey && knownKey !== cfg.publicKey && reg) {
            // Server đã đổi khóa VAPID: đăng ký lại thiết bị bằng khóa mới
            await sub.unsubscribe().catch(() => undefined);
            const fresh = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.publicKey) });
            await sendSubscription(fresh, cfg.publicKey);
          } else if (localStorage.getItem(SYNC_STORE) !== syncTag(sub.endpoint)) {
            // Mỗi ngày nhắc server một lần rằng thiết bị này vẫn còn (phòng khi trình duyệt đổi địa chỉ nhận)
            await sendSubscription(sub, cfg.publicKey);
          }
          return setState('on');
        }
        setState('off');
      } catch (err) {
        if (err instanceof PushError && err.code === 'not_setup') return setState('not-setup');
        setState(sub ? 'on' : 'off');
      }
    },

    enable: async () => {
      if (get().busy) return;
      if (!supported()) return setState(isIOS() && !isStandalone() ? 'ios-install' : 'unsupported');
      set({ busy: true });
      try {
        // Hỏi quyền ngay khi bấm nút (Safari bắt buộc phải hỏi trong lúc người dùng bấm)
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setState(permission === 'denied' ? 'denied' : 'off');
          if (permission !== 'denied') useStore.getState().toast('Bạn chưa cho phép thông báo nên Kairos chưa bật được.', 'info');
          return;
        }
        const cfg = await callTick<{ publicKey: string; tickOk: boolean }>('config');
        set({ tickOk: cfg.tickOk });
        const reg = await registration();
        if (!reg) throw new PushError('failed', 'App chưa sẵn sàng. Tải lại trang rồi thử lại nhé.');
        let sub = await reg.pushManager.getSubscription();
        if (sub && localStorage.getItem(KEY_STORE) !== cfg.publicKey) {
          await sub.unsubscribe().catch(() => undefined);
          sub = null;
        }
        sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.publicKey) });
        await sendSubscription(sub, cfg.publicKey);
        setState('on');
        useStore.getState().toast('Đã bật thông báo trên thiết bị này 🔔', 'success');
      } catch (err) {
        fail(err);
      } finally {
        set({ busy: false });
      }
    },

    disable: async () => {
      if (get().busy) return;
      set({ busy: true });
      try {
        const reg = await registration();
        const sub = reg ? await reg.pushManager.getSubscription() : null;
        if (sub) {
          await callTick('unsubscribe', { endpoint: sub.endpoint }).catch(() => undefined);
          await sub.unsubscribe().catch(() => undefined);
        }
        localStorage.removeItem(SYNC_STORE);
        setState('off');
        useStore.getState().toast('Đã tắt thông báo trên thiết bị này. Chuông trong app vẫn hoạt động.', 'info');
      } finally {
        set({ busy: false });
      }
    },

    test: async () => {
      if (get().busy) return;
      set({ busy: true });
      try {
        const r = await callTick<{ devices: number; sent: number; failed: number }>('test');
        const st = useStore.getState();
        void st.refreshNotifications();
        if (r.sent > 0) st.toast(`Đã gửi thử tới ${r.sent} thiết bị. Thông báo sẽ hiện sau vài giây.`, 'success');
        else if (r.devices === 0) st.toast('Chưa có thiết bị nào bật thông báo. Thông báo thử chỉ hiện ở chuông trong app.', 'info');
        else st.toast('Gửi thử chưa tới được thiết bị. Thử tắt rồi bật lại thông báo nhé.', 'error');
      } catch (err) {
        fail(err);
      } finally {
        set({ busy: false });
      }
    },
  };
});

// Đăng xuất: hủy nhận thông báo trên thiết bị này để người sau dùng máy không thấy thông báo của bạn
// (server sẽ tự xóa thiết bị này ở lần gửi kế tiếp)
useStore.subscribe((s, prev) => {
  if (prev.mode === 'cloud' && s.status === 'signed-out' && supported()) {
    localStorage.removeItem(SYNC_STORE);
    void registration().then((reg) => reg?.pushManager.getSubscription().then((sub) => sub?.unsubscribe()).catch(() => undefined));
    usePush.setState({ state: 'checking', tickOk: null });
  }
});
