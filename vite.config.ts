import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

/**
 * Plugin nhỏ tự tạo service worker (dist/sw.js) sau khi build.
 * Nó lấy danh sách file đã build để app mở được khi offline,
 * và gắn một mã phiên bản để app biết khi nào có bản mới.
 */
function kairosServiceWorker(): Plugin {
  return {
    name: 'kairos-service-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle)
        .filter((f) => f !== 'index.html' && !f.endsWith('.map') && !f.endsWith('.woff'))
        .sort();
      const precache = [
        '/',
        '/manifest.webmanifest',
        '/icons/icon-192.png',
        '/icons/logo-mark.png',
        ...files.map((f) => '/' + f),
      ];
      const template = readFileSync(fileURLToPath(new URL('./pwa/sw.js', import.meta.url)), 'utf8');
      const version = createHash('sha1')
        .update(template + files.join('|'))
        .digest('hex')
        .slice(0, 10);
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace("'__VERSION__'", JSON.stringify(version))
          .replace("'__PRECACHE__'", JSON.stringify(precache)),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), kairosServiceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
