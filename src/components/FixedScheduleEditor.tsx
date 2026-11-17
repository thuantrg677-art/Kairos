// Lịch cố định trong tuần: lịch học, lịch làm, hoạt động lặp lại theo thứ.
// Dùng ở onboarding (bước 3) và trong Cài đặt.

import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useStore } from '@/lib/store';
import { hmToMin, minToHM, WEEKDAY_LONG, WEEKDAY_SHORT } from '@/lib/dates';
import { EVENT_COLORS, eventHex } from '@/lib/themes';
import type { FixedEvent } from '@/lib/types';
import { Button, Chip, cx, Field, Sheet } from './ui';

export function FixedScheduleEditor() {
  const events = useStore((s) => s.fixed_events);
  const [editing, setEditing] = useState<FixedEvent | null>(null);
  const [open, setOpen] = useState(false);

  const byDay = useMemo(() => {
    const map = new Map<number, FixedEvent[]>();
    for (const e of events) map.set(e.weekday, [...(map.get(e.weekday) ?? []), e]);
    for (const list of map.values()) list.sort((a, b) => a.start_min - b.start_min);
    return map;
  }, [events]);

  return (
    <div>
      {events.length === 0 ? (
        <p className="rounded-2xl bg-surface2 px-4 py-3 text-sm text-muted">
          Chưa có lịch cố định nào. Thêm lịch học, lịch làm… để Kairos biết lúc nào bạn bận và lúc nào bạn rảnh.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4, 5, 6, 7].map((wd) => {
            const list = byDay.get(wd);
            if (!list) return null;
            return (
              <div key={wd}>
                <p className="mb-1 text-[13px] font-bold text-muted">{WEEKDAY_LONG[wd - 1]}</p>
                <div className="flex flex-col gap-1.5">
                  {list.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        setEditing(e);
                        setOpen(true);
                      }}
                      className="flex min-h-12 items-center gap-3 rounded-2xl border border-line bg-surface px-3 text-left"
                      style={{ borderLeft: `5px solid ${eventHex(e.color)}` }}
                    >
                      <span className="flex-1 text-sm font-semibold text-ink">{e.title}</span>
                      <span className="text-sm text-muted tabular-nums">
                        {minToHM(e.start_min)} – {minToHM(e.end_min)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Button
        variant="soft"
        className="mt-3 w-full"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        <Plus size={18} /> Thêm lịch cố định
      </Button>
      <EventSheet open={open} onClose={() => setOpen(false)} event={editing} />
    </div>
  );
}

function EventSheet({ open, onClose, event }: { open: boolean; onClose: () => void; event: FixedEvent | null }) {
  const [title, setTitle] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('11:30');
  const [color, setColor] = useState('blue');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? '');
    setDays(event ? [event.weekday] : []);
    setStart(event ? minToHM(event.start_min) : '07:00');
    setEnd(event ? minToHM(event.end_min) : '11:30');
    setColor(event?.color ?? 'blue');
    setError('');
  }, [open, event]);

  const save = () => {
    const s = hmToMin(start);
    const e = hmToMin(end);
    if (!title.trim()) return setError('Bạn chưa đặt tên cho lịch này.');
    if (days.length === 0) return setError('Chọn ít nhất một ngày trong tuần.');
    if (e <= s) return setError('Giờ kết thúc phải sau giờ bắt đầu.');
    const st = useStore.getState();
    const values = { title: title.trim(), start_min: s, end_min: e, color };
    if (event) st.update('fixed_events', event.id, { ...values, weekday: days[0] });
    else for (const weekday of days) if (!st.insert('fixed_events', { ...values, weekday })) return;
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? 'Sửa lịch cố định' : 'Thêm lịch cố định'}
      footer={
        <>
          {event && (
            <Button
              variant="danger"
              aria-label="Xóa lịch"
              onClick={() => {
                useStore.getState().remove('fixed_events', event.id);
                onClose();
              }}
            >
              <Trash2 size={18} />
            </Button>
          )}
          <Button className="flex-1" onClick={save}>
            {event ? 'Lưu thay đổi' : 'Thêm lịch'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Tên">
          <input className="k-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Ví dụ: Học trên trường, Làm thêm" />
        </Field>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">{event ? 'Vào ngày' : 'Lặp vào các ngày'}</span>
          <div className="flex flex-wrap gap-1.5">
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <Chip
                key={d}
                selected={days.includes(d)}
                className="min-w-11 px-0"
                onClick={() => setDays((cur) => (event ? [d] : cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()))}
              >
                {WEEKDAY_SHORT[d - 1]}
              </Chip>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bắt đầu">
            <input type="time" className="k-input" value={start} step={300} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Kết thúc">
            <input type="time" className="k-input" value={end} step={300} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-semibold">Màu</span>
          <div className="flex gap-2">
            {EVENT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.name}
                aria-pressed={color === c.id}
                onClick={() => setColor(c.id)}
                className={cx('h-11 w-11 rounded-full border-4 transition', color === c.id ? 'border-ink' : 'border-transparent')}
                style={{ background: c.hex }}
              />
            ))}
          </div>
        </div>
        {error && <p className="rounded-2xl bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</p>}
      </div>
    </Sheet>
  );
}
