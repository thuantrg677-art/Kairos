import type { DarkMode, ThemeId } from './types';

export const THEMES: { id: ThemeId; name: string; note: string }[] = [
  { id: 'tan-rung', name: 'Tán rừng', note: 'Xanh lá chanh, trời xanh nhạt' },
  { id: 'dinh-tuyet', name: 'Đỉnh tuyết', note: 'Xanh lam đậm, trắng tuyết' },
  { id: 'linh-lan', name: 'Linh lan', note: 'Xanh lam dịu, trắng' },
  { id: 'giay-kem', name: 'Giấy kem', note: 'Nền kem ấm, nâu gỗ' },
  { id: 'trang-den', name: 'Trắng đen', note: 'Tối giản' },
  { id: 'pastel', name: 'Pastel', note: 'Hồng, tím, bạc hà' },
];

export const isDark = (mode: DarkMode) =>
  mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

/** Áp theme lên toàn trang và ghi nhớ để lần sau mở app không bị nháy màu */
export function applyTheme(theme: ThemeId, mode: DarkMode) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', isDark(mode));
  try {
    localStorage.setItem('kairos-theme', theme);
    localStorage.setItem('kairos-dark', mode);
  } catch {
    /* bỏ qua */
  }
  // Màu thanh trạng thái của điện thoại ăn theo màu nền
  const bg = getComputedStyle(root).getPropertyValue('--k-bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
}

export function storedTheme(): { theme: ThemeId; mode: DarkMode } {
  let theme: ThemeId = 'tan-rung';
  let mode: DarkMode = 'system';
  try {
    const t = localStorage.getItem('kairos-theme') as ThemeId | null;
    const d = localStorage.getItem('kairos-dark') as DarkMode | null;
    if (t && THEMES.some((x) => x.id === t)) theme = t;
    if (d === 'light' || d === 'dark' || d === 'system') mode = d;
  } catch {
    /* bỏ qua */
  }
  return { theme, mode };
}

/** Màu cho các khung lịch cố định */
export const EVENT_COLORS: { id: string; name: string; hex: string }[] = [
  { id: 'blue', name: 'Xanh lam', hex: '#4a8fd8' },
  { id: 'green', name: 'Xanh lá', hex: '#4fa36a' },
  { id: 'orange', name: 'Cam', hex: '#e3893b' },
  { id: 'purple', name: 'Tím', hex: '#8e6bd1' },
  { id: 'pink', name: 'Hồng', hex: '#e06c9a' },
  { id: 'gray', name: 'Xám', hex: '#7c8794' },
];
export const eventHex = (id: string) => EVENT_COLORS.find((c) => c.id === id)?.hex ?? EVENT_COLORS[0].hex;
