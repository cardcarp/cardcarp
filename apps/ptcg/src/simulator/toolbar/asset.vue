<script setup>
// Selection toolbar for the accessories that carry no settings of their own — playmats
// (board) and tokens/counters (marker). They had no toolbar at all, which was survivable
// while Delete was a key, and not once tablets came into it: an accessory dropped on an iPad
// could never be removed. So this exists to carry the one action they do have.
//
// Board and marker share it rather than getting a file each: their payloads are the same
// shape (`itemData` and nothing else), and a second copy of this shell would be two places to
// update the day either of them grows a real control.
import { AnimatePresence, Motion } from 'motion-v'

import { useStore } from '../composable/use-store.js'

import ToolDelete from './shared/tool-delete.vue'
import { useTable } from '../use-table.js'

// The table, through its object (see use-table.js).
const { current: uiSelection } = useTable().selection

const ui_selection = useStore(uiSelection)

const ASSET_TYPES = ['board', 'marker']
</script>

<template lang="pug">
AnimatePresence
    Motion(
        v-if="ASSET_TYPES.includes(ui_selection.type)"
        key="toolbar-asset"
        :initial="{ opacity: 0, y: 0 }"
        :animate="{ opacity: 1, y: -10 }"
        :exit="{ opacity: 0, y: 0 }"
        class="absolute p-2 flex gap-1 bg-neutral-950 border border-white/5 rounded-xl z-50 -translate-x-1/2 -translate-y-full"
        :style="{ left: `${ui_selection.x}px`, top: `${ui_selection.y}px` }"
    )
        ToolDelete
</template>
