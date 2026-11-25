// Bộ thành phần giao diện dùng chung: nút, thẻ, bảng trượt (sheet), chip, công tắc, thông báo nổi…

import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Zap } from 'lucide-react';
import { useStore } from '@/lib/store';

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'soft' | 'ghost' | 'outline' | 'danger';
  size?: 'md' | 'sm' | 'lg';
};

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex select-none items-center justify-center gap-2 font-semibold whitespace-nowrap transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-45',
        size === 'md' && 'min-h-11 rounded-2xl px-4 text-[15px]',
        size === 'sm' && 'min-h-9 rounded-xl px-3 text-sm',
        size === 'lg' && 'min-h-13 rounded-2xl px-6 text-base',
        variant === 'primary' && 'bg-primary text-onprimary hover:brightness-110',
        variant === 'soft' && 'bg-soft text-ink hover:brightness-95',
        variant === 'ghost' && 'text-ink hover:bg-surface2',
        variant === 'outline' && 'border-[1.5px] border-line bg-surface text-ink hover:bg-surface2',
        variant === 'danger' && 'border-[1.5px] border-danger/40 text-danger hover:bg-danger/10',
        className,
      )}
      {...props}
    />
  );
}

/** Nút tròn chỉ có biểu tượng. Luôn cần aria-label để trình đọc màn hình hiểu. */
export function IconButton({
  label,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition hover:bg-surface2 active:scale-95 disabled:opacity-40',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-3xl border border-line bg-surface', className)}>{children}</div>;
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] leading-snug text-muted">{hint}</span>}
    </label>
  );
}

export function Chip({
  selected,
  onClick,
  children,
  className,
}: {
  selected?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        'inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition active:scale-[.97]',
        selected ? 'bg-primary text-onprimary' : 'bg-surface2 text-ink hover:brightness-95',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative h-8 w-14 shrink-0 rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-line',
      )}
    >
      <span
        className={cx(
          'absolute top-1 left-1 h-6 w-6 rounded-full bg-surface shadow transition-transform',
          checked && 'translate-x-6',
        )}
      />
    </button>
  );
}

/** Bảng trượt: trên điện thoại trượt từ dưới lên, trên máy tính hiện giữa màn hình */
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="k-sheet-up relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] bg-bg shadow-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <IconButton label="Đóng" onClick={onClose} className="-mr-2">
            <X size={22} />
          </IconButton>
        </div>
        <div className="flex-1 overflow-y-auto px-5 pb-4">{children}</div>
        {footer && <div className="safe-bottom border-t border-line px-5 pt-3 pb-3"><div className="flex gap-2 pb-1">{footer}</div></div>}
      </div>
    </div>,
    document.body,
  );
}

/**
 * Nhãn đòn bẩy: việc 20% nổi bật, việc 80% hiển thị bình thường. Luôn cho thấy số 💧.
 * `step` = việc mỗi ngày (việc nhỏ nằm dưới một đầu việc): +2 💧 nếu thuộc việc 20%, +1 💧 nếu thuộc việc 80%.
 */
export function LeverageBadge({ leverage, compact, step }: { leverage: 'high' | 'normal'; compact?: boolean; step?: boolean }) {
  const pts = step ? (leverage === 'high' ? 2 : 1) : leverage === 'high' ? 3 : 1;
  if (leverage === 'high') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-highsoft px-2 py-0.5 text-xs font-bold whitespace-nowrap text-high">
        <Zap size={12} fill="currentColor" aria-hidden />
        {compact || step ? '20%' : 'Việc 20%'} · +{pts} 💧
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-surface2 px-2 py-0.5 text-xs font-medium whitespace-nowrap text-muted">
      {compact || step ? '' : 'Việc 80% · '}+{pts} 💧
    </span>
  );
}

export function EmptyState({ art, title, children }: { art?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-8 text-center">
      {art}
      <p className="mt-3 text-base font-semibold text-ink">{title}</p>
      {children && <div className="mt-1 max-w-xs text-sm leading-relaxed text-muted">{children}</div>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-2 flex min-h-9 items-center justify-between gap-3">
      <h2 className="text-[13px] font-bold tracking-wide text-muted uppercase">{children}</h2>
      {action}
    </div>
  );
}

/** Các thông báo nổi ngắn ở đầu màn hình */
export function Toasts() {
  const toasts = useStore((s) => s.toasts);
  const dismiss = useStore((s) => s.dismissToast);
  if (toasts.length === 0) return null;
  return createPortal(
    <div className="safe-top pointer-events-none fixed inset-x-0 top-0 z-[90] flex flex-col items-center gap-2 px-4 pt-3" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cx(
            'k-fade-in pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-left text-sm font-medium shadow-lg',
            t.kind === 'error' ? 'bg-danger text-white dark:text-black' : 'bg-ink text-bg',
          )}
        >
          {t.text}
        </button>
      ))}
    </div>,
    document.body,
  );
}
