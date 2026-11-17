// Màn "Mục tiêu": mục tiêu dài hạn → mục tiêu 12 tuần → đầu việc.

import { useMemo, useState } from 'react';
import { ChevronDown, Pencil, Plus, Sparkles } from 'lucide-react';
import { useData } from '@/lib/store';
import { diffDays, formatDMY, todayISO } from '@/lib/dates';
import { cycleWeek, getActiveCycle, goalGrowth, STAGE_NAMES, STAGE_NAMES_TREE } from '@/lib/logic';
import type { Goal, Task, Vision } from '@/lib/types';
import { Button, Card, cx, EmptyState, IconButton } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant, plantIsTree } from '@/components/Plant';
import { PlantBadge } from '@/components/pickers';
import { TaskRow } from '@/components/TaskRow';
import { GoalEditor, TaskEditor, VisionEditor } from '@/components/Editors';
import { SuggestTasksSheet } from '@/components/AI';

export default function Goals() {
  const d = useData();
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);
  const week = cycle ? cycleWeek(cycle, today) : 0;
  const daysLeft = cycle ? Math.max(0, diffDays(today, cycle.end_date)) : 0;

  const [openGoals, setOpenGoals] = useState<Set<string>>(new Set());
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; goalId?: string } | null>(null);
  const [goalSheet, setGoalSheet] = useState<{ goal?: Goal; visionId?: string } | null>(null);
  const [visionSheet, setVisionSheet] = useState<{ vision?: Vision } | null>(null);
  const [suggestFor, setSuggestFor] = useState<Goal | null>(null);

  const goals = useMemo(() => d.goals.filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id)).sort((a, b) => a.sort - b.sort), [d.goals, cycle]);
  const looseTasks = useMemo(() => d.tasks.filter((t) => !t.goal_id && !t.archived_at && !t.done_at), [d.tasks]);

  const toggle = (id: string) =>
    setOpenGoals((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mục tiêu" subtitle={cycle ? `Tuần ${week}/12 · còn ${daysLeft} ngày đến ${formatDMY(cycle.end_date)}` : undefined} />

      <div className="flex flex-col gap-5 px-4 lg:px-8">
        {goals.length > 3 && (
          <p className="rounded-2xl bg-highsoft px-4 py-3 text-sm leading-snug text-high">
            Bạn đang theo {goals.length} mục tiêu. <b>Chỉ nên đặt 2–3 mục tiêu cho 12 tuần</b> để đủ sức làm tới nơi.
          </p>
        )}

        {d.visions.map((v) => {
          const mine = goals.filter((g) => g.vision_id === v.id);
          return (
            <section key={v.id}>
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold tracking-wide text-muted uppercase">Mục tiêu dài hạn{v.area ? ` · ${v.area}` : ''}</p>
                  <h2 className="mt-0.5 text-lg leading-snug font-bold text-ink">{v.title}</h2>
                </div>
                <IconButton label={`Sửa mục tiêu dài hạn: ${v.title}`} onClick={() => setVisionSheet({ vision: v })} className="-mt-1 text-muted">
                  <Pencil size={18} />
                </IconButton>
              </div>

              <div className="mt-2 flex flex-col gap-3 border-l-2 border-line pl-3">
                {mine.map((g) => {
                  const growth = goalGrowth(g, cycle, d);
                  const tasks = d.tasks.filter((t) => t.goal_id === g.id && !t.archived_at).sort(sortTasks);
                  const open = openGoals.has(g.id);
                  const highCount = tasks.filter((t) => t.leverage === 'high').length;
                  const stageName = (plantIsTree(g.plant) ? STAGE_NAMES_TREE : STAGE_NAMES)[growth.stage];
                  return (
                    <Card key={g.id} className="overflow-hidden">
                      <div className="flex items-center gap-1 p-3 pr-1.5">
                        <button type="button" onClick={() => toggle(g.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <PlantBadge species={g.plant} stage={growth.stage} size={60} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-base leading-snug font-bold text-ink">{g.title}</span>
                            <span className="mt-0.5 block text-[13px] text-muted">
                              {stageName} · {Math.round(growth.pct * 100)}% · hạn {formatDMY(g.due_date)}
                            </span>
                            <span className="mt-1.5 block h-2 overflow-hidden rounded-full bg-surface2">
                              <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(2, growth.pct * 100)}%` }} />
                            </span>
                          </span>
                          <ChevronDown size={20} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
                        </button>
                        <IconButton label={`Sửa mục tiêu: ${g.title}`} onClick={() => setGoalSheet({ goal: g })} className="text-muted">
                          <Pencil size={18} />
                        </IconButton>
                      </div>

                      {open && (
                        <div className="k-fade-in border-t border-line bg-bg/60 p-3">
                          {g.measure && <p className="mb-2 text-[13px] text-muted">Đo bằng: {g.measure}</p>}
                          <p className="mb-2 text-[13px] text-muted">
                            {tasks.length} đầu việc · {highCount} việc 20% · đã nhận {growth.earned}/{growth.total} 💧
                          </p>
                          <div className="flex flex-col gap-2">
                            {tasks.map((t) => (
                              <TaskRow key={t.id} task={t} goal={null} done={!!t.done_at} showRepeat onEdit={() => setTaskSheet({ task: t })} />
                            ))}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button size="sm" onClick={() => setTaskSheet({ goalId: g.id })}>
                              <Plus size={16} /> Thêm đầu việc
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setSuggestFor(g)}>
                              <Sparkles size={16} /> AI gợi ý đầu việc
                            </Button>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setGoalSheet({ visionId: v.id })}
                  className="flex min-h-11 items-center gap-2 rounded-2xl border-[1.5px] border-dashed border-line px-3 text-sm font-semibold text-muted"
                >
                  <Plus size={16} /> Thêm mục tiêu 12 tuần
                </button>
              </div>
            </section>
          );
        })}

        {d.visions.length === 0 && (
          <Card>
            <EmptyState art={<Plant species="sen" stage={0} size={84} />} title="Chưa có mục tiêu nào">
              Hãy bắt đầu bằng một mục tiêu dài hạn (3–5 năm), rồi chia thành mục tiêu 12 tuần.
            </EmptyState>
          </Card>
        )}

        <Button variant="soft" onClick={() => setVisionSheet({})}>
          <Plus size={18} /> Thêm mục tiêu dài hạn
        </Button>

        {looseTasks.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Việc lẻ chưa gắn mục tiêu</p>
            <div className="flex flex-col gap-2">
              {looseTasks.map((t) => (
                <TaskRow key={t.id} task={t} goal={null} done={false} showRepeat onEdit={() => setTaskSheet({ task: t })} />
              ))}
            </div>
          </section>
        )}
      </div>

      <TaskEditor open={!!taskSheet} onClose={() => setTaskSheet(null)} task={taskSheet?.task} defaults={{ goal_id: taskSheet?.goalId ?? null, kind: 'recurring' }} />
      <GoalEditor open={!!goalSheet} onClose={() => setGoalSheet(null)} goal={goalSheet?.goal} visionId={goalSheet?.visionId} />
      <SuggestTasksSheet goal={suggestFor} onClose={() => setSuggestFor(null)} />
      <VisionEditor open={!!visionSheet} onClose={() => setVisionSheet(null)} vision={visionSheet?.vision} />
    </div>
  );
}

/** Việc 20% lên trước, rồi việc chưa xong, rồi theo tên */
function sortTasks(a: Task, b: Task) {
  if (!!a.done_at !== !!b.done_at) return a.done_at ? 1 : -1;
  if (a.leverage !== b.leverage) return a.leverage === 'high' ? -1 : 1;
  return a.title.localeCompare(b.title, 'vi');
}
