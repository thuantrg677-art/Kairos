// Nhật ký ngày: bảng viết/sửa nhật ký, thẻ nhắc ở màn Hôm nay, ô chọn năng lượng.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ListChecks, NotebookPen, Pencil, Trash2 } from 'lucide-react';
import { useData, useStore } from '@/lib/store';
import { addDays, formatDM, formatDuration, formatLongDate, isoWeekday, mondayOf, todayISO } from '@/lib/dates';
import { getActiveCycle } from '@/lib/logic';
import { daySummary, energyOf, ENERGY, saveJournal } from '@/lib/review';
import type { Journal } from '@/lib/types';
import { Button, Card, cx, Field, Sheet } from './ui';

export function EnergyPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Năng lượng hôm nay">
      {ENERGY.map((e) => {
        const on = value === e.v;
        return (
          <button
            key={e.v}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(on ? null : e.v)}
            className={cx('flex min-h-16 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 px-1 transition active:scale-95', on ? 'border-primary bg-soft' : 'border-transparent bg-surface2')}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {e.emoji}
            </span>
            <span className="text-center text-[11px] leading-tight font-medium text-ink">{e.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Tóm tắt một ngày: việc đã xong, 💧, giờ focus */
export function DayChips({ date }: { date: string }) {
  const d = useData();
  const sum = useMemo(() => daySummary(d, date), [d, date]);
  return (
    <div className="flex flex-wrap gap-1.5 text-[13px] font-semibold">
      {sum.planned > 0 && (
        <span className="rounded-full bg-surface2 px-2.5 py-1">
          {sum.done}/{sum.planned} việc
        </span>
      )}
      <span className="rounded-full bg-surface2 px-2.5 py-1">{sum.drops} 💧</span>
      <span className="rounded-full bg-surface2 px-2.5 py-1">Focus {formatDuration(sum.focusMin)}</span>
    </div>
  );
}

export function JournalSheet({ date, onClose }: { date: string | null; onClose: () => void }) {
  const d = useData();
  const existing = date ? d.journals.find((j) => j.date === date) ?? null : null;
  const [energy, setEnergy] = useState<number | null>(null);
  const [did, setDid] = useState('');
  const [improve, setImprove] = useState('');

  useEffect(() => {
    if (!date) return;
    setEnergy(existing?.energy ?? null);
    setDid(existing?.did ?? '');
    setImprove(existing?.improve ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, existing?.id]);

  const sum = useMemo(() => (date ? daySummary(d, date) : null), [d, date]);

  const fillFromTicks = () => {
    if (!sum || sum.doneTasks.length === 0) return useStore.getState().toast('Ngày này chưa tick việc nào.');
    const lines = sum.doneTasks.map((t) => `- ${t.title}`).join('\n');
    setDid((cur) => (cur.trim() ? `${cur.trim()}\n${lines}` : lines));
  };

  const save = () => {
    if (!date) return;
    if (!energy && !did.trim() && !improve.trim()) return useStore.getState().toast('Hãy chọn năng lượng hoặc viết vài dòng trước khi lưu.');
    if (!saveJournal(date, { energy, did: did.trim().slice(0, 4000), improve: improve.trim().slice(0, 4000) })) return;
    useStore.getState().toast(existing ? 'Đã lưu nhật ký' : 'Đã viết nhật ký. Ngủ ngon nhé 🌙', 'success');
    onClose();
  };

  const remove = () => {
    if (!existing || !window.confirm('Xóa nhật ký của ngày này?')) return;
    useStore.getState().remove('journals', existing.id);
    onClose();
  };

  return (
    <Sheet
      open={!!date}
      onClose={onClose}
      title={date === todayISO() ? 'Nhật ký hôm nay' : 'Nhật ký'}
      footer={
        <>
          {existing && (
            <Button variant="danger" onClick={remove} aria-label="Xóa nhật ký">
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            Lưu nhật ký
          </Button>
        </>
      }
    >
      {date && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-sm text-muted">{formatLongDate(date)}</p>
            <DayChips date={date} />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-semibold text-ink">Năng lượng của bạn hôm nay thế nào?</span>
            <EnergyPicker value={energy} onChange={setEnergy} />
          </div>
          <Field label="Hôm nay mình đã làm được gì?">
            <textarea className="k-input resize-none" rows={4} maxLength={4000} value={did} onChange={(e) => setDid(e.target.value)} placeholder="Việc đã xong, điều khiến bạn vui, một chút tiến bộ nhỏ…" />
          </Field>
          {sum && sum.doneTasks.length > 0 && (
            <Button size="sm" variant="ghost" className="-mt-3 self-start" onClick={fillFromTicks}>
              <ListChecks size={16} /> Điền nhanh {sum.doneTasks.length} việc đã tick
            </Button>
          )}
          <Field label="Ngày mai mình muốn làm tốt hơn điều gì?">
            <textarea className="k-input resize-none" rows={3} maxLength={4000} value={improve} onChange={(e) => setImprove(e.target.value)} placeholder="Một điều cụ thể thôi là đủ." />
          </Field>
          <p className="text-[12.5px] leading-snug text-muted">Nhật ký chỉ mình bạn xem được. Khi bạn bấm “AI nhận xét tuần”, AI sẽ đọc nhật ký của tuần đó để nhận xét sát hơn.</p>
        </div>
      )}
    </Sheet>
  );
}

/** Một dòng nhật ký trong danh sách */
export function JournalEntry({ journal, onEdit }: { journal: Journal; onEdit: () => void }) {
  const e = energyOf(journal.energy);
  return (
    <button type="button" onClick={onEdit} className="block w-full rounded-3xl border border-line bg-surface p-4 text-left transition active:scale-[.99]">
      <div className="flex items-center gap-2">
        {e && (
          <span className="text-xl leading-none" title={e.label} aria-label={`Năng lượng: ${e.label}`}>
            {e.emoji}
          </span>
        )}
        <span className="flex-1 text-sm font-bold text-ink">{formatLongDate(journal.date)}</span>
        <Pencil size={16} className="text-muted" aria-hidden />
      </div>
      {journal.did && <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink">{journal.did}</p>}
      {journal.improve && (
        <p className="mt-2 rounded-2xl bg-surface2 px-3 py-2 text-[13px] leading-snug text-ink">
          <span className="font-semibold">Ngày mai: </span>
          {journal.improve}
        </p>
      )}
    </button>
  );
}

/** Thẻ ở màn Hôm nay: nhắc viết nhật ký, hoặc hiện nhật ký đã viết */
export function JournalCard() {
  const today = todayISO();
  const journal = useStore((s) => s.journals.find((j) => j.date === today));
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const evening = new Date().getHours() >= 17;
  const e = energyOf(journal?.energy);
  return (
    <>
      <Card className={cx('p-4', !journal && evening && 'border-primary/40')}>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">
            <BookOpen size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">{journal ? 'Nhật ký hôm nay' : evening ? 'Cuối ngày rồi, viết vài dòng nhật ký nhé' : 'Nhật ký ngày'}</p>
            {journal ? (
              <p className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-muted">
                {e ? `${e.emoji} ${e.label}. ` : ''}
                {journal.did || journal.improve}
              </p>
            ) : (
              <p className="mt-0.5 text-[13px] leading-snug text-muted">Năng lượng hôm nay, điều đã làm được, điều muốn làm tốt hơn. Chỉ mất 1 phút.</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <Button size="sm" variant={journal ? 'soft' : 'primary'} onClick={() => setOpen(true)}>
                {journal ? 'Sửa' : 'Viết nhật ký'}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => navigate('/tong-quan/nhat-ky')}>
                Xem các ngày trước
              </Button>
            </div>
          </div>
        </div>
      </Card>
      <JournalSheet date={open ? today : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** Thẻ nhắc nhìn lại tuần: cuối tuần (T7, CN) cho tuần này, đầu tuần (T2, T3) cho tuần trước */
export function WeekReviewPrompt() {
  const navigate = useNavigate();
  const today = todayISO();
  const wd = isoWeekday(today);
  const cycles = useStore((s) => s.cycles);
  const reviews = useStore((s) => s.weekly_reviews);
  const cycle = getActiveCycle(cycles);
  const week = wd >= 6 ? mondayOf(today) : wd <= 2 ? addDays(mondayOf(today), -7) : null;
  if (!cycle || !week || week < cycle.start_date) return null;
  const r = reviews.find((x) => x.week_start === week);
  if (r && (r.ai_review || r.wins || r.lessons || r.next_focus)) return null;
  return (
    <Card className="flex items-start gap-3 border-primary/40 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-soft text-primary">
        <NotebookPen size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">{wd >= 6 ? 'Cuối tuần rồi, nhìn lại tuần này nhé' : 'Nhìn lại tuần trước'}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted">
          Tuần {formatDM(week)} – {formatDM(addDays(week, 6))}: điểm thực thi, việc 20% bị bỏ lỡ, ba câu tự nhìn lại và AI nhận xét. Khoảng 5 phút.
        </p>
        <Button size="sm" className="mt-2" onClick={() => navigate(`/tong-quan/tuan?tuan=${week}`)}>
          Bắt đầu nhìn lại
        </Button>
      </div>
    </Card>
  );
}
