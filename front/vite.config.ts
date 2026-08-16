import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // В дев-режиме фронт живёт на 5173, API — в контейнере на 8000.
      // ws: true обязателен, иначе не пройдут потоки логов и метрик.
      '/api': { target: 'http://localhost:8000', changeOrigin: true, ws: true },
    },
  },
})
