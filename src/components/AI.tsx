// Các mảnh giao diện dùng chung cho tính năng AI (giai đoạn 2a).

import { useEffect, useState, type ReactNode } from 'react';
import { Check, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { checkAI, useAI, useAIQuota, useChatQuota, type AIResults, type AITask } from '@/lib/ai';
import { useStore } from '@/lib/store';
import { formatDM, formatDuration, isoWeekday, WEEKDAY_SHORT } from '@/lib/dates';
import type { Goal, Task } from '@/lib/types';
import { Button, cx, LeverageBadge, Sheet } from './ui';

/** Nút AI: biểu tượng lấp lánh, quay vòng khi đang chờ */
export function AIButton({
  busy,
  onClick,
  children,
  size = 'sm',
  variant = 'outline',
  className,
  disabled,
}: {
  busy?: boolean;
  onClick: () => void;
  children: ReactNode;
  size?: 'sm' | 'md';
  variant?: 'outline' | 'ghost' | 'soft' | 'primary';
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Button size={size} variant={variant} onClick={onClick} disabled={busy || disabled} aria-busy={busy} className={className}>
      {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Sparkles size={16} />}
      {busy ? 'AI đang nghĩ…' : children}
    </Button>
  );
}

/** Dòng nhỏ "Còn N/15 lượt AI hôm nay" */
export function QuotaHint({ className }: { className?: string }) {
  const { remaining, limit } = useAIQuota();
  if (remaining === null) return null;
  return (
    <p className={cx('text-xs text-muted', className)}>
      Còn {remaining}/{limit} lượt AI hôm nay
    </p>
  );
}

/** Mô tả ngắn một việc: lặp lại thứ mấy / hạn / thời lượng */
export function describeTask(t: Pick<AITask, 'kind' | 'weekdays' | 'due_date' | 'estimate_min'>): string {
  const when =
    t.kind === 'recurring'
      ? t.weekdays.length === 7
        ? 'Hằng ngày'
        : `Lặp ${t.weekdays.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')}`
      : t.due_date
        ? `Một lần · hạn ${formatDM(t.due_date)}`
        : 'Một lần';
  return `${when} · ${formatDuration(t.estimate_min)}`;
}

// ------------------------------------------------------------
// AI gợi ý đầu việc cho một mục tiêu
// ------------------------------------------------------------
export function SuggestTasksSheet({ goal, onClose }: { goal: Goal | null; onClose: () => void }) {
  const { busy, run } = useAI();
  const [result, setResult] = useState<AIResults['suggest_tasks'] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const ask = async () => {
    if (!goal) return;
    const { result: r } = await run('suggest_tasks', { goal_id: goal.id });
    if (r) {
      setResult(r);
      setPicked(new Set(r.tasks.map((_, i) => i)));
    } else if (!result) onClose();
  };

  useEffect(() => {
    setResult(null);
    if (goal) void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goal?.id]);

  const add = () => {
    if (!goal || !result) return;
    const st = useStore.getState();
    let n = 0;
    result.tasks.forEach((t, i) => {
      if (!picked.has(i)) return;
      const row = st.insert('tasks', {
        goal_id: goal.id,
        title: t.title,
        kind: t.kind,
        weekdays: t.weekdays,
        due_date: t.due_date,
        estimate_min: t.estimate_min,
        leverage: t.leverage,
        leverage_reason: t.reason,
        leverage_source: 'ai',
        important: false,
        done_at: null,
        archived_at: null,
      });
      if (row) n++;
    });
    if (n) st.toast(`Đã thêm ${n} đầu việc vào "${goal.title}"`, 'success');
    onClose();
  };

  const toggle = (i: number) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Sheet
      open={!!goal}
      onClose={onClose}
      title="AI gợi ý đầu việc"
      footer={
        result && (
          <>
            <Button variant="outline" onClick={ask} disabled={!!busy} aria-label="Gợi ý khác">
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </Button>
            <Button className="flex-1" onClick={add} disabled={picked.size === 0 || !!busy}>
              Thêm {picked.size} việc đã chọn
            </Button>
          </>
        )
      }
    >
      <p className="text-sm text-muted">
        Cho mục tiêu <b className="text-ink">{goal?.title}</b>
      </p>
      {!result && (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted">
          <LoaderCircle size={28} className="animate-spin text-primary" />
          AI đang đọc mục tiêu và các việc bạn đã có…
        </div>
      )}
      {result && (
        <>
          {result.note && <p className="mt-3 rounded-2xl bg-soft px-3.5 py-2.5 text-sm leading-snug text-ink">💡 {result.note}</p>}
          <div className={cx('mt-3 flex flex-col gap-2 transition-opacity', busy && 'opacity-50')}>
            {result.tasks.map((t, i) => {
              const on = picked.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className={cx('flex gap-3 rounded-2xl border-2 p-3 text-left transition', on ? 'border-primary bg-surface' : 'border-line bg-surface opacity-70')}
                >
                  <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2', on ? 'border-primary bg-primary text-onprimary' : 'border-line')}>
                    {on && <Check size={15} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-snug font-semibold text-ink">{t.title}</span>
                    <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[13px] text-muted">
                      <LeverageBadge leverage={t.leverage} compact />
                      {describeTask(t)}
                    </span>
                    {t.reason && <span className="mt-1 block text-[13px] leading-snug text-muted">{t.reason}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <QuotaHint className="mt-3 text-center" />
          <p className="mt-1 text-center text-xs text-muted">Thêm xong vẫn sửa hoặc xóa từng việc được như bình thường.</p>
        </>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------
// Bản 2 · AI chia nhỏ một đầu việc thành các việc mỗi ngày
// ------------------------------------------------------------
export function BreakdownSheet({ task, onClose }: { task: Task | null; onClose: () => void }) {
  const { busy, run } = useAI();
  const [result, setResult] = useState<AIResults['breakdown'] | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());

  const ask = async () => {
    if (!task) return;
    const { result: r } = await run('breakdown', { task_id: task.id });
    if (r) {
      setResult(r);
      setPicked(new Set(r.steps.map((_, i) => i)));
    } else if (!result) onClose();
  };

  useEffect(() => {
    setResult(null);
    if (task) void ask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.id]);

  const add = () => {
    if (!task || !result) return;
    const st = useStore.getState();
    let n = 0;
    result.steps.forEach((x, i) => {
      if (!picked.has(i)) return;
      const row = st.insert('tasks', {
        goal_id: task.goal_id,
        parent_id: task.id,
        title: x.title,
        kind: 'once',
        weekdays: [],
        due_date: x.date,
        estimate_min: x.estimate_min,
        leverage: task.leverage,
        leverage_reason: '',
        leverage_source: 'ai',
        important: false,
        done_at: null,
        archived_at: null,
      });
      if (row) n++;
    });
    if (n) st.toast(`Đã thêm ${n} việc mỗi ngày cho "${task.title}". Mỗi việc xong là +${task.leverage === 'high' ? 2 : 1} 💧`, 'success');
    onClose();
  };

  const toggle = (i: number) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <Sheet
      open={!!task}
      onClose={onClose}
      title="AI chia nhỏ đầu việc"
      footer={
        result && (
          <>
            <Button variant="outline" onClick={ask} disabled={!!busy} aria-label="Chia cách khác">
              {busy ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={18} />}
            </Button>
            <Button className="flex-1" onClick={add} disabled={picked.size === 0 || !!busy}>
              Thêm {picked.size} việc mỗi ngày
            </Button>
          </>
        )
      }
    >
      <p className="text-sm text-muted">
        Đầu việc <b className="text-ink">{task?.title}</b>
      </p>
      {!result && (
        <div className="flex flex-col items-center gap-3 py-12 text-sm text-muted">
          <LoaderCircle size={28} className="animate-spin text-primary" />
          AI đang chia thành từng bước nhỏ theo lịch của bạn…
        </div>
      )}
      {result && (
        <>
          {result.note && <p className="mt-3 rounded-2xl bg-soft px-3.5 py-2.5 text-sm leading-snug text-ink">💡 {result.note}</p>}
          <div className={cx('mt-3 flex flex-col gap-2 transition-opacity', busy && 'opacity-50')}>
            {result.steps.map((x, i) => {
              const on = picked.has(i);
              return (
                <button
                  key={i}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(i)}
                  className={cx('flex gap-3 rounded-2xl border-2 p-3 text-left transition', on ? 'border-primary bg-surface' : 'border-line bg-surface opacity-70')}
                >
                  <span className={cx('mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2', on ? 'border-primary bg-primary text-onprimary' : 'border-line')}>
                    {on && <Check size={15} strokeWidth={3} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] leading-snug font-semibold text-ink">{x.title}</span>
                    <span className="mt-1 block text-[13px] text-muted">
                      {WEEKDAY_SHORT[isoWeekday(x.date) - 1]} {formatDM(x.date)} · {formatDuration(x.estimate_min)} · +{task?.leverage === 'high' ? 2 : 1} 💧
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <QuotaHint className="mt-3 text-center" />
        </>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------
// AI giúp diễn đạt (mục tiêu dài hạn hoặc mục tiêu 12 tuần)
// ------------------------------------------------------------
export function PhraseHelper({
  target,
  text,
  detail,
  area,
  visionId,
  onPick,
}: {
  target: 'vision' | 'goal';
  text: string;
  detail: string;
  area?: string;
  visionId?: string;
  onPick: (o: { title: string; detail: string }) => void;
}) {
  const { busy, run } = useAI();
  const [result, setResult] = useState<AIResults['phrase'] | null>(null);

  const ask = async () => {
    if (!text.trim() && !detail.trim()) {
      useStore.getState().toast(target === 'vision' ? 'Hãy viết vài chữ về điều bạn muốn trước, AI sẽ giúp diễn đạt lại.' : 'Hãy viết nháp tên mục tiêu trước, AI sẽ giúp viết lại cho rõ.');
      return;
    }
    const { result: r } = await run('phrase', { target, text, detail, area, vision_id: visionId });
    if (r) setResult(r);
  };

  return (
    <div>
      <AIButton busy={!!busy} onClick={ask} variant="ghost" className="-ml-2">
        {result ? 'Gợi ý cách viết khác' : 'AI giúp diễn đạt'}
      </AIButton>
      {result && (
        <div className="k-fade-in mt-2 flex flex-col gap-2">
          {result.note && <p className="text-[13px] leading-snug text-muted">💡 {result.note}</p>}
          {result.options.map((o, i) => (
            <div key={i} className="rounded-2xl border border-line bg-surface p-3">
              <p className="text-[15px] leading-snug font-semibold text-ink">{o.title}</p>
              {o.detail && (
                <p className="mt-0.5 text-[13px] leading-snug text-muted">
                  {target === 'goal' ? 'Đo bằng: ' : ''}
                  {o.detail}
                </p>
              )}
              <Button
                size="sm"
                variant="soft"
                className="mt-2"
                onClick={() => {
                  onPick(o);
                  setResult(null);
                }}
              >
                <Check size={15} /> Dùng cách viết này
              </Button>
            </div>
          ))}
          <QuotaHint />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// AI nhận xét mức liên kết của mục tiêu 12 tuần với mục tiêu dài hạn
// ------------------------------------------------------------
export function AlignCheck({
  goalId,
  title,
  measure,
  dueDate,
  visionId,
}: {
  goalId?: string;
  title: string;
  measure: string;
  dueDate: string | null;
  visionId: string;
}) {
  const { busy, run } = useAI();
  const [result, setResult] = useState<AIResults['align'] | null>(null);

  const ask = async () => {
    if (!title.trim()) return useStore.getState().toast('Hãy nhập tên mục tiêu trước.');
    if (!visionId) return useStore.getState().toast('Hãy chọn mục tiêu dài hạn trước để AI xem mức liên kết.');
    const { result: r } = await run('align', { goal_id: goalId, title, measure, due_date: dueDate, vision_id: visionId });
    if (r) setResult(r);
  };

  const tone = result ? (result.score >= 4 ? 'text-primary' : result.score === 3 ? 'text-high' : 'text-danger') : '';

  return (
    <div>
      <AIButton busy={!!busy} onClick={ask} variant="ghost" className="-ml-2">
        {result ? 'Nhận xét lại' : 'AI nhận xét mức liên kết'}
      </AIButton>
      {result && (
        <div className="k-fade-in mt-2 rounded-2xl border border-line bg-surface p-3.5">
          <div className="flex items-center gap-2">
            <span className={cx('text-[15px] font-bold', tone)}>{result.verdict}</span>
            <span className="ml-auto flex gap-1" aria-label={`${result.score} trên 5 điểm`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <span key={n} className={cx('h-2 w-5 rounded-full', n <= result.score ? 'bg-primary' : 'bg-surface2')} />
              ))}
            </span>
          </div>
          {result.comment && <p className="mt-1.5 text-sm leading-relaxed text-ink">{result.comment}</p>}
          {result.suggestion && (
            <div className="mt-2 rounded-xl bg-soft px-3 py-2 text-[13px] leading-snug text-ink">
              💡 {result.suggestion}
            </div>
          )}
          <QuotaHint className="mt-2" />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Trạng thái AI (trong Cài đặt)
// ------------------------------------------------------------
export function AIStatus() {
  const [st, setSt] = useState<Awaited<ReturnType<typeof checkAI>> | null>(null);
  const { remaining, limit } = useAIQuota();
  const chat = useChatQuota();
  useEffect(() => {
    let alive = true;
    checkAI()
      .then((r) => alive && setSt(r))
      .catch(() => alive && setSt({ state: 'error' }));
    return () => {
      alive = false;
    };
  }, []);

  const text: Record<string, string> = {
    demo: 'Tính năng AI cần đăng nhập tài khoản, chế độ xem thử chưa dùng được.',
    offline: 'Bạn đang offline.',
    missing: 'AI chưa được bật: chưa tạo Edge Function "ai" trong Supabase (xem hướng dẫn giai đoạn 2a).',
    no_key: 'Edge Function "ai" đã chạy nhưng chưa có khóa GEMINI_API_KEY.',
    error: 'Chưa kiểm tra được trạng thái AI. Thử lại sau.',
  };
  return (
    <div className="text-sm leading-relaxed">
      {!st && <p className="text-muted">Đang kiểm tra…</p>}
      {st?.state === 'ready' && (
        <p className="text-ink">
          ✨ AI đang bật. Hôm nay bạn còn <b>{remaining ?? limit}/{limit}</b> lượt cho các nút AI và <b>{chat.remaining ?? chat.limit}/{chat.limit}</b> tin nhắn trò chuyện.
        </p>
      )}
      {st && st.state !== 'ready' && <p className="text-muted">{text[st.state]}</p>}
      <p className="mt-2 text-[13px] text-muted">
        Trợ lý AI cùng bạn đặt mục tiêu, phân việc 80/20 và chia việc thành từng bước. Các nút AI (gợi ý đầu việc, gắn nhãn, chia nhỏ, xếp lịch…) dùng chung một số lượt; trò chuyện có lượt riêng. Lượt nào AI lỗi thì không bị tính.
      </p>
    </div>
  );
}
