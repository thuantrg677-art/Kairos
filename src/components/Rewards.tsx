// Phần thưởng cho từng việc nhỏ: bình tưới hôm nay (đầy khi làm hết việc trong ngày)
// và chuỗi ngày liên tiếp có tưới cây. Việc nhỏ cỡ nào cũng làm bình đầy thêm.

import { useId } from 'react';
import { useStore } from '@/lib/store';
import { todayISO } from '@/lib/dates';
import { waterCan, waterStreak, type DayItem } from '@/lib/logic';
import { Card, cx } from './ui';

/** Bình tưới vẽ bằng SVG, mực nước theo pct (0–1) */
export function WateringCan({ pct, size = 64, pour }: { pct: number; size?: number; pour?: boolean }) {
  const clip = useId();
  const body = 'M15 19 L47 19 L44 50 Q43 53.5 39.5 53.5 L22.5 53.5 Q19 53.5 18 50 Z';
  const level = 53.5 - Math.max(0, Math.min(1, pct)) * 35;
  return (
    <svg viewBox="0 0 66 58" width={size} height={(size * 58) / 66} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={body} />
        </clipPath>
      </defs>
      {/* vòi */}
      <path d="M44 32 L59 16" stroke="var(--k-muted)" strokeWidth={4} strokeLinecap="round" />
      <ellipse cx={60} cy={15} rx={4.2} ry={2.6} transform="rotate(-45 60 15)" fill="var(--k-muted)" />
      {/* tay cầm */}
      <path d="M19 24 C5 24 5 46 18 46" stroke="var(--k-muted)" strokeWidth={3.2} fill="none" strokeLinecap="round" />
      <path d="M22 19 C24 9 38 9 40 19" stroke="var(--k-muted)" strokeWidth={3.2} fill="none" strokeLinecap="round" />
      {/* thân + nước */}
      <path d={body} fill="var(--k-surface-2)" />
      <g clipPath={`url(#${clip})`}>
        <rect x={10} y={level} width={44} height={60} fill="var(--k-water)" style={{ transition: 'y .6s ease-out' }} />
        <path d={`M10 ${level} Q20 ${level - 2.2} 30 ${level} T50 ${level}`} stroke="var(--k-surface)" strokeOpacity={0.45} strokeWidth={1.4} fill="none" />
      </g>
      <path d={body} fill="none" stroke="var(--k-muted)" strokeWidth={2.2} strokeLinejoin="round" />
      {pour && (
        <g fill="var(--k-water)">
          <circle className="k-pour" cx={62} cy={22} r={1.6} />
          <circle className="k-pour" cx={64} cy={20} r={1.3} style={{ animationDelay: '.25s' }} />
          <circle className="k-pour" cx={60.5} cy={21} r={1.2} style={{ animationDelay: '.5s' }} />
        </g>
      )}
    </svg>
  );
}

/** Thẻ "Bình tưới hôm nay" ở màn Hôm nay */
export function WaterCanCard({ items }: { items: DayItem[] }) {
  const completions = useStore((s) => s.task_completions);
  const today = todayISO();
  const can = waterCan(items, completions, today);
  const streak = waterStreak(completions, today);
  const full = can.drops > 0 && can.drops >= can.capacity;
  const left = Math.max(0, can.capacity - can.drops);

  let note: string;
  if (can.drops === 0) note = 'Tick việc đầu tiên để bắt đầu tưới vườn. Việc nhỏ nhất cũng tính.';
  else if (full) note = 'Đầy bình rồi! Cả vườn được tưới đẫm hôm nay 🌈';
  else if (left <= 2) note = `Chỉ còn ${left} 💧 nữa là đầy bình.`;
  else note = `Còn ${left} 💧 nữa là đầy bình. Mỗi việc xong là một lần tưới.`;

  return (
    <Card className={cx('flex items-center gap-3.5 p-3.5', full && 'border-water/50')}>
      <div className={cx('shrink-0', full && 'k-pop')} key={full ? 'full' : 'not'}>
        <WateringCan pct={can.pct} size={60} pour={full} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-muted">Bình tưới hôm nay</p>
        <p className="text-xl leading-tight font-bold text-ink tabular-nums">
          {can.drops}
          <span className="text-base font-semibold text-muted">/{can.capacity}</span> 💧
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2" role="progressbar" aria-valuemin={0} aria-valuemax={can.capacity} aria-valuenow={can.drops} aria-label="Mực nước trong bình tưới">
          <div className="h-full rounded-full bg-water transition-all duration-500" style={{ width: `${Math.max(can.drops ? 4 : 0, can.pct * 100)}%` }} />
        </div>
        <p className="mt-1.5 text-[13px] leading-snug text-muted">{note}</p>
      </div>
      {streak.days > 0 && (
        <div className={cx('flex shrink-0 flex-col items-center rounded-2xl px-2.5 py-1.5 text-center', streak.today ? 'bg-highsoft text-high' : 'bg-surface2 text-muted')} title={streak.today ? 'Chuỗi ngày liên tiếp có tưới cây' : 'Tick một việc hôm nay để giữ chuỗi'}>
          <span className="text-lg leading-none" aria-hidden>
            🔥
          </span>
          <span className="mt-0.5 text-base leading-none font-bold tabular-nums">{streak.days}</span>
          <span className="text-[10.5px] leading-tight font-semibold">{streak.today ? 'ngày liền' : 'giữ chuỗi'}</span>
        </div>
      )}
    </Card>
  );
}
