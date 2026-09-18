import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { DOC, pages } from '../../src/view/doc/tree.js'

const site = fileURLToPath(new URL('..', import.meta.url))

export default {
    watch: ['../**/*.md', '../../src/view/doc/tree.js'],

    paths() {
        return Object.keys(DOC).flatMap((pkg) => pages(pkg)
            .filter((page) => !existsSync(`${site}/${pkg}/${page.slug || 'index'}.md`))
            .map((page) => ({
                params: {
                    pkg,
                    slug: page.slug || 'index'
                }
            })))
    }
}
