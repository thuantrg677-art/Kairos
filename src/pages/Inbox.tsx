// "Nháp": hộp thư ghi nhanh. Ghi trước, sắp xếp sau.

import { useMemo, useState } from 'react';
import { ArrowLeft, CornerDownLeft, Sparkles, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { useAI, type AIResults } from '@/lib/ai';
import { AIButton, describeTask, QuotaHint } from '@/components/AI';
import { diffDays, formatDMY, todayISO } from '@/lib/dates';
import type { InboxItem, Task } from '@/lib/types';
import { Button, Card, EmptyState, IconButton, LeverageBadge } from '@/components/ui';
import { Plant } from '@/components/Plant';
import { TaskEditor } from '@/components/Editors';

function ago(iso: string): string {
  const n = diffDays(iso.slice(0, 10), todayISO());
  if (n <= 0) return 'Hôm nay';
  if (n === 1) return 'Hôm qua';
  if (n < 7) return `${n} ngày trước`;
  return formatDMY(iso.slice(0, 10));
}

export default function Inbox() {
  const all = useStore((s) => s.inbox_items);
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [converting, setConverting] = useState<{ item: InboxItem; defaults: Partial<Task> } | null>(null);
  const [hints, setHints] = useState<Map<string, Hint>>(new Map());
  const ai = useAI();
  const goals = useStore((s) => s.goals);

  const items = useMemo(() => all.filter((i) => !i.processed_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), [all]);
  const st = useStore.getState();

  const askAI = async () => {
    const batch = items.slice(0, 15);
    const { result } = await ai.run('inbox', { items: batch.map((i) => ({ id: i.id, content: i.content })) });
    if (!result) return;
    setHints(new Map(result.items.map((h) => [h.item_id, h])));
    if (items.length > batch.length) st.toast(`AI đã xem ${batch.length} mục mới nhất. Xử lý xong thì bấm lại để xem tiếp.`);
  };

  const convert = (item: InboxItem, hint?: Hint) => {
    const base: Partial<Task> = { title: item.content.split('\n')[0].slice(0, 300), kind: 'once' };
    if (hint?.action === 'task') {
      const t = hint.task;
      Object.assign(base, {
        title: t.title,
        goal_id: t.goal_id,
        kind: t.kind,
        weekdays: t.weekdays,
        due_date: t.due_date,
        estimate_min: t.estimate_min,
        leverage: t.leverage,
        leverage_reason: t.reason,
        leverage_source: 'ai',
      } satisfies Partial<Task>);
    }
    setConverting({ item, defaults: base });
  };

  const add = () => {
    const content = text.trim();
    if (!content) return;
    if (st.insert('inbox_items', { content, processed_at: null, task_id: null })) setText('');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center gap-1 px-2 pt-4 pb-2 lg:px-6 lg:pt-8">
        <IconButton label="Quay lại" onClick={() => navigate(-1)} className="lg:hidden">
          <ArrowLeft size={22} />
        </IconButton>
        <div className="px-2">
          <h1 className="text-[26px] leading-tight font-bold">Nháp</h1>
          <p className="text-sm text-muted">Ghi nhanh mọi thứ chợt nghĩ ra, rồi sắp xếp khi rảnh.</p>
        </div>
      </header>

      <div className="px-4 lg:px-8">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input className="k-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Ghi nhanh một ý tưởng hoặc việc cần làm…" aria-label="Ghi nhanh" />
          <Button type="submit" disabled={!text.trim()} aria-label="Lưu vào Nháp" className="shrink-0">
            <CornerDownLeft size={18} />
          </Button>
        </form>

        {items.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <AIButton busy={!!ai.busy} onClick={askAI}>
              {hints.size ? 'AI xem lại Nháp' : 'AI gợi ý cách xếp'}
            </AIButton>
            <QuotaHint />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2">
          {items.length === 0 && (
            <Card>
              <EmptyState art={<Plant species="linh-lan" stage={2} size={84} />} title="Nháp đang trống">
                Đầu óc nhẹ nhõm rồi. Khi có ý tưởng mới, bấm nút bút chì ở góc màn hình để ghi lại.
              </EmptyState>
            </Card>
          )}
          {items.map((item) => {
            const hint = hints.get(item.id);
            const goal = hint?.action === 'task' && hint.task.goal_id ? goals.find((g) => g.id === hint.task.goal_id) : null;
            return (
            <Card key={item.id} className="p-3.5">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{item.content}</p>
              <p className="mt-1 text-xs text-muted">{ago(item.created_at)}</p>
              {hint && (
                <div className="k-fade-in mt-2.5 rounded-2xl bg-soft px-3 py-2.5 text-[13px] leading-snug text-ink">
                  <p className="flex items-center gap-1 font-bold">
                    <Sparkles size={13} /> {hint.action === 'task' ? 'AI gợi ý: chuyển thành việc' : 'AI gợi ý: giữ làm ghi chú'}
                  </p>
                  {hint.action === 'task' && (
                    <>
                      <p className="mt-1 text-[14px] font-semibold">{hint.task.title}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-muted">
                        <LeverageBadge leverage={hint.task.leverage} compact />
                        {describeTask(hint.task)}
                        {goal && <span>· {goal.title}</span>}
                      </p>
                    </>
                  )}
                  {hint.tip && <p className="mt-1 text-muted">{hint.tip}</p>}
                </div>
              )}
              <div className="mt-2.5 flex flex-wrap gap-2">
                {hint?.action === 'task' && (
                  <Button size="sm" onClick={() => convert(item, hint)}>
                    Dùng gợi ý
                  </Button>
                )}
                <Button size="sm" variant={hint?.action === 'task' ? 'outline' : 'primary'} onClick={() => convert(item)}>
                  Chuyển thành việc
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-muted" aria-label="Xóa mục này" onClick={() => st.remove('inbox_items', item.id)}>
                  <Trash2 size={17} />
                </Button>
              </div>
            </Card>
            );
          })}
        </div>

        {items.length > 0 && (
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            "Chuyển thành việc" cho phép gắn mục vào một mục tiêu, đặt deadline, cho lặp lại hoặc đưa vào việc hôm nay.
            <span className="mt-1 flex items-center gap-1.5">
              <Sparkles size={14} /> "AI gợi ý cách xếp" đề xuất mục nào nên thành việc, thuộc mục tiêu nào, nhãn và hạn ra sao. Bạn vẫn xem lại trước khi lưu.
            </span>
          </p>
        )}
      </div>

      <TaskEditor
        open={!!converting}
        onClose={() => setConverting(null)}
        defaults={converting?.defaults}
        onSaved={(task) => {
          if (converting) st.update('inbox_items', converting.item.id, { processed_at: new Date().toISOString(), task_id: task.id });
          st.toast('Đã chuyển thành việc', 'success');
        }}
      />
    </div>
  );
}

type Hint = AIResults['inbox']['items'][number];
