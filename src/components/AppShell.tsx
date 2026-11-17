// Khung chung của app: thanh bên (máy tính), thanh tab dưới (điện thoại),
// nút ghi nhanh nổi và các dải thông báo (offline, bản mới, xem thử).

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChartNoAxesColumn, Inbox, PenLine, RefreshCw, Settings, Sprout, Sun, Target, Timer, WifiOff } from 'lucide-react';
import { useStore } from '@/lib/store';
import { usePwa } from '@/lib/pwa';
import { Button, cx, IconButton, Sheet } from './ui';
import { LogoWord } from './Logo';
import { FocusPill } from './FocusPill';

const TABS = [
  { to: '/', label: 'Hôm nay', icon: Sun },
  { to: '/muc-tieu', label: 'Mục tiêu', icon: Target },
  { to: '/focus', label: 'Focus', icon: Timer },
  { to: '/vuon', label: 'Vườn', icon: Sprout },
  { to: '/tong-quan', label: 'Tổng quan', icon: ChartNoAxesColumn },
];

export const useInboxCount = () => useStore((s) => s.inbox_items.filter((i) => !i.processed_at).length);

/** Ô ghi nhanh: mở bằng nút nổi ở mọi màn hình, gõ xong nhấn Enter là lưu vào Nháp */
export function QuickCapture({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 60);
  }, [open]);

  const save = () => {
    const content = text.trim();
    if (!content) return;
    const row = useStore.getState().insert('inbox_items', { content, processed_at: null, task_id: null });
    if (!row) return;
    setText('');
    onClose();
    useStore.getState().toast('Đã lưu vào Nháp', 'success');
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ghi nhanh"
      footer={
        <Button className="flex-1" onClick={save} disabled={!text.trim()}>
          Lưu vào Nháp
        </Button>
      }
    >
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            save();
          }
        }}
        rows={3}
        maxLength={2000}
        placeholder="Ý tưởng, việc chợt nhớ ra… cứ ghi lại đã, sắp xếp sau."
        className="k-input resize-none"
      />
      <p className="mt-2 text-[13px] text-muted">Nhấn Enter để lưu. Mục này nằm trong Nháp cho đến khi bạn sắp xếp.</p>
    </Sheet>
  );
}

