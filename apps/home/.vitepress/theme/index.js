// A fully custom theme: nothing is inherited from VitePress's default theme.

import Layout from './Layout.vue'
import DocDraft from './DocDraft.vue'
import DocLegacy from './DocLegacy.vue'
import { RouterLink } from './shim/vue-router.js'

import './style.css'

export default {
    Layout,

    enhanceApp({ app }) {
        // Used by the dynamic route's Markdown (site/[pkg]/[slug].md).
        app.component('DocDraft', DocDraft)
        app.component('DocLegacy', DocLegacy)

        // MIGRATION SHIM: <router-link> in the templates not ported yet.
        app.component('RouterLink', RouterLink)
    }
}
