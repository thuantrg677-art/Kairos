// Phần "app thật" của PWA: đăng ký service worker, báo có bản mới, nút "Cài Kairos".

import { create } from 'zustand';

/** Sự kiện Chrome/Edge/Android bắn ra khi app đủ điều kiện cài đặt */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  updateReady: boolean;
  canInstall: boolean;
  installed: boolean;
  applyUpdate: () => void;
  promptInstall: () => Promise<void>;
}

let registration: ServiceWorkerRegistration | null = null;
let installEvent: BeforeInstallPromptEvent | null = null;

export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const usePwa = create<PwaState>((set) => ({
  updateReady: false,
  canInstall: false,
  installed: typeof window !== 'undefined' && isStandalone(),
  applyUpdate: () => {
    if (registration?.waiting) registration.waiting.postMessage('SKIP_WAITING');
    else window.location.reload();
  },
  promptInstall: async () => {
    if (!installEvent) return;
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === 'accepted') set({ canInstall: false, installed: true });
    installEvent = null;
  },
}));

let started = false;
export function startPwa() {
  if (started) return;
  started = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    installEvent = e as BeforeInstallPromptEvent;
    usePwa.setState({ canInstall: true });
  });
  window.addEventListener('appinstalled', () => usePwa.setState({ canInstall: false, installed: true }));

  // Service worker chỉ chạy ở bản đã build (npm run build / trên Vercel), không chạy khi "npm run dev"
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => {
      registration = reg;
      const markReady = () => {
        // Chỉ báo "có bản mới" khi trước đó đã có một bản đang chạy
        if (reg.waiting && navigator.serviceWorker.controller) usePwa.setState({ updateReady: true });
      };
      markReady();
      reg.addEventListener('updatefound', () => {
        const next = reg.installing;
        next?.addEventListener('statechange', () => {
          if (next.state === 'installed') markReady();
        });
      });
      // Thỉnh thoảng hỏi server xem có bản mới không
      setInterval(() => void reg.update().catch(() => undefined), 30 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') void reg.update().catch(() => undefined);
      });
    })
    .catch((err) => console.warn('[Kairos] Không đăng ký được service worker:', err));
}
