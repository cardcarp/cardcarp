<script setup>
// Core
import { computed, ref } from 'vue'
import { useFileDialog } from '@vueuse/core'

// Libraries
import { saveAs } from 'file-saver'
import { Motion } from 'motion-v'

// UI
import {
    DialogContent,
    DialogDescription,
    DialogOverlay,
    DialogPortal,
    DialogRoot,
    DialogTitle,

    VisuallyHidden
} from 'reka-ui'

// Stores
import { useProfileStore } from '@cardcarp/core/store/profile.js'
import { dialog_profile_open } from './profile.js'
import { project } from './project.js'

const GAME = project.id

const { profile } = useProfileStore()

const deck_count = computed(() => (profile.value?.game?.[GAME] ?? []).length)
const storage_count = computed(() => {
    const main = profile.value?.storage?.[GAME]?.list?.main ?? {}
    return Object.values(main).reduce((total, qty) => total + (qty ?? 0), 0)
})

// Local
const export_label = ref('Export')
const import_label = ref('Restore')
const clear_label = ref('Clear data')
const confirming = ref(false)
const busy = ref(false)
const error = ref('')

const pause = (ms) => new Promise(resolve => setTimeout(resolve, ms))

function close() {
    dialog_profile_open.value = false
    confirming.value = false
    error.value = ''
}

async function clickExport() {
    if (busy.value) return
    busy.value = true
    error.value = ''
    export_label.value = 'Saving…'

    const text = JSON.stringify(profile.value, null, 2)
    saveAs(new Blob([text], { type: 'application/json;charset=utf-8' }), 'cardcarp-profile.json')

    await pause(900)
    export_label.value = 'Export'
    busy.value = false
}

const { open: clickImport, reset: resetFileDialog, onChange } = useFileDialog({
    accept: '.json',
    multiple: false,
})

onChange(async (files) => {
    const file = files?.[0]
    if (!file || busy.value) return

    busy.value = true
    error.value = ''
    import_label.value = 'Restoring…'

    try {
        const data = JSON.parse(await file.text())

        if (!data || typeof data !== 'object' || !('storage' in data) || !('game' in data)) {
            throw new Error('That file is not a cardcarp profile.')
        }

        profile.value = data
        import_label.value = 'Restored'
    } catch (err) {
        error.value = err instanceof SyntaxError
            ? 'That file could not be read as JSON.'
            : err.message
        import_label.value = 'Restore'
    } finally {
        resetFileDialog()
        await pause(1200)
        import_label.value = 'Restore'
        busy.value = false
    }
})

async function clickClear() {
    if (busy.value) return

    if (!confirming.value) {
        confirming.value = true
        return
    }

    busy.value = true
    confirming.value = false
    error.value = ''
    clear_label.value = 'Clearing…'

    profile.value.storage = {}
    profile.value.game = {}

    await pause(400)
    clear_label.value = 'Cleared'
    await pause(900)
    clear_label.value = 'Clear data'
    busy.value = false
}

</script>

