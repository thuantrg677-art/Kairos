// "Nháp": hộp thư ghi nhanh. Ghi trước, sắp xếp sau.

import { useMemo, useState } from 'react';
import { ArrowLeft, CornerDownLeft, Sparkles, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/lib/store';
import { diffDays, formatDMY, todayISO } from '@/lib/dates';
import type { InboxItem } from '@/lib/types';
import { Button, Card, EmptyState, IconButton } from '@/components/ui';
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
  const [converting, setConverting] = useState<InboxItem | null>(null);

  const items = useMemo(() => all.filter((i) => !i.processed_at).sort((a, b) => b.created_at.localeCompare(a.created_at)), [all]);
  const st = useStore.getState();

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

        <div className="mt-4 flex flex-col gap-2">
          {items.length === 0 && (
            <Card>
              <EmptyState art={<Plant species="linh-lan" stage={2} size={84} />} title="Nháp đang trống">
                Đầu óc nhẹ nhõm rồi. Khi có ý tưởng mới, bấm nút bút chì ở góc màn hình để ghi lại.
              </EmptyState>
            </Card>
          )}
          {items.map((item) => (
            <Card key={item.id} className="p-3.5">
              <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-ink">{item.content}</p>
              <p className="mt-1 text-xs text-muted">{ago(item.created_at)}</p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setConverting(item)}>
                  Chuyển thành việc
                </Button>
                <Button size="sm" variant="ghost" className="ml-auto text-muted" aria-label="Xóa mục này" onClick={() => st.remove('inbox_items', item.id)}>
                  <Trash2 size={17} />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {items.length > 0 && (
          <p className="mt-4 text-[13px] leading-relaxed text-muted">
            "Chuyển thành việc" cho phép gắn mục vào một mục tiêu, đặt deadline, cho lặp lại hoặc đưa vào việc hôm nay.
            <span className="mt-1 flex items-center gap-1.5">
              <Sparkles size={14} /> Ở giai đoạn 2, AI sẽ gợi ý nên xếp từng mục vào đâu.
            </span>
          </p>
        )}
      </div>

      <TaskEditor
        open={!!converting}
        onClose={() => setConverting(null)}
        defaults={{ title: converting?.content.split('\n')[0].slice(0, 300) ?? '', kind: 'once' }}
        onSaved={(task) => {
          if (converting) st.update('inbox_items', converting.id, { processed_at: new Date().toISOString(), task_id: task.id });
          st.toast('Đã chuyển thành việc', 'success');
        }}
      />
    </div>
  );
}
