import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Куда проксировать /api. В контейнере — на сервис api, локально — на порт хоста.
const API_TARGET = process.env.VITE_API_PROXY_TARGET ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 3000,
    // В bind-mount с macOS в контейнер inotify-события не долетают — нужен опрос.
    watch: process.env.CHOKIDAR_USEPOLLING === 'true' ? { usePolling: true, interval: 300 } : undefined,
    proxy: {
      // ws: true обязателен, иначе не пройдут потоки логов и метрик.
      '/api': { target: API_TARGET, changeOrigin: true, ws: true },
    },
  },
})
