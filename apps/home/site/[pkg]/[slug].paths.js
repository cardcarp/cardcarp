// The URLs the dynamic route claims: every page in every tree that has no
// Markdown file of its own under site/<pkg>/.
//
//   legacy  a component under src/view/doc/page/ still renders it
//   draft   nothing does, and it renders the placeholder
//
// Writing site/<pkg>/<slug>.md takes a URL off this list with no other edit —
// which is how a tree moves to Markdown one page at a time.

import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { DOC, pages } from '../../src/view/doc/tree.js'

const site = fileURLToPath(new URL('..', import.meta.url))
const legacy = fileURLToPath(new URL('../../src/view/doc/page', import.meta.url))

export default {
    // Re-run when a page is added or converted, so the dev server picks it up.
    watch: ['../**/*.md', '../../src/view/doc/page/**/*.vue', '../../src/view/doc/tree.js'],

    paths() {
        return Object.keys(DOC).flatMap((pkg) => pages(pkg)
            .filter((page) => !existsSync(`${site}/${pkg}/${page.slug || 'index'}.md`))
            .map((page) => ({
                params: {
                    pkg,
                    // `index` is how a dynamic route produces a folder's own page: /<pkg>.
                    slug: page.slug || 'index',
                    kind: existsSync(`${legacy}/${pkg}/${page.file ?? page.slug}.vue`) ? 'legacy' : 'draft'
                }
            })))
    }
}
