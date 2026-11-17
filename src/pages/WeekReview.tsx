// "Nhìn lại tuần": điểm thực thi, từng ngày, từng mục tiêu, việc 20% bị bỏ lỡ, nhật ký,
// ba câu tự nhìn lại và AI nhận xét tuần.

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { addDays, formatDM, formatDuration, isoWeekday, mondayOf, todayISO, WEEKDAY_SHORT } from '@/lib/dates';
import { cycleWeek, getActiveCycle, goalGrowth } from '@/lib/logic';
import { goalHealth } from '@/lib/garden';
import { defaultReviewWeek, energyOf, saveReview, weekReport } from '@/lib/review';
import { useAI } from '@/lib/ai';
import { Button, Card, cx, Field, IconButton, LeverageBadge } from '@/components/ui';
import { SubPageHeader } from '@/components/AppShell';
import { PlantBadge } from '@/components/pickers';
import { JournalSheet } from '@/components/Journal';
import { AIButton, QuotaHint } from '@/components/AI';

const TARGET = 0.85;

export default function WeekReview() {
  const d = useData();
  const gd3 = useStore((s) => s.gd3);
  const today = todayISO();
  const [params, setParams] = useSearchParams();
  const thisMonday = mondayOf(today);
  const requested = params.get('tuan');
  const week = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) && requested <= thisMonday ? mondayOf(requested) : defaultReviewWeek(today);
  const setWeek = (w: string) => setParams({ tuan: w }, { replace: true });

  const cycle = getActiveCycle(d.cycles);
  const weekNo = cycle && week >= cycle.start_date && week <= cycle.end_date ? cycleWeek(cycle, week) : 0;
  const rep = useMemo(() => weekReport(d, week, today), [d, week, today]);
  const review = d.weekly_reviews.find((r) => r.week_start === week) ?? null;
  const [journalDate, setJournalDate] = useState<string | null>(null);

  // Ba câu tự nhìn lại
  const [wins, setWins] = useState('');
  const [lessons, setLessons] = useState('');
  const [nextFocus, setNextFocus] = useState('');
  useEffect(() => {
    setWins(review?.wins ?? '');
    setLessons(review?.lessons ?? '');
    setNextFocus(review?.next_focus ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week, review?.id]);
  const dirty = (review?.wins ?? '') !== wins || (review?.lessons ?? '') !== lessons || (review?.next_focus ?? '') !== nextFocus;

  const saveNotes = () => {
    if (!gd3) return useStore.getState().toast('Chủ app cần chạy file 003_gd3.sql trong Supabase thì mới lưu được phần này.');
    if (saveReview(week, { wins: wins.trim(), lessons: lessons.trim(), next_focus: nextFocus.trim(), planned: rep.planned, done: rep.done })) {
      useStore.getState().toast('Đã lưu phần nhìn lại tuần', 'success');
    }
  };

  const ai = useAI();
  const askAI = async () => {
    const { result } = await ai.run('weekly_review', {
      week_start: week,
      stats: {
        planned: rep.planned,
        done: rep.done,
        drops: rep.drops,
        focus_min: Math.round(rep.focusMin),
        high_min: Math.round(rep.split.high),
        normal_min: Math.round(rep.split.normal),
      },
      goals: rep.goals.map((g) => ({
        goal_id: g.goal.id,
        planned: g.planned,
        done: g.done,
        drops: g.drops,
        dry_days: week === thisMonday ? goalHealth(g.goal, cycle, d, today).dryDays : 0,
      })),
      missed: rep.missedHigh.map((m) => ({ title: m.task.title, missed: m.missed })),
      days: rep.days.filter((x) => !x.future).map((x) => ({ date: x.date, planned: x.planned, done: x.done, focus_min: Math.round(x.focusMin) })),
      notes: { wins, lessons, next_focus: nextFocus },
    });
    if (!result) return;
    saveReview(week, {
      ai_review: { ...result, at: new Date().toISOString() },
      planned: rep.planned,
      done: rep.done,
      ...(dirty && gd3 ? { wins: wins.trim(), lessons: lessons.trim(), next_focus: nextFocus.trim() } : {}),
    });
  };

  const earliest = mondayOf(addDays(today, -98));
  const ongoing = week === thisMonday;
  const maxDayPlanned = Math.max(1, ...rep.days.map((x) => x.planned));

  return (
    <div className="mx-auto max-w-2xl">
      <SubPageHeader title="Nhìn lại tuần" subtitle={weekNo ? `Tuần ${weekNo}/12 của chu kỳ` : 'Ngoài chu kỳ hiện tại'} />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        {/* Chọn tuần */}
        <div className="flex items-center justify-between rounded-3xl border border-line bg-surface px-1.5 py-1">
          <IconButton label="Tuần trước" onClick={() => setWeek(addDays(week, -7))} disabled={week <= earliest}>
            <ChevronLeft size={22} />
          </IconButton>
          <div className="text-center">
            <p className="text-[15px] font-bold">
              {formatDM(week)} – {formatDM(addDays(week, 6))}
            </p>
            <p className="text-xs text-muted">{ongoing ? 'Tuần này (chưa hết)' : week === addDays(thisMonday, -7) ? 'Tuần trước' : `${Math.round((Date.parse(thisMonday) - Date.parse(week)) / 604800000)} tuần trước`}</p>
          </div>
          <IconButton label="Tuần sau" onClick={() => setWeek(addDays(week, 7))} disabled={week >= thisMonday}>
            <ChevronRight size={22} />
          </IconButton>
        </div>

        {/* Điểm thực thi */}
        <Card className="p-4">
          <h2 className="text-base font-bold">Điểm thực thi</h2>
          <div className="mt-2 flex items-end gap-3">
            <span className={cx('text-5xl leading-none font-bold tabular-nums', rep.pct >= TARGET ? 'text-primary' : 'text-ink')}>{Math.round(rep.pct * 100)}%</span>
            <span className="pb-1 text-sm text-muted">
              {rep.done}/{rep.planned} lượt việc{ongoing ? ' tính đến hôm nay' : ''}
            </span>
          </div>
          <div className="relative mt-3 h-3 rounded-full bg-surface2">
            <span className="absolute inset-y-0 left-0 rounded-full bg-primary transition-all" style={{ width: `${rep.pct * 100}%` }} />
            <span className="absolute -top-1 -bottom-1 w-0.5 bg-accent" style={{ left: `${TARGET * 100}%` }} aria-hidden />
          </div>
          <p className="mt-1.5 text-xs text-muted">{rep.pct >= TARGET ? 'Đạt mốc 85% của 12 Week Year. Tuyệt!' : 'Mốc 85% là vạch màu cam. Không cần hoàn hảo, chỉ cần đều.'}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-surface2 px-2 py-2">
              <p className="text-lg font-bold tabular-nums">{rep.drops} 💧</p>
              <p className="text-[11px] text-muted">đã tưới</p>
            </div>
            <div className="rounded-2xl bg-surface2 px-2 py-2">
              <p className="text-lg font-bold tabular-nums">{formatDuration(rep.focusMin)}</p>
              <p className="text-[11px] text-muted">focus</p>
            </div>
            <div className="rounded-2xl bg-surface2 px-2 py-2">
              <p className="text-lg font-bold tabular-nums">{rep.split.total >= 1 ? `${Math.round((rep.split.high / rep.split.total) * 100)}%` : '–'}</p>
              <p className="text-[11px] leading-tight text-muted">focus cho việc 20%</p>
            </div>
          </div>
        </Card>

        {/* Từng ngày */}
        <Card className="p-4">
          <h2 className="text-base font-bold">Từng ngày</h2>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {rep.days.map((x) => {
              const e = energyOf(x.journal?.energy);
              const pct = x.planned ? x.done / x.planned : 0;
              return (
                <button
                  key={x.date}
                  type="button"
                  disabled={x.future}
                  onClick={() => setJournalDate(x.date)}
                  className={cx('flex flex-col items-center rounded-2xl py-1.5 transition', x.date === today ? 'bg-soft' : 'hover:bg-surface2', x.future && 'opacity-40')}
                  aria-label={`${WEEKDAY_SHORT[isoWeekday(x.date) - 1]} ${formatDM(x.date)}: ${x.done}/${x.planned} việc${e ? `, năng lượng ${e.label}` : ''}`}
                >
                  <span className="text-[11px] font-semibold text-muted">{WEEKDAY_SHORT[isoWeekday(x.date) - 1]}</span>
                  <span className="mt-1 flex h-16 w-5 items-end overflow-hidden rounded-md bg-surface2">
                    <span className={cx('w-full rounded-md', pct >= TARGET ? 'bg-primary' : 'bg-primary/50')} style={{ height: `${x.planned ? Math.max(6, (x.done / maxDayPlanned) * 100) : 0}%` }} />
                  </span>
                  <span className="mt-1 text-[11px] font-semibold tabular-nums">{x.future ? '' : `${x.done}/${x.planned}`}</span>
                  <span className="mt-0.5 h-5 text-base leading-5" aria-hidden>
                    {e?.emoji ?? (x.journal ? '📝' : '')}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[12.5px] text-muted">Cột là số việc đã làm; biểu tượng là năng lượng trong nhật ký. Bấm một ngày để xem hoặc viết nhật ký.</p>
        </Card>

        {/* Từng mục tiêu */}
        {rep.goals.length > 0 && (
          <Card className="p-4">
            <h2 className="text-base font-bold">Từng mục tiêu</h2>
            <div className="mt-3 flex flex-col gap-3">
              {rep.goals.map((g) => {
                const c = d.cycles.find((x) => x.id === g.goal.cycle_id) ?? null;
                const stage = goalGrowth(g.goal, c, d).stage;
                const pct = g.planned ? g.done / g.planned : 0;
                return (
                  <div key={g.goal.id} className="flex items-center gap-3">
                    <PlantBadge species={g.goal.plant} stage={stage} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{g.goal.title}</p>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {g.done}/{g.planned} · {g.drops} 💧
                        </span>
                      </div>
                      <span className="mt-1 block h-2 overflow-hidden rounded-full bg-surface2">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(g.planned ? 2 : 0, pct * 100)}%` }} />
                      </span>
                      {g.planned === 0 && <p className="mt-0.5 text-xs text-high">Tuần này không có việc nào cho mục tiêu này.</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {rep.missedHigh.length > 0 && (
          <Card className="p-4">
            <h2 className="text-base font-bold">Việc 20% bị bỏ lỡ</h2>
            <p className="mt-0.5 text-[13px] text-muted">Những việc đòn bẩy cao nhất mà tuần này chưa làm được.</p>
            <div className="mt-3 flex flex-col gap-2">
              {rep.missedHigh.map((m) => (
                <div key={m.task.id} className="rounded-2xl bg-surface2 px-3 py-2.5">
                  <p className="text-sm leading-snug font-semibold">{m.task.title}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    <LeverageBadge leverage="high" compact />
                    {m.task.kind === 'recurring' ? `bỏ lỡ ${m.missed} lượt` : 'đã quá hạn'}
                    {m.goal && ` · ${m.goal.title}`}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Tự nhìn lại */}
        <Card className="p-4">
          <h2 className="text-base font-bold">Tự nhìn lại</h2>
          <p className="mt-0.5 mb-3 text-[13px] text-muted">Ba câu hỏi ngắn. Viết thật lòng, chỉ mình bạn xem.</p>
          {!gd3 && (
            <p className="mb-3 rounded-2xl bg-highsoft px-3 py-2 text-[13px] text-high">
              Phần này cần chủ app chạy file <b>003_gd3.sql</b> trong Supabase (xem hướng dẫn giai đoạn 3). Trong lúc chờ, bạn vẫn dùng được AI nhận xét tuần.
            </p>
          )}
          <div className="flex flex-col gap-3">
            <Field label="Tuần này mình làm tốt điều gì?">
              <textarea className="k-input resize-none" rows={3} maxLength={4000} value={wins} onChange={(e) => setWins(e.target.value)} disabled={!gd3} />
            </Field>
            <Field label="Điều gì chưa ổn, vì sao?">
              <textarea className="k-input resize-none" rows={3} maxLength={4000} value={lessons} onChange={(e) => setLessons(e.target.value)} disabled={!gd3} />
            </Field>
            <Field label="Tuần tới mình sẽ tập trung vào…">
              <textarea className="k-input resize-none" rows={3} maxLength={4000} value={nextFocus} onChange={(e) => setNextFocus(e.target.value)} disabled={!gd3} />
            </Field>
            <Button variant={dirty ? 'primary' : 'soft'} onClick={saveNotes} disabled={!gd3 || !dirty}>
              <Save size={17} /> {dirty || !review?.wins ? 'Lưu phần nhìn lại' : 'Đã lưu'}
            </Button>
          </div>
        </Card>

        {/* AI nhận xét */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">AI nhận xét tuần</h2>
            <AIButton busy={!!ai.busy} onClick={askAI} variant={review?.ai_review ? 'outline' : 'primary'}>
              {review?.ai_review ? 'Nhận xét lại' : 'AI nhận xét tuần này'}
            </AIButton>
          </div>
          {!review?.ai_review ? (
            <p className="mt-2 text-[13px] leading-snug text-muted">
              AI đọc số liệu tuần, nhật ký và phần tự nhìn lại của bạn rồi gợi ý 2–3 việc cụ thể cho tuần tới. Tốn 1 lượt AI.
            </p>
          ) : (
            <div className={cx('k-fade-in mt-3 flex flex-col gap-3', ai.busy && 'opacity-50')}>
              <p className="text-[15px] leading-snug font-semibold text-ink">{review.ai_review.headline}</p>
              {review.ai_review.went_well.length > 0 && (
                <div>
                  <p className="text-xs font-bold tracking-wide text-primary uppercase">Làm tốt</p>
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm leading-snug">
                    {review.ai_review.went_well.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.ai_review.improve.length > 0 && (
                <div>
                  <p className="text-xs font-bold tracking-wide text-high uppercase">Cần cải thiện</p>
                  <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm leading-snug">
                    {review.ai_review.improve.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              {review.ai_review.next_steps.length > 0 && (
                <div className="rounded-2xl bg-soft px-3.5 py-3">
                  <p className="text-xs font-bold tracking-wide text-ink uppercase">Tuần tới</p>
                  <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5 text-sm leading-snug">
                    {review.ai_review.next_steps.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ol>
                </div>
              )}
              {review.ai_review.encouragement && <p className="text-sm text-muted italic">🌱 {review.ai_review.encouragement}</p>}
              <QuotaHint />
            </div>
          )}
        </Card>
      </div>

      <JournalSheet date={journalDate} onClose={() => setJournalDate(null)} />
    </div>
  );
}
