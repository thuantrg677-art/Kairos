// Thống kê Focus: biểu đồ theo ngày / tuần / mục tiêu và tỉ lệ thời gian dành cho việc 20% so với 80%.

import { useMemo, useState } from 'react';
import { useData } from '@/lib/store';
import { addDays, formatDuration, todayISO } from '@/lib/dates';
import { getActiveCycle } from '@/lib/logic';
import { byDay, byGoal, byWeek, fmtMinShort, inRange, leverageSplit, type Bucket } from '@/lib/focusStats';
import { Card, cx } from './ui';
import { Segmented, PlantBadge } from './pickers';

type View = 'day' | 'week' | 'goal';

function Bars({ data }: { data: Bucket[] }) {
  const max = Math.max(30, ...data.map((b) => b.min));
  return (
    <>
      <div className="mt-3 flex h-36 items-end gap-1.5">
        {data.map((b) => (
          <div key={b.key} className="flex h-full flex-1 flex-col items-center justify-end" title={`${b.sub ?? b.label}: ${formatDuration(b.min)}`}>
            <span className="mb-0.5 text-[10px] font-semibold text-muted tabular-nums">{b.min >= 1 ? fmtMinShort(b.min) : ''}</span>
            <span
              className={cx('w-full max-w-10 rounded-t-lg transition-all', b.current ? 'bg-primary' : 'bg-primary/45')}
              style={{ height: b.min >= 1 ? `${Math.max(4, (b.min / max) * 82)}%` : '2px' }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {data.map((b) => (
          <span key={b.key} className={cx('flex-1 text-center text-[11px] leading-tight', b.current ? 'font-bold text-ink' : 'text-muted')}>
            {b.label}
            {b.sub && <span className="block text-[10px] font-normal text-muted">{b.sub}</span>}
          </span>
        ))}
      </div>
    </>
  );
}

export function FocusStats() {
  const d = useData();
  const [view, setView] = useState<View>('day');
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);

  // Khoảng thời gian của từng chế độ xem (dùng cho cả tỉ lệ 20/80)
  const from = view === 'day' ? addDays(today, -6) : cycle && cycle.start_date <= today ? cycle.start_date : addDays(today, -55);
  const sessions = useMemo(() => inRange(d.focus_sessions, from, today), [d.focus_sessions, from, today]);
  const split = useMemo(() => leverageSplit(sessions, d.tasks), [sessions, d.tasks]);
  const todayMin = useMemo(() => inRange(d.focus_sessions, today, today).reduce((a, f) => a + f.actual_sec / 60, 0), [d.focus_sessions, today]);
  const days = useMemo(() => byDay(d.focus_sessions, today), [d.focus_sessions, today]);
  const weeks = useMemo(() => byWeek(d.focus_sessions, today, cycle), [d.focus_sessions, today, cycle]);
  const goals = useMemo(() => byGoal(sessions, d.goals), [sessions, d.goals]);
  const goalMax = Math.max(1, ...goals.map((g) => g.min));
  const weekMin = weeks.find((w) => w.current)?.min ?? 0;
  const pct = (v: number) => (split.total > 0 ? Math.round((v / split.total) * 100) : 0);
  const periodName = view === 'day' ? '7 ngày qua' : cycle ? 'chu kỳ này' : '8 tuần qua';

  return (
    <Card className="p-4">
      <h2 className="text-base font-bold">Thống kê focus</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-surface2 px-3 py-2.5">
          <p className="text-xs text-muted">Hôm nay</p>
          <p className="text-xl font-bold tabular-nums">{formatDuration(todayMin)}</p>
        </div>
        <div className="rounded-2xl bg-surface2 px-3 py-2.5">
          <p className="text-xs text-muted">Tuần này</p>
          <p className="text-xl font-bold tabular-nums">{formatDuration(weekMin)}</p>
        </div>
      </div>

      <div className="mt-4">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { id: 'day', label: 'Theo ngày' },
            { id: 'week', label: 'Theo tuần' },
            { id: 'goal', label: 'Mục tiêu' },
          ]}
        />
      </div>

      {view === 'day' && <Bars data={days} />}
      {view === 'week' && <Bars data={weeks} />}
      {view === 'goal' && (
        <div className="mt-3 flex flex-col gap-3">
          {goals.length === 0 && <p className="py-6 text-center text-sm text-muted">Chưa có phiên focus nào trong {periodName}.</p>}
          {goals.map(({ goal, min }) => (
            <div key={goal?.id ?? 'none'} className="flex items-center gap-3">
              {goal ? <PlantBadge species={goal.plant} stage={3} size={40} /> : <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-surface2 text-lg" aria-hidden>⏱️</span>}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{goal?.title ?? 'Không gắn mục tiêu'}</p>
                  <span className="shrink-0 text-xs font-semibold text-muted tabular-nums">{formatDuration(min)}</span>
                </div>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface2">
                  <span className={cx('block h-full rounded-full', goal ? 'bg-primary' : 'bg-muted/50')} style={{ width: `${Math.max(2, (min / goalMax) * 100)}%` }} />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <h3 className="text-sm font-bold">Thời gian cho việc 20% so với 80%</h3>
        <p className="mt-0.5 text-[13px] text-muted">Trong {periodName}. Càng nhiều thời gian cho việc 20% thì càng gần mục tiêu.</p>
        {split.total < 1 ? (
          <p className="mt-3 text-sm text-muted">Chưa có dữ liệu. Chọn một việc rồi bắt đầu focus nhé.</p>
        ) : (
          <>
            <div className="mt-3 flex h-4 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`Việc 20%: ${pct(split.high)}%, việc 80%: ${pct(split.normal)}%, không gắn việc: ${pct(split.none)}%`}>
              <span className="bg-high" style={{ width: `${(split.high / split.total) * 100}%` }} />
              <span className="bg-primary/60" style={{ width: `${(split.normal / split.total) * 100}%` }} />
              <span className="bg-muted/30" style={{ width: `${(split.none / split.total) * 100}%` }} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-high" /> <b>Việc 20%</b> {pct(split.high)}% · {formatDuration(split.high)}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary/60" /> <b>Việc 80%</b> {pct(split.normal)}% · {formatDuration(split.normal)}
              </span>
              {split.none >= 1 && (
                <span className="flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted/30" /> Không gắn việc {pct(split.none)}%
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
