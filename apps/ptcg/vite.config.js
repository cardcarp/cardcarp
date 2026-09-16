import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// Deliberately minimal: no path alias, no middleware and no proxy. The app reads the storage bucket
// directly in development, exactly as a deployed page does — the bucket's CORS policy allows this dev
// port (see @cardcarp/core's config.js) — so nothing sits between a request made here and the one
// production makes, and a CORS problem shows up here first.
export default defineConfig({
    plugins: [vue(), tailwindcss()],
    server: {
        // A fixed port per app. They all used to run bare `vite`, which means they all wanted 5173
        // and quietly took 5174, 5175… in whatever order you happened to start them — so the URL
        // for any given app depended on your startup order. Pinned here so `npm run dev:ptcg` is
        // always the same address, and so a port that is genuinely occupied says so instead of
        // moving somewhere you have to go and read the terminal to discover. It matters more now
        // that the bucket's CORS policy names these ports: a page on a port it does not name gets
        // no fonts, no manifest and no card art.
        port: 5175,
        strictPort: true,
    },
})
