<script setup>
// The roster. A seat is an end of the bartop rather than a client — see @cardcarp/simulator's seats.js — so this
// list is the table's own state, and it reads the same whether or not anyone is online.
//
// Add Seat lives here rather than with the connection controls it used to sit beside: adding
// a seat needs no relay at all (it is how you goldfish against yourself), and filing it under
// Multiplayer said the opposite.
import { computed, ref } from 'vue'

import { AnimatePresence, Motion } from 'motion-v'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'

import Section from './section.vue'

import { color_list } from '../toolbar/shared/colors.js'

import { useStore } from '../composable/use-store.js'
import { useTable } from '../use-table.js'

// The table, through its object (see use-table.js).
const { roster: seatRoster, canAdd: canAddSeat, add: addSeat, claim: claimSeat, remove: removeSeat, update: updateSeat } = useTable().seats

// Which seat's colour picker is showing. One shared boolean drove every row's PopoverRoot
// before, so opening one opened all of them.
const openColorSeatId = ref(null)

// Every seat, with what this client may do with each — see seatRoster in @cardcarp/simulator's seats.js.
const roster = useStore(seatRoster)
const can_add_seat = useStore(canAddSeat)

// The seat list in creation order, which is stable across clients (the relay stamps `ord`)
// and, more to the point, stable across a seat change: floating our own row to the top made
// the whole list reshuffle under the cursor the instant you took a seat over, so the chip you
// just clicked jumped out from under you. Which seat is ours is said by the icon instead,
// where it costs no movement.
const seatRows = computed(() => roster.value.map(seat => ({
    ...seat,
    // One rule for every row: hands are replicated in full, so the count is always just the
    // cards we're holding for that seat.
    cards: seat.hand.length,
})))

// Three states per row, and they drive both the click behaviour and the icon:
//   mine  — the seat I'm sitting in
//   free  — a goldfish: unclaimed, mine to take over, hand and all
//   held  — someone else is here; not takeable while their socket is open
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

// Recolour the seat whose swatch was clicked. Only the seat you're sitting in is editable —
// the relay enforces the same rule, so an unclaimed goldfish is recoloured by taking it over
// first.
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
        //- A free seat is a button: click it to sit down and pick up its hand.
        //-
        //- The who-is-here icon rides INSIDE the chip. It used to hang off the chip's left
        //- edge on a not-clipped wrapper, which worked in a floating flyout and cannot here —
        //- the panel clips its own rounded corners, and the scroll column clips anything
        //- reaching past the padding.
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
                //- Colour swatch — a picker only for the seat we're actually in.
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

                //- Only our own seat's name is editable. Every other row renders as static text so
                //- an input doesn't swallow the click that would claim the seat.
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

            //- Always on rather than hover-only: binning an empty chair is a listed option,
            //- not something to go hunting for.
            //-
            //- An occupied seat never offers it. Someone else's is not ours to bin — its hand
            //- goes with it — and our own is the chair we are sitting in; both render the
            //- who-is-here icon in the same slot instead.
            //-
            //- canRemoveSeat is asked as well, for the empty seat it still says no to: the last
            //- one. A table with no seats has nowhere to draw to, so removeSeat refuses it, and
            //- without asking here the row would offer an X that quietly did nothing.
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
