// Một khung cảnh vườn: trời, đồi và các cây đứng cạnh nhau. Dùng cho Vườn hiện tại và Khu vườn kỷ niệm.

import type { ReactNode } from 'react';
import type { PlantSpecies } from '@/lib/types';
import type { PlantEvent } from '@/lib/garden';
import { Plant } from './Plant';
import { cx } from './ui';

export interface ScenePlant {
  key: string;
  species: PlantSpecies;
  stage: number;
  wilt?: 0 | 1 | 2;
  title: string;
  sub?: ReactNode;
  /** Chip nhỏ dưới tên, ví dụ trạng thái héo */
  badge?: ReactNode;
  event?: PlantEvent;
  onClick?: () => void;
}

/** Vài đốm lấp lánh bay lên khi cây vừa lớn hoặc vừa hồi phục */
function Sparkles({ kind }: { kind: PlantEvent }) {
  const spots = [
    [18, 52, 0],
    [72, 30, 160],
    [44, 18, 320],
    [84, 62, 480],
    [28, 34, 640],
  ];
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {spots.map(([x, y, delay]) => (
        <span key={`${x}-${y}`} className="k-twinkle absolute text-base" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${delay}ms` }}>
          {kind === 'grew' ? '✨' : '💧'}
        </span>
      ))}
    </span>
  );
}

export function GardenScene({ plants, size = 112, compact, children }: { plants: ScenePlant[]; size?: number; compact?: boolean; children?: ReactNode }) {
  return (
    <div className={cx('relative overflow-hidden border border-line', compact ? 'rounded-3xl' : 'rounded-[32px]')} style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2) 70%)' }}>
      <div className={cx('absolute inset-x-0 bottom-0', compact ? 'h-10' : 'h-16')} style={{ background: 'var(--k-hill-2)' }} />
      <div className={cx('absolute inset-x-0 rounded-[50%]', compact ? 'bottom-7 h-7' : 'bottom-12 h-10')} style={{ background: 'var(--k-hill-2)' }} />
      {children}
      <div className={cx('relative flex flex-wrap items-end justify-around gap-x-2', compact ? 'gap-y-3 px-2 pt-5 pb-2.5' : 'gap-y-6 px-3 pt-10 pb-4')}>
        {plants.map((p) => {
          const body = (
            <>
              <span className={cx('relative block', p.event === 'grew' && 'k-grow', p.event === 'revived' && 'k-revive')}>
                <Plant species={p.species} stage={p.stage} wilt={p.wilt} size={size} sway={!compact} />
                {p.event && <Sparkles kind={p.event} />}
              </span>
              <span className={cx('mt-1 block rounded-2xl bg-surface/90 text-center leading-tight font-semibold text-ink', compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs')}>
                <span className="line-clamp-2">{p.title}</span>
              </span>
              {p.sub && <span className={cx('mt-1 rounded-full bg-surface/90 px-2 py-0.5 font-medium text-muted', compact ? 'text-[10px]' : 'text-[11px]')}>{p.sub}</span>}
              {p.badge}
            </>
          );
          const cls = cx('flex flex-col items-center', compact ? 'w-[30%] min-w-[84px]' : 'w-[30%] min-w-[104px]');
          return p.onClick ? (
            <button key={p.key} type="button" onClick={p.onClick} className={cx(cls, 'transition active:scale-[.97]')}>
              {body}
            </button>
          ) : (
            <div key={p.key} className={cls}>
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
}
