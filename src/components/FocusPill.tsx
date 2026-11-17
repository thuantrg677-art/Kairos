// Viên nhỏ hiện đồng hồ Focus khi đang ở màn hình khác, bấm vào để quay lại trang Focus.

import { useLocation, useNavigate } from 'react-router-dom';
import { fmtClock, useFocus, useFocusClock } from '@/lib/focus';
import { cx } from './ui';

export function FocusPill() {
  const phase = useFocus((s) => s.phase);
  const paused = useFocus((s) => !s.runStart);
  const { remaining } = useFocusClock();
  const location = useLocation();
  const navigate = useNavigate();
  if ((phase !== 'focus' && phase !== 'break') || location.pathname === '/focus') return null;
  return (
    <button
      onClick={() => navigate('/focus')}
      aria-label={`${phase === 'focus' ? 'Đang focus' : 'Đang nghỉ'}, còn ${fmtClock(remaining)}. Mở trang Focus`}
      className={cx(
        'k-fade-in fixed left-4 z-30 flex min-h-12 items-center gap-2 rounded-full px-4 text-[15px] font-bold shadow-lg shadow-black/20 transition active:scale-95 lg:left-[17rem]',
        phase === 'focus' ? 'bg-primary text-onprimary' : 'bg-accent text-onaccent',
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)' }}
    >
      <span aria-hidden>{phase === 'focus' ? '🌱' : '☕'}</span>
      <span className="tabular-nums">{fmtClock(remaining)}</span>
      {paused && <span className="text-xs font-semibold opacity-80">tạm dừng</span>}
    </button>
  );
}
