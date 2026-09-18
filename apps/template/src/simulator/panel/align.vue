<script setup>
import { computed } from 'vue'

import Section from './section.vue'

import { useStore } from '../composable/use-store.js'
import { useTable } from '../use-table.js'

const { current: uiSelection, align: selectionAlign } = useTable().selection

const ui_selection = useStore(uiSelection)
const units = computed(() => ui_selection.value?.units ?? 0)

const show = computed(() => units.value >= 2)

const title = computed(() => `Align · ${units.value}`)

const ROWS = [
    {
        label: 'Horizontal',
        buttons: [
            { edge: 'left',    title: 'Align left',              bar: 'M4 3v18',  blocks: [[7, 6, 11, 4], [7, 14, 7, 4]] },
            { edge: 'centerX', title: 'Align horizontal centres', bar: 'M12 3v18', blocks: [[5, 6, 14, 4], [7, 14, 10, 4]] },
            { edge: 'right',   title: 'Align right',             bar: 'M20 3v18', blocks: [[6, 6, 11, 4], [10, 14, 7, 4]] },
        ],
    },
    {
        label: 'Vertical',
        buttons: [
            { edge: 'top',     title: 'Align top',             bar: 'M3 4h18',  blocks: [[6, 7, 4, 11], [14, 7, 4, 7]] },
            { edge: 'middleY', title: 'Align vertical centres', bar: 'M3 12h18', blocks: [[6, 5, 4, 14], [14, 7, 4, 10]] },
            { edge: 'bottom',  title: 'Align bottom',          bar: 'M3 20h18', blocks: [[6, 6, 4, 11], [14, 10, 4, 7]] },
        ],
    },
]
</script>

<template lang="pug">
Section(v-if="show" id="align" :title="title")

    .align(class="flex flex-col gap-2 font-mono text-2.75")

        .row(v-for="row in ROWS" :key="row.label" class="h-7 flex items-center gap-2")
            span(class="grow min-w-0 truncate text-neutral-400") {{ row.label }}
            .group(class="flex-none flex items-stretch h-7 bg-neutral-900 outline outline-neutral-800 rounded-lg overflow-hidden")
                template(v-for="(btn, i) in row.buttons" :key="btn.edge")
                    .divide(v-if="i" class="flex-none w-px bg-neutral-800")
                    .btn(
                        @click="selectionAlign(btn.edge)"
                        :title="btn.title"
                        class="w-8 flex items-center justify-center text-white hover:bg-neutral-800"
                    )
                        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(:d="btn.bar" class="opacity-50")
                            rect(
                                v-for="(b, n) in btn.blocks"
                                :key="n"
                                :x="b[0]" :y="b[1]" :width="b[2]" :height="b[3]" rx="1"
                            )
</template>
