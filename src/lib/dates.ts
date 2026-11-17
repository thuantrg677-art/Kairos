// Tiện ích ngày giờ. Ngày lưu dạng chuỗi 'yyyy-mm-dd', hiển thị dạng dd/mm/yyyy.
// Tuần bắt đầu từ thứ Hai. Giờ trong ngày tính bằng "phút từ 0h" (vd 7:30 = 450).

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO(): string {
  return toISO(new Date());
}
export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
/** Số ngày từ a đến b (b - a) */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000);
}
/** 1 = thứ Hai … 7 = Chủ nhật */
export function isoWeekday(iso: string): number {
  const wd = parseISO(iso).getDay();
  return wd === 0 ? 7 : wd;
}
export function mondayOf(iso: string): string {
  return addDays(iso, 1 - isoWeekday(iso));
}

export const WEEKDAY_SHORT = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WEEKDAY_LONG = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ nhật'];

/** dd/mm/yyyy */
export function formatDMY(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
/** dd/mm */
export function formatDM(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}
/** "Thứ Ba, 17/11/2026" */
export function formatLongDate(iso: string): string {
  return `${WEEKDAY_LONG[isoWeekday(iso) - 1]}, ${formatDMY(iso)}`;
}

/** 450 → "07:30" */
export function minToHM(min: number): string {
  return `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
}
/** "07:30" → 450 */
export function hmToMin(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
/** 90 → "1 giờ 30 phút" */
export function formatDuration(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} phút`;
  if (r === 0) return `${h} giờ`;
  return `${h} giờ ${r} phút`;
}
export function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/** Mô tả deadline so với hôm nay: "Hôm nay", "Ngày mai", "Còn 3 ngày", "Trễ 2 ngày" */
export function describeDue(due: string, today: string): string {
  const n = diffDays(today, due);
  if (n === 0) return 'Hạn hôm nay';
  if (n === 1) return 'Hạn ngày mai';
  if (n > 1) return `Còn ${n} ngày`;
  return `Trễ ${-n} ngày`;
}

/** Lời chào theo buổi */
export function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
}
