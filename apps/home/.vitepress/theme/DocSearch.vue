<script setup>
// The sidebar filter's results — in place of the doc tree while there is a
// query, the way VS Code's Search view lists matches under the file they are in.
//
// A plain case-insensitive substring match, like VS Code's default, not fuzzy
// search: a docs reader filtering for `dataset.yml` wants the places that say
// exactly that. Every occurrence is its own row, linking to the section it sits
// in (see search.data.js for how pages are split).

// Core
import { computed, shallowRef } from 'vue'

// Data
import { pageHref } from './link.js'

const props = defineProps({
    pkg: { type: String, required: true },
    query: { type: String, default: '' }
})

// A single character matches nearly every page, which is noise rather than
// an answer.
const MIN_QUERY = 2

// A page can match a common word dozens of times. Past this many rows the rest
// are summarised, and the page link is the way to them.
const MAX_PER_PAGE = 20

// How much of the text before a hit a row keeps. The row truncates at its end,
// so a long lead-in would push the hit itself out of sight.
const LEAD = 24

// Fetched the first time results are shown — the sidebar also starts the fetch
// when the input is focused, so it has normally landed before the first
// keystroke. Until then there is simply nothing to list.
const index = shallowRef(null)
import('./search.data.js').then((mod) => { index.value = mod.data })

const q = computed(() => props.query.trim().toLowerCase())

const results = computed(() => {
    if (!index.value || q.value.length < MIN_QUERY) return []

    return (index.value[props.pkg] ?? [])
        .map((page) => {
            const href = pageHref(props.pkg, page)
            const matches = []

            for (const section of page.sections) {
                const to = section.id ? `${href}#${section.id}` : href

                if (section.heading.toLowerCase().includes(q.value)) {
                    matches.push({ to, heading: true, parts: split(section.heading, section.heading.toLowerCase().indexOf(q.value)) })
                }

                const lower = section.text.toLowerCase()
                for (let at = lower.indexOf(q.value); at !== -1; at = lower.indexOf(q.value, at + q.value.length)) {
                    matches.push({ to, heading: false, parts: snippet(section.text, at) })
                }
            }

            return {
                page,
                href,
                name: page.name.toLowerCase().includes(q.value)
                    ? split(page.name, page.name.toLowerCase().indexOf(q.value))
                    : [page.name, '', ''],
                count: matches.length,
                matches: matches.slice(0, MAX_PER_PAGE)
            }
        })
        .filter((result) => result.count || result.name[1])
})

const total = computed(() => results.value.reduce((sum, result) => sum + result.count, 0))

// [before, hit, after] — rendered as three spans rather than injected HTML, so
// nothing in the docs' text can become markup.
function split(value, at) {
    return [value.slice(0, at), value.slice(at, at + q.value.length), value.slice(at + q.value.length)]
}

// The hit with a little of what comes before it, cut back to a word boundary.
function snippet(value, at) {
    let start = Math.max(0, at - LEAD)
    if (start > 0) {
        const space = value.indexOf(' ', start)
        if (space !== -1 && space < at) start = space + 1
    }

    const [before, hit, after] = split(value, at)
    return [(start > 0 ? '…' : '') + before.slice(start), hit, after.slice(0, 120)]
}
</script>

<template lang="pug">
.doc-search(class="flex flex-col gap-4 text-3.5 leading-tight")

    .summary(class="px-2 font-mono text-2.5 text-white/30")
        template(v-if="!index") Loading…
        template(v-else-if="q.length < MIN_QUERY") Keep typing…
        template(v-else-if="!results.length") No results
        template(v-else) {{ total }} {{ total === 1 ? 'result' : 'results' }} in {{ results.length }} {{ results.length === 1 ? 'page' : 'pages' }}

    .page(v-for="result in results" :key="result.page.slug" class="flex flex-col")

        //- The page itself, with how many times it matched.
        a(
            :href="result.href"
            class="px-2 h-8 flex items-center gap-2 text-neutral-300 rounded hover:text-white hover:bg-neutral-800/60"
        )
            span(class="min-w-0 truncate")
                span {{ result.name[0] }}
                mark(class="text-white bg-sky-500/25 rounded-sm") {{ result.name[1] }}
                span {{ result.name[2] }}
            span(
                v-if="result.count"
                class="flex-none ml-auto px-1.5 py-0.5 font-mono text-2.5 text-white/50 bg-white/5 rounded"
            ) {{ result.count }}

        //- One row per occurrence, indented under its page.
        a(
            v-for="(match, i) in result.matches"
            :key="i"
            :href="match.to"
            class="pl-5 pr-2 py-1.5 block text-3.25 font-light truncate rounded hover:text-white hover:bg-neutral-800/60"
            :class="match.heading ? 'text-neutral-300' : 'text-neutral-500'"
        )
            span {{ match.parts[0] }}
            mark(class="text-white bg-sky-500/25 rounded-sm") {{ match.parts[1] }}
            span {{ match.parts[2] }}

        a(
            v-if="result.count > result.matches.length"
            :href="result.href"
            class="pl-5 pr-2 py-1.5 block font-mono text-2.5 text-white/30 hover:text-white"
        ) {{ result.count - result.matches.length }} more on this page
</template>
