import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

const TEMPLATE = dirname(fileURLToPath(import.meta.url))

// Fills the %origin:VITE_…% / %host:VITE_…% placeholders in public/_headers after the build.
function headersFromEnv() {
    let env
    let outDir

    return {
        name: 'headers-from-env',
        apply: 'build',
        configResolved(config) {
            env = loadEnv(config.mode, config.envDir, 'VITE_')
            outDir = resolve(config.root, config.build.outDir)
        },
        writeBundle() {
            const file = resolve(outDir, '_headers')
            const text = readFileSync(file, 'utf8').replace(/ ?(\S*)%(origin|host):(VITE_\w+)%/g, (whole, prefix, part, name) => {
                const value = env[name]
                if (!value) {
                    if (name === 'VITE_STORAGE_ROOT') throw new Error(`_headers: ${name} is not set — see .env.example`)
                    console.warn(`[headers-from-env] ${name} is not set; leaving it out of _headers`)
                    return ''
                }
                if (!/^[a-z][a-z\d+.-]*:\/\//i.test(value)) return ''
                const url = new URL(value)
                return ` ${prefix}${part === 'origin' ? url.origin : url.host}`
            })
            writeFileSync(file, text)
        },
    }
}

export function defineGameConfig({ port }) {
    return defineConfig({
        plugins: [vue(), tailwindcss(), headersFromEnv()],
        publicDir: resolve(TEMPLATE, 'public'),
        server: {
            // Fixed, because the storage bucket's CORS allowlist names this port.
            port,
            strictPort: true,
        },
    })
}
