import Layout from '@/layout.vue'
import DocDraft from '@/view/doc/draft.vue'

import '@/style/main.css'

export default {
    Layout,

    enhanceApp({ app }) {
        app.component('DocDraft', DocDraft)
    }
}
