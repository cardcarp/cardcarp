<script setup>
// How you are looking at the table, and how you clear it.
//
// Named Settings rather than Table because the panel's own header already reads TABLE, and a
// section repeating it reads as a nesting mistake. Nothing in here is a persisted setting in
// the strict sense — zoom is view state, the flip belongs to the seat — but Settings is where
// people look for the controls that act on the whole surface rather than on anything they have
// selected, which is exactly what these are.
//
// The rows are controls.js's (`settings`), in its order, and this draws them. Three shapes: a group
// of small buttons, one wide button, and a destructive button. Asking twice before the destructive
// one acts is the one behaviour a row cannot state for itself, so it lives here.
import { computed, onUnmounted, ref, watch } from 'vue'

import Section from './section.vue'

import { panel_section } from '../ui.js'
import { useStore } from '../composable/use-store.js'
import { useControls } from '../use-controls.js'

// Each button's state bound once, at setup: its `on` names a table store, and useStore is what turns
// that into something this template re-renders from.
const rows = Object.entries(useControls().settings).map(([id, row]) => ({
    id,
    row,
    buttons: (row.button ? [row.button] : row.buttons ?? []).map(button => ({
        button,
        on: button.on ? useStore(button.on()) : null,
    })),
}))

// What the template draws: each button's state read out, and its icon and title chosen for that state.
const view = computed(() => rows.map(({ id, row, buttons }) => ({
    id,
    label: row.label,
    confirm: row.confirm,
    press: row.press,
    wide: !!row.button,
    buttons: buttons.map(({ button, on }) => {
        const lit = on?.value ?? false
        return {
            lit,
            icon: Array.isArray(button.icon) ? button.icon : button.icon[lit ? 'on' : 'off'],
            title: typeof button.title === 'function' ? button.title(lit) : button.title,
            tour: button.tour,
            press: button.press,
        }
    }),
})))

// A destructive row asks twice — the same press-again-to-confirm the About dialog's Clear Data uses.
// The armed state times out rather than sitting there indefinitely, so a stray click cannot be
// completed by a later unrelated one.
const armed = ref(null)
let armed_timer = 0

function pressDestructive(row) {
    clearTimeout(armed_timer)

    if (armed.value !== row.id) {
        armed.value = row.id
        armed_timer = setTimeout(() => { armed.value = null }, 4000)
        return
    }

    armed.value = null
    row.press()
}

// Collapsing the section disarms it: the next time it opens, the button should read as the
// thing it does rather than as a question the player has forgotten answering.
watch(() => panel_section.value.settings, (open) => {
    if (open) return
    clearTimeout(armed_timer)
    armed.value = null
})

onUnmounted(() => clearTimeout(armed_timer))
</script>

<template lang="pug">
Section(id="settings" title="Settings")

    .settings(class="flex flex-col gap-2 font-mono text-2.75")

        template(v-for="row in view" :key="row.id")

            //- Destructive: behind a rule of its own, and a question before it is an act.
            .destructive(v-if="row.confirm" class="mt-2 font-light")
                .btn(
                    @click="pressDestructive(row)"
                    :class="armed === row.id ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700'"
                    class="h-6 flex items-center justify-center rounded"
                )
                    span {{ armed === row.id ? row.confirm : row.label }}

            .row(v-else class="h-7 flex items-center gap-2")
                span(class="grow min-w-0 truncate text-neutral-400") {{ row.label }}

                //- One button standing for the whole row.
                .btn(
                    v-if="row.wide"
                    @click="row.buttons[0].press()"
                    :title="row.buttons[0].title"
                    :data-tour="row.buttons[0].tour"
                    :class="row.buttons[0].lit ? 'bg-white text-black' : 'text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700'"
                    class="flex-none w-17 h-7 flex items-center justify-center rounded-lg"
                )
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(v-for="d in row.buttons[0].icon" :key="d" :d="d")

                //- A group, one button per question. Two questions about the same object stay two
                //- buttons rather than one control with four states, so a player reaching for one of
                //- them never has to read the other to know what pressing it will do.
                .group(v-else class="flex-none flex items-stretch h-7 rounded-lg overflow-hidden text-neutral-300 outline outline-neutral-700 bg-neutral-800")
                    template(v-for="(button, i) in row.buttons" :key="i")
                        .divide(v-if="i" class="flex-none w-px bg-neutral-700")
                        .btn(
                            @click="button.press()"
                            :title="button.title"
                            :data-tour="button.tour"
                            :class="button.lit ? 'bg-white text-black' : 'text-white hover:bg-neutral-700'"
                            class="w-8 flex items-center justify-center"
                        )
                            svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(v-for="d in button.icon" :key="d" :d="d")
</template>
