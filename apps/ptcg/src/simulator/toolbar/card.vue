<script setup>
import { ref } from 'vue'
import { AnimatePresence, Motion } from 'motion-v'
import {
    PopoverContent,
    PopoverPortal,
    PopoverRoot,
    PopoverTrigger,


    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger,
} from 'reka-ui'

import { useStore } from '../composable/use-store.js'

import Swatches from './shared/swatches.vue'
import ToolDelete from './shared/tool-delete.vue'
import { useTable } from '../use-table.js'
import { keyHint } from '../use-controls.js'

// The table, through its object (see use-table.js).
const { current: uiSelection, moveZ } = useTable().selection
const { cards: hand } = useTable().hand
const { rotate: cardRotate, flip: cardFlip, draw: cardDraw, shuffle: cardShuffle, selectedGroupId: cardGetSelectedGroupId, group: cardMakeGroup, ungroup: cardUngroup, emptyHand: cardEmptyHand, changeSleeve: cardChangeSleeveColor } = useTable().cards

const popoverColor = ref(false)
const ui_selection = useStore(uiSelection)
const hand_card_list = useStore(hand)

// Each button's key, from the list the keyboard binds (controls.js) — so a verb this app gives no key
// advertises none.
const hint = {
    draw: keyHint('cards.draw1'),
    emptyHand: keyHint('cards.emptyHand'),
    shuffle: keyHint('cards.shuffle'),
    group: keyHint('cards.group'),
    ungroup: keyHint('cards.ungroup'),
    rotate: keyHint('cards.rotateRight'),
    bottom: keyHint('selection.bottom'),
    flip: keyHint('cards.flip'),
}

// Recolors every card the transformer holds — one card when a single card is selected,
// the whole pile when a group is (selecting any member expands to the group). Swatches
// hand back a bare "H S L" triplet; the canvas stores a ready-to-use CSS color.
function pick_color(color) {
    cardChangeSleeveColor(`hsl(${color})`)
    popoverColor.value = false
}

// One click, one card, off the top, into your hand — the move you make constantly, now with
// nothing between the intent and the card. The count/from/to popover this replaces made the
// common case three interactions deep to serve options that were rarely anything else.
// Identical to pressing 1, so the button and the key can't drift apart — the number row
// draws that many cards (see drawToHand in controls.js), and the button is its one-card case.
function handle_cardDraw() {
    cardDraw({
        groupId: cardGetSelectedGroupId(),
        count: 1,
        from: 'top',
        to: 'hand',
    })
}

// Empty Hand is offered even with nothing to empty, so the guard lives here rather than in
// the template's `v-if`. cardEmptyHand bails on an empty hand of its own accord; saying so at
// the call site is what makes the greyed-out button and the dead click one decision instead
// of two that could drift.
function handle_cardEmptyHand() {
    if (!hand_card_list.value.length) return
    cardEmptyHand()
}

</script>

