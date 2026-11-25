// Các ô chọn dùng lại nhiều nơi: ngày (dd/mm/yyyy), loài cây, theme, sáng/tối.

import { useRef } from 'react';
import { CalendarDays, Check, Monitor, Moon, Sun, X } from 'lucide-react';
import type { DarkMode, PlantSpecies, ThemeId } from '@/lib/types';
import { formatDMY } from '@/lib/dates';
import { THEMES } from '@/lib/themes';
import { Plant, PLANTS, V2_PLANTS } from './Plant';
import { useStore } from '@/lib/store';
import { Scenery } from './Scenery';
import { cx } from './ui';

/**
 * Ô chọn ngày luôn hiển thị dd/mm/yyyy (ô ngày mặc định của trình duyệt có thể hiện mm/dd/yyyy).
 * Bấm vào sẽ mở bảng chọn ngày quen thuộc của điện thoại/máy tính.
 */
export function DateField({
  value,
  onChange,
  min,
  max,
  placeholder = 'Chọn ngày',
  clearable,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const open = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus();
      el.click();
    }
  };
  return (
    <div className="relative flex gap-2">
      <button type="button" onClick={open} className="k-input flex items-center gap-2.5 text-left">
        <CalendarDays size={18} className="shrink-0 text-muted" />
        <span className={value ? 'text-ink' : 'text-muted'}>{value ? formatDMY(value) : placeholder}</span>
      </button>
      {clearable && value && (
        <button type="button" aria-label="Bỏ ngày" onClick={() => onChange(null)} className="flex h-[46px] w-11 shrink-0 items-center justify-center rounded-2xl bg-surface2 text-muted">
          <X size={18} />
        </button>
      )}
      <input
        ref={ref}
        type="date"
        tabIndex={-1}
        aria-hidden
        value={value ?? ''}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value || null)}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
      />
    </div>
  );
}

/** Nền trời nhỏ phía sau cây, để hoa trắng vẫn nổi trên thẻ trắng */
export function PlantBadge({ species, stage, size = 56, wilt }: { species: PlantSpecies; stage: number; size?: number; wilt?: 0 | 1 | 2 }) {
  return (
    <span
      className="inline-flex shrink-0 items-end justify-center overflow-hidden rounded-2xl"
      style={{ width: size, height: size, background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}
    >
      <Plant species={species} stage={stage} size={size * 0.92} wilt={wilt} />
    </span>
  );
}

export function PlantPicker({ value, onChange }: { value: PlantSpecies; onChange: (v: PlantSpecies) => void }) {
  // Loài cây mới của bản 2 chỉ chọn được khi database đã chạy 005_v2.sql
  const gd5 = useStore((s) => s.gd5);
  return (
    <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Chọn loài cây">
      {PLANTS.filter((p) => gd5 || !V2_PLANTS.has(p.id)).map((p) => {
        const selected = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(p.id)}
            className={cx(
              'flex flex-col items-center gap-1 rounded-2xl border-2 p-1.5 pb-2 transition active:scale-[.97]',
              selected ? 'border-primary bg-soft' : 'border-transparent bg-surface2',
            )}
          >
            <span className="flex w-full items-end justify-center overflow-hidden rounded-xl" style={{ background: 'linear-gradient(var(--k-sky-1), var(--k-sky-2))' }}>
              <Plant species={p.id} stage={4} size={54} />
            </span>
            <span className="text-center text-[11px] leading-tight font-semibold text-ink">{p.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function ThemePicker({ value, dark, onChange }: { value: ThemeId; dark: boolean; onChange: (v: ThemeId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Chọn giao diện">
      {THEMES.map((t) => {
        const selected = t.id === value;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(t.id)}
            // data-theme trên chính ô này để xem trước đúng màu của từng theme
            data-theme={t.id}
            className={cx(
              'relative overflow-hidden rounded-2xl border-2 text-left transition active:scale-[.98]',
              dark && 'dark',
              selected ? 'border-primary' : 'border-line',
            )}
            style={{ background: 'var(--k-surface)', color: 'var(--k-ink)', borderColor: selected ? undefined : 'var(--k-line)' }}
          >
            <Scenery theme={t.id} className="block h-16 w-full" />
            <span className="block px-3 py-2">
              <span className="block text-sm font-bold">{t.name}</span>
              <span className="block text-[11px] leading-snug" style={{ color: 'var(--k-muted)' }}>
                {t.note}
              </span>
            </span>
            {selected && (
              <span className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full" style={{ background: 'var(--k-primary)', color: 'var(--k-on-primary)' }}>
                <Check size={14} strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const MODES: { id: DarkMode; label: string; icon: typeof Sun }[] = [
  { id: 'system', label: 'Theo máy', icon: Monitor },
  { id: 'light', label: 'Sáng', icon: Sun },
  { id: 'dark', label: 'Tối', icon: Moon },
];

export function DarkModePicker({ value, onChange }: { value: DarkMode; onChange: (v: DarkMode) => void }) {
  return (
    <div className="grid grid-cols-3 gap-1 rounded-2xl bg-surface2 p-1" role="radiogroup" aria-label="Chế độ sáng tối">
      {MODES.map((m) => (
        <button
          key={m.id}
          type="button"
          role="radio"
          aria-checked={value === m.id}
          onClick={() => onChange(m.id)}
          className={cx(
            'flex min-h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition',
            value === m.id ? 'bg-surface text-ink shadow-sm' : 'text-muted',
          )}
        >
          <m.icon size={16} /> {m.label}
        </button>
      ))}
    </div>
  );
}

/** Thanh chọn 2–3 lựa chọn */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid gap-1 rounded-2xl bg-surface2 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }} role="radiogroup">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cx('min-h-10 rounded-xl px-2 text-sm font-semibold transition', value === o.id ? 'bg-surface text-ink shadow-sm' : 'text-muted')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
