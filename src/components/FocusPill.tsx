// Viên nhỏ hiện đồng hồ Focus khi đang ở màn hình khác, bấm vào để quay lại trang Focus.

import { useLocation, useNavigate } from 'react-router-dom';
import { fmtClock, useFocus, useFocusElapsed } from '@/lib/focus';
import { cx } from './ui';

export function FocusPill() {
  const phase = useFocus((s) => s.phase);
  const elapsed = useFocusElapsed();
  const location = useLocation();
  const navigate = useNavigate();
  if (phase === 'idle' || location.pathname === '/focus') return null;
  const running = phase === 'running';
  return (
    <button
      onClick={() => navigate('/focus')}
      aria-label={running ? `Đang focus ${fmtClock(elapsed)}. Mở trang Focus` : 'Phiên focus vừa xong, chưa đánh giá. Mở trang Focus'}
      className={cx(
        'k-fade-in fixed left-4 z-30 flex min-h-12 items-center gap-2 rounded-full px-4 text-[15px] font-bold shadow-lg shadow-black/20 transition active:scale-95 lg:left-[17rem]',
        running ? 'bg-primary text-onprimary' : 'bg-accent text-onaccent',
      )}
      style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 82px)' }}
    >
      <span aria-hidden>🎯</span>
      {running ? <span className="tabular-nums">{fmtClock(elapsed)}</span> : <span className="text-sm">Đánh giá phiên vừa xong</span>}
    </button>
  );
}
