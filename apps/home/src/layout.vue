<script setup>
// Core
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

// UI
import { ConfigProvider, TooltipProvider } from 'reka-ui'

// Components
import Shell from '@/part/shell.vue'
import DocView from '@/view/doc/index.vue'

import Landing from '@/view/home/landing.vue'
import Examples from '@/view/example/index.vue'
import NotFound from '@/view/not-found.vue'

// Data
import { doc, packages } from '@/view/doc/tree.js'
import { segments } from '@/link.js'

const { page, frontmatter } = useData()
const route = useRoute()

const path = computed(() => segments(route.path))
const pkg = computed(() => (packages.includes(path.value[0]) ? path.value[0] : null))

const missed = computed(() => {
    const tree = pkg.value && doc(pkg.value)
    if (!tree) return {}

    return {
        message: `There is no “${path.value.slice(1).join('/')}” page in the ${tree.name} documentation.`,
        back: `/${pkg.value}`,
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
