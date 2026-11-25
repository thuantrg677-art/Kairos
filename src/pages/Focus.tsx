// "Focus" (bản 2): một nghi thức nhỏ để bắt đầu tập trung. Không tính điểm, không tưới cây.
//   Trước phiên: phiên này bạn làm gì? Có muốn AI gợi ý các bước không?
//   Trong phiên: chỉ có Bắt đầu và Dừng (đồng hồ đếm lên), các bước để tự đánh dấu.
//   Sau phiên: bạn học có hiệu quả không?

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, LoaderCircle, Play, RefreshCw, Sparkles, Square, Target, X } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { fmtClock, useFocus, useFocusElapsed } from '@/lib/focus';
import { useAI } from '@/lib/ai';
import { addDays, formatDM, formatDuration, mondayOf, todayISO, toISO } from '@/lib/dates';
import { itemsForDate } from '@/lib/logic';
import type { FocusSession } from '@/lib/types';
import { Button, Card, cx, LeverageBadge } from '@/components/ui';
import { PageHeader } from '@/components/AppShell';
import { SoundMixer } from '@/components/SoundMixer';
import { QuotaHint } from '@/components/AI';

const RATINGS = [
  { v: 3, emoji: '😊', label: 'Hiệu quả', ask: 'Điều gì giúp bạn tập trung tốt? Ghi lại để lần sau lặp lại.' },
  { v: 2, emoji: '😐', label: 'Tạm được', ask: 'Điều gì sẽ làm phiên sau tốt hơn?' },
  { v: 1, emoji: '😣', label: 'Chưa hiệu quả', ask: 'Điều gì làm bạn khó tập trung?' },
] as const;

const AFTER: Record<number, string> = {
  3: 'Tuyệt! Nhớ điều đã giúp bạn để lặp lại ở phiên sau.',
  2: 'Ổn rồi. Phiên sau thử chia việc nhỏ hơn hoặc cất điện thoại ra xa nhé.',
  1: 'Không sao, ai cũng có phiên như vậy. Lần sau thử bắt đầu bằng bước dễ nhất, chỉ 2 phút thôi.',
};

/** Vòng tròn thở nhẹ phía sau đồng hồ khi đang focus */
function Pulse({ active }: { active: boolean }) {
  return (
    <div className="relative mx-auto flex h-52 w-52 items-center justify-center">
      <span className={cx('absolute inset-0 rounded-full bg-soft', active && 'k-breathe')} aria-hidden />
      <span className="absolute inset-6 rounded-full border-2 border-primary/30" aria-hidden />
      <Target size={40} className="relative text-primary" aria-hidden />
    </div>
  );
}

