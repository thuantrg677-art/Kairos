// Thẻ "Tập làm quen" ở màn Hôm nay: 8 bước nhỏ giúp người mới dùng thử từng tính năng.
// Mỗi bước tự đánh dấu xong theo dữ liệu thật (đã có việc, đã tick, đã focus…). Ẩn được; bật lại trong Cài đặt.

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Plus, Sprout, X } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { todayISO } from '@/lib/dates';
import { getActiveCycle } from '@/lib/logic';
import { patchSettings, practiceSteps, STARTER_TASKS, type PracticeStep, type StarterTask } from '@/lib/guide';
import type { Task } from '@/lib/types';
import { Button, Card, cx } from './ui';
import { TaskEditor } from './Editors';
import { Plant } from './Plant';

export function PracticeCard() {
  const d = useData();
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [draft, setDraft] = useState<Partial<Task> | null>(null);
  const steps = useMemo(() => practiceSteps(d), [d]);
  const cycle = getActiveCycle(d.cycles);
  const firstGoal = d.goals.filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id)).sort((a, b) => a.sort - b.sort)[0];

  if (!d.profile || d.profile.settings.practice_hidden) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;
  const nextStep = steps.find((s) => !s.done);
  const today = todayISO();

  const hide = () => {
    patchSettings({ practice_hidden: true });
    useStore.getState().toast(allDone ? 'Đã ẩn thẻ Tập làm quen' : 'Đã ẩn thẻ. Bật lại trong Cài đặt → Hướng dẫn sử dụng.', 'success');
  };

  const openTask = (starter?: StarterTask) =>
    setDraft({
      kind: 'once',
      due_date: today,
      goal_id: starter && !starter.withGoal ? null : (firstGoal?.id ?? null),
      ...(starter ? { title: starter.title, estimate_min: starter.estimate_min, leverage: starter.leverage, leverage_reason: starter.leverage_reason, leverage_source: 'manual' as const } : {}),
    });

  const run = (step: PracticeStep) => {
    const a = step.action;
    if (a.kind === 'task') return openTask();
    if (a.kind === 'route') return navigate(a.to);
    document.getElementById(a.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (allDone) {
    return (
      <Card className="k-fade-in flex items-center gap-3 border-primary/40 p-4">
        <Plant species="linh-lan" stage={4} size={56} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">Bạn đã làm quen xong Kairos 🎉</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">Cả {steps.length} bước đều xong. Từ giờ cứ đều đặn mỗi ngày một chút, khu vườn sẽ tự lớn.</p>
          <Button size="sm" variant="soft" className="mt-2" onClick={hide}>
            Ẩn thẻ này
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-primary/40 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">
          <Sprout size={21} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">Tập làm quen với Kairos</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {steps.length} bước nhỏ, mỗi bước 1–5 phút · đã xong {doneCount}/{steps.length}
          </p>
        </div>
        <button type="button" aria-label="Ẩn thẻ Tập làm quen" title="Ẩn thẻ" onClick={hide} className="-mt-1.5 -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-surface2">
          <X size={18} />
        </button>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={doneCount} aria-label="Tiến độ tập làm quen">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${Math.max(4, (doneCount / steps.length) * 100)}%` }} />
      </div>

      {nextStep && (
        <div className="mt-3 rounded-2xl bg-surface2 p-3.5">
          <p className="text-xs font-bold tracking-wide text-primary uppercase">Bước tiếp theo</p>
          <p className="mt-1 text-[15px] font-bold text-ink">
            {nextStep.emoji} {nextStep.title}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">{nextStep.hint}</p>
          {nextStep.id === 'tasks' && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {STARTER_TASKS.filter((t) => !d.tasks.some((x) => x.title === t.title)).map((t) => (
                <button
                  key={t.title}
                  type="button"
                  onClick={() => openTask(t)}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-2xl border border-line bg-surface px-3 py-1.5 text-left text-[13px] leading-snug font-medium text-ink transition active:scale-[.97]"
                >
                  <Plus size={14} className="shrink-0 text-primary" />
                  <span>
                    {t.title}
                    {t.leverage === 'high' && <span className="ml-1 font-bold whitespace-nowrap text-high">· 20%</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
          <Button size="sm" className="mt-2.5" onClick={() => run(nextStep)}>
            {nextStep.action.label}
          </Button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setShowAll((v) => !v)}
        aria-expanded={showAll}
        className="mt-2 flex min-h-10 w-full items-center justify-between rounded-xl px-1 text-[13px] font-semibold text-muted"
      >
        <span>{showAll ? 'Thu gọn' : `Xem cả ${steps.length} bước`}</span>
        <ChevronDown size={17} className={cx('transition-transform', showAll && 'rotate-180')} />
      </button>
      {showAll && (
        <ol className="k-fade-in flex flex-col gap-1">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => !s.done && run(s)}
                disabled={s.done}
                className={cx('flex min-h-11 w-full items-center gap-2.5 rounded-xl px-1.5 text-left text-sm transition', s.done ? 'text-muted' : 'text-ink hover:bg-surface2')}
              >
                <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', s.done ? 'bg-primary text-onprimary' : 'border-2 border-line')}>
                  {s.done && <Check size={14} strokeWidth={3} />}
                </span>
                <span className={cx('flex-1', s.done && 'line-through')}>
                  {s.emoji} {s.title}
                </span>
                {!s.done && <span className="text-xs font-semibold text-primary">{s.action.label}</span>}
              </button>
            </li>
          ))}
        </ol>
      )}

      <TaskEditor open={!!draft} onClose={() => setDraft(null)} defaults={draft ?? undefined} startToday />
    </Card>
  );
}
