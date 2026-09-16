<script setup>
// MIGRATION: a doc page not converted to Markdown yet, rendered from its old
// component under src/view/doc/page/. The dynamic route (site/[pkg]/[slug].md)
// renders this for every tree entry that has a .vue page and no .md one, so the
// unconverted trees keep working while they are moved over a page at a time.
//
// Converting a page is writing site/<pkg>/<slug>.md; the dynamic route stops
// claiming that URL on its own. Once no page is left, delete this, the route,
// and src/view/doc/loader.js.
import { computed, defineAsyncComponent } from 'vue'

import { findPage } from '@/view/doc/tree.js'
import { loader } from '@/view/doc/loader.js'

const props = defineProps({
    pkg: { type: String, required: true },
    slug: { type: String, default: '' }
})

// Resolved during the pre-render as well — Vue's server renderer awaits an
// async component — so these pages still ship as HTML.
const body = computed(() => {
    const load = loader(props.pkg, findPage(props.pkg, props.slug))
    return load ? defineAsyncComponent(load) : null
})
</script>

<template lang="pug">
component(v-if="body" :is="body")
</template>
