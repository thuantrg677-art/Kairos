import { lazy, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { startPwa } from '@/lib/pwa';
import { applyTheme, storedTheme } from '@/lib/themes';
import { Button, Toasts } from '@/components/ui';
import { LogoMark } from '@/components/Logo';
import { AppShell } from '@/components/AppShell';
import Login from '@/pages/Login';
import Welcome from '@/pages/Welcome';
import Today from '@/pages/Today';
import Assistant from '@/pages/Assistant';
import Goals from '@/pages/Goals';
import Inbox from '@/pages/Inbox';
import Garden from '@/pages/Garden';
import Focus from '@/pages/Focus';
import Overview from '@/pages/Overview';
import Settings from '@/pages/Settings';
import WeekReview from '@/pages/WeekReview';
import JournalPage from '@/pages/JournalPage';
import History from '@/pages/History';

// Trang nguyên lý Pareto ít khi mở nên tải riêng, không làm nặng lần mở app
const Pareto = lazy(() => import('@/pages/Pareto'));

let started = false;

export default function App() {
  const status = useStore((s) => s.status);
  const profile = useStore((s) => s.profile);
  const location = useLocation();

  // Khởi động một lần: kiểm tra đăng nhập, tải dữ liệu, bật phần PWA
  useEffect(() => {
    if (started) return;
    started = true;
    void useStore.getState().init();
    startPwa();
  }, []);

  // Áp theme: lấy từ tài khoản nếu đã đăng nhập, chưa thì lấy theme đã nhớ trên máy
  const theme = profile?.theme ?? storedTheme().theme;
  const mode = profile?.dark_mode ?? storedTheme().mode;
  useEffect(() => {
    applyTheme(theme, mode);
    if (mode !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(theme, mode);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme, mode]);

  let screen;
  if (status === 'loading') {
    screen = (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <LogoMark size={84} className="k-pop" />
        <p className="text-sm text-muted">Đang mở Kairos…</p>
      </div>
    );
  } else if (status === 'error') {
    screen = (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-8 text-center">
        <LogoMark size={72} />
        <p className="text-lg font-bold">Chưa tải được dữ liệu</p>
        <p className="max-w-xs text-sm text-muted">Kiểm tra kết nối mạng rồi thử lại. Dữ liệu của bạn vẫn an toàn trên máy chủ.</p>
        <Button onClick={() => window.location.reload()}>Thử lại</Button>
        <Button variant="ghost" onClick={() => void useStore.getState().signOut()}>
          Đăng xuất
        </Button>
      </div>
    );
  } else if (status === 'signed-out') {
    screen = <Login />;
  } else if (!profile?.onboarded_at) {
    // Người mới: vào thẳng cuộc trò chuyện làm quen với Trợ lý AI
    screen = <Welcome />;
  } else {
    screen = (
      <AppShell>
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/muc-tieu" element={<Goals />} />
          <Route path="/tro-ly" element={<Assistant />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/vuon" element={<Garden />} />
          <Route path="/tong-quan" element={<Overview />} />
          <Route path="/tong-quan/tuan" element={<WeekReview />} />
          <Route path="/tong-quan/nhat-ky" element={<JournalPage />} />
          <Route path="/tong-quan/lich-su" element={<History />} />
          <Route path="/nhap" element={<Inbox />} />
          <Route path="/cai-dat" element={<Settings />} />
          <Route path="/pareto" element={<Pareto />} />
          <Route path="/huong-dan" element={<Navigate to="/pareto" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    );
  }

  return (
    <>
      <Suspense fallback={<div className="min-h-dvh" />}>{screen}</Suspense>
      <Toasts />
    </>
  );
}
