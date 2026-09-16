import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // A fixed port per app. They all used to run bare `vite`, which means they all wanted 5173
    // and quietly took 5174, 5175… in whatever order you happened to start them — so the URL
    // for any given app depended on your startup order. Pinned here so `npm run dev:home` is
    // always the same address, and so a port that is genuinely occupied says so instead of
    // moving somewhere you have to go and read the terminal to discover.
    port: 5173,
    strictPort: true,
    watch: {
        ignored: ['**/.wrangler/**']
    },
    proxy: {
      // Whenever fetch() calls a route starting with /api...
      '/api': {
        // ...Vite silently forwards it to your local Wrangler server
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
      // No /cdn here: the storage bucket's CORS policy allows this dev port, so the site
      // reads it directly, as production does (see @cardcarp/core's config.js).
    }
  }
})
