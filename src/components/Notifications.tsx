// Thông báo (giai đoạn 4): chuông trong app và phần "Thông báo" trong Cài đặt.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlarmClock, Bell, BellOff, BellRing, BookOpen, CheckCheck, Send, Settings as SettingsIcon, Sun } from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePush } from '@/lib/push';
import { addDays, hmToMin, minToHM, toISO, todayISO } from '@/lib/dates';
import { NOTIFY_DEFAULTS, type AppNotification, type NotifySettings } from '@/lib/types';
import { Button, cx, EmptyState, IconButton, Sheet, Switch } from './ui';

export const useUnreadCount = () => useStore((s) => s.notifications.filter((n) => !n.read_at).length);

const KIND_ICON: Record<string, ReactNode> = {
  morning: <Sun size={18} />,
  deadline: <AlarmClock size={18} />,
  journal: <BookOpen size={18} />,
  test: <BellRing size={18} />,
};

/** "07:00", "Hôm qua 21:30", "15/11 07:00" */
function timeLabel(iso: string): string {
  const d = new Date(iso);
  const day = toISO(d);
  const t = minToHM(d.getHours() * 60 + d.getMinutes());
  const today = todayISO();
  if (day === today) return t;
  if (day === addDays(today, -1)) return `Hôm qua ${t}`;
  return `${day.slice(8, 10)}/${day.slice(5, 7)} ${t}`;
}

/** Nút chuông có số thông báo chưa đọc */
export function NotificationBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCount();
  return (
    <>
      <IconButton label={`Thông báo${unread ? ` (${unread} chưa đọc)` : ''}`} onClick={() => setOpen(true)} className={cx('relative', className)}>
        <Bell size={22} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-onaccent">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </IconButton>
      <NotificationSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}