<template lang="pug">
AnimatePresence
    Motion(
        v-if="ui_selection.type === 'card'"
        key="toolbar-card"
        :initial="{ opacity: 0, y: 0 }"
        :animate="{ opacity: 1, y: -10 }"
        :exit="{ opacity: 0, y: 0 }"
        class="absolute p-2 flex gap-1 bg-neutral-950 border border-white/5 rounded-xl z-50 -translate-x-1/2 -translate-y-full"
        :style="{ left: `${ui_selection.x}px`, top: `${ui_selection.y}px` }"
    )
        template(v-if="ui_selection?.data?.group" )

            //- Single action, not a menu: draws the top card into your hand. Same verb the
            //- number row fires (1 draws one, 2 draws two, and so on).
            TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-draw(
                        @click="handle_cardDraw"
                        class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    )
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M12.65 7.65a2 2 0 012.629-1.046l5.51 2.374a2 2 0 011.046 2.628l-3.957 9.184a2 2 0 01-2.628 1.046l-5.51-2.374a2 2 0 01-1.046-2.628z")
                            path(d="M18 7.777V4a2 2 0 00-2-2h-6a2 2 0 00-2 2v10a2 2 0 001.137 1.805")
                            path(d="m8 4.389-4.364.809a2 2 0 00-1.602 2.33l1.822 9.833a2 2 0 002.331 1.602l2.542-.47")
                
                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 flex items-center gap-2 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Draw
                                //- The digit is the count, so the hint names the range rather than
                                //- the one key the button itself stands for (see drawToHand in controls.js).
                                code(v-if="hint.draw" class="flex items-center gap-px font-mono opacity-50")
                                    span {{ hint.draw }}

            //- The bulk inverse of Draw: the whole hand goes back on top of this pile. Greyed
            //- out on an empty hand rather than hidden, because hiding it MOVES the buttons
            //- either side of it — and the hand is empty exactly while you are drawing, so
            //- the row shifted under a finger already on its way down to Draw. On a mouse
            //- that is a wasted click; on a tablet it emptied the hand you had just drawn.
            //- A dead control costs a little clarity, once. That cost the game.
            TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-empty-hand(
                        @click="handle_cardEmptyHand"
                        :class="hand_card_list.length ? 'hover:bg-neutral-900' : 'text-neutral-600 cursor-not-allowed'"
                        :aria-disabled="!hand_card_list.length"
                        class="size-8 flex items-center justify-center rounded-lg"
                    )
                        //- Draw's own icon, upside down: the same hand and the same card, each
                        //- mirrored through the middle of the box (y → 24 - y), so the hand is
                        //- overhead and the card is below it. Built from those paths rather than
                        //- drawn fresh because the pair has to read as one verb and its inverse —
                        //- the two sit side by side in this toolbar.
                        //-
                        //- The arrow is the exception: mirroring it would turn it around, and an
                        //- arrow pointing up at the hand is a card being picked up. It keeps
                        //- Draw's own downward arrow, in Draw's own place, so in both icons the
                        //- point of the arrow lands on whatever is receiving the card.
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="m10 15 5 5 5-5"/>
                            <path d="M4 4h7a4 4 0 0 1 4 4v12"/>

                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 flex items-center gap-2 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Empty Hand
                                code(v-if="hint.emptyHand" class="flex items-center gap-px font-mono opacity-50")
                                    span {{ hint.emptyHand }}

            TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-rotate-ccw(
                        @click="cardShuffle()"
                        class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    )
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="M11 10V14H15"/>
                            <path d="M11 14L12.535 12.395C13.109 11.8433 13.8065 11.4367 14.5694 11.2089C15.3323 10.9812 16.1386 10.9389 16.9211 11.0856C17.7037 11.2324 18.4399 11.5638 19.0684 12.0525C19.697 12.5411 20.1998 13.1728 20.535 13.895"/>
                            <path d="M21 18L19.465 19.605C18.891 20.1567 18.1935 20.5633 17.4306 20.7911C16.6677 21.0188 15.8614 21.0611 15.0789 20.9144C14.2964 20.7676 13.5602 20.4362 12.9316 19.9475C12.303 19.4589 11.8002 18.8272 11.465 18.105"/>
                            <path d="M21 22V18H17"/>
                            <path d="M19.275 8.89511L21.42 7.92011C21.5978 7.842 21.7489 7.71385 21.8551 7.55128C21.9612 7.38871 22.0177 7.19876 22.0177 7.00461C22.0177 6.81047 21.9612 6.62052 21.8551 6.45795C21.7489 6.29538 21.5978 6.16722 21.42 6.08911L12.83 2.18011C12.5695 2.06126 12.2864 1.99976 12 1.99976C11.7136 1.99976 11.4306 2.06126 11.17 2.18011L2.60003 6.08011C2.42257 6.15836 2.2717 6.28651 2.16579 6.44897C2.05987 6.61143 2.00348 6.80118 2.00348 6.99511C2.00348 7.18905 2.05987 7.3788 2.16579 7.54126C2.2717 7.70371 2.42257 7.83187 2.60003 7.91011L6.89003 9.86511"/>
                            <path d="M2 12C1.99953 12.1913 2.05392 12.3787 2.15672 12.5399C2.25952 12.7012 2.40642 12.8297 2.58 12.91L6.88 14.865L9.03 15.8425"/>
                            <path d="M2 17C1.99953 17.1913 2.05392 17.3787 2.15672 17.5399C2.25952 17.7012 2.40642 17.8297 2.58 17.91L6.88 19.865L9.03 20.8425L10.105 21.3312"/>

                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Shuffle
                                code(v-if="hint.shuffle" class="font-mono ml-1 opacity-50") {{ hint.shuffle }}

            //- Explode the pile back into loose cards. Sits opposite the Group button in the
            //- v-else branch below — a selection is either one pile or several objects, so
            //- exactly one of the two is ever offered, and G does whichever is showing.
            TooltipRoot(v-if="ui_selection?.data?.canUngroup" :delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-ungroup(
                        @click="cardUngroup()"
                        class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    )
                        //- A burst, not a sparkle: six spikes of uneven length, thrown slightly
                        //- off-axis so it reads as something coming apart rather than as a star.
                        //- The valleys are cut deep (inner radius ~4 against an outer ~10) for one
                        //- reason — at the 20px this renders at, a shallower notch closes up into
                        //- a blob and the whole shape turns to mush.
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M10.55 1.7 13.46 8.38 19.25 6.34 16.26 11.4 21.27 15.75 14.34 14.99 13.31 21.31 10.43 15.89 3.8 18.4 8.14 12.54 3.66 8.63 9.35 8.61Z")

                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Ungroup
                                code(v-if="hint.ungroup" class="font-mono ml-1 opacity-50") {{ hint.ungroup }}
        template(v-else)

            //- Rotate left is keyboard-only now. Two rotate buttons sat side by side spending
            //- a third of a five-button toolbar on one verb's two directions, and the pair is
            //- only worth that on a surface where both are one keystroke away. Left survives
            //- as ArrowLeft (see controls.js, which is where the tooltip's ← came from); a
            //- finger reaches the same place by pressing right three times.
            TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-rotate-cw(
                        @click="cardRotate('cw')"
                        class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    )
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="M12.5227 6.375V3.375C12.5227 2.82272 12.075 2.375 11.5227 2.375H3.52271C2.97042 2.375 2.52271 2.82272 2.52271 3.375V15.375C2.52271 15.9273 2.97042 16.375 3.52271 16.375H10.5227" />
                            <path d="M19.0625 11.375L20.5227 11.375C21.075 11.375 21.5227 11.8227 21.5227 12.375L21.5227 20.375C21.5227 20.9273 21.075 21.375 20.5227 21.375L8.5227 21.375C7.97042 21.375 7.5227 20.9273 7.5227 20.375L7.5227 20"  />
                            <path d="M10.4375 9.5625H12.6477C13.7523 9.5625 14.6477 10.4579 14.6477 11.5625V12.3438" />
                            <path d="M11.6477 13.875L14.6477 16.875V11.375"  />
                            <path d="M14.6477 16.875L17.6477 13.875"  />

                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Rotate
                                code(v-if="hint.rotate" class="font-mono ml-1 opacity-50") {{ hint.rotate }}

            //- All the way under, not the single layer ArrowDown gives. This is the verb behind
            //- the energy-onto-a-Pokemon case: the card has to be played before it can be put
            //- underneath, and a finger had no way to ask for the second half. A step at a time
            //- is the wrong unit for it — a Pokemon three energies deep would need the button
            //- pressed once per card already on it, counted by eye.
            //-
            //- Shift+ArrowDown does the same thing (see controls.js, where the bare arrow is
            //- guarded off so the two depths of "down" cannot both fire on one press).
            TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-send-back(
                        @click="moveZ('bottom')"
                        class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    )
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="M16 5H3"/>
                            <path d="M16 12H3"/>
                            <path d="M9 19H3"/>
                            <path d="m16 16-3 3 3 3"/>
                            <path d="M21 5v12a2 2 0 0 1-2 2h-6"/>

                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Bottom
                                code(v-if="hint.bottom" class="font-mono ml-1 opacity-50") {{ hint.bottom }}

            TooltipRoot(v-if="ui_selection?.data?.canGroup" :delayDuration="100" :disable-closing-trigger="false")
                TooltipTrigger
                    .tool-make-group(
                        @click="cardMakeGroup()"
                        class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                    )
                        svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M3 7V5c0-1.1.9-2 2-2h2")
                            path(d="M17 3h2c1.1 0 2 .9 2 2v2")
                            path(d="M21 17v2c0 1.1-.9 2-2 2h-2")
                            path(d="M7 21H5c-1.1 0-2-.9-2-2v-2")
                            rect(width="7" height="5" x="7" y="7" rx="1")
                            rect(width="7" height="5" x="10" y="12" rx="1")

                TooltipPortal
                    AnimatePresence
                        TooltipContent(asChild align="center" side="top" :sideOffset="4")
                            Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                span Group
                                code(v-if="hint.group" class="font-mono ml-1 opacity-50") {{ hint.group }}

        //- Reveal / hide. Outside the group/single branches for the same reason as the colour
        //- chip below: the verb covers whatever the transformer holds, which for a grouped
        //- card is the whole pile — a deck being turned face-up or face-down in one action is
        //- exactly the case that wanted a button, and only the button was missing (H already
        //- did it). The icon reflects the pile's top card, which is also the card the flip
        //- keys on (see canvas flip()).
        TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
            TooltipTrigger
                .tool-flip(
                    @click="cardFlip()"
                    class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                )
                    svg(class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        template(v-if="ui_selection?.data?.faceDown")
                            path(d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49")
                            path(d="M14.084 14.158a3 3 0 0 1-4.242-4.242")
                            path(d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143")
                            path(d="m2 2 20 20")
                        template(v-else)
                            path(d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0")
                            circle(cx="12" cy="12" r="3")

            TooltipPortal
                AnimatePresence
                    TooltipContent(asChild align="center" side="top" :sideOffset="4")
                        Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                            span(v-if="ui_selection?.data?.faceDown") Show
                            span(v-else) Hide
                            code(v-if="hint.flip" class="font-mono ml-1 opacity-50") {{ hint.flip }}

        //- Card-back color. Outside the group/single branches above so it is offered for
        //- any card selection; the swap covers whatever the transformer holds, which is
        //- the whole pile when a grouped card is selected. Chip previews the current color.
        PopoverRoot(:modal="false" v-model:open="popoverColor")
            PopoverTrigger
                TooltipRoot(:delayDuration="100" :disable-closing-trigger="false")
                    TooltipTrigger
                        .tool-color(
                            class="size-8 flex items-center justify-center hover:bg-neutral-900 rounded-lg"
                            :class="{'bg-white!' : popoverColor}"
                        )
                            .chip(
                                class="size-5 rounded-full outline outline-white/20"
                                :style="{ backgroundColor: ui_selection?.data?.sleeveColor }"
                            )

                    TooltipPortal
                        AnimatePresence
                            TooltipContent(asChild align="center" side="top" :sideOffset="4")
                                Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                    span(v-if="ui_selection?.data?.group") Deck Color
                                    span(v-else) Card Color

            PopoverPortal
                AnimatePresence
                    PopoverContent(
                        asChild 
                        align="center" 
                        side="bottom" 
                        :sideOffset="12"
                        :collisionPadding="12"
                    )
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }"
                            :animate="{ opacity: 1, scale: 1 }"
                            :exit="{ opacity: 0, scale: 0.6 }"
                            class="z-99"
                        )
                            Swatches(:on-pick="pick_color")

        ToolDelete
</template>
