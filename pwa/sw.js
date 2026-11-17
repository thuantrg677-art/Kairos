/*
 * Service worker của Kairos (file mẫu).
 * Khi build, vite.config.ts điền mã phiên bản và danh sách file vào 2 dòng const bên dưới rồi ghi ra dist/sw.js.
 * Nhiệm vụ: lưu sẵn "vỏ app" để mở được khi offline, báo khi có bản mới,
 * và nhận Web Push (giai đoạn 4): tóm tắt sáng, nhắc nhật ký, nhắc deadline.
 */
const VERSION = '__VERSION__';
const CACHE = 'kairos-' + VERSION;
const PRECACHE = '__PRECACHE__';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

// App gửi tin nhắn này khi người dùng bấm "Tải lại" trên thanh cập nhật
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

// Web Push từ Edge Function "tick": hiện thông báo và báo cho app đang mở để cập nhật chuông
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Kairos';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    tag: data.tag || 'kairos',
    data: { url: data.url || '/', id: data.id || null },
  };
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((list) => list.forEach((c) => c.postMessage({ type: 'kairos-push' }))),
    ]),
  );
});

// Bấm vào thông báo: mở lại app đúng trang. Thông báo Focus ("Mầm cây đang chờ bạn", "Hết giờ focus")
// không có đường dẫn riêng nên mở trang Focus.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const info = event.notification.data || {};
  const url = info.url || '/focus';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.location.origin));
      if (open) {
        // App đang mở: chuyển trang bên trong app (không tải lại) và đánh dấu đã đọc
        if (info.url) open.postMessage({ type: 'kairos-open', url: info.url, id: info.id || null });
        return open.focus();
      }
      return self.clients.openWindow(info.id ? `${url}${url.includes('?') ? '&' : '?'}tb=${encodeURIComponent(info.id)}` : url);
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('kairos-') && k !== CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// Chờ mạng tối đa `ms` mili giây, quá thì dùng bản đã lưu
function networkWithTimeout(request, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    fetch(request).then(
      (res) => {
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Chỉ xử lý file của chính app. Các lệnh gọi Supabase luôn đi thẳng ra mạng.
  if (url.origin !== self.location.origin) return;

  // Mở trang: ưu tiên mạng để luôn có bản mới, mất mạng thì dùng vỏ app đã lưu
  if (request.mode === 'navigate') {
    event.respondWith(
      networkWithTimeout(request, 3500)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy));
          }
          return res;
        })
        .catch(() => caches.match('/').then((hit) => hit || Response.error())),
    );
    return;
  }

  // File tĩnh (JS, CSS, font, hình): lấy từ bộ nhớ trước, chưa có thì tải rồi lưu lại
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