export function NotificationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const list = useStore((s) => s.notifications);
  const mode = useStore((s) => s.mode);
  const pushState = usePush((s) => s.state);
  const items = useMemo(() => [...list].sort((a, b) => b.created_at.localeCompare(a.created_at)), [list]);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    if (open) void useStore.getState().refreshNotifications();
  }, [open]);

  const openItem = (n: AppNotification) => {
    useStore.getState().markRead([n.id]);
    onClose();
    if (n.url && n.url !== window.location.pathname) navigate(n.url);
  };
  const goSettings = () => {
    onClose();
    navigate('/cai-dat#thong-bao');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Thông báo"
      footer={
        <>
          <Button variant="outline" className="flex-1" onClick={goSettings}>
            <SettingsIcon size={17} /> Cài đặt nhắc
          </Button>
          <Button variant="soft" className="flex-1" disabled={!unread} onClick={() => useStore.getState().markRead('all')}>
            <CheckCheck size={17} /> Đã đọc hết
          </Button>
        </>
      }
    >
      {mode === 'cloud' && pushState === 'off' && (
        <button type="button" onClick={goSettings} className="mb-3 flex w-full items-center gap-3 rounded-2xl bg-soft p-3 text-left">
          <BellRing size={20} className="shrink-0 text-primary" />
          <span className="text-sm leading-snug text-ink">
            <b>Bật thông báo trên thiết bị này</b> để nhận nhắc cả khi không mở Kairos.
          </span>
        </button>
      )}
      {items.length === 0 ? (
        <EmptyState art={<BellOff size={40} className="text-muted" />} title="Chưa có thông báo nào">
          Tóm tắt buổi sáng, nhắc viết nhật ký và nhắc deadline quan trọng sẽ hiện ở đây.
        </EmptyState>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {items.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => openItem(n)} className="flex w-full gap-3 rounded-2xl px-2 py-2.5 text-left transition hover:bg-surface2">
                <span className={cx('mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', n.read_at ? 'bg-surface2 text-muted' : 'bg-soft text-primary')}>
                  {KIND_ICON[n.kind] ?? <Bell size={18} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cx('min-w-0 flex-1 text-[15px] leading-snug', n.read_at ? 'font-medium text-ink' : 'font-bold text-ink')}>{n.title}</span>
                    <span className="shrink-0 text-xs text-muted tabular-nums">{timeLabel(n.created_at)}</span>
                  </span>
                  {n.body && <span className="mt-0.5 block text-[13px] leading-snug text-muted">{n.body}</span>}
                </span>
                {!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Chưa đọc" />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------
// Cài đặt → Thông báo
// ------------------------------------------------------------

function ReminderRow({ title, sub, on, onToggle, time, onTime }: { title: string; sub: string; on: boolean; onToggle: (v: boolean) => void; time?: number; onTime?: (min: number) => void }) {
  return (
    <div className="py-3">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-ink">{title}</p>
          <p className="text-[13px] leading-snug text-muted">{sub}</p>
        </div>
        <Switch checked={on} onChange={onToggle} label={title} />
      </div>
      {on && time != null && onTime && (
        <label className="mt-2 flex items-center gap-2 text-[13px] font-semibold text-muted">
          Giờ nhắc
          <input
            type="time"
            step={900}
            aria-label={`Giờ ${title.toLowerCase()}`}
            className="k-input w-36 py-2 text-center tabular-nums"
            value={minToHM(time)}
            onChange={(e) => e.target.value && onTime(hmToMin(e.target.value))}
          />
        </label>
      )}
    </div>
  );
}

export function NotificationSettings() {
  const profile = useStore((s) => s.profile)!;
  const mode = useStore((s) => s.mode);
  const online = useStore((s) => s.online);
  const { state, busy, message, tickOk, enable, disable, test, check } = usePush();
  const n: NotifySettings = { ...NOTIFY_DEFAULTS, ...profile.settings.notify };
  const tz = profile.timezone || 'Asia/Ho_Chi_Minh';

  useEffect(() => {
    void check();
  }, [check, mode, online]);

  const set = (patch: Partial<NotifySettings>) =>
    useStore.getState().updateProfile({ settings: { ...profile.settings, notify: { ...profile.settings.notify, ...patch } } });

  return (
    <div>
      <div className="rounded-2xl bg-surface2 p-3.5">
        <div className="flex items-start gap-3">
          <span className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', state === 'on' ? 'bg-primary text-onprimary' : 'bg-surface text-muted')}>
            {state === 'on' ? <BellRing size={20} /> : state === 'denied' ? <BellOff size={20} /> : <Bell size={20} />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-ink">{state === 'on' ? 'Đang bật trên thiết bị này' : 'Thông báo trên thiết bị này'}</p>
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{state === 'checking' ? 'Đang kiểm tra…' : message}</p>
          </div>
        </div>
        {(state === 'off' || state === 'on') && (
          <div className="mt-3 flex flex-wrap gap-2">
            {state === 'off' ? (
              <Button className="flex-1" disabled={busy} onClick={() => void enable()}>
                <BellRing size={18} /> {busy ? 'Đang bật…' : 'Bật thông báo'}
              </Button>
            ) : (
              <>
                <Button variant="soft" className="flex-1" disabled={busy} onClick={() => void test()}>
                  <Send size={17} /> Gửi thử
                </Button>
                <Button variant="outline" className="flex-1" disabled={busy} onClick={() => void disable()}>
                  <BellOff size={17} /> Tắt
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-1 divide-y divide-line">
        <ReminderRow title="Tóm tắt buổi sáng" sub="Hôm nay có mấy việc, nên bắt đầu từ việc nào." on={n.morning} onToggle={(morning) => set({ morning })} time={n.morning_min} onTime={(morning_min) => set({ morning_min })} />
        <ReminderRow title="Nhắc deadline quan trọng" sub="Trước 7, 3 và 1 ngày, gửi cùng giờ tóm tắt sáng. Bật “Deadline quan trọng” khi tạo việc." on={n.deadline} onToggle={(deadline) => set({ deadline })} />
        <ReminderRow title="Nhắc viết nhật ký" sub="Chỉ nhắc khi hôm đó chưa viết. Tối Chủ nhật nhắc thêm nhìn lại tuần." on={n.journal} onToggle={(journal) => set({ journal })} time={n.journal_min} onTime={(journal_min) => set({ journal_min })} />
      </div>

      <p className="mt-1 text-[13px] leading-relaxed text-muted">
        Giờ nhắc tính theo múi giờ {tz.replace(/_/g, ' ')}, đến trong khoảng 15 phút sau giờ đã chọn. Mọi thông báo cũng hiện ở biểu tượng chuông trong app.
      </p>
      {mode === 'cloud' && tickOk === false && state !== 'not-setup' && (
        <p className="mt-2 rounded-xl bg-highsoft px-3 py-2 text-[13px] leading-snug text-high">
          Máy chủ nhắc chưa chạy gần đây. Nếu vừa cài xong thì chờ khoảng 15 phút; lâu hơn thì chủ app xem lại hướng dẫn giai đoạn 4.
        </p>
      )}
    </div>
  );
}
