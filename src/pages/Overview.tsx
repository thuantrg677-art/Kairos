// "Tổng quan": cả chu kỳ 12 tuần trên một trang.
// Lối vào Nhìn lại tuần / Nhật ký / Lịch sử, tuần hiện tại, các con số chính, điểm thực thi từng tuần,
// deadline sắp tới, giờ focus, tiến độ và chi tiết từng mục tiêu.

import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellRing, BookOpen, CalendarDays, ChevronRight, NotebookPen, Timer } from 'lucide-react';
import { useData } from '@/lib/store';
import { addDays, describeDue, formatDM, formatDMY, mondayOf, todayISO, WEEKDAY_SHORT } from '@/lib/dates';
import { defaultReviewWeek } from '@/lib/review';
import { cycleWeek, getActiveCycle, goalGrowth, weekStats } from '@/lib/logic';
import { cycleScore, describeHealth, goalHealth, stageNames } from '@/lib/garden';
import { fmtMinShort } from '@/lib/focusStats';
import { dropsBetween, focusSummary, goalDetail, upcomingDeadlines } from '@/lib/overview';
import type { Goal, Task } from '@/lib/types';
import { Button, Card, cx, EmptyState, LeverageBadge, Sheet } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant } from '@/components/Plant';
import { PlantBadge } from '@/components/pickers';
import { TaskEditor } from '@/components/Editors';

const TARGET = 0.85; // Mục tiêu của 12 Week Year: điểm thực thi từ 85% trở lên

function LinkCard({ icon, title, sub, onClick }: { icon: ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-3xl border border-line bg-surface p-3.5 text-left transition hover:bg-surface2 active:scale-[.99]">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-ink">{title}</span>
        <span className="block text-[13px] leading-snug text-muted">{sub}</span>
      </span>
      <ChevronRight size={18} className="shrink-0 text-muted" />
    </button>
  );
}

/** Lối vào ba trang nhìn lại */
function ReviewLinks() {
  const navigate = useNavigate();
  const d = useData();
  const week = defaultReviewWeek();
  const reviewed = d.weekly_reviews.some((r) => r.week_start === week && (r.ai_review || r.wins || r.lessons || r.next_focus));
  const journaled = d.journals.some((j) => j.date === todayISO());
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <LinkCard icon={<NotebookPen size={20} />} title="Nhìn lại tuần" sub={reviewed ? `Tuần ${formatDM(week)} đã nhìn lại ✓` : `Tuần ${formatDM(week)} chưa nhìn lại`} onClick={() => navigate('/tong-quan/tuan')} />
      <LinkCard icon={<BookOpen size={20} />} title="Nhật ký" sub={journaled ? 'Hôm nay đã viết ✓' : 'Hôm nay chưa viết'} onClick={() => navigate('/tong-quan/nhat-ky')} />
      <LinkCard icon={<CalendarDays size={20} />} title="Lịch sử" sub="Xem lại từng ngày theo lịch" onClick={() => navigate('/tong-quan/lich-su')} />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl bg-surface2 px-3 py-2.5">
      <p className="text-[12px] leading-snug font-semibold text-muted">{label}</p>
      <p className="mt-0.5 text-[22px] leading-tight font-bold text-ink tabular-nums">{value}</p>
      {sub && <p className="text-[12px] leading-snug text-muted">{sub}</p>}
    </div>
  );
}

function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-base font-bold">{children}</h2>
      {action}
    </div>
  );
}

/** Thanh chia thời gian focus: việc 20% / việc 80% / không gắn việc */
function SplitBar({ high, normal, none }: { high: number; normal: number; none: number }) {
  const total = high + normal + none;
  if (total <= 0) return <div className="h-3 rounded-full bg-surface2" />;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <div className="flex h-3 overflow-hidden rounded-full bg-surface2" role="img" aria-label={`Việc 20%: ${Math.round((high / total) * 100)}%, việc 80%: ${Math.round((normal / total) * 100)}%`}>
      <span className="h-full bg-high" style={{ width: pct(high) }} />
      <span className="h-full bg-primary/55" style={{ width: pct(normal) }} />
      <span className="h-full bg-line" style={{ width: pct(none) }} />
    </div>
  );
}

