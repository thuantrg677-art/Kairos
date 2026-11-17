// Màn "Hôm nay": việc cần làm theo thứ tự ưu tiên + dòng thời gian của ngày.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Inbox, Plus, Settings, Wand2 } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { formatDuration, formatLongDate, greeting, isoWeekday, nowMinutes, todayISO } from '@/lib/dates';
import { autoArrange, cycleWeek, dayRange, freeSlots, getActiveCycle, itemsForDate, otherOpenTasks, sumIntervals, type Interval } from '@/lib/logic';
import type { Task } from '@/lib/types';
import { Button, Card, cx, EmptyState, SectionTitle } from '@/components/ui';
import { Scenery } from '@/components/Scenery';
import { Plant } from '@/components/Plant';
import { TaskRow } from '@/components/TaskRow';
import { Timeline } from '@/components/Timeline';
import { TaskEditor } from '@/components/Editors';
import { useInboxCount } from '@/components/AppShell';
import { NotificationBell } from '@/components/Notifications';
import { AIButton, QuotaHint } from '@/components/AI';
import { useAI } from '@/lib/ai';
import { JournalCard, WeekReviewPrompt } from '@/components/Journal';
import { CycleEndBanner } from '@/components/CycleWrap';
import { PracticeCard } from '@/components/Practice';

