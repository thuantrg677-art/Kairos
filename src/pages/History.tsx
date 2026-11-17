// "Lịch sử": lịch theo tháng, ô càng đậm là ngày càng nhiều 💧. Bấm một ngày để xem việc đã làm, giờ focus và nhật ký.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react';
import { loadedSince, useData, useStore } from '@/lib/store';
import { formatDuration, formatLongDate, mondayOf, todayISO, WEEKDAY_SHORT } from '@/lib/dates';
import { sessionDate } from '@/lib/focusStats';
import { daySummary, energyOf, goodDayDrops, heatLevel, monthGrid, monthTitle, shiftMonth } from '@/lib/review';
import type { Snapshot } from '@/lib/types';
import { Button, Card, cx, IconButton, LeverageBadge, Sheet } from '@/components/ui';
import { SubPageHeader } from '@/components/AppShell';
import { JournalSheet } from '@/components/Journal';

type Extra = Pick<Snapshot, 'task_completions' | 'focus_sessions'>;

const HEAT = ['bg-surface2', 'bg-primary/20', 'bg-primary/40', 'bg-primary/65', 'bg-primary'];

export default function History() {
  const d = useData();
  const navigate = useNavigate();
  const loadRange = useStore((s) => s.loadRange);
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [picked, setPicked] = useState<string | null>(null);
  const [journalDate, setJournalDate] = useState<string | null>(null);

  // Tháng cũ hơn phần dữ liệu đã tải sẵn thì tải riêng
  const first = `${month}-01`;
  const last = monthGrid(month).filter(Boolean).pop()!;
  const needFetch = first < loadedSince();
  const [extra, setExtra] = useState<{ month: string; data: Extra } | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!needFetch || extra?.month === month) return;
    let alive = true;
    setLoading(true);
    loadRange(first, last)
      .then((data) => alive && setExtra({ month, data }))
      .catch(() => alive && useStore.getState().toast('Chưa tải được lịch sử tháng này.', 'error'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [needFetch, month, first, last, extra?.month, loadRange]);
  const source: Extra = needFetch && extra?.month === month ? extra.data : d;

  const dropsByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of source.task_completions) m.set(c.date, (m.get(c.date) ?? 0) + c.points);
    return m;
  }, [source.task_completions]);
  const allDrops = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of d.task_completions) m.set(c.date, (m.get(c.date) ?? 0) + c.points);
    return m;
  }, [d.task_completions]);
  const good = goodDayDrops(allDrops);
  const focusByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of source.focus_sessions) {
      const k = sessionDate(f);
      m.set(k, (m.get(k) ?? 0) + f.actual_sec / 60);
    }
    return m;
  }, [source.focus_sessions]);
  const journals = useMemo(() => new Map(d.journals.map((j) => [j.date, j])), [d.journals]);

  const cells = monthGrid(month);
  const inMonth = cells.filter((c): c is string => !!c && c <= today);
  const monthDrops = inMonth.reduce((n, c) => n + (dropsByDate.get(c) ?? 0), 0);
  const activeDays = inMonth.filter((c) => (dropsByDate.get(c) ?? 0) > 0).length;
  const monthFocus = inMonth.reduce((n, c) => n + (focusByDate.get(c) ?? 0), 0);
  const monthJournals = inMonth.filter((c) => journals.has(c)).length;

  const sum = useMemo(() => (picked ? daySummary(d, picked, needFetch && extra?.month === month ? extra.data : undefined) : null), [d, picked, needFetch, extra, month]);
  const thisMonth = today.slice(0, 7);

  return (
    <div className="mx-auto max-w-2xl">
      <SubPageHeader title="Lịch sử" subtitle="Ô càng đậm là ngày bạn tưới càng nhiều 💧." />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <Card className="p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <IconButton label="Tháng trước" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={22} />
            </IconButton>
            <p className="flex items-center gap-2 text-base font-bold">
              {monthTitle(month)}
              {loading && <LoaderCircle size={16} className="animate-spin text-muted" />}
            </p>
            <IconButton label="Tháng sau" onClick={() => setMonth(shiftMonth(month, 1))} disabled={month >= thisMonth}>
              <ChevronRight size={22} />
            </IconButton>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAY_SHORT.map((w) => (
              <span key={w} className="pb-1 text-center text-[11px] font-semibold text-muted">
                {w}
              </span>
            ))}
            {cells.map((date, i) => {
              if (!date) return <span key={`x${i}`} />;
              const future = date > today;
              const drops = dropsByDate.get(date) ?? 0;
              const lvl = future ? 0 : heatLevel(drops, good);
              const j = journals.get(date);
              const e = energyOf(j?.energy);
              return (
                <button
                  key={date}
                  type="button"
                  disabled={future}
                  onClick={() => setPicked(date)}
                  aria-label={`${formatLongDate(date)}: ${drops} giọt nước${j ? ', có nhật ký' : ''}`}
                  className={cx(
                    'relative flex aspect-square min-h-10 flex-col items-center justify-center rounded-xl text-sm font-semibold transition active:scale-95',
                    HEAT[lvl],
                    lvl >= 3 ? 'text-onprimary' : 'text-ink',
                    future && 'opacity-35',
                    date === today && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                  )}
                >
                  <span className="tabular-nums">{Number(date.slice(8))}</span>
                  {j && (
                    <span className="absolute right-0.5 bottom-0 text-[10px] leading-none sm:right-1 sm:bottom-0.5" aria-hidden>
                      {e?.emoji ?? '📝'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-muted">
            Ít
            {HEAT.map((h) => (
              <span key={h} className={cx('h-3.5 w-3.5 rounded', h)} />
            ))}
            Nhiều 💧
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            [`${monthDrops} 💧`, 'đã tưới'],
            [`${activeDays} ngày`, 'có làm việc'],
            [formatDuration(monthFocus), 'focus'],
            [`${monthJournals} trang`, 'nhật ký'],
          ].map(([v, l]) => (
            <div key={l} className="rounded-2xl border border-line bg-surface px-3 py-2.5">
              <p className="text-lg font-bold tabular-nums">{v}</p>
              <p className="text-xs text-muted">{l}</p>
            </div>
          ))}
        </div>
      </div>

      <Sheet open={!!picked} onClose={() => setPicked(null)} title={picked ? formatLongDate(picked) : ''}>
        {sum && picked && (
          <div className="flex flex-col gap-4 pb-2">
            <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
              {sum.planned > 0 && (
                <span className="rounded-full bg-surface2 px-2.5 py-1">
                  {sum.done}/{sum.planned} việc theo kế hoạch
                </span>
              )}
              <span className="rounded-full bg-surface2 px-2.5 py-1">{sum.drops} 💧</span>
              <span className="rounded-full bg-surface2 px-2.5 py-1">Focus {formatDuration(sum.focusMin)}</span>
            </div>

            <div>
              <p className="mb-1.5 text-sm font-bold">Việc đã làm</p>
              {sum.doneTasks.length === 0 ? (
                <p className="text-sm text-muted">Không có việc nào được tick ngày này.</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {sum.doneTasks.map((t, i) => (
                    <li key={i} className="flex items-start gap-2 rounded-2xl bg-surface2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 leading-snug">{t.title}</span>
                      <LeverageBadge leverage={t.points >= 3 ? 'high' : 'normal'} compact />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-sm font-bold">Nhật ký</p>
              {sum.journal ? (
                <div className="rounded-2xl border border-line p-3 text-sm leading-relaxed">
                  {energyOf(sum.journal.energy) && (
                    <p className="font-semibold">
                      {energyOf(sum.journal.energy)!.emoji} {energyOf(sum.journal.energy)!.label}
                    </p>
                  )}
                  {sum.journal.did && <p className="mt-1 whitespace-pre-line">{sum.journal.did}</p>}
                  {sum.journal.improve && (
                    <p className="mt-1.5 text-muted">
                      <b className="text-ink">Ngày mai: </b>
                      {sum.journal.improve}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted">Chưa viết nhật ký ngày này.</p>
              )}
              <Button size="sm" variant="soft" className="mt-2" onClick={() => setJournalDate(picked)}>
                <BookOpen size={16} /> {sum.journal ? 'Sửa nhật ký' : 'Viết nhật ký cho ngày này'}
              </Button>
            </div>

            <Button variant="outline" onClick={() => navigate(`/tong-quan/tuan?tuan=${mondayOf(picked)}`)}>
              Nhìn lại cả tuần này
            </Button>
          </div>
        )}
      </Sheet>

      <JournalSheet date={journalDate} onClose={() => setJournalDate(null)} />
    </div>
  );
}