function Banners() {
  const online = useStore((s) => s.online);
  const mode = useStore((s) => s.mode);
  const stale = useStore((s) => s.stale);
  const updateReady = usePwa((s) => s.updateReady);
  const applyUpdate = usePwa((s) => s.applyUpdate);
  return (
    <>
      {updateReady && (
        <div className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-sm font-medium text-onprimary">
          <span>Có bản cập nhật mới của Kairos.</span>
          <button onClick={applyUpdate} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-onprimary/20 px-3 font-semibold">
            <RefreshCw size={15} /> Tải lại
          </button>
        </div>
      )}
      {mode === 'cloud' && (!online || stale) && (
        <div className="flex items-center gap-2 bg-surface2 px-4 py-2 text-sm text-ink">
          <WifiOff size={16} className="shrink-0" />
          <span>{online ? 'Chưa đồng bộ được. Đang hiện dữ liệu đã lưu trên máy.' : 'Bạn đang offline. Vẫn xem được dữ liệu đã tải, chưa chỉnh sửa được.'}</span>
        </div>
      )}
      {mode === 'demo' && (
        <div className="bg-highsoft px-4 py-1.5 text-center text-[13px] font-medium text-high">
          Đang xem thử · dữ liệu mẫu chỉ lưu trên máy này
        </div>
      )}
    </>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [capture, setCapture] = useState(false);
  const inboxCount = useInboxCount();
  const location = useLocation();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Phím tắt của app đã cài ("Ghi nhanh vào Nháp") mở thẳng ô ghi nhanh
  useEffect(() => {
    if (params.get('ghi') === '1') {
      setCapture(true);
      navigate(location.pathname, { replace: true });
    }
  }, [params, navigate, location.pathname]);

  // Chuyển màn thì cuộn về đầu trang
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Thanh bên cho màn hình rộng */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
        <LogoWord className="px-2" />
        <p className="mt-1.5 px-2 text-xs text-muted">Focus on what matters</p>
        <nav className="mt-7 flex flex-1 flex-col gap-1" aria-label="Điều hướng chính">
          {TABS.map((t) => (
            <SideLink key={t.to} to={t.to} label={t.label} icon={<t.icon size={20} />} />
          ))}
          <div className="my-3 border-t border-line" />
          <SideLink to="/nhap" label="Nháp" icon={<Inbox size={20} />} badge={inboxCount} />
          <SideLink to="/tong-quan/nhat-ky" label="Nhật ký" icon={<BookOpen size={20} />} />
          <SideLink to="/cai-dat" label="Cài đặt" icon={<Settings size={20} />} />
          <div className="mt-auto">
            <Button className="w-full" onClick={() => setCapture(true)}>
              <PenLine size={18} /> Ghi nhanh
            </Button>
          </div>
        </nav>
      </aside>

      <div className="safe-top">
        <Banners />
        <main className="pb-28 lg:pb-12">{children}</main>
      </div>

      {/* Nút ghi nhanh nổi (điện thoại) */}
      <button
        aria-label="Ghi nhanh vào Nháp"
        onClick={() => setCapture(true)}
        className="fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-onprimary shadow-lg shadow-black/20 transition active:scale-95 lg:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)' }}
      >
        <PenLine size={24} />
      </button>

      {/* Thanh tab dưới cùng (điện thoại) */}
      <nav
        className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur lg:hidden"
        aria-label="Điều hướng chính"
      >
        <div className="mx-auto flex max-w-lg">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                cx(
                  'flex min-h-[60px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition',
                  isActive ? 'text-primary' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', isActive && 'bg-soft')}>
                    <t.icon size={20} strokeWidth={isActive ? 2.4 : 2} />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      <FocusPill />
      <QuickCapture open={capture} onClose={() => setCapture(false)} />
    </div>
  );
}

function SideLink({ to, label, icon, badge }: { to: string; label: string; icon: ReactNode; badge?: number }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        cx(
          'flex min-h-11 items-center gap-3 rounded-2xl px-3 text-[15px] font-medium transition',
          isActive ? 'bg-soft text-ink' : 'text-muted hover:bg-surface2 hover:text-ink',
        )
      }
    >
      {icon}
      <span className="flex-1">{label}</span>
      {!!badge && <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-onaccent">{badge}</span>}
    </NavLink>
  );
}

/** Tiêu đề trang + lối tắt tới Nháp và Cài đặt (trên điện thoại) */
export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children?: ReactNode }) {
  const inboxCount = useInboxCount();
  const navigate = useNavigate();
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 lg:px-8 lg:pt-8">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 items-center">
        {children}
        <span className="flex lg:hidden">
          <IconButton label={`Nháp${inboxCount ? ` (${inboxCount} mục)` : ''}`} onClick={() => navigate('/nhap')} className="relative">
            <Inbox size={22} />
            {inboxCount > 0 && (
              <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-onaccent">
                {inboxCount}
              </span>
            )}
          </IconButton>
          <IconButton label="Cài đặt" onClick={() => navigate('/cai-dat')}>
            <Settings size={22} />
          </IconButton>
        </span>
      </div>
    </header>
  );
}

/** Tiêu đề cho trang con (Nhìn lại tuần, Nhật ký, Lịch sử): có nút quay lại */
export function SubPageHeader({ title, subtitle, back = '/tong-quan', children }: { title: string; subtitle?: ReactNode; back?: string; children?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="flex items-start gap-1 px-2 pt-4 pb-3 lg:px-6 lg:pt-8">
      <IconButton label="Quay lại" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(back))} className="shrink-0">
        <ArrowLeft size={22} />
      </IconButton>
      <div className="min-w-0 flex-1 pt-1">
        <h1 className="text-[24px] leading-tight font-bold text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {children}
    </header>
  );
}