export default function Today() {
  const d = useData();
  const navigate = useNavigate();
  const inboxCount = useInboxCount();
  const today = todayISO();
  const [now, setNow] = useState(nowMinutes());
  const [editing, setEditing] = useState<Task | null>(null);
  const [adding, setAdding] = useState(false);
  const [showOthers, setShowOthers] = useState(false);
  const [aiNote, setAiNote] = useState('');
  const ai = useAI();

  // Cập nhật vạch "bây giờ" mỗi phút
  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);

  const cycle = getActiveCycle(d.cycles);
  const week = cycle ? cycleWeek(cycle, today) : 0;
  const items = useMemo(() => itemsForDate(d, today), [d, today]);
  const others = useMemo(() => otherOpenTasks(d, today), [d, today]);

  const wd = isoWeekday(today);
  const fixedToday = useMemo(() => d.fixed_events.filter((e) => e.weekday === wd).sort((a, b) => a.start_min - b.start_min), [d.fixed_events, wd]);
  const range = dayRange(d.profile, fixedToday);
  const timed = items.filter((i) => i.block?.start_min != null);
  const occupied: Interval[] = [
    ...fixedToday.map((e) => ({ start: e.start_min, end: e.end_min })),
    ...timed.filter((i) => !i.done).map((i) => ({ start: i.block!.start_min!, end: i.block!.start_min! + i.block!.duration_min })),
  ];
  const free = freeSlots(range, occupied);
  // Thời gian rảnh còn lại tính từ bây giờ
  const freeLeft = sumIntervals(free.map((f) => ({ start: Math.max(f.start, now), end: f.end })).filter((f) => f.end > f.start));

  const doneCount = items.filter((i) => i.done).length;
  const drops = d.task_completions.filter((c) => c.date === today).reduce((n, c) => n + c.points, 0);
  const unscheduled = items.filter((i) => !i.done && i.block?.start_min == null);

  const st = useStore.getState();

  /** Đặt giờ cho một việc (tạo mới hoặc cập nhật khối lịch của hôm nay) */
  const place = (taskId: string, start_min: number, duration_min: number, source: 'manual' | 'auto' | 'ai') => {
    const block = d.schedule_blocks.find((b) => b.task_id === taskId && b.date === today);
    if (block) st.update('schedule_blocks', block.id, { start_min, duration_min, source });
    else st.insert('schedule_blocks', { task_id: taskId, date: today, start_min, duration_min, source });
  };

  /** Bỏ giờ: việc lặp lại thì xóa khối, việc một lần thì giữ lại trong hôm nay nhưng không có giờ */
  const unschedule = (blockId: string) => {
    const block = d.schedule_blocks.find((b) => b.id === blockId);
    if (!block) return;
    const task = d.tasks.find((t) => t.id === block.task_id);
    if (task?.kind === 'once') st.update('schedule_blocks', blockId, { start_min: null });
    else st.remove('schedule_blocks', blockId);
  };

  /** AI xếp lịch; nếu AI không dùng được (hết lượt, chưa bật, offline…) thì xếp theo quy tắc */
  const aiArrange = async () => {
    const from = Math.max(now, range.start);
    const { result, error } = await ai.run(
      'schedule',
      {
        now_min: from,
        free: free.filter((f) => f.end > from).map((f) => ({ start: Math.max(f.start, from), end: f.end })),
        fixed: fixedToday.map((e) => ({ title: e.title, start: e.start_min, end: e.end_min })),
        items: unscheduled.map((i) => ({ id: i.task.id, title: i.task.title, leverage: i.task.leverage, estimate_min: i.task.estimate_min, due_date: i.task.due_date, goal_id: i.task.goal_id })),
      },
      { silent: true },
    );
    if (!result) {
      if (error?.code === 'no_space' || error?.code === 'bad_request') return st.toast(error.message);
      st.toast(`${error?.message ?? 'AI chưa trả lời được.'} Mình xếp theo quy tắc thay nhé.`);
      setAiNote('');
      return arrangeAll(true);
    }
    result.placed.forEach((p) => place(p.task_id, p.start_min, p.duration_min, 'ai'));
    setAiNote(result.note);
    if (result.placed.length === 0) st.toast('AI chưa tìm được chỗ hợp lý cho việc nào. Hôm nay khá kín rồi.');
    else st.toast(`AI đã xếp ${result.placed.length} việc${result.left.length ? `, để lại ${result.left.length} việc chưa có chỗ` : ''}.`, 'success');
  };

  const arrangeAll = (quiet = false) => {
    const { placed, left } = autoArrange(items, free, Math.max(now, range.start));
    if (quiet) {
      placed.forEach((p) => place(p.task_id, p.start_min, p.duration_min, 'auto'));
      return;
    }
    placed.forEach((p) => place(p.task_id, p.start_min, p.duration_min, 'auto'));
    if (placed.length === 0 && left.length === 0) st.toast('Không còn việc nào cần xếp giờ.');
    else if (left.length > 0)
      st.toast(`Đã xếp ${placed.length} việc. Còn ${left.length} việc chưa có chỗ: hôm nay không đủ khung trống, bạn đừng cố nhồi nhé.`);
    else st.toast(`Đã xếp ${placed.length} việc vào khung trống, việc 20% được ưu tiên trước.`, 'success');
  };

  const scheduleOne = (taskId: string) => {
    const item = items.find((i) => i.task.id === taskId);
    if (!item) return;
    if (item.block?.start_min != null) return unschedule(item.block.id);
    const { placed } = autoArrange([item], free, Math.max(now, range.start));
    if (placed[0]) place(taskId, placed[0].start_min, placed[0].duration_min, 'manual');
    else st.toast('Hôm nay không còn khung trống đủ dài cho việc này.');
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-6 px-4 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-8 lg:pt-8">
        {/* Cột trái: việc hôm nay */}
        <section>
          {/* Tranh nền + lời chào */}
          <div className="relative -mx-4 mb-5 overflow-hidden lg:mx-0 lg:rounded-[32px]">
            <Scenery className="block h-52 w-full lg:h-60" />
            <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 text-onsky lg:p-7">
              <div>
                <p className="text-sm font-medium opacity-90">
                  {greeting()}
                  {d.profile?.display_name ? `, ${d.profile.display_name}` : ''}
                </p>
                <h1 className="mt-0.5 text-[26px] leading-tight font-bold">{formatLongDate(today)}</h1>
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-[13px] font-semibold">
                  {week > 0 && <span className="rounded-full bg-surface/85 px-2.5 py-1 text-ink">Tuần {week}/12</span>}
                  <span className="rounded-full bg-surface/85 px-2.5 py-1 text-ink">
                    {doneCount}/{items.length} việc · {drops} 💧
                  </span>
                </div>
              </div>
              <div className="-mt-1.5 -mr-2 flex">
                <NotificationBell />
                <span className="flex lg:hidden">
                  <button aria-label={`Nháp${inboxCount ? ` (${inboxCount} mục)` : ''}`} onClick={() => navigate('/nhap')} className="relative flex h-11 w-11 items-center justify-center rounded-full">
                    <Inbox size={22} />
                    {inboxCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-onaccent">{inboxCount}</span>
                    )}
                  </button>
                  <button aria-label="Cài đặt" onClick={() => navigate('/cai-dat')} className="flex h-11 w-11 items-center justify-center rounded-full">
                    <Settings size={22} />
                  </button>
                </span>
              </div>
            </div>
          </div>

          <div className="mb-4 empty:hidden">
            <CycleEndBanner />
          </div>

          <div className="mb-5 empty:hidden">
            <PracticeCard />
          </div>

          <div id="viec-hom-nay" className="scroll-mt-4" />
          <SectionTitle
            action={
              <Button size="sm" variant="soft" onClick={() => setAdding(true)}>
                <Plus size={16} /> Thêm việc
              </Button>
            }
          >
            Việc hôm nay
          </SectionTitle>

          {items.length === 0 ? (
            <Card>
              <EmptyState art={<Plant species="tan-tron" stage={1} size={84} />} title="Hôm nay chưa có việc nào">
                Thêm việc mới, hoặc vào Mục tiêu để lên danh sách đầu việc cho từng mục tiêu.
              </EmptyState>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((it) => (
                <TaskRow
                  key={it.task.id}
                  task={it.task}
                  goal={it.goal}
                  done={it.done}
                  date={today}
                  block={it.block}
                  onEdit={() => setEditing(it.task)}
                  onFocus={() => navigate(`/focus?viec=${it.task.id}`)}
                  onSchedule={() => scheduleOne(it.task.id)}
                />
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowOthers((v) => !v)}
                aria-expanded={showOthers}
                className="flex min-h-11 w-full items-center justify-between rounded-2xl px-2 text-sm font-semibold text-muted"
              >
                <span>Việc khác chưa đến hạn ({others.length})</span>
                <ChevronDown size={18} className={cx('transition-transform', showOthers && 'rotate-180')} />
              </button>
              {showOthers && (
                <div className="mt-1 flex flex-col gap-2">
                  {others.map(({ task, goal }) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      goal={goal}
                      done={false}
                      onEdit={() => setEditing(task)}
                      extra={
                        <button
                          type="button"
                          onClick={() => st.insert('schedule_blocks', { task_id: task.id, date: today, start_min: null, duration_min: task.estimate_min, source: 'manual' })}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full bg-soft px-3 text-[13px] font-semibold text-primary"
                        >
                          <Plus size={14} /> Làm hôm nay
                        </button>
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3">
            <WeekReviewPrompt />
            <div id="nhat-ky-hom-nay" className="scroll-mt-4">
              <JournalCard />
            </div>
          </div>
        </section>

        {/* Cột phải: dòng thời gian */}
        <section id="dong-thoi-gian" className="scroll-mt-4">
          <SectionTitle>Dòng thời gian</SectionTitle>
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted">
                Còn trống hôm nay
                <span className="block text-lg leading-tight font-bold text-ink">{formatDuration(freeLeft)}</span>
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => arrangeAll()} disabled={unscheduled.length === 0 || !!ai.busy}>
                  <Wand2 size={16} /> Tự xếp
                </Button>
                <AIButton variant="primary" busy={!!ai.busy} onClick={aiArrange} disabled={unscheduled.length === 0}>
                  AI xếp lịch
                </AIButton>
              </div>
            </div>
            <p className="mb-4 text-[13px] leading-snug text-muted">
              <b>Tự xếp</b> đặt việc 20% vào khung sớm nhất. <b>AI xếp lịch</b> còn tính đến hạn chót, độ dài khung trống và lúc bạn tỉnh táo. Kéo tay nắm <span aria-hidden>⋮⋮</span> bên phải mỗi việc để đổi giờ.
            </p>
            {aiNote && (
              <div className="k-fade-in mb-4 rounded-2xl bg-soft px-3.5 py-2.5 text-[13px] leading-snug text-ink">
                <p>💡 {aiNote}</p>
                <QuotaHint className="mt-1" />
              </div>
            )}
            <Timeline
              range={range}
              fixed={fixedToday}
              items={timed}
              free={free}
              now={now}
              onMove={(id, start) => st.update('schedule_blocks', id, { start_min: start, source: 'manual' })}
              onUnschedule={unschedule}
            />
          </Card>
        </section>
      </div>

      <TaskEditor open={adding} onClose={() => setAdding(false)} defaults={{ kind: 'once', due_date: today }} />
      <TaskEditor open={!!editing} onClose={() => setEditing(null)} task={editing} />
    </div>
  );
}