function StepList({ editable }: { editable?: boolean }) {
  const steps = useFocus((s) => s.steps);
  const toggle = useFocus((s) => s.toggleStep);
  const setSteps = useFocus((s) => s.setSteps);
  const tip = useFocus((s) => s.tip);
  if (!steps.length) return null;
  return (
    <div className="w-full max-w-md text-left">
      <ol className="flex flex-col gap-1.5">
        {steps.map((x, i) => (
          <li key={i} className="flex items-center gap-2 rounded-2xl bg-surface2 py-1 pr-1 pl-1">
            <button
              type="button"
              role="checkbox"
              aria-checked={!!x.done}
              aria-label={x.done ? `Bỏ đánh dấu: ${x.title}` : `Đánh dấu xong: ${x.title}`}
              onClick={() => toggle(i)}
              className="flex h-10 w-10 shrink-0 items-center justify-center"
            >
              <span className={cx('flex h-6 w-6 items-center justify-center rounded-full border-2 text-[12px] font-bold', x.done ? 'border-primary bg-primary text-onprimary' : 'border-muted/50 text-muted')}>
                {x.done ? <Check size={14} strokeWidth={3.5} /> : i + 1}
              </span>
            </button>
            <span className={cx('min-w-0 flex-1 text-[14.5px] leading-snug', x.done && 'text-muted line-through')}>
              {x.title}
              {x.minutes ? <span className="ml-1 text-xs text-muted">· {x.minutes}′</span> : null}
            </span>
            {editable && (
              <button type="button" aria-label={`Bỏ bước: ${x.title}`} onClick={() => setSteps(steps.filter((_, k) => k !== i), tip)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted">
                <X size={16} />
              </button>
            )}
          </li>
        ))}
      </ol>
      {tip && <p className="mt-2 rounded-2xl bg-soft px-3.5 py-2 text-[13px] leading-snug text-ink">💡 {tip}</p>}
    </div>
  );
}

/** Bước 1–2: chọn việc, gợi ý các bước, bắt đầu */
function Setup() {
  const d = useData();
  const f = useFocus();
  const ai = useAI();
  const today = todayISO();
  // null = chưa trả lời câu hỏi "có muốn AI gợi ý không"; 'yes' = đã lấy gợi ý
  const [askedSteps, setAskedSteps] = useState<'yes' | null>(f.steps.length ? 'yes' : null);
  const [showAll, setShowAll] = useState(false);
  const todays = useMemo(() => itemsForDate(d, today).filter((i) => !i.done), [d, today]);
  const task = f.taskId ? d.tasks.find((t) => t.id === f.taskId) ?? null : null;

  const suggest = async () => {
    setAskedSteps('yes');
    const { result } = await ai.run('focus_steps', { intention: f.intention.trim(), task_id: f.taskId });
    if (result) f.setSteps(result.steps.map((x) => ({ title: x.title, minutes: x.minutes })), result.tip);
    else if (!f.steps.length) setAskedSteps(null);
  };

  const ready = f.intention.trim().length > 0;
  const shown = showAll ? todays : todays.slice(0, 4);

  return (
    <div className="flex w-full flex-col items-center">
      <label className="w-full max-w-md text-left">
        <span className="mb-1.5 block text-[17px] font-bold text-ink">Phiên này bạn làm gì?</span>
        <textarea
          className="k-input resize-none text-[15px]"
          rows={2}
          maxLength={300}
          value={f.intention}
          onChange={(e) => f.setIntention(e.target.value)}
          placeholder="Ví dụ: Viết xong phần mở đầu của bài luận"
        />
      </label>

      {task && (
        <div className="mt-2 flex w-full max-w-md items-center gap-2 rounded-2xl bg-soft px-3 py-1.5 text-left text-[13px]">
          <span className="min-w-0 flex-1 truncate">
            Gắn với việc: <b>{task.title}</b>
          </span>
          <button type="button" className="flex h-8 w-8 items-center justify-center rounded-full text-muted" aria-label="Bỏ gắn việc" onClick={() => f.setTask(null)}>
            <X size={15} />
          </button>
        </div>
      )}

      {!task && todays.length > 0 && (
        <div className="mt-3 w-full max-w-md text-left">
          <p className="mb-1.5 text-[13px] font-semibold text-muted">Hoặc chọn một việc hôm nay:</p>
          <div className="flex flex-col gap-1.5">
            {shown.map((i) => (
              <button
                key={i.task.id}
                type="button"
                onClick={() => {
                  f.setTask(i.task.id, i.task.title);
                  setAskedSteps(null);
                }}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-line bg-surface px-3 py-1.5 text-left transition hover:bg-surface2"
              >
                <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{i.task.title}</span>
                <LeverageBadge leverage={i.task.leverage} compact step={!!i.task.parent_id} />
              </button>
            ))}
          </div>
          {todays.length > 4 && (
            <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-1 inline-flex min-h-9 items-center gap-1 text-[13px] font-semibold text-primary">
              {showAll ? 'Thu gọn' : `Xem thêm ${todays.length - 4} việc`} <ChevronDown size={15} className={cx('transition-transform', showAll && 'rotate-180')} />
            </button>
          )}
        </div>
      )}

      {ready && askedSteps === null && (
        <div className="k-fade-in mt-5 w-full max-w-md rounded-3xl border border-line bg-surface2/60 p-4 text-left">
          <p className="text-[15px] font-bold text-ink">Bạn có muốn AI gợi ý các bước thực hiện không?</p>
          <p className="mt-0.5 text-[13px] leading-snug text-muted">AI chia việc này thành vài bước cụ thể, bước đầu tiên thật dễ để bắt tay vào ngay.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" variant="soft" onClick={suggest}>
              <Sparkles size={17} /> Có, gợi ý giúp mình
            </Button>
            <Button className="flex-1" onClick={f.start}>
              <Play size={17} fill="currentColor" /> Không, bắt đầu luôn
            </Button>
          </div>
        </div>
      )}

      {ready && askedSteps === 'yes' && (
        <div className="k-fade-in mt-5 flex w-full max-w-md flex-col items-center gap-3">
          {ai.busy && !f.steps.length ? (
            <p className="flex items-center gap-2 py-6 text-sm text-muted">
              <LoaderCircle size={20} className="animate-spin text-primary" /> AI đang chia việc thành từng bước…
            </p>
          ) : (
            <>
              <p className="w-full text-left text-[15px] font-bold text-ink">Các bước cho phiên này</p>
              <StepList editable />
              <div className="flex w-full gap-2">
                <Button variant="outline" onClick={suggest} disabled={!!ai.busy} aria-label="Gợi ý cách khác">
                  {ai.busy ? <LoaderCircle size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                </Button>
                <Button size="lg" className="flex-1" onClick={f.start}>
                  <Play size={20} fill="currentColor" /> Bắt đầu focus
                </Button>
              </div>
              <QuotaHint />
            </>
          )}
        </div>
      )}

      {!ready && <p className="mt-5 max-w-md text-[13px] leading-relaxed text-muted">Viết một câu về điều bạn định làm. Nói rõ việc cần xong giúp bạn bắt đầu dễ hơn và biết khi nào là xong.</p>}
    </div>
  );
}

/** Bước 3: đang tập trung */
function Running() {
  const f = useFocus();
  const elapsed = useFocusElapsed();
  return (
    <div className="flex w-full flex-col items-center">
      <Pulse active />
      <p className="-mt-2 text-sm font-semibold text-primary">Đang tập trung</p>
      <p className="text-[56px] leading-none font-bold tracking-tight tabular-nums" aria-live="off">
        {fmtClock(elapsed)}
      </p>
      <p className="mt-3 max-w-md text-[16px] leading-snug font-semibold text-ink">{f.intention}</p>
      <div className="mt-4 w-full max-w-md">
        <StepList />
      </div>
      <Button size="lg" variant="outline" className="mt-5 w-full max-w-md" onClick={f.stop}>
        <Square size={18} /> Dừng focus
      </Button>
    </div>
  );
}

/** Bước 4: sau phiên */
function Reflect() {
  const f = useFocus();
  const elapsed = useFocusElapsed();
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const doneSteps = f.steps.filter((x) => x.done).length;
  const save = (r: number | null) => {
    f.finish(r, r ? note : '');
    useStore.getState().toast(r ? AFTER[r] : 'Đã lưu phiên focus.', 'success');
  };
  return (
    <div className="flex w-full flex-col items-center">
      <p className="text-sm font-semibold text-primary">Bạn vừa tập trung {formatDuration(elapsed / 60000)}</p>
      <p className="mt-1 max-w-md text-[15px] leading-snug text-ink">{f.intention}</p>
      {f.steps.length > 0 && (
        <p className="mt-1 text-[13px] text-muted">
          Đã xong {doneSteps}/{f.steps.length} bước
        </p>
      )}
      <h2 className="mt-5 text-[19px] font-bold text-ink">Phiên vừa rồi bạn học có hiệu quả không?</h2>
      <div className="mt-3 grid w-full max-w-md grid-cols-3 gap-2" role="radiogroup" aria-label="Tự đánh giá phiên focus">
        {RATINGS.map((r) => (
          <button
            key={r.v}
            type="button"
            role="radio"
            aria-checked={rating === r.v}
            onClick={() => setRating(r.v)}
            className={cx('flex flex-col items-center gap-1 rounded-2xl border-2 px-1 py-3 transition active:scale-[.97]', rating === r.v ? 'border-primary bg-soft' : 'border-line bg-surface')}
          >
            <span className="text-3xl leading-none" aria-hidden>
              {r.emoji}
            </span>
            <span className="text-[13px] font-semibold text-ink">{r.label}</span>
          </button>
        ))}
      </div>
      {rating !== null && (
        <label className="k-fade-in mt-4 w-full max-w-md text-left">
          <span className="mb-1.5 block text-sm font-semibold">{RATINGS.find((r) => r.v === rating)!.ask} (không bắt buộc)</span>
          <textarea className="k-input resize-none" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Viết vài chữ cho chính mình" />
        </label>
      )}
      <div className="mt-4 flex w-full max-w-md gap-2">
        <Button variant="ghost" onClick={() => save(null)}>
          Bỏ qua
        </Button>
        <Button size="lg" className="flex-1" disabled={rating === null} onClick={() => save(rating)}>
          Lưu phiên
        </Button>
      </div>
    </div>
  );
}

const RATING_EMOJI = ['', '😣', '😐', '😊'];

/** Các phiên gần đây và tỉ lệ phiên hiệu quả trong tuần */
function Recent() {
  const sessions = useStore((s) => s.focus_sessions);
  const tasks = useStore((s) => s.tasks);
  const today = todayISO();
  const recent = useMemo(() => [...sessions].sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 8), [sessions]);
  const week = useMemo(() => {
    const mon = mondayOf(today);
    const list = sessions.filter((f) => {
      const d = toISO(new Date(f.started_at));
      return d >= mon && d <= addDays(mon, 6);
    });
    const rated = list.filter((f) => f.rating);
    return { count: list.length, min: list.reduce((n, f) => n + f.actual_sec / 60, 0), good: rated.filter((f) => f.rating === 3).length, rated: rated.length };
  }, [sessions, today]);
  if (!recent.length) return null;
  const label = (f: FocusSession) => f.intention || tasks.find((t) => t.id === f.task_id)?.title || 'Phiên focus';
  return (
    <Card className="p-4">
      <h2 className="text-base font-bold">Phiên gần đây</h2>
      <p className="mt-0.5 text-[13px] text-muted">
        Tuần này: {week.count} phiên · {formatDuration(week.min)}
        {week.rated > 0 && ` · ${week.good}/${week.rated} phiên bạn thấy hiệu quả`}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {recent.map((f) => {
          const d = toISO(new Date(f.started_at));
          return (
            <li key={f.id} className="flex items-center gap-3 rounded-2xl bg-surface2 px-3 py-2">
              <span className="w-7 shrink-0 text-center text-xl" aria-label={f.rating ? `Tự đánh giá ${f.rating}/3` : 'Chưa đánh giá'}>
                {f.rating ? RATING_EMOJI[f.rating] : '·'}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold">{label(f)}</span>
                <span className="block text-xs text-muted">
                  {d === today ? 'Hôm nay' : formatDM(d)} · {formatDuration(f.actual_sec / 60)}
                  {f.reflection ? ` · “${f.reflection}”` : ''}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export default function Focus() {
  const [params, setParams] = useSearchParams();
  const phase = useFocus((s) => s.phase);
  const d = useData();
  const [sound, setSound] = useState(false);

  // Đến từ nút "Bắt đầu focus" ở Hôm nay: gắn sẵn việc đó (nếu chưa có phiên nào đang chạy)
  useEffect(() => {
    const id = params.get('viec');
    if (!id) return;
    const st = useFocus.getState();
    const task = d.tasks.find((t) => t.id === id);
    if (st.phase === 'idle' && task) st.setTask(id, task.title);
    setParams({}, { replace: true });
  }, [params, setParams, d.tasks]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Focus" subtitle="Một nghi thức nhỏ để bắt đầu tập trung." />
      <div className="flex flex-col gap-4 px-4 lg:px-8">
        <Card className="flex flex-col items-center px-5 pt-6 pb-6 text-center">
          {phase === 'idle' && <Setup />}
          {phase === 'running' && <Running />}
          {phase === 'reflect' && <Reflect />}
        </Card>

        {phase !== 'reflect' && (
          <div>
            <button type="button" onClick={() => setSound((v) => !v)} aria-expanded={sound} className="flex min-h-11 w-full items-center justify-between rounded-2xl px-2 text-sm font-semibold text-muted">
              <span>Âm thanh nền (không bắt buộc)</span>
              <ChevronDown size={18} className={cx('transition-transform', sound && 'rotate-180')} />
            </button>
            {sound && (
              <div className="k-fade-in mt-1">
                <SoundMixer />
              </div>
            )}
          </div>
        )}

        <Recent />

        <p className="px-2 pb-2 text-center text-[13px] leading-relaxed text-muted">
          Focus không tính điểm và không tưới cây. Cây chỉ lớn khi bạn tick việc đã thật sự xong ở màn Hôm nay hoặc Mục tiêu.
        </p>
      </div>
    </div>
  );
}
