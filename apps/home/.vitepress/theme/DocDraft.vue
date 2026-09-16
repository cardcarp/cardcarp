<script setup>
// A page the tree names and nobody has written yet — the placeholder
// src/view/doc/index.vue rendered inline, rendered here by the dynamic route
// (site/[pkg]/[slug].md) so a draft is still a real, pre-rendered URL.
import { computed } from 'vue'

import { findPage } from '@/view/doc/tree.js'

const props = defineProps({
    pkg: { type: String, required: true },
    slug: { type: String, default: '' }
})

const page = computed(() => findPage(props.pkg, props.slug))
</script>

<template lang="pug">
//- A page the tree names and nobody has written yet.
.draft(
    class="mt-8 px-6 py-10 flex flex-col items-center gap-2 text-center bg-black/30 rounded-xl"
    style="box-shadow: inset 0 0 0 1px hsl(0 0 100 / 0.04)"
)
    svg(class="size-6 text-yellow-600/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
        path(d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7")
        path(d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z")
    .title(class="text-white text-4 font-light") Not written yet
    .detail(class="max-w-100 text-3.25 text-neutral-500 font-light leading-relaxed") “{{ page.name }}” is part of this tree but has no page behind it. Add #[span(class="font-mono text-neutral-400") site/{{ pkg }}/{{ page.slug || 'index' }}.md] and drop the draft flag in #[span(class="font-mono text-neutral-400") src/view/doc/tree.js].
</template>
