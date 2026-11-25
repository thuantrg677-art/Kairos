// Thẻ một đầu việc trong danh sách: ô tick, tên, mục tiêu, thời lượng, deadline, nhãn 20%/80%.

import { useState, type ReactNode } from 'react';
import { Check, Clock, CornerDownRight, Play } from 'lucide-react';
import { useStore } from '@/lib/store';
import { describeDue, diffDays, formatDM, formatDuration, isoWeekday, minToHM, todayISO, WEEKDAY_SHORT } from '@/lib/dates';
import type { Goal, ScheduleBlock, Task } from '@/lib/types';
import { cx, LeverageBadge } from './ui';
import { Plant } from './Plant';
import { celebrateTick, plantSnapshot } from '@/lib/garden';

/** Mô tả lịch lặp: "Hằng ngày", "T2 · T4 · T6" */
export function repeatLabel(weekdays: number[]): string {
  if (weekdays.length === 7) return 'Hằng ngày';
  return weekdays.map((d) => WEEKDAY_SHORT[d - 1]).join(' · ');
}

/** Ngày làm của một việc mỗi ngày: "Hôm nay", "Ngày mai", "T5 26/11", "Từ hôm qua" */
export function stepDayLabel(date: string, today: string): string {
  const n = diffDays(today, date);
  if (n === 0) return 'Hôm nay';
  if (n === 1) return 'Ngày mai';
  if (n === -1) return 'Từ hôm qua';
  if (n < 0) return `Từ ${-n} ngày trước`;
  return `${WEEKDAY_SHORT[isoWeekday(date) - 1]} ${formatDM(date)}`;
}

