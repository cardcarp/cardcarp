<script setup>
// The one layout every URL renders through — what src/app.vue and the router's
// route table were between them.
//
// Which view fills the shell is decided from the page: its frontmatter `view`
// for the landing page and examples, the path for a doc page, and VitePress's
// own flag for a URL with no file behind it.

// Core
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

// UI
import { ConfigProvider, TooltipProvider } from 'reka-ui'

// Components
import Shell from './Shell.vue'
import DocView from './DocView.vue'

// Not ported yet — running on the vue-router shim (see ./shim/vue-router.js).
import Landing from '@/view/home/landing.vue'
import Examples from '@/view/example/index.vue'
import NotFound from '@/view/not-found.vue'

// Data
import { doc, packages } from '@/view/doc/tree.js'
import { segments } from './link.js'

const { page, frontmatter } = useData()
const route = useRoute()

const path = computed(() => segments(route.path))
const pkg = computed(() => (packages.includes(path.value[0]) ? path.value[0] : null))

// A miss under a package keeps the doc shell's more specific 404, which names
// the tree being read and offers the way back into it.
const missed = computed(() => {
    const tree = pkg.value && doc(pkg.value)
    if (!tree) return {}

    return {
        message: `There is no “${path.value.slice(1).join('/')}” page in the ${tree.name} documentation.`,
        back: { name: pkg.value },
        backLabel: `${tree.name} docs`
    }
})
</script>

<template lang="pug">
ConfigProvider(:scrollBody="false")
    TooltipProvider(:disableHoverableContent="true")
        Shell
            NotFound(v-if="page.isNotFound" v-bind="missed")
            Landing(v-else-if="frontmatter.view === 'landing'")
            Examples(v-else-if="frontmatter.view === 'examples'")
            DocView(v-else-if="pkg" :pkg="pkg" :slug="path[1] ?? ''")
            Content(v-else)
</template>
