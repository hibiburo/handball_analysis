import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // ffmpeg.wasm は内部で new URL('./worker.js', import.meta.url) を使うため、開発サーバーの事前バンドルから外す
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  },
});
