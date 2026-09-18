<script setup>
// Core
import { computed } from 'vue'
import { useRoute } from 'vitepress'

// Data
import { doc } from './tree.js'
import { pageHref, segments } from '@/link.js'

const props = defineProps({
    pkg: { type: String, required: true }
})

const route = useRoute()
const tree = computed(() => doc(props.pkg))

const current = computed(() => segments(route.path)[1] ?? '')
</script>

<template lang="pug">
.doc-nav(class="flex flex-col gap-8 text-3.75 leading-tight")
    .section(
        v-for="section in tree?.section ?? []" 
        :key="section.name"

    )
        .name(class="px-5 mb-2 text-2.5 uppercase font-stretch-150% text-white/25") {{ section.name }}

        .pages(class="mt-1.5 flex flex-col")
        
            a(
                v-for="page in section.page"
                :key="page.slug"
                :href="pageHref(pkg, page)"
                class="group/btn relative"
            )

                .tab(
                    class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
                    :class="current === page.slug ? 'block!' : ''"
                )

                .padding(class="pl-3 pr-5")
                    .pill(
                        class="px-2 py-2 flex items-center gap-3 group-hover/btn:text-white rounded-lg"
                        :class="current === page.slug ? 'text-white! bg-neutral-800' : ''"
                    )

                        span(class="min-w-0 truncate") {{ page.name }}

                        .draft(
                            v-if="page.draft"
                            class="flex-none px-1 py-0.5 font-mono text-2 uppercase tracking-wide text-yellow-600/70 bg-yellow-500/8 rounded"
                        ) Draft
</template>
