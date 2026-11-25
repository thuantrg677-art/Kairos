// Màn "Mục tiêu": 4 tầng
//   Mục tiêu dài hạn (3–5 năm) → Mục tiêu ngắn hạn (12 tuần, mỗi mục tiêu là một cây)
//   → Đầu việc (việc 20% / 80%) → Việc mỗi ngày (việc nhỏ làm trong một ngày, tick là tưới cây).

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronRight, MessageCircle, Pencil, Plus, Sparkles } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { diffDays, formatDMY, todayISO } from '@/lib/dates';
import { cycleWeek, getActiveCycle, goalGrowth, STAGE_NAMES, STAGE_NAMES_TREE } from '@/lib/logic';
import type { Goal, Task, Vision } from '@/lib/types';
import { Button, Card, cx, EmptyState, IconButton } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { Plant, plantIsTree } from '@/components/Plant';
import { PlantBadge } from '@/components/pickers';
import { goalHealth } from '@/lib/garden';
import { TaskRow } from '@/components/TaskRow';
import { GoalEditor, StepEditor, TaskEditor, VisionEditor } from '@/components/Editors';
import { BreakdownSheet, SuggestTasksSheet } from '@/components/AI';

/** Bậc thang 4 tầng ở đầu trang */
function Ladder() {
  const [open, setOpen] = useState(false);
  const levels = [
    { n: 1, name: 'Mục tiêu dài hạn', sub: '3–5 năm' },
    { n: 2, name: 'Mục tiêu ngắn hạn', sub: '12 tuần · một cây' },
    { n: 3, name: 'Đầu việc', sub: 'việc 20% / 80%' },
    { n: 4, name: 'Việc mỗi ngày', sub: 'tick là tưới cây' },
  ];
  return (
    <Card className="p-3.5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center gap-2 text-left">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
          {levels.map((l, i) => (
            <span key={l.n} className="flex items-center gap-1">
              <span className="rounded-full bg-surface2 px-2 py-1 text-[12.5px] leading-none font-semibold text-ink">{l.name}</span>
              {i < levels.length - 1 && <ChevronRight size={14} className="text-muted" aria-hidden />}
            </span>
          ))}
        </div>
        <ChevronDown size={18} className={cx('shrink-0 text-muted transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="k-fade-in mt-3 grid gap-2 sm:grid-cols-2">
          {levels.map((l) => (
            <div key={l.n} className="rounded-2xl bg-surface2 px-3 py-2">
              <p className="text-sm font-bold text-ink">
                {l.n}. {l.name} <span className="font-medium text-muted">· {l.sub}</span>
              </p>
              <p className="mt-0.5 text-[13px] leading-snug text-muted">
                {l.n === 1 && 'Bạn muốn trở thành ai, đạt được gì sau vài năm. Mọi thứ bên dưới đều nối về đây.'}
                {l.n === 2 && 'Chỉ 2–3 mục tiêu đo được cho 12 tuần. Mỗi mục tiêu là một cây trong Vườn.'}
                {l.n === 3 && 'Những việc tạo ra mục tiêu. Đánh dấu Việc 20% là việc đòn bẩy cao: +3 💧.'}
                {l.n === 4 && 'Bước cụ thể, làm xong trong một buổi. Việc nhỏ của Việc 20% +2 💧, của Việc 80% +1 💧.'}
              </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Một đầu việc và các việc mỗi ngày của nó */
function TaskBranch({ task, onEdit, onEditStep, onAddStep, onBreakdown }: { task: Task; onEdit: () => void; onEditStep: (t: Task) => void; onAddStep: () => void; onBreakdown: () => void }) {
  const all = useStore((s) => s.tasks);
  const steps = useMemo(() => all.filter((t) => t.parent_id === task.id), [all, task.id]);
  const gd5 = useStore((s) => s.gd5);
  const [open, setOpen] = useState(false);
  const today = todayISO();
  const doneCount = steps.filter((t) => t.done_at).length;
  // Việc chưa làm theo ngày, rồi 5 việc vừa làm xong gần nhất
  const shown = useMemo(() => {
    const todo = steps.filter((t) => !t.done_at).sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
    const done = steps.filter((t) => t.done_at).sort((a, b) => (b.done_at ?? '').localeCompare(a.done_at ?? '')).slice(0, 5);
    return [...todo, ...done];
  }, [steps]);
  const finished = !!task.done_at;

  return (
    <div>
      <TaskRow
        task={task}
        goal={null}
        done={finished}
        showRepeat
        onEdit={onEdit}
        extra={
          !finished && gd5 ? (
            <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-surface2 px-3 text-[13px] font-semibold text-ink">
              {steps.length ? `${doneCount}/${steps.length} việc mỗi ngày` : 'Chia thành việc mỗi ngày'}
              <ChevronDown size={15} className={cx('transition-transform', open && 'rotate-180')} />
            </button>
          ) : undefined
        }
      />
      {open && (
        <div className="k-fade-in mt-1.5 ml-4 flex flex-col gap-1.5 border-l-2 border-line pl-3">
          {shown.map((t) => (
            <TaskRow key={t.id} task={t} goal={null} done={!!t.done_at} date={t.done_at ? t.due_date ?? today : today} hideParent compact onEdit={() => onEditStep(t)} />
          ))}
          {shown.length === 0 && <p className="py-1 text-[13px] text-muted">Chưa có việc nhỏ nào. Chia đầu việc thành từng bước cụ thể để biết hôm nay cần làm gì.</p>}
          <div className="flex flex-wrap gap-2 pt-0.5 pb-1">
            <Button size="sm" variant="soft" onClick={onAddStep}>
              <Plus size={15} /> Việc mỗi ngày
            </Button>
            <Button size="sm" variant="outline" onClick={onBreakdown}>
              <Sparkles size={15} /> AI chia nhỏ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Goals() {
  const d = useData();
  const navigate = useNavigate();
  const today = todayISO();
  const cycle = getActiveCycle(d.cycles);
  const week = cycle ? cycleWeek(cycle, today) : 0;
  const daysLeft = cycle ? Math.max(0, diffDays(today, cycle.end_date)) : 0;

  const [openGoals, setOpenGoals] = useState<Set<string>>(new Set());
  const [taskSheet, setTaskSheet] = useState<{ task?: Task; goalId?: string } | null>(null);
  const [stepSheet, setStepSheet] = useState<{ step?: Task; parentId?: string } | null>(null);
  const [goalSheet, setGoalSheet] = useState<{ goal?: Goal; visionId?: string } | null>(null);
  const [visionSheet, setVisionSheet] = useState<{ vision?: Vision } | null>(null);
  const [suggestFor, setSuggestFor] = useState<Goal | null>(null);
  const [breakdownFor, setBreakdownFor] = useState<Task | null>(null);

  const goals = useMemo(() => d.goals.filter((g) => g.status === 'active' && (!cycle || g.cycle_id === cycle.id)).sort((a, b) => a.sort - b.sort), [d.goals, cycle]);
  const looseTasks = useMemo(() => d.tasks.filter((t) => !t.goal_id && !t.parent_id && !t.archived_at && !t.done_at), [d.tasks]);

  const toggle = (id: string) =>
    setOpenGoals((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const branch = (t: Task) => (
    <TaskBranch
      key={t.id}
      task={t}
      onEdit={() => setTaskSheet({ task: t })}
      onEditStep={(s) => setStepSheet({ step: s })}
      onAddStep={() => setStepSheet({ parentId: t.id })}
      onBreakdown={() => setBreakdownFor(t)}
    />
  );

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Mục tiêu" subtitle={cycle ? `Tuần ${week}/12 · còn ${daysLeft} ngày đến ${formatDMY(cycle.end_date)}` : undefined} />

      <div className="flex flex-col gap-5 px-4 lg:px-8">
        <Ladder />

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
                  const tasks = d.tasks.filter((t) => t.goal_id === g.id && !t.parent_id && !t.archived_at).sort(sortTasks);
                  const open = openGoals.has(g.id);
                  const highCount = tasks.filter((t) => t.leverage === 'high').length;
                  const stageName = (plantIsTree(g.plant) ? STAGE_NAMES_TREE : STAGE_NAMES)[growth.stage];
                  return (
                    <Card key={g.id} className="overflow-hidden">
                      <div className="flex items-center gap-1 p-3 pr-1.5">
                        <button type="button" onClick={() => toggle(g.id)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                          <PlantBadge species={g.plant} stage={growth.stage} size={60} wilt={goalHealth(g, cycle, d, today).wilt} />
                          <span className="min-w-0 flex-1">
                            <span className="block text-[11.5px] font-bold tracking-wide text-muted uppercase">Ngắn hạn · 12 tuần</span>
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
                          <div className="flex flex-col gap-2">{tasks.map(branch)}</div>
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
                  <Plus size={16} /> Thêm mục tiêu ngắn hạn (12 tuần)
                </button>
              </div>
            </section>
          );
        })}

        {d.visions.length === 0 && (
          <Card>
            <EmptyState art={<Plant species="huong-duong" stage={0} size={84} />} title="Chưa có mục tiêu nào">
              Trò chuyện với Trợ lý AI để cùng đặt mục tiêu dài hạn và kế hoạch 12 tuần, hoặc tự thêm bên dưới.
            </EmptyState>
            <div className="flex justify-center pb-6">
              <Button onClick={() => navigate('/tro-ly')}>
                <MessageCircle size={18} /> Lập kế hoạch cùng AI
              </Button>
            </div>
          </Card>
        )}

        <Button variant="soft" onClick={() => setVisionSheet({})}>
          <Plus size={18} /> Thêm mục tiêu dài hạn
        </Button>

        {looseTasks.length > 0 && (
          <section>
            <p className="mb-2 text-xs font-bold tracking-wide text-muted uppercase">Việc lẻ chưa gắn mục tiêu</p>
            <div className="flex flex-col gap-2">{looseTasks.map(branch)}</div>
          </section>
        )}
      </div>

      <TaskEditor open={!!taskSheet} onClose={() => setTaskSheet(null)} task={taskSheet?.task} defaults={{ goal_id: taskSheet?.goalId ?? null, kind: 'recurring' }} />
      <StepEditor open={!!stepSheet} onClose={() => setStepSheet(null)} step={stepSheet?.step} parentId={stepSheet?.parentId} />
      <GoalEditor open={!!goalSheet} onClose={() => setGoalSheet(null)} goal={goalSheet?.goal} visionId={goalSheet?.visionId} />
      <SuggestTasksSheet goal={suggestFor} onClose={() => setSuggestFor(null)} />
      <BreakdownSheet task={breakdownFor} onClose={() => setBreakdownFor(null)} />
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
