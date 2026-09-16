<script setup>
// A package's documentation tree — sections, and the pages under each.
//
// This is the deeper of the primary sidebar's two levels (see part/sidebar.vue):
// entering a package replaces the section list with its header and this. It
// draws no container and no panel of its own — the sidebar is already both, and
// the header above it already says which package this belongs to. What is left
// is the list.
//
// Every page is a link, drafts included. A draft is a real place in the tree
// with a URL and a placeholder behind it; hiding it would mean the tree only
// documents what is finished, which is the opposite of what a tree is for.

// Ported from src/view/doc/nav.vue onto VitePress's router.

// Core
import { computed } from 'vue'
import { useRoute } from 'vitepress'

// Data
import { doc } from '@/view/doc/tree.js'
import { pageHref, segments } from './link.js'

const props = defineProps({
    pkg: { type: String, required: true }    // 'deckbox' | 'simulator'
})

const route = useRoute()
const tree = computed(() => doc(props.pkg))

// The slug showing right now, off the path. The package's index page has no
// second segment, which is the empty slug.
const current = computed(() => segments(route.path)[1] ?? '')

// Closing the mobile menu is handled by the delegated click on the sidebar's
// `.btns` wrapper, which these links sit inside — so there is nothing to emit.
</script>

<template lang="pug">
.doc-nav(class="flex flex-col gap-8 text-3.75 leading-tight")
    .section(
        v-for="section in tree?.section ?? []" 
        :key="section.name"

    )
        .name(class="px-2 mb-2 text-2.5 uppercase font-stretch-150% text-white/25") {{ section.name }}

        .pages(class="mt-1.5 flex flex-col")
            a(
                v-for="page in section.page"
                :key="page.slug"
                :href="pageHref(pkg, page)"
                class="px-2 h-8 flex items-center gap-2 rounded hover:text-white"
                :class="current === page.slug ? 'text-white! bg-neutral-800' : ''"
            )
                span(class="min-w-0 truncate") {{ page.name }}

                //- A draft is marked in the tree rather than only on the page it
                //- opens, so the shape of what is written is readable without
                //- clicking through every entry.
                .draft(
                    v-if="page.draft"
                    class="flex-none px-1 py-0.5 font-mono text-2 uppercase tracking-wide text-yellow-600/70 bg-yellow-500/8 rounded"
                ) Draft
</template>