<template lang="pug">
DialogRoot(:modal="true" :open="dialog_profile_open" @update:open="value => !value && close()")
    DialogPortal
        DialogOverlay(asChild)
            Motion(
                @click="close"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ ease: 'linear', duration: 0.2 }"
                class="fixed inset-0 bg-black/80 backdrop-blur-xs z-99"
            )
        DialogContent(asChild @interact-outside="event => event.preventDefault()")
            Motion(
                :initial="{ opacity: 0, y: 10 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ ease: 'easeOut', duration: 0.2 }"
                class="fixed top-1/2 left-1/2 w-110 max-w-[90vw] max-h-[85vh] flex flex-col overflow-y-auto scrollbar-none text-text text-4 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl -translate-x-1/2 -translate-y-1/2 z-100"
                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
            )
                VisuallyHidden(asChild)
                    DialogDescription(:aria-describedby="undefined")

                .head(class="px-6 pt-5 flex items-start justify-between gap-4")
                    DialogTitle(class="text-white text-5 font-light leading-none") Profile
                    .close(
                        @click="close"
                        class="-mt-1 -mr-1 size-6 flex-none flex items-center justify-center text-white bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                    )
                        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M18 6 6 18")
                            path(d="m6 6 12 12")

                .rule(class="mt-4 px-6")
                    .divider-dark(class="w-full h-0.5 bg-black")
                    .divider-light(class="w-full h-px bg-white/8")

                .summary(class="px-6 mt-4 flex gap-8 font-mono leading-none")
                    .stat
                        .value(class="text-white text-5 tabular-nums") {{ deck_count }}
                        .label(class="mt-1.5 text-3 text-neutral-500") saved {{ deck_count === 1 ? 'deck' : 'decks' }}
                    .stat
                        .value(class="text-white text-5 tabular-nums") {{ storage_count }}
                        .label(class="mt-1.5 text-3 text-neutral-500") cards in storage

                .section(class="px-6 mt-7")
                    .title(class="text-sky-500 text-3.5") Bring your own data
                    .subtitle(class="mt-1 text-3.5 font-light") Your whole profile — every saved deck, list and collection — as one portable file.

                    .btns(class="mt-3 p-1.5 inline-flex flex-col sm:flex-row gap-1.5 bg-black rounded-lg" style="box-shadow: 0 1px 0 0 hsl(0 0 100 / 0.075)")
                        .btn(
                            @click="clickExport"
                            class="px-4 h-8 inline-flex items-center justify-center gap-2 font-mono text-3 text-neutral-500 bg-linear-to-br from-zinc-800 to-zinc-950 rounded whitespace-nowrap hover:text-white"
                            :class="busy ? 'pointer-events-none opacity-60' : ''"
                            style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
                        )
                            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z")
                                path(d="M14 2v5a1 1 0 0 0 1 1h5")
                                path(d="M12 18v-6")
                                path(d="m9 15 3 3 3-3")
                            .text {{ export_label }}

                        .btn(
                            @click="clickImport()"
                            class="px-4 h-8 inline-flex items-center justify-center gap-2 font-mono text-3 text-neutral-500 bg-linear-to-br from-zinc-800 to-zinc-950 rounded whitespace-nowrap hover:text-white"
                            :class="busy ? 'pointer-events-none opacity-60' : ''"
                            style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
                        )
                            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M12 13v8")
                                path(d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242")
                                path(d="m8 17 4-4 4 4")
                            .text {{ import_label }}

                    .error(v-if="error" class="mt-3 font-mono text-3 text-rose-400") {{ error }}

                .section(class="px-6 mt-8 mb-6")
                    .title(class="text-rose-500 text-3.5") Clear this browser
                    .subtitle(class="mt-1 text-3.5 font-light") Deletes every saved deck, list and collection held here. Export first if you want them back.

                    .btns(class="mt-3 p-1.5 inline-flex gap-1.5 bg-black rounded-lg" style="box-shadow: 0 1px 0 0 hsl(0 0 100 / 0.075)")
                        .btn(
                            @click="clickClear"
                            class="px-4 h-8 inline-flex items-center justify-center gap-2 font-mono text-3 bg-linear-to-br from-zinc-800 to-zinc-950 rounded whitespace-nowrap hover:text-white"
                            :class="[busy ? 'pointer-events-none opacity-60' : '', confirming ? 'text-rose-400' : 'text-neutral-500']"
                            style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
                        )
                            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="M4 13V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v5")
                                path(d="M14 2v5a1 1 0 0 0 1 1h5")
                                path(d="M2 13h20")
                                path(d="M10 22v-5")
                                path(d="M14 19v-2")
                                path(d="M18 20v-3")
                            .text {{ confirming ? 'Tap again to confirm' : clear_label }}

                        .btn(
                            v-if="confirming"
                            @click="confirming = false"
                            class="px-4 h-8 inline-flex items-center justify-center font-mono text-3 text-neutral-500 bg-linear-to-br from-zinc-800 to-zinc-950 rounded whitespace-nowrap hover:text-white"
                            style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0)"
                        )
                            .text Cancel
</template>
