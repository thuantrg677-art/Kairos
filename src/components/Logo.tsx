import { cx } from './ui';

/** Biểu tượng chữ K của Kairos (cắt từ file logo gốc) */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src="/icons/logo-mark.png"
      width={size}
      height={size}
      alt="Kairos"
      className={cx('rounded-[28%]', className)}
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}

/** Logo ngang: biểu tượng + chữ "kairos" */
export function LogoWord({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={38} />
      <span className="text-[26px] leading-none font-bold tracking-tight text-ink">kairos</span>
    </span>
  );
}