function Deadlines({ onOpen }: { onOpen: (t: Task) => void }) {
  const d = useData();
  const [all, setAll] = useState(false);
  const today = todayISO();
  const list = useMemo(() => upcomingDeadlines(d, today), [d, today]);
  const shown = all ? list : list.slice(0, 5);
  return (
    <Card className="p-4">
      <CardTitle>Deadline sắp tới</CardTitle>
      <p className="mt-0.5 text-[13px] text-muted">
        Việc chưa xong có hạn trong 2 tuần tới. Biểu tượng <BellRing size={13} className="-mt-0.5 inline text-accent" aria-label="chuông" /> là deadline quan trọng, được nhắc trước 7, 3, 1 ngày.
      </p>
      {list.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-surface2 px-3 py-3 text-sm text-muted">Không có hạn nào trong 2 tuần tới. 🌿</p>
      ) : (
        <ul className="mt-2 flex flex-col">
          {shown.map(({ task, goal, days }) => (
            <li key={task.id}>
              <button type="button" onClick={() => onOpen(task)} className="-mx-2 flex w-[calc(100%+1rem)] items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface2">
                <span
                  className={cx(
                    'flex w-[66px] shrink-0 flex-col items-center rounded-xl px-1 py-1 text-center leading-tight',
                    days < 0 ? 'bg-danger/12 text-danger' : days <= 1 ? 'bg-highsoft text-high' : 'bg-surface2 text-ink',
                  )}
                >
                  <span className="text-[15px] font-bold tabular-nums">{formatDM(task.due_date!)}</span>
                  <span className="text-[11px] font-semibold">{days < 0 ? `Trễ ${-days}n` : days === 0 ? 'Hôm nay' : days === 1 ? 'Ngày mai' : `${days} ngày`}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[15px] font-semibold text-ink">{task.title}</span>
                    {task.important && <BellRing size={14} className="shrink-0 text-accent" aria-label="Deadline quan trọng" />}
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    {task.leverage === 'high' && <LeverageBadge leverage="high" compact />}
                    <span className="truncate text-xs text-muted">{goal ? goal.title : 'Không thuộc mục tiêu'}</span>
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {list.length > 5 && (
        <Button variant="ghost" size="sm" className="mt-1 w-full" onClick={() => setAll(!all)}>
          {all ? 'Thu gọn' : `Xem thêm ${list.length - 5} việc`}
        </Button>
      )}
    </Card>
  );
}

function FocusCard() {
  const navigate = useNavigate();
  const d = useData();
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);
  const f = useMemo(() => focusSummary(d, cycle, today), [d, cycle, today]);
  const s = f.split;
  const tracked = s.high + s.normal;
  const delta = f.weekMin - f.lastWeekMin;
  return (
    <Card className="p-4">
      <CardTitle
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/focus')}>
            <Timer size={16} /> Focus
          </Button>
        }
      >
        Giờ focus
      </CardTitle>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Tuần này" value={fmtMinShort(f.weekMin)} sub={f.lastWeekMin || f.weekMin ? `${delta >= 0 ? '+' : '−'}${fmtMinShort(Math.abs(delta))} so với tuần trước` : 'Chưa có phiên nào'} />
        <Stat label={cycle ? 'Cả chu kỳ' : '12 tuần qua'} value={fmtMinShort(f.cycleMin)} />
        <Stat label="7 ngày qua" value={`${f.activeDays}/7`} sub="ngày có focus" />
      </div>
      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-2 text-[13px]">
          <span className="font-semibold text-ink">Thời gian cho việc 20%</span>
          <span className="font-bold text-high tabular-nums">{tracked > 0 ? `${Math.round((s.high / tracked) * 100)}%` : '–'}</span>
        </div>
        <div className="mt-1.5">
          <SplitBar high={s.high} normal={s.normal} none={s.none} />
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-high" />Việc 20% · {fmtMinShort(s.high)}</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary/55" />Việc 80% · {fmtMinShort(s.normal)}</span>
          {s.none > 0 && <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-line" />Không gắn việc · {fmtMinShort(s.none)}</span>}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">Theo Pareto, phần lớn kết quả đến từ việc 20%: cố gắng dành cho chúng nhiều giờ focus nhất.</p>
      </div>
    </Card>
  );
}

function GoalSheet({ goal, onClose, onEditTask }: { goal: Goal | null; onClose: () => void; onEditTask: (t: Task) => void }) {
  const d = useData();
  const navigate = useNavigate();
  const cycle = getActiveCycle(d.cycles);
  const today = todayISO();
  const info = useMemo(() => (goal ? goalDetail(goal, cycle, d, today) : null), [goal, cycle, d, today]);
  if (!goal || !info) return null;
  const vision = d.visions.find((v) => v.id === goal.vision_id);
  const g = info.growth;
  return (
    <Sheet
      open
      onClose={onClose}
      title="Chi tiết mục tiêu"
      footer={
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => {
            onClose();
            navigate('/muc-tieu');
          }}
        >
          Sửa trong Mục tiêu
        </Button>
      }
    >
      <div className="flex items-center gap-3">
        <PlantBadge species={goal.plant} stage={g.stage} size={72} wilt={info.health.wilt} />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] leading-snug font-bold text-ink">{goal.title}</p>
          {vision && <p className="mt-0.5 truncate text-[13px] text-muted">→ {vision.title}</p>}
          <p className="mt-1 text-[13px] text-muted">
            {stageNames(goal)[g.stage]} · {describeHealth(info.health)}
          </p>
        </div>
      </div>
      {goal.measure && (
        <p className="mt-3 rounded-2xl bg-surface2 px-3 py-2 text-[13px] leading-snug text-ink">
          <b>Đo bằng:</b> {goal.measure} · hạn {formatDMY(goal.due_date)}
        </p>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Cây đã lớn" value={`${Math.round(g.pct * 100)}%`} sub={`${g.earned}/${g.total} 💧`} />
        <Stat label="Tuần này" value={info.weekPlanned ? `${info.weekDone}/${info.weekPlanned}` : '–'} sub="lượt việc" />
        <Stat label="Focus" value={fmtMinShort(info.focusMin)} sub="trong chu kỳ" />
      </div>

      <h3 className="mt-5 mb-1 text-[13px] font-bold tracking-wide text-muted uppercase">Đầu việc ({info.tasks.length})</h3>
      {info.tasks.length === 0 ? (
        <p className="text-sm text-muted">Mục tiêu này chưa có đầu việc nào.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {info.tasks.map(({ task, done, planned, drops }) => {
            const finished = task.kind === 'once' && !!task.done_at;
            const meta =
              task.kind === 'recurring'
                ? `${task.weekdays.length === 7 ? 'Hằng ngày' : task.weekdays.map((w) => WEEKDAY_SHORT[w - 1]).join(', ')} · đã làm ${done}/${planned} lượt`
                : finished
                  ? 'Đã xong ✓'
                  : task.due_date
                    ? describeDue(task.due_date, today)
                    : 'Chưa đặt hạn';
            return (
              <li key={task.id}>
                <button type="button" onClick={() => onEditTask(task)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface2">
                  <span className="min-w-0 flex-1">
                    <span className={cx('flex items-center gap-1.5 text-[15px] font-semibold', finished ? 'text-muted line-through' : 'text-ink')}>
                      <span className="truncate">{task.title}</span>
                      {task.important && !finished && <BellRing size={14} className="shrink-0 text-accent" aria-label="Deadline quan trọng" />}
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <LeverageBadge leverage={task.leverage} compact />
                      <span className="truncate text-xs text-muted">{meta}</span>
                    </span>
                  </span>
                  <span className="w-11 shrink-0 text-right text-xs font-semibold text-water tabular-nums">{drops} 💧</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Sheet>
  );
}

export default function Overview() {
  const d = useData();
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);
  const week = cycle ? cycleWeek(cycle, today) : 0;
  const [goalOpen, setGoalOpen] = useState<Goal | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const weeks = useMemo(() => {
    if (!cycle || week === 0) return [];
    return Array.from({ length: week }, (_, i) => {
      const start = addDays(cycle.start_date, i * 7);
      return { n: i + 1, start, ...weekStats(d, start, today) };
    });
  }, [d, cycle, week, today]);
  const current = weeks[weeks.length - 1];
  const score = useMemo(() => (cycle ? cycleScore(cycle, d, today) : null), [cycle, d, today]);
  const weekDrops = useMemo(() => dropsBetween(d, mondayOf(today), today), [d, today]);
  const cycleDrops = useMemo(() => (cycle ? dropsBetween(d, cycle.start_date, today) : 0), [d, cycle, today]);

  const goals = useMemo(
    () => d.goals.filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id)).sort((a, b) => a.sort - b.sort),
    [d.goals, cycle],
  );

  const editor = <TaskEditor open={!!editTask} onClose={() => setEditTask(null)} task={editTask} />;

  if (!cycle) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Tổng quan" />
        <div className="flex flex-col gap-4 px-4 lg:px-8">
          <ReviewLinks />
          <Card>
            <EmptyState art={<Plant species="thong" stage={1} size={84} />} title="Chưa có chu kỳ 12 tuần" />
          </Card>
          <Deadlines onOpen={setEditTask} />
          <FocusCard />
        </div>
        {editor}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Tổng quan" subtitle={`Chu kỳ ${formatDMY(cycle.start_date)} – ${formatDMY(cycle.end_date)}`} />

      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <ReviewLinks />

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
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label="Điểm chu kỳ" value={score && score.planned ? `${Math.round(score.pct * 100)}%` : '–'} sub={score ? `${score.done}/${score.planned} việc` : undefined} />
            <Stat label="💧 tuần này" value={weekDrops} sub={`${cycleDrops} 💧 cả chu kỳ`} />
            <Stat label="Mục tiêu" value={goals.length} sub={`${goals.filter((g) => goalGrowth(g, cycle, d).stage >= 4).length} cây đã nở`} />
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

        <Deadlines onOpen={setEditTask} />

        <FocusCard />

        <Card className="p-4">
          <CardTitle>Tiến độ các mục tiêu</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted">Bấm vào một mục tiêu để xem từng đầu việc.</p>
          <div className="mt-2 flex flex-col">
            {goals.map((g) => {
              const growth = goalGrowth(g, cycle, d);
              const vision = d.visions.find((v) => v.id === g.vision_id);
              return (
                <button key={g.id} type="button" onClick={() => setGoalOpen(g)} className="-mx-2 flex items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-surface2">
                  <PlantBadge species={g.plant} stage={growth.stage} size={48} wilt={goalHealth(g, cycle, d, today).wilt} />
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
                  <ChevronRight size={18} className="shrink-0 text-muted" />
                </button>
              );
            })}
            {goals.length === 0 && <p className="text-sm text-muted">Chưa có mục tiêu 12 tuần nào.</p>}
          </div>
        </Card>
      </div>

      <GoalSheet goal={goalOpen} onClose={() => setGoalOpen(null)} onEditTask={setEditTask} />
      {editor}
    </div>
  );
}
