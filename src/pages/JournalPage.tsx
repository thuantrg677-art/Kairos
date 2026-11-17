// "Nhật ký": năng lượng 14 ngày gần đây và các trang nhật ký đã viết.

import { useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
import { useData } from '@/lib/store';
import { addDays, formatDM, isoWeekday, todayISO, WEEKDAY_SHORT } from '@/lib/dates';
import { energyOf } from '@/lib/review';
import { Button, Card, cx, EmptyState } from '@/components/ui';
import { SubPageHeader } from '@/components/AppShell';
import { JournalEntry, JournalSheet } from '@/components/Journal';
import { Plant } from '@/components/Plant';

const PAGE = 20;

export default function JournalPage() {
  const d = useData();
  const today = todayISO();
  const [editing, setEditing] = useState<string | null>(null);
  const [shown, setShown] = useState(PAGE);

  const list = useMemo(() => [...d.journals].sort((a, b) => b.date.localeCompare(a.date)), [d.journals]);
  const byDate = useMemo(() => new Map(d.journals.map((j) => [j.date, j])), [d.journals]);
  const hasToday = byDate.has(today);
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13));
  const energies = last14.map((date) => byDate.get(date)?.energy ?? null).filter((v): v is number => v != null);
  const avg = energies.length ? energies.reduce((a, b) => a + b, 0) / energies.length : null;
  const streak = (() => {
    let n = 0;
    for (let day = hasToday ? today : addDays(today, -1); byDate.has(day); day = addDays(day, -1)) n++;
    return n;
  })();

  return (
    <div className="mx-auto max-w-2xl">
      <SubPageHeader title="Nhật ký" subtitle="Mỗi tối một phút: năng lượng, điều đã làm được, điều muốn làm tốt hơn." />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <Button onClick={() => setEditing(today)}>
          <PenLine size={18} /> {hasToday ? 'Sửa nhật ký hôm nay' : 'Viết nhật ký hôm nay'}
        </Button>

        <Card className="p-4">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-base font-bold">Năng lượng 14 ngày qua</h2>
            {avg != null && <span className="text-sm text-muted">TB {energyOf(Math.round(avg))?.emoji} {String(Math.round(avg * 10) / 10).replace('.', ',')}/5</span>}
          </div>
          <div className="mt-3 flex h-28 items-end gap-1">
            {last14.map((date) => {
              const j = byDate.get(date);
              const e = energyOf(j?.energy);
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setEditing(date)}
                  className="flex h-full flex-1 flex-col items-center justify-end"
                  aria-label={`${formatDM(date)}: ${j ? (e ? e.label : 'đã viết nhật ký') : 'chưa viết'}`}
                  title={`${formatDM(date)}${e ? ` · ${e.label}` : ''}`}
                >
                  {e && (
                    <span className="mb-0.5 text-[13px] leading-none" aria-hidden>
                      {e.emoji}
                    </span>
                  )}
                  <span
                    className={cx('w-full max-w-7 rounded-t-md', date === today ? 'bg-primary' : j ? 'bg-primary/50' : 'bg-surface2')}
                    style={{ height: e ? `${e.v * 15}%` : j ? '8%' : '4%' }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mt-1 flex gap-1">
            {last14.map((date) => (
              <span key={date} className={cx('flex-1 text-center text-[10px] leading-tight', date === today ? 'font-bold text-ink' : 'text-muted')}>
                {WEEKDAY_SHORT[isoWeekday(date) - 1]}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[13px] text-muted">
            {streak > 1 ? `🔥 Bạn đã viết nhật ký ${streak} ngày liền.` : 'Bấm vào một cột để viết hoặc sửa nhật ký ngày đó.'}
          </p>
        </Card>

        {list.length === 0 ? (
          <Card>
            <EmptyState art={<Plant species="linh-lan" stage={2} size={80} />} title="Chưa có trang nhật ký nào">
              Viết vài dòng mỗi tối giúp bạn thấy mình tiến bộ, và giúp AI nhận xét tuần sát hơn.
            </EmptyState>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {list.slice(0, shown).map((j) => (
              <JournalEntry key={j.id} journal={j} onEdit={() => setEditing(j.date)} />
            ))}
            {list.length > shown && (
              <Button variant="ghost" onClick={() => setShown((n) => n + PAGE)}>
                Xem thêm
              </Button>
            )}
          </div>
        )}
      </div>

      <JournalSheet date={editing} onClose={() => setEditing(null)} />
    </div>
  );
}
