// "Focus": đồng hồ 25/50/90/tự đặt + giờ nghỉ, mầm cây lớn dần theo thời gian, âm thanh nền,
// nhắc khi rời app và thống kê giờ focus. Đồng hồ nằm ở src/lib/focus.ts nên vẫn chạy khi chuyển màn hình.

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Bell, Check, ChevronDown, Coffee, Pause, Play, Square } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { BREAKS, fmtClock, PRESETS, useFocus, useFocusClock } from '@/lib/focus';
import { formatDuration, todayISO } from '@/lib/dates';
import { itemsForDate, otherOpenTasks, taskPoints } from '@/lib/logic';
import type { Goal, Task } from '@/lib/types';
import { Button, Card, Chip, cx, LeverageBadge, Sheet, Switch } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant } from '@/components/Plant';
import { SoundMixer } from '@/components/SoundMixer';
import { FocusStats } from '@/components/FocusStats';

/** Mầm cây lớn theo % thời gian: hạt → nảy mầm → cây non → ra nụ → nở hoa khi hết giờ */
function stageFor(progress: number, phase: string): number {
  if (phase === 'done' || phase === 'break') return 4;
  if (phase !== 'focus') return 0;
  if (progress >= 1) return 4;
  if (progress >= 0.6) return 3;
  if (progress >= 0.3) return 2;
  if (progress >= 0.04) return 1;
  return 0;
}

function TimerRing({ progress, children, tone }: { progress: number; children: ReactNode; tone: 'primary' | 'accent' }) {
  const r = 128;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-[272px] w-[272px]">
      <svg viewBox="0 0 272 272" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={136} cy={136} r={r} fill="none" stroke="var(--k-surface-2)" strokeWidth={10} />
        <circle
          cx={136}
          cy={136}
          r={r}
          fill="none"
          stroke={tone === 'primary' ? 'var(--k-primary)' : 'var(--k-accent)'}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.3s linear' }}
        />
      </svg>
      <div className="absolute inset-[18px] flex items-end justify-center overflow-hidden rounded-full" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
        {children}
      </div>
    </div>
  );
}

