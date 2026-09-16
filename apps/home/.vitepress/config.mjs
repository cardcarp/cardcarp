// The static build of cardcarp.com — a VitePress SPIKE running beside the Vite SPA in ../src.
//
// Everything is pre-rendered to HTML at build time, one file per URL, and hydrates into the same
// Vue app on load. The theme is entirely our own (./theme) — nothing from VitePress's default
// theme is used — so the shell, sidebar and doc panel are this site's components, ported off
// vue-router onto VitePress's router.
//
// Content lives in ../site. Written pages are Markdown; see site/compile/ for the converted tree.
// Pages not converted yet, and drafts, come from one dynamic route (site/[pkg]/[slug].md).

import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vitepress'
import tailwindcss from '@tailwindcss/vite'

import { doc, findPage } from '../src/view/doc/tree.js'

const SITE_TITLE = 'Open-Source Tools to Bring Tabletop Games Online'
const SITE_DESCRIPTION = 'Self-host interactive card archives and playable tabletop simulators on your own site using open-source web tools.'

export default defineConfig({
    srcDir: 'site',
    cleanUrls: true,

    // A package's index page is written as site/<pkg>/index.md, beside the rest of its tree, but
    // VitePress would serve that at /<pkg>/ — a trailing slash the SPA's URLs never had. Built as
    // <pkg>.md instead, it is /<pkg>, so every existing link and bookmark still resolves.
    rewrites: {
        ':pkg/index.md': ':pkg.md'
    },

    lang: 'en',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    // Page titles are written whole below (`Install — Compile`), so no suffix.
    titleTemplate: false,

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

    // The head used to be set in the browser by composable/head.js. Now it is resolved per page
    // at build time and lands in the HTML, where crawlers and link unfurlers can read it. A doc
    // page's title comes from the tree, as it did before — the tree already names every page.
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

    markdown: {
        // Shiki at build time, so a sample ships highlighted in the HTML and highlight.js drops
        // out of the client bundle. github-dark matches the theme CodeBlock used.
        theme: 'github-dark',

        // h2s only, to feed the right rail. Extracted at build time, which retires the hand-written
        // `export const toc` a page had to keep in step with its own headings.
        headers: { level: [2] },

        config(md) {
            // A fence's label — the filename or language shown in the corner, as CodeBlock's
            // `label` prop did — written in brackets after the language:
            //
            //   ```yaml [dataset.yml — ptcg]
            //
            // Taken off the info string before VitePress renders the fence, then put back on
            // the wrapper it emits. Without a label, the language is shown.
            const fence = md.renderer.rules.fence
            md.renderer.rules.fence = (tokens, idx, options, env, self) => {
                const token = tokens[idx]
                const match = token.info.match(/\[(.+)\]\s*$/)
                const label = match ? match[1] : token.info.trim().split(/\s+/)[0]
                if (match) token.info = token.info.slice(0, match.index).trim()

                // `code-block` picks up the box part/code-block.vue draws (see theme/style.css);
                // `not-prose` keeps typography's own <pre> styles off it, as it did there.
                return fence(tokens, idx, options, env, self)
                    .replace('<div class="language-', '<div class="code-block not-prose language-')
                    .replace(/<span class="lang">[^<]*<\/span>/, `<span class="lang">${md.utils.escapeHtml(label)}</span>`)
            }
        }
    },

    vite: {
        plugins: [tailwindcss()],

        // The SPA's public folder, shared rather than copied, so both builds serve the same files.
        publicDir: fileURLToPath(new URL('../public', import.meta.url)),

        resolve: {
            alias: {
                '@': fileURLToPath(new URL('../src', import.meta.url)),

                // MIGRATION SHIM. The views not ported yet (landing, examples, not-found, the
                // unconverted doc pages) import vue-router, which does not run here. This maps
                // the few pieces they use onto VitePress's router. Delete it once they are ported.
                'vue-router': fileURLToPath(new URL('./theme/shim/vue-router.js', import.meta.url))
            }
        },

        server: {
            port: 5174,
            strictPort: true
        },

        ssr: {
            // Shipped as source (Vue SFCs and CSS), so they have to go through Vite during the
            // pre-render rather than being required as-is by Node.
            noExternal: ['@cardcarp/core', 'reka-ui', 'motion-v']
        }
    }
})
