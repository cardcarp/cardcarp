<script setup>
import { computed, ref } from 'vue'

import { AnimatePresence, Motion } from 'motion-v'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import Section from './section.vue'

import { color_list } from '../toolbar/shared/colors.js'

import { useStore } from '../composable/use-store.js'
import { useTable } from '../use-table.js'

const { roster: seatRoster, canAdd: canAddSeat, add: addSeat, claim: claimSeat, remove: removeSeat, update: updateSeat } = useTable().seats

const openColorSeatId = ref(null)

const roster = useStore(seatRoster)
const can_add_seat = useStore(canAddSeat)

const seatRows = computed(() => roster.value.map(seat => ({
    ...seat,
    cards: seat.hand.length,
})))

function seatState(row) {
    if (row.mine) return 'mine'
    return row.free ? 'free' : 'held'
}

function onSeatClick(row) {
    if (row.mine || !row.free) return
    claimSeat(row.seatId)
}

function onSeatName(row, value) {
    updateSeat(row.seatId, { name: value })
}

function pickColor(seatId, color) {
    updateSeat(seatId, { sleeve: color })
    openColorSeatId.value = null
}
</script>

<template lang="pug">
Section(id="seats" title="Seats")

    template(#aside)
        span(class="font-mono text-2.75 text-neutral-500 leading-none") {{ seatRows.length }}

    .roster(class="flex flex-col gap-2 font-mono text-2.75")
        .row(
            v-for="row in seatRows"
            :key="row.seatId"
            class="flex items-center gap-2"
        )
            .seat(
                data-tour="seat"
                @click="onSeatClick(row)"
                class="relative w-full h-7 flex items-center leading-none rounded-full overflow-hidden"
                :class="{ 'hover:brightness-150': row.free && !row.mine, 'opacity-60': seatState(row) === 'held' }"
                :style="{ backgroundColor: `hsl(${row.sleeve} / 0.20)` }"
                :title="seatState(row) === 'held' ? 'Another player is in this seat' : (row.free && !row.mine ? 'Sit here and take over this hand' : '')"
            )
                PopoverRoot(
                    v-if="row.mine"
                    :modal="false"
                    :open="openColorSeatId === row.seatId"
                    @update:open="v => openColorSeatId = v ? row.seatId : null"
                )
                    PopoverTrigger
                        .color(
                            class="flex-none m-2 size-4 rounded-full"
                            :style="{ backgroundColor: `hsl(${row.sleeve})` }"
                        )
                    PopoverPortal
                        AnimatePresence
                            PopoverContent(
                                asChild 
                                align="start" 
                                :alignOffset="0" 
                                side="left" 
                                :sideOffset="8"
                                :collisionPadding="12"
                            )
                                Motion(
                                    :initial="{ opacity: 0, scale: 0 }"
                                    :animate="{ opacity: 1, scale: 1 }"
                                    :exit="{ opacity: 0, scale: 0.6 }"
                                    class="relative p-2 grid grid-cols-5 gap-1 bg-black border border-white/15 rounded-xl z-99 overflow-hidden"
                                )
                                    .btn(
                                        v-for="color in color_list"
                                        :key="color"
                                        @click="pickColor(row.seatId, color)"
                                        class="size-6 rounded-full outline outline-white/5"
                                        :style="{ backgroundColor: `hsl(${color})` }"
                                    )

                .color(
                    v-else
                    class="flex-none m-2 size-4 rounded-full"
                    :style="{ backgroundColor: `hsl(${row.sleeve})` }"
                )

                input(
                    v-if="row.mine"
                    :value="row.name"
                    @input="onSeatName(row, $event.target.value)"
                    class="grow relative min-w-0 w-auto h-full whitespace-nowrap"
                    :style="{ color: `hsl(from hsl(${row.sleeve}) h s calc(l + 30))` }"
                )
                .name(
                    v-else
                    class="grow min-w-0 truncate"
                    :style="{ color: `hsl(from hsl(${row.sleeve}) h s calc(l + 50))` }"
                ) {{ row.name }}



                .cards(
                    class="flex-none mr-3"
                    :style="{ color: `hsl(from hsl(${row.sleeve}) h s calc(l + 30))` }"
                ) {{ row.cards }}

            .state(class="flex-none flex items-center")
                .mine(
                    v-if="row.mine"
                    class="size-6 flex items-center justify-center rounded-full"
                )
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ color: `hsl(from hsl(${row.sleeve}) h s calc(l + 30))` }")
                        <circle cx="12" cy="8" r="5"/>
                        <path d="M20 21a8 8 0 0 0-16 0"/>
                            
                .held(
                    v-else-if="seatState(row) === 'held'"
                    class="group/btn relative size-6 flex items-center justify-center rounded-full"
                )
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ color: `hsl(from hsl(${row.sleeve}) h s calc(l + 30))` }")
                        path(d="M19 16v-2a2 2 0 0 0-4 0v2")
                        path(d="M9.5 15H7a4 4 0 0 0-4 4v2")
                        circle(cx="10" cy="7" r="4")
                        rect(x="13" y="16" width="8" height="5" rx=".899")

                .remove(
                    v-else-if="row.removable"
                    @click.stop="removeSeat(row.seatId)"
                    title="Remove this seat and its hand"
                    class="group/btn relative size-6 flex items-center justify-center rounded-full"
                )
                    .h(
                        class="absolute inset-0 transition-transform scale-0 group-hover/btn:scale-100 size-full rounded-full"
                        :style="{ backgroundColor: `hsl(${row.sleeve} / 0.20)` }"
                    )
                    svg(
                        class="size-4"
                        :style="{ color: `hsl(from hsl(${row.sleeve}) h s calc(l + 5))` }"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                    )
                        path(d="M18 6 6 18")
                        path(d="m6 6 12 12")

        .btn(
            @click="addSeat"
            data-tour="seat-add"
            :class="can_add_seat ? 'text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'"
            class="flex-none h-6 flex items-center justify-center rounded"
        )
            span Add Seat
</template>
