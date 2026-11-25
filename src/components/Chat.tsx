// Giao diện trò chuyện với Trợ lý AI: dùng cho tab "Trợ lý" và cho phần làm quen của người mới.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUp, Brain, CalendarClock, Check, CornerDownRight, Flag, ImagePlus, ListTodo, LoaderCircle, Mountain, RotateCcw, Sparkles, Tag, X, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';
import { applyActions, askAssistant, describeSummary, parentIndex, prepareImage, sendMessage, type ChatMode, type PreparedImage } from '@/lib/chat';
import { useChatQuota, type AIError } from '@/lib/ai';
import { formatDM, isoWeekday, minToHM, WEEKDAY_SHORT } from '@/lib/dates';
import { describeTask } from './AI';
import type { ChatAction, ChatMessage } from '@/lib/types';
import { Button, cx } from './ui';
import { LogoMark } from './Logo';

// ------------------------------------------------------------
// Định dạng đơn giản: đoạn văn, gạch đầu dòng "- ", danh sách "1. ", chữ đậm **…**
// ------------------------------------------------------------
function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <b key={i}>{part.slice(2, -2)}</b> : part));
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, '').split('\n');
  let list: { ordered: boolean; items: string[] } | null = null;
  let para: string[] = [];
  const flushPara = () => {
    if (para.length) blocks.push(<p key={blocks.length}>{inline(para.join(' '))}</p>);
    para = [];
  };
  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <Tag key={blocks.length} className={cx('flex flex-col gap-1 pl-5', list.ordered ? 'list-decimal' : 'list-disc')}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-•*]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      flushPara();
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
    } else if (!line) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.replace(/^#+\s*/, ''));
    }
  }
  flushPara();
  flushList();
  return <div className="flex flex-col gap-2">{blocks}</div>;
}

// ------------------------------------------------------------
// Thẻ đề xuất của AI
// ------------------------------------------------------------
const TYPE_INFO: Record<ChatAction['type'], { label: string; icon: typeof Flag }> = {
  vision: { label: 'Mục tiêu dài hạn', icon: Mountain },
  goal: { label: 'Mục tiêu 12 tuần', icon: Flag },
  task: { label: 'Đầu việc', icon: ListTodo },
  step: { label: 'Việc mỗi ngày', icon: CornerDownRight },
  label: { label: 'Gắn nhãn 20/80', icon: Tag },
  event: { label: 'Lịch cố định', icon: CalendarClock },
};

function useTitleOf() {
  const visions = useStore((s) => s.visions);
  const goals = useStore((s) => s.goals);
  const tasks = useStore((s) => s.tasks);
  return (id: string, actions: ChatAction[]) => {
    if (/^new\d+$/.test(id)) return actions.find((a) => a.ref === id)?.title ?? '';
    return visions.find((v) => v.id === id)?.title ?? goals.find((g) => g.id === id)?.title ?? tasks.find((t) => t.id === id)?.title ?? '';
  };
}

