// "Tổng quan" (bản gọn ở giai đoạn 1): tuần hiện tại của chu kỳ, điểm thực thi từng tuần, tiến độ các mục tiêu.
// Bản đầy đủ (chi tiết từng mục tiêu, giờ focus, lịch sử) sẽ có ở giai đoạn 4.

import { useMemo } from 'react';
import { useData } from '@/lib/store';
import { addDays, formatDM, formatDMY, todayISO } from '@/lib/dates';
import { cycleWeek, getActiveCycle, goalGrowth, weekStats } from '@/lib/logic';
import { Card, cx, EmptyState } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant } from '@/components/Plant';
import { PlantBadge } from '@/components/pickers';

const TARGET = 0.85; // Mục tiêu của 12 Week Year: điểm thực thi từ 85% trở lên

export default function Overview() {
  const d = useData();
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);
  const week = cycle ? cycleWeek(cycle, today) : 0;

  const weeks = useMemo(() => {
    if (!cycle || week === 0) return [];
    return Array.from({ length: week }, (_, i) => {
      const start = addDays(cycle.start_date, i * 7);
      return { n: i + 1, start, ...weekStats(d, start, today) };
    });
  }, [d, cycle, week, today]);
  const current = weeks[weeks.length - 1];

  const goals = useMemo(
    () => d.goals.filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id)).sort((a, b) => a.sort - b.sort),
    [d.goals, cycle],
  );

  if (!cycle) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Tổng quan" />
        <div className="px-4 lg:px-8">
          <Card>
            <EmptyState art={<Plant species="thong" stage={1} size={84} />} title="Chưa có chu kỳ 12 tuần" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Tổng quan" subtitle={`Chu kỳ ${formatDMY(cycle.start_date)} – ${formatDMY(cycle.end_date)}`} />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <Card className="p-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-bold">Tuần {week}/12</h2>
            <span className="text-sm text-muted">{week === 0 ? `Bắt đầu ${formatDM(cycle.start_date)}` : `còn ${12 - week} tuần`}</span>
          </div>
          <div className="mt-3 flex gap-1" role="img" aria-label={`Đang ở tuần ${week} trên 12`}>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className={cx('h-3 flex-1 rounded-full', i + 1 < week ? 'bg-primary' : i + 1 === week ? 'bg-accent' : 'bg-surface2')} />
            ))}
          </div>
        </Card>

        {current && (
          <Card className="p-4">
            <h2 className="text-base font-bold">Điểm thực thi tuần này</h2>
            <p className="mt-0.5 text-[13px] text-muted">% việc đã làm so với kế hoạch, tính đến hôm nay. Mục tiêu: từ 85%.</p>
            <div className="mt-3 flex items-end gap-3">
              <span className={cx('text-5xl leading-none font-bold tabular-nums', current.pct >= TARGET ? 'text-primary' : 'text-ink')}>{Math.round(current.pct * 100)}%</span>
              <span className="pb-1 text-sm text-muted">
                {current.done}/{current.planned} việc
              </span>
            </div>
            <div className="relative mt-3 h-3 rounded-full bg-surface2">
              <span className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: `${current.pct * 100}%` }} />
              <span className="absolute -top-1 -bottom-1 w-0.5 bg-accent" style={{ left: `${TARGET * 100}%` }} aria-hidden />
            </div>

            {weeks.length > 1 && (
              <>
                <h3 className="mt-5 text-sm font-bold">Các tuần đã qua</h3>
                <div className="relative mt-2 flex h-28 items-end gap-1.5">
                  <span className="absolute inset-x-0 border-t border-dashed border-accent" style={{ bottom: `${TARGET * 78}%` }} aria-hidden />
                  {weeks.map((w) => (
                    <div key={w.n} className="relative flex h-full flex-1 flex-col items-center justify-end" title={`Tuần ${w.n}: ${Math.round(w.pct * 100)}% (${w.done}/${w.planned})`}>
                      <span className="mb-0.5 text-[10px] font-semibold text-muted tabular-nums">{Math.round(w.pct * 100)}</span>
                      <span className={cx('w-full max-w-9 rounded-t-lg', w.pct >= TARGET ? 'bg-primary' : 'bg-primary/45')} style={{ height: `${Math.max(3, w.pct * 78)}%` }} />
                    </div>
                  ))}
                </div>
                <div className="mt-1 flex gap-1.5">
                  {weeks.map((w) => (
                    <span key={w.n} className="flex-1 text-center text-[11px] text-muted">
                      T{w.n}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">Đường gạch ngang là mốc 85%.</p>
              </>
            )}
          </Card>
        )}

        <Card className="p-4">
          <h2 className="text-base font-bold">Tiến độ các mục tiêu</h2>
          <div className="mt-3 flex flex-col gap-3.5">
            {goals.map((g) => {
              const growth = goalGrowth(g, cycle, d);
              const vision = d.visions.find((v) => v.id === g.vision_id);
              return (
                <div key={g.id} className="flex items-center gap-3">
                  <PlantBadge species={g.plant} stage={growth.stage} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold">{g.title}</p>
                    <p className="truncate text-xs text-muted">→ {vision?.title}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(2, growth.pct * 100)}%` }} />
                      </span>
                      <span className="w-10 text-right text-xs font-semibold tabular-nums">{Math.round(growth.pct * 100)}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
            {goals.length === 0 && <p className="text-sm text-muted">Chưa có mục tiêu 12 tuần nào.</p>}
          </div>
        </Card>

        <p className="px-1 text-[13px] leading-relaxed text-muted">Đây là bản gọn. Ở giai đoạn 4, trang này sẽ có thêm chi tiết từng mục tiêu và đầu việc, lịch sử hoàn thành, tổng giờ focus và các deadline sắp tới.</p>
      </div>
    </div>
  );
}