/** Danh sách việc để chọn: việc hôm nay trước, rồi các việc một lần khác */
function TaskPicker({ open, onClose, value, onPick }: { open: boolean; onClose: () => void; value: string | null; onPick: (id: string | null) => void }) {
  const d = useData();
  const today = todayISO();
  const groups = useMemo(() => {
    const todayItems = itemsForDate(d, today).filter((i) => !i.done);
    const others = otherOpenTasks(d, today);
    return [
      { title: 'Việc hôm nay', items: todayItems.map((i) => ({ task: i.task, goal: i.goal })) },
      { title: 'Việc khác chưa xong', items: others },
    ].filter((g) => g.items.length > 0);
  }, [d, today]);

  const Row = ({ task, goal }: { task: Task | null; goal: Goal | null }) => {
    const selected = (task?.id ?? null) === value;
    return (
      <button
        type="button"
        onClick={() => {
          onPick(task?.id ?? null);
          onClose();
        }}
        className={cx('flex min-h-14 w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition', selected ? 'bg-soft' : 'hover:bg-surface2')}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">{task?.title ?? 'Không gắn việc cụ thể'}</p>
          {task ? (
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted">
              <LeverageBadge leverage={task.leverage} compact />
              {goal && <span className="truncate">{goal.title}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">Vẫn được tính giờ focus, nhưng không vào mục tiêu nào.</p>
          )}
        </div>
        {selected && <Check size={20} className="shrink-0 text-primary" />}
      </button>
    );
  };

  return (
    <Sheet open={open} onClose={onClose} title="Focus vào việc gì?">
      {groups.map((g) => (
        <div key={g.title} className="mb-3">
          <p className="mb-1 px-1 text-[13px] font-bold tracking-wide text-muted uppercase">{g.title}</p>
          {g.items.map((it) => (
            <Row key={it.task.id} task={it.task} goal={it.goal} />
          ))}
        </div>
      ))}
      <Row task={null} goal={null} />
    </Sheet>
  );
}

export default function Focus() {
  const [params, setParams] = useSearchParams();
  const d = useData();
  const f = useFocus();
  const { remaining, progress } = useFocusClock();
  const [picker, setPicker] = useState(false);
  const [custom, setCustom] = useState(() => (PRESETS.includes(f.planMin as 25) ? '' : String(f.planMin)));
  const today = todayISO();

  // Đến từ nút "Bắt đầu focus" ở Hôm nay: chọn sẵn việc đó (nếu chưa có phiên nào đang chạy)
  useEffect(() => {
    const id = params.get('viec');
    if (!id) return;
    const st = useFocus.getState();
    if (st.phase === 'idle' || st.phase === 'done') {
      st.setTask(id);
      if (st.phase === 'done') st.reset();
    }
    setParams({}, { replace: true });
  }, [params, setParams]);

  const task = f.taskId ? d.tasks.find((t) => t.id === f.taskId) ?? null : null;
  const goal = task?.goal_id ? d.goals.find((g) => g.id === task.goal_id) ?? null : null;
  const species = goal?.plant ?? 'tan-tron';
  const stage = stageFor(progress, f.phase);
  const running = !!f.runStart;
  const isCustom = !PRESETS.includes(f.planMin as 25);

  const resultTask = f.result?.taskId ? d.tasks.find((t) => t.id === f.result!.taskId) : undefined;
  const resultTaskDone = resultTask
    ? resultTask.kind === 'once'
      ? !!resultTask.done_at
      : d.task_completions.some((c) => c.task_id === resultTask.id && c.date === today)
    : true;

  const markDone = () => {
    if (!resultTask) return;
    const pts = useStore.getState().toggleTask(resultTask, today);
    if (pts > 0) useStore.getState().toast(`Đã xong việc · +${pts} 💧 cho cây${goal ? ` "${goal.title}"` : ''}`, 'success');
  };

  let status: string;
  if (f.phase === 'focus') status = running ? 'Đang tập trung' : 'Đang tạm dừng';
  else if (f.phase === 'break') status = running ? 'Giờ nghỉ' : 'Nghỉ · tạm dừng';
  else if (f.phase === 'done') status = f.result?.completed ? 'Hoàn thành phiên focus 🌸' : 'Đã dừng phiên focus';
  else status = 'Sẵn sàng';

  const shownTime = f.phase === 'done' ? fmtClock((f.result?.sec ?? 0) * 1000) : fmtClock(remaining);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Focus" subtitle="Tập trung sâu vào một việc, như chăm một mầm cây." />
      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <Card className="flex flex-col items-center px-5 pt-6 pb-5 text-center">
          <TimerRing progress={f.phase === 'done' ? 1 : progress} tone={f.phase === 'break' ? 'accent' : 'primary'}>
            <div key={stage} className={cx('mb-1', f.phase !== 'idle' && 'k-pop')}>
              <Plant species={species} stage={stage} size={176} sway={running && f.phase === 'focus'} />
            </div>
          </TimerRing>

          <p className={cx('mt-3 text-sm font-semibold', f.phase === 'break' ? 'text-accent' : 'text-primary')}>{status}</p>
          <p className="text-[56px] leading-none font-bold tracking-tight tabular-nums" aria-live="off">
            {shownTime}
          </p>
          {f.phase === 'done' && <p className="mt-1 text-sm text-muted">thời gian đã tập trung</p>}

          {/* Việc đang focus */}
          {f.phase === 'idle' ? (
            <button
              type="button"
              onClick={() => setPicker(true)}
              className="mt-4 flex min-h-14 w-full max-w-sm items-center gap-3 rounded-2xl bg-surface2 px-4 py-2 text-left transition hover:brightness-95"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-muted">Focus vào</p>
                <p className="truncate text-[15px] font-bold">{task?.title ?? 'Chọn một việc (không bắt buộc)'}</p>
              </div>
              {task && <LeverageBadge leverage={task.leverage} compact />}
              <ChevronDown size={18} className="shrink-0 text-muted" />
            </button>
          ) : (
            (task || f.phase === 'focus') && (
              <div className="mt-4 w-full max-w-sm rounded-2xl bg-surface2 px-4 py-2.5">
                <p className="truncate text-[15px] font-bold">{task?.title ?? 'Focus tự do'}</p>
                {task && (
                  <p className="mt-1 flex items-center justify-center gap-2 text-xs text-muted">
                    <LeverageBadge leverage={task.leverage} compact /> {goal?.title}
                  </p>
                )}
              </div>
            )
          )}

          {/* Chọn thời lượng */}
          {f.phase === 'idle' && (
            <div className="mt-4 w-full max-w-sm">
              <div className="flex flex-wrap justify-center gap-2">
                {PRESETS.map((m) => (
                  <Chip
                    key={m}
                    selected={f.planMin === m}
                    onClick={() => {
                      f.setPlan(m);
                      setCustom('');
                    }}
                  >
                    {m} phút
                  </Chip>
                ))}
                <Chip
                  selected={isCustom}
                  onClick={() => {
                    if (isCustom) return;
                    f.setPlan(40);
                    setCustom('40');
                  }}
                >
                  Tự đặt
                </Chip>
              </div>
              {isCustom && (
                <label className="mt-3 flex items-center justify-center gap-2 text-sm">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={5}
                    max={180}
                    value={custom}
                    onChange={(e) => {
                      setCustom(e.target.value);
                      const n = Number(e.target.value);
                      if (n >= 5 && n <= 180) f.setPlan(n);
                    }}
                    className="k-input w-24 text-center"
                    aria-label="Số phút tự đặt"
                  />
                  phút (5–180)
                </label>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted">
                <Coffee size={15} /> Nghỉ sau đó:
                {BREAKS.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => f.setBreak(b)}
                    aria-pressed={f.breakMin === b}
                    className={cx('min-h-9 rounded-full px-2.5 font-semibold transition', f.breakMin === b ? 'bg-soft text-ink' : 'hover:bg-surface2')}
                  >
                    {b}p
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kết quả phiên vừa xong */}
          {f.phase === 'done' && f.result && (
            <div className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
              {f.result.recorded ? (
                <p>
                  Đã ghi {formatDuration(f.result.sec / 60)} focus
                  {f.result.completed ? '' : ` (dừng sớm, đặt ${f.result.planned} phút)`}.
                  {f.result.awayCount > 0 && ` Bạn rời app ${f.result.awayCount} lần.`}
                </p>
              ) : (
                <p>Phiên dưới 1 phút nên không được ghi lại.</p>
              )}
            </div>
          )}

          {/* Nút điều khiển */}
          <div className="mt-5 flex w-full max-w-sm flex-col gap-2">
            {f.phase === 'idle' && (
              <Button size="lg" onClick={f.start}>
                <Play size={20} fill="currentColor" /> Bắt đầu {f.planMin} phút
              </Button>
            )}
            {(f.phase === 'focus' || f.phase === 'break') && (
              <div className="flex gap-2">
                <Button size="lg" variant={running ? 'soft' : 'primary'} className="flex-1" onClick={running ? f.pause : f.resume}>
                  {running ? <Pause size={20} /> : <Play size={20} fill="currentColor" />}
                  {running ? 'Tạm dừng' : 'Tiếp tục'}
                </Button>
                {f.phase === 'focus' ? (
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => {
                      if (window.confirm('Dừng phiên focus này? Thời gian đã tập trung (từ 1 phút) vẫn được ghi lại.')) f.stop();
                    }}
                  >
                    <Square size={18} /> Dừng
                  </Button>
                ) : (
                  <Button size="lg" variant="outline" onClick={f.skipBreak}>
                    Bỏ qua nghỉ
                  </Button>
                )}
              </div>
            )}
            {f.phase === 'done' && (
              <>
                {resultTask && !resultTaskDone && (
                  <Button size="lg" onClick={markDone}>
                    <Check size={20} /> Đánh dấu việc đã xong · +{taskPoints(resultTask)} 💧
                  </Button>
                )}
                <div className="flex gap-2">
                  <Button size="lg" variant={resultTask && !resultTaskDone ? 'soft' : 'primary'} className="flex-1" onClick={f.startBreak}>
                    <Coffee size={18} /> Nghỉ {f.breakMin} phút
                  </Button>
                  <Button size="lg" variant="outline" className="flex-1" onClick={f.reset}>
                    Phiên mới
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex w-full max-w-sm items-center gap-3 border-t border-line pt-4 text-left">
            <Bell size={18} className="shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Nhắc khi rời app</p>
              <p className="text-xs leading-snug text-muted">Gửi thông báo nếu bạn chuyển sang app khác giữa phiên focus.</p>
            </div>
            <Switch checked={f.remindLeave} onChange={f.setRemindLeave} label="Nhắc khi rời app" />
          </div>
        </Card>

        <SoundMixer />
        <FocusStats />
      </div>

      <TaskPicker open={picker} onClose={() => setPicker(false)} value={f.taskId} onPick={f.setTask} />
    </div>
  );
}
