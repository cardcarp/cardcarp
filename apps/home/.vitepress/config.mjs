import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitepress'
import tailwindcss from '@tailwindcss/vite'

import { doc, findPage } from '../src/view/doc/tree.js'

const SITE_TITLE = 'Open-Source Tools to Bring Tabletop Games Online'
const SITE_DESCRIPTION = 'Self-host interactive card archives and playable tabletop simulators on your own site using open-source web tools.'

export default defineConfig({
    srcDir: 'site',
    cleanUrls: true,

    rewrites: {
        ':pkg/index.md': ':pkg.md'
    },

    lang: 'en',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    titleTemplate: false,

    appearance: false,

    head: [
        ['link', { rel: 'icon', href: '/favicon.svg' }],
        ['meta', { name: 'theme-color', content: '#000000' }],
        ['meta', { property: 'og:site_name', content: 'CardCarp' }],
        ['meta', { property: 'og:type', content: 'website' }],
        ['meta', { property: 'og:image', content: 'https://storage.cardcarp.com/site/image/meta.png' }],
        ['meta', { property: 'og:image:width', content: '1200' }],
        ['meta', { property: 'og:image:height', content: '630' }],
        ['meta', { property: 'og:image:alt', content: 'A variety of collectible card game cards with different colors, illustrations, and text, arranged in a diagonal, overlapping pattern.' }],
        ['meta', { name: 'twitter:card', content: 'summary_large_image' }]
    ],

    transformPageData(pageData) {
        const path = pageData.relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '')
        const [pkg, slug = ''] = path.split('/')
        const tree = doc(pkg)
        const page = tree && findPage(pkg, slug)

        if (page) {
            pageData.title = page.slug ? `${page.name} — ${tree.name}` : tree.name
            pageData.description = tree.tagline
        }

        const url = `https://cardcarp.com/${path}`

        pageData.frontmatter.head ??= []
        pageData.frontmatter.head.push(
            ['meta', { property: 'og:title', content: pageData.title || SITE_TITLE }],
            ['meta', { property: 'og:description', content: pageData.description || SITE_DESCRIPTION }],
            ['meta', { property: 'og:url', content: url }]
        )
    },

    transformHtml(html) {
        return html.replace(/<script id="check-mac-os">[\s\S]*?<\/script>/, '')
    },

    markdown: {
        theme: 'github-dark',

        headers: { level: [2] },

        config(md) {
            const fence = md.renderer.rules.fence
            md.renderer.rules.fence = (tokens, idx, options, env, self) => {
                const token = tokens[idx]
                const match = token.info.match(/\[(.+)\]\s*$/)
                const label = match ? match[1] : token.info.trim().split(/\s+/)[0]
                if (match) token.info = token.info.slice(0, match.index).trim()

                return fence(tokens, idx, options, env, self)
                    .replace('<div class="language-', '<div class="code-block not-prose language-')
                    .replace(/<span class="lang">[^<]*<\/span>/, `<span class="lang">${md.utils.escapeHtml(label)}</span>`)
            }
        }
    },

    vite: {
        plugins: [tailwindcss()],

        publicDir: fileURLToPath(new URL('../public', import.meta.url)),

        resolve: {
            alias: {
                '@': fileURLToPath(new URL('../src', import.meta.url))
            }
        },

        server: {
            port: 5173,
            strictPort: true,
            watch: {
                ignored: ['**/.wrangler/**']
            }
        },

        ssr: {
            noExternal: ['@cardcarp/core', 'reka-ui', 'motion-v']
        }
    }
})