function ActionLine({ a, actions }: { a: ChatAction; actions: ChatAction[] }) {
  const titleOf = useTitleOf();
  const parent = a.parent ? titleOf(a.parent, actions) : '';
  const meta: ReactNode[] = [];
  if (a.type === 'goal') {
    if (a.detail) meta.push(<span key="m">Đo bằng: {a.detail}</span>);
    if (a.date) meta.push(<span key="d">Hạn {formatDM(a.date)}</span>);
  }
  if (a.type === 'vision' && a.detail) meta.push(<span key="v">{a.detail}</span>);
  if (a.type === 'task') {
    meta.push(
      <span key="l" className={cx('inline-flex items-center gap-0.5 font-semibold', a.leverage === 'high' ? 'text-high' : 'text-muted')}>
        {a.leverage === 'high' && <Zap size={11} fill="currentColor" />}
        {a.leverage === 'high' ? 'Việc 20%' : 'Việc 80%'}
      </span>,
      <span key="t">{describeTask({ kind: a.kind, weekdays: a.weekdays, due_date: a.date, estimate_min: a.estimate_min || 30 })}</span>,
    );
  }
  if (a.type === 'step' && a.date) meta.push(<span key="s">{`${WEEKDAY_SHORT[isoWeekday(a.date) - 1]} ${formatDM(a.date)} · ${a.estimate_min || 25}′`}</span>);
  if (a.type === 'label')
    meta.push(
      <span key="lb" className={cx('font-semibold', a.leverage === 'high' ? 'text-high' : 'text-muted')}>
        → {a.leverage === 'high' ? 'Việc 20%' : 'Việc 80%'}
      </span>,
    );
  if (a.type === 'event') meta.push(<span key="e">{`${a.weekdays.map((d) => WEEKDAY_SHORT[d - 1]).join(', ')} · ${minToHM(a.start_min)}–${minToHM(a.end_min)}`}</span>);
  return (
    <span className="min-w-0 flex-1">
      <span className="block text-[14.5px] leading-snug font-semibold text-ink">{a.title}</span>
      {parent && a.type !== 'label' && (
        <span className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
          <CornerDownRight size={12} className="shrink-0" /> <span className="truncate">{parent}</span>
        </span>
      )}
      {meta.length > 0 && <span className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[12.5px] leading-snug text-muted">{meta}</span>}
      {a.reason && (a.type === 'task' || a.type === 'label') && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{a.reason}</span>}
    </span>
  );
}

function ActionCard({ msg, onApplied }: { msg: ChatMessage; onApplied?: (summary: string) => void }) {
  const actions = useMemo(() => msg.meta.actions ?? [], [msg.meta.actions]);
  const applied = useMemo(() => new Set(msg.meta.applied ?? []), [msg.meta.applied]);
  const [picked, setPicked] = useState<Set<number>>(() => new Set(actions.map((_, i) => i).filter((i) => !applied.has(i))));
  const left = actions.map((_, i) => i).filter((i) => !applied.has(i));

  const toggle = (i: number) =>
    setPicked((cur) => {
      const next = new Set(cur);
      if (next.has(i)) {
        // Bỏ một mục thì bỏ luôn các mục con của nó
        const drop = (k: number) => {
          next.delete(k);
          actions.forEach((_, j) => parentIndex(actions, j) === k && drop(j));
        };
        drop(i);
      } else {
        // Chọn một mục thì chọn luôn mục cha (chưa thêm) của nó
        for (let k = i; k >= 0 && !applied.has(k); k = parentIndex(actions, k)) next.add(k);
      }
      return next;
    });

  const add = () => {
    const list = [...picked].filter((i) => !applied.has(i));
    const sum = applyActions(msg, list);
    if (!sum) return;
    const text = describeSummary(sum);
    if (text) {
      useStore.getState().toast(`Đã thêm vào kế hoạch: ${text}.`, 'success');
      onApplied?.(text);
    }
    setPicked(new Set());
  };

  const depth = (i: number) => {
    let d = 0;
    for (let k = parentIndex(actions, i); k >= 0 && d < 3; k = parentIndex(actions, k)) d++;
    return d;
  };

  return (
    <div className="mt-2 w-full rounded-3xl border border-line bg-surface p-3">
      <p className="flex items-center gap-1.5 px-1 text-[13px] font-bold text-ink">
        <Sparkles size={15} className="text-primary" /> {msg.meta.actions_title || 'Đề xuất cho kế hoạch của bạn'}
      </p>
      <div className="mt-2 flex flex-col gap-1.5">
        {actions.map((a, i) => {
          const isDone = applied.has(i);
          const on = isDone || picked.has(i);
          const info = TYPE_INFO[a.type];
          return (
            <button
              key={i}
              type="button"
              disabled={isDone}
              aria-pressed={on}
              onClick={() => toggle(i)}
              style={{ marginLeft: depth(i) * 14 }}
              className={cx('flex gap-2.5 rounded-2xl border p-2.5 text-left transition', isDone ? 'border-transparent bg-soft/60' : on ? 'border-primary/60 bg-surface' : 'border-line bg-surface opacity-60')}
            >
              <span className={cx('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2', on ? 'border-primary bg-primary text-onprimary' : 'border-line')}>{on && <Check size={13} strokeWidth={3} />}</span>
              <span className="min-w-0 flex-1">
                <span className="mb-0.5 flex items-center gap-1 text-[11px] font-bold tracking-wide text-muted uppercase">
                  <info.icon size={12} /> {info.label}
                  {isDone && <span className="ml-1 text-primary normal-case">· đã thêm</span>}
                </span>
                <ActionLine a={a} actions={actions} />
              </span>
            </button>
          );
        })}
      </div>
      {left.length > 0 && (
        <Button className="mt-2.5 w-full" onClick={add} disabled={![...picked].some((i) => !applied.has(i))}>
          <Check size={18} /> Thêm {[...picked].filter((i) => !applied.has(i)).length} mục vào kế hoạch
        </Button>
      )}
    </div>
  );
}

// ------------------------------------------------------------
// Một tin nhắn
// ------------------------------------------------------------
function Bubble({ msg, onApplied }: { msg: ChatMessage; onApplied?: (summary: string) => void }) {
  const ai = msg.role === 'ai';
  return (
    <div className={cx('flex w-full gap-2', ai ? 'justify-start' : 'justify-end')}>
      {ai && (
        <span className="mt-0.5 shrink-0">
          <LogoMark size={30} />
        </span>
      )}
      <div className={cx('flex min-w-0 flex-col', ai ? 'max-w-[92%] items-start' : 'max-w-[85%] items-end')}>
        {msg.meta.image && <img src={msg.meta.image} alt={msg.meta.image_note || 'Ảnh bạn gửi'} className="mb-1 max-h-60 max-w-[240px] rounded-2xl border border-line object-cover" />}
        {msg.content && (
          <div className={cx('rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed', ai ? 'rounded-tl-lg bg-surface text-ink shadow-sm' : 'rounded-tr-lg bg-primary text-onprimary')}>
            {ai ? <RichText text={msg.content} /> : <p className="whitespace-pre-wrap">{msg.content}</p>}
          </div>
        )}
        {ai && msg.meta.remembered && msg.meta.remembered.length > 0 && (
          <p className="mt-1 flex items-start gap-1 px-2 text-[12px] leading-snug text-muted">
            <Brain size={13} className="mt-0.5 shrink-0" /> Đã ghi nhớ: {msg.meta.remembered.join('; ')}
          </p>
        )}
        {ai && msg.meta.actions && msg.meta.actions.length > 0 && <ActionCard msg={msg} onApplied={onApplied} />}
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Khung trò chuyện
// ------------------------------------------------------------
export function ChatView({
  mode,
  stickyClass = 'bottom-0',
  minHeightClass = '',
  prefill,
  onApplied,
  disabledReason,
  footer,
}: {
  mode: ChatMode;
  /** Vị trí dính của ô soạn tin (chừa chỗ cho thanh tab), vd "bottom-0" */
  stickyClass?: string;
  /** Chiều cao tối thiểu của khung (để ô soạn tin luôn ở đáy khi còn ít tin nhắn) */
  minHeightClass?: string;
  prefill?: string;
  onApplied?: (summary: string) => void;
  /** Có lý do không gửi được (chưa chạy SQL, xem thử…) thì hiện thay cho ô soạn tin */
  disabledReason?: ReactNode;
  /** Phần hiện ngay trên ô soạn tin (vd nút "Vào Kairos" khi làm quen xong) */
  footer?: ReactNode;
}) {
  const messages = useStore((s) => s.chat_messages);
  const quota = useChatQuota();
  const [text, setText] = useState(prefill ?? '');
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ msg: ChatMessage; image: PreparedImage | null; error: AIError } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefill) setText(prefill);
  }, [prefill]);

  // Có tin nhắn mới thì cuộn xuống cuối
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'auto', block: 'end' });
  }, [messages.length, busy, failed]);

  // Ô soạn tin tự cao lên theo nội dung (tối đa 6 dòng)
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [text]);

  const send = async (content: string) => {
    const t = content.trim();
    if ((!t && !image) || busy) return;
    setBusy(true);
    setFailed(null);
    const img = image;
    setText('');
    setImage(null);
    const res = await sendMessage(t, img, mode);
    setBusy(false);
    if (!res.msg) {
      setText(t);
      setImage(img);
      return;
    }
    if (!res.ok && res.error) setFailed({ msg: res.msg, image: img, error: res.error });
  };

  const retry = async () => {
    if (!failed || busy) return;
    const f = failed;
    setBusy(true);
    setFailed(null);
    const res = await askAssistant(f.msg, mode, f.image);
    setBusy(false);
    if (!res.ok && res.error) setFailed({ ...f, error: res.error });
  };

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    try {
      setImage(await prepareImage(file));
    } catch (e) {
      useStore.getState().toast(e instanceof Error ? e.message : 'Không đọc được ảnh.', 'error');
    }
  };

  const last = messages[messages.length - 1];
  const quick = !busy && !failed && last?.role === 'ai' ? last.meta.quick_replies ?? [] : [];

  return (
    <div className={cx('flex flex-col', minHeightClass)}>
      <div className="flex flex-1 flex-col gap-4 px-4 pt-2 pb-4 lg:px-8">
        {messages.map((m) => (
          <Bubble key={m.id} msg={m} onApplied={onApplied} />
        ))}
        {busy && (
          <div className="flex items-center gap-2">
            <LogoMark size={30} />
            <span className="flex items-center gap-2 rounded-3xl rounded-tl-lg bg-surface px-4 py-3 text-sm text-muted shadow-sm">
              <LoaderCircle size={16} className="animate-spin text-primary" /> Trợ lý đang nghĩ…
            </span>
          </div>
        )}
        {failed && (
          <div className="k-fade-in ml-10 flex flex-col items-start gap-2 rounded-2xl bg-danger/8 px-3.5 py-2.5 text-sm text-ink">
            <p>{failed.error.message}</p>
            {failed.error.code !== 'quota' && failed.error.code !== 'demo' && (
              <Button size="sm" variant="outline" onClick={retry}>
                <RotateCcw size={15} /> Thử lại
              </Button>
            )}
          </div>
        )}
        {quick.length > 0 && (
          <div className="ml-10 flex flex-wrap gap-1.5">
            {quick.map((q) => (
              <button key={q} type="button" onClick={() => void send(q)} className="min-h-9 rounded-full border border-primary/40 bg-surface px-3 text-[13.5px] font-medium text-ink transition hover:bg-soft active:scale-[.97]">
                {q}
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Ô soạn tin dính ở đáy màn hình */}
      <div className={cx('sticky z-20 border-t border-line bg-bg/95 px-3 pt-2 pb-2 backdrop-blur lg:px-6', stickyClass)}>
        {footer}
        {disabledReason ? (
          <div className="rounded-2xl bg-surface2 px-4 py-3 text-sm leading-snug text-muted">{disabledReason}</div>
        ) : (
          <>
            {image && (
              <div className="mb-2 flex items-center gap-2">
                <span className="relative">
                  <img src={image.thumb} alt="Ảnh sẽ gửi" className="h-16 w-16 rounded-xl border border-line object-cover" />
                  <button type="button" aria-label="Bỏ ảnh" onClick={() => setImage(null)} className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-bg">
                    <X size={14} />
                  </button>
                </span>
                <span className="text-xs text-muted">Ảnh được thu nhỏ trước khi gửi.</span>
              </div>
            )}
            <div className="flex items-end gap-1.5">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void pickImage(e.target.files?.[0]).finally(() => (e.target.value = ''))} />
              <button type="button" aria-label="Gửi kèm ảnh" title="Gửi kèm ảnh" onClick={() => fileRef.current?.click()} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-surface2">
                <ImagePlus size={22} />
              </button>
              <textarea
                ref={inputRef}
                value={text}
                rows={1}
                maxLength={4000}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && !('ontouchstart' in window)) {
                    e.preventDefault();
                    void send(text);
                  }
                }}
                placeholder={mode === 'onboarding' ? 'Trả lời Trợ lý…' : 'Hỏi Trợ lý, ví dụ: phân việc 80/20 cho tuần này'}
                aria-label="Tin nhắn cho Trợ lý AI"
                className="k-input max-h-40 min-h-11 flex-1 resize-none !rounded-3xl !py-2.5"
              />
              <button
                type="button"
                aria-label="Gửi"
                onClick={() => void send(text)}
                disabled={busy || (!text.trim() && !image)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-onprimary transition active:scale-95 disabled:opacity-40"
              >
                {busy ? <LoaderCircle size={20} className="animate-spin" /> : <ArrowUp size={22} strokeWidth={2.5} />}
              </button>
            </div>
            {quota.remaining !== null && quota.remaining <= 10 && <p className="mt-1 px-2 text-center text-[11.5px] text-muted">Còn {quota.remaining}/{quota.limit} tin nhắn hôm nay</p>}
          </>
        )}
      </div>
    </div>
  );
}