export function TaskRow({
  task,
  goal,
  done,
  date,
  block,
  onEdit,
  onFocus,
  onSchedule,
  extra,
  showRepeat,
  hideParent,
  compact,
}: {
  task: Task;
  goal: Goal | null;
  done: boolean;
  /** Ngày đang xem. Có date thì hiện ô tick. */
  date?: string;
  block?: ScheduleBlock | null;
  onEdit?: () => void;
  onFocus?: () => void;
  onSchedule?: () => void;
  extra?: ReactNode;
  showRepeat?: boolean;
  /** Không hiện dòng "thuộc đầu việc…" (khi đã nằm ngay dưới đầu việc đó) */
  hideParent?: boolean;
  /** Thẻ nhỏ gọn hơn (việc mỗi ngày nằm trong danh sách đầu việc) */
  compact?: boolean;
}) {
  const [burst, setBurst] = useState(0);
  const today = todayISO();
  const step = !!task.parent_id;
  const parent = useStore((s) => (task.parent_id ? s.tasks.find((t) => t.id === task.parent_id) ?? null : null));
  const high = task.leverage === 'high' && !step;

  const toggle = () => {
    if (!date) return;
    const before = plantSnapshot(task.goal_id);
    const points = useStore.getState().toggleTask(task, date);
    if (points > 0) {
      celebrateTick(task, before, points);
      // Hiệu ứng tưới nước: mỗi 💧 là một giọt bay lên
      setBurst(points);
      setTimeout(() => setBurst(0), 950);
    }
  };

  const overdue = !done && task.kind === 'once' && !!task.due_date && task.due_date < today;
  const stepHigh = step && task.leverage === 'high';

  return (
    <div
      className={cx(
        'relative flex items-stretch gap-1 border bg-surface transition',
        compact ? 'rounded-2xl' : 'rounded-3xl',
        high && !done ? 'border-high/45' : 'border-line',
        done && 'opacity-60',
      )}
    >
      {high && !done && <span className="absolute inset-y-3 left-0 w-1 rounded-r-full bg-high" aria-hidden />}

      {date && (
        <div className="relative flex shrink-0 items-center pl-2">
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? `Bỏ tick: ${task.title}` : `Hoàn thành: ${task.title}`}
            onClick={toggle}
            className={cx('flex w-11 items-center justify-center', compact ? 'h-11' : 'h-12')}
          >
            <span
              className={cx(
                'flex items-center justify-center rounded-full border-2 transition',
                step ? 'h-6 w-6' : 'h-7 w-7',
                done ? 'k-pop border-primary bg-primary text-onprimary' : high || stepHigh ? 'border-high' : 'border-muted/60',
              )}
            >
              {done && <Check size={step ? 14 : 16} strokeWidth={3.5} />}
            </span>
          </button>
          {burst > 0 && (
            <span className="pointer-events-none absolute top-1 left-5 z-10" aria-hidden>
              {Array.from({ length: burst }).map((_, i) => (
                <span
                  key={i}
                  className="k-drop absolute text-lg"
                  style={{ ['--dx' as string]: `${(i - (burst - 1) / 2) * 18}px`, animationDelay: `${i * 90}ms` }}
                >
                  💧
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <div className={cx('min-w-0 flex-1', !date && 'pl-4')}>
      <button type="button" onClick={onEdit} className={cx('block w-full text-left', compact ? 'py-2' : 'py-3')}>
        <span className={cx('block leading-snug font-semibold text-ink', step ? 'text-[14.5px]' : 'text-[15px]', done && 'line-through')}>{task.title}</span>
        {step && parent && !hideParent && (
          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[12.5px] text-muted">
            <CornerDownRight size={13} className="shrink-0" aria-hidden />
            <span className="truncate">{parent.title}</span>
          </span>
        )}
        <span className={cx('flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted', compact ? 'mt-1' : 'mt-1.5')}>
          <LeverageBadge leverage={task.leverage} step={step} />
          {goal && !step && (
            <span className="inline-flex max-w-[11rem] items-center gap-1">
              <span className="-my-1 inline-flex h-5 w-4 shrink-0 items-end overflow-hidden">
                <Plant species={goal.plant} stage={4} size={16} />
              </span>
              <span className="truncate">{goal.title}</span>
            </span>
          )}
          <span className="whitespace-nowrap">{formatDuration(task.estimate_min)}</span>
          {block?.start_min != null && <span className="font-semibold whitespace-nowrap text-ink">{minToHM(block.start_min)}</span>}
          {showRepeat && task.kind === 'recurring' && <span className="whitespace-nowrap">{repeatLabel(task.weekdays)}</span>}
          {step && task.due_date && !done && (
            <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', overdue ? 'bg-danger/12 text-danger' : 'bg-surface2 text-ink')}>{stepDayLabel(task.due_date, today)}</span>
          )}
          {!step && task.kind === 'once' && task.due_date && !done && (
            <span className={cx('rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap', overdue ? 'bg-danger/12 text-danger' : 'bg-surface2 text-ink')}>
              {task.important ? '⚑ ' : ''}
              {describeDue(task.due_date, today)}
            </span>
          )}
        </span>
        {high && task.leverage_reason && !done && <span className="mt-1.5 block text-[13px] leading-snug text-muted">{task.leverage_reason}</span>}
      </button>
        {extra && <div className="-mt-1 pb-3">{extra}</div>}
      </div>

      {(onFocus || onSchedule) && !done && (
        <div className="flex shrink-0 flex-col justify-center gap-0.5 pr-1.5">
          {onFocus && (
            <button type="button" onClick={onFocus} aria-label={`Bắt đầu focus: ${task.title}`} title="Bắt đầu focus" className="flex h-11 w-11 items-center justify-center rounded-full bg-soft text-primary transition active:scale-95">
              <Play size={18} fill="currentColor" />
            </button>
          )}
          {onSchedule && (
            <button
              type="button"
              onClick={onSchedule}
              aria-label={block?.start_min != null ? `Bỏ giờ đã xếp: ${task.title}` : `Xếp giờ: ${task.title}`}
              title={block?.start_min != null ? 'Bỏ giờ đã xếp' : 'Xếp vào khung trống gần nhất'}
              className={cx('flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95', block?.start_min != null ? 'text-primary' : 'text-muted')}
            >
              <Clock size={19} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
