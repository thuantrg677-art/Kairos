// Dòng thời gian theo giờ của một ngày: khung bận (lịch cố định), khung trống,
// và các việc đã xếp giờ. Kéo tay nắm ở mép phải của một việc để đổi giờ.

import { useRef, useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import { formatDuration, minToHM } from '@/lib/dates';
import type { DayItem, Interval } from '@/lib/logic';
import { eventHex } from '@/lib/themes';
import type { FixedEvent } from '@/lib/types';
import { cx } from './ui';

const PX = 1.1; // 1 phút = 1.1 px
const GUTTER = 46; // chỗ cho nhãn giờ

export function Timeline({
  range,
  fixed,
  items,
  free,
  now,
  onMove,
  onUnschedule,
}: {
  range: Interval;
  fixed: FixedEvent[];
  /** Các việc đã có giờ */
  items: DayItem[];
  free: Interval[];
  /** Phút hiện tại (null nếu không phải hôm nay) */
  now: number | null;
  onMove: (blockId: string, startMin: number) => void;
  onUnschedule: (blockId: string) => void;
}) {
  const hours: number[] = [];
  for (let m = Math.ceil(range.start / 60) * 60; m <= range.end; m += 60) hours.push(m);
  const y = (min: number) => (min - range.start) * PX;

  return (
    <div className="relative select-none" style={{ height: y(range.end) + 12 }}>
      {/* vạch giờ */}
      {hours.map((m) => (
        <div key={m} className="absolute inset-x-0 flex items-start" style={{ top: y(m) }}>
          <span className="-mt-2 w-[38px] text-right text-[11px] text-muted tabular-nums">{minToHM(m)}</span>
          <span className="ml-2 h-px flex-1 bg-line" />
        </div>
      ))}

      {/* khung trống */}
      {free
        .filter((f) => f.end - f.start >= 30)
        .map((f) => (
          <div
            key={'f' + f.start}
            className="absolute right-1 flex items-center justify-center rounded-2xl border border-dashed border-primary/35 text-xs font-medium text-muted"
            style={{ left: GUTTER, top: y(f.start) + 3, height: (f.end - f.start) * PX - 6 }}
          >
            {(f.end - f.start) * PX > 26 && <span>Trống · {formatDuration(f.end - f.start)}</span>}
          </div>
        ))}

      {/* khung bận từ lịch cố định */}
      {fixed.map((e) => {
        const hex = eventHex(e.color);
        return (
          <div
            key={e.id}
            className="absolute right-1 overflow-hidden rounded-2xl px-3 py-1.5"
            style={{
              left: GUTTER,
              top: y(e.start_min) + 1,
              height: (e.end_min - e.start_min) * PX - 2,
              background: `color-mix(in srgb, ${hex} 20%, var(--k-surface))`,
              borderLeft: `5px solid ${hex}`,
            }}
          >
            <p className="truncate text-sm font-semibold text-ink">{e.title}</p>
            <p className="text-xs text-muted tabular-nums">
              {minToHM(e.start_min)} – {minToHM(e.end_min)} · bận
            </p>
          </div>
        );
      })}

      {/* việc đã xếp giờ */}
      {items.map((it) => (
        <TaskBlock key={it.block!.id} item={it} range={range} fixed={fixed} onMove={onMove} onUnschedule={onUnschedule} />
      ))}

      {/* vạch "bây giờ" */}
      {now != null && now >= range.start && now <= range.end && (
        <div className="pointer-events-none absolute inset-x-0 z-20 flex items-center" style={{ top: y(now) - 5 }}>
          <span className="w-[38px] text-right text-[11px] font-bold text-accent tabular-nums">{minToHM(now)}</span>
          <span className="ml-1 h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="h-0.5 flex-1 bg-accent" />
        </div>
      )}
    </div>
  );
}

function TaskBlock({
  item,
  range,
  fixed,
  onMove,
  onUnschedule,
}: {
  item: DayItem;
  range: Interval;
  fixed: FixedEvent[];
  onMove: (blockId: string, startMin: number) => void;
  onUnschedule: (blockId: string) => void;
}) {
  const block = item.block!;
  const [delta, setDelta] = useState<number | null>(null);
  const startY = useRef(0);

  const clamp = (m: number) => Math.max(range.start, Math.min(range.end - block.duration_min, m));
  const start = clamp(block.start_min! + (delta ?? 0));
  const end = start + block.duration_min;
  const clash = fixed.some((e) => start < e.end_min && end > e.start_min);
  const high = item.task.leverage === 'high';
  const h = Math.max(block.duration_min * PX - 2, 30);

  return (
    <div
      className={cx(
        'absolute right-1 z-10 flex items-stretch overflow-hidden rounded-2xl border-2 shadow-sm transition-shadow',
        high ? 'border-high bg-highsoft' : 'border-primary bg-soft',
        clash && '!border-danger',
        delta != null && 'z-30 shadow-lg',
        item.done && 'opacity-55',
      )}
      style={{ left: GUTTER, top: (start - range.start) * PX + 1, height: h }}
    >
      <div className="min-w-0 flex-1 px-3 py-1">
        <p className={cx('truncate text-sm font-semibold text-ink', item.done && 'line-through')}>{item.task.title}</p>
        {h >= 44 && (
          <p className="truncate text-xs text-muted tabular-nums">
            {minToHM(start)} – {minToHM(end)}
            {clash && <span className="font-semibold text-danger"> · trùng lịch bận</span>}
          </p>
        )}
      </div>
      <button type="button" aria-label={`Bỏ giờ của việc: ${item.task.title}`} onClick={() => onUnschedule(block.id)} className="flex w-8 items-center justify-center text-muted">
        <X size={16} />
      </button>
      <div
        role="slider"
        tabIndex={0}
        aria-label={`Đổi giờ: ${item.task.title}`}
        aria-valuemin={range.start}
        aria-valuemax={range.end - block.duration_min}
        aria-valuenow={start}
        aria-valuetext={minToHM(start)}
        className="flex w-11 cursor-grab touch-none items-center justify-center text-muted active:cursor-grabbing"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          startY.current = e.clientY;
          setDelta(0);
        }}
        onPointerMove={(e) => {
          if (delta == null) return;
          setDelta(Math.round((e.clientY - startY.current) / PX / 5) * 5);
        }}
        onPointerUp={() => {
          if (delta == null) return;
          if (start !== block.start_min) onMove(block.id, start);
          setDelta(null);
        }}
        onPointerCancel={() => setDelta(null)}
        onKeyDown={(e) => {
          // Dùng bàn phím: mũi tên lên/xuống dịch 5 phút
          if (e.key === 'ArrowUp') onMove(block.id, clamp(block.start_min! - 5));
          if (e.key === 'ArrowDown') onMove(block.id, clamp(block.start_min! + 5));
        }}
      >
        <GripVertical size={18} />
      </div>
    </div>
  );
}
