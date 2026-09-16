<script setup>
// Placement for the walkthrough: find the step's target in the DOM, dim everything but it,
// and hang the card off it.
//
// Anchoring goes through Reka's PopoverAnchor `reference` prop, which takes an element
// instead of wrapping one. That is the whole reason the wizard can point at the deckbox,
// the multiplayer flyout and the mirror button without any of those components knowing it
// exists — they carry a `data-tour` attribute and nothing else.
//
// Nothing here captures the pointer. The dim and the spotlight are pointer-events-none and
// the popover is non-modal, so the player can work the control being described while it is
// being described — which is exactly what the self-advancing steps in tutorial.js expect.

// Core
import { computed, onMounted, shallowRef, watch } from 'vue'

// Libraries
import { onKeyStroke, useElementBounding, useRafFn } from '@vueuse/core'

// UI
import { Motion } from 'motion-v'
import { PopoverAnchor, PopoverContent, PopoverPortal, PopoverRoot } from 'reka-ui'

// Components
import TutorialCard from './tutorial-card.vue'

// Tutorial
import {
    tutorial_open,
    tutorial_step,
    tutorial_index,
    tutorial_count,
    tutorial_isFirst,
    tutorial_isLast,
    tutorialBack,
    tutorialNext,
    tutorialSkip,
    tutorialStartIfUnseen,
} from './tutorial.js'

// The element the current step points at, or null for a centred step.
const anchor = shallowRef(null)

// shallowRef, not ref: this holds a DOM node, and making one deeply reactive would walk the
// whole element.
const bounds = useElementBounding(anchor)

function resolveAnchor() {
    const declared = tutorial_step.value?.anchor
    if (!declared) {
        anchor.value = null
        return
    }
    // A step may list several selectors, most-preferred first: the deck step follows the card
    // panel once it is open and falls back to the button that opens it. First one with
    // anything on screen wins — and since the frame loop re-runs this, opening or closing that
    // panel moves the card on its own.
    for (const selector of (Array.isArray(declared) ? declared : [declared])) {
        const found = document.querySelectorAll(selector)
        // Last match within a selector. The seat step's matches every row, and the one worth
        // pointing at is the seat the player just added.
        if (found.length) {
            anchor.value = found[found.length - 1]
            return
        }
    }
    anchor.value = null
}

// One frame loop for the life of the walkthrough, doing both jobs: re-resolve (targets
// appear and disappear as the flyout opens and seats are added) and re-measure (opening
// the flyout moves the seat list without resizing anything, so neither a ResizeObserver
// nor a scroll listener would notice). A querySelectorAll and a getBoundingClientRect per
// frame, for the minute or two the wizard is up.
const frame = useRafFn(() => {
    resolveAnchor()
    bounds.update()
}, { immediate: false })

watch(tutorial_open, (open) => {
    if (open) {
        resolveAnchor()
        frame.resume()
    } else {
        frame.pause()
        anchor.value = null
    }
}, { immediate: true })

// Escape leaves, like every other dismissable layer on the table.
onKeyStroke('Escape', () => {
    if (tutorial_open.value) tutorialSkip()
})

// Which of the two placements the current step is in. Derived once rather than re-tested at
// each use, so the dim, the spotlight and the popover can never disagree — an anchored step
// whose target has not appeared yet is neither, and draws nothing until it resolves.
const is_centred = computed(() => Boolean(tutorial_step.value) && !tutorial_step.value.anchor)
const is_anchored = computed(() => Boolean(tutorial_step.value?.anchor) && Boolean(anchor.value))

// What Reka is actually given to hang the card off: a virtual reference rather than the
// element, rebuilt whenever the measured rect changes.
//
// Reka passes `reference` straight to floating-ui, which recomputes on scroll and resize but
// not on a transform — and the deck panel opens by scaling up from nothing. Handed the
// element directly, the card was placed against the panel's half-grown box and left sitting
// on top of the finished one. Changing the object identity is what re-triggers the placement;
// while the rect is still, the same object comes back and nothing recomputes. getBoundingClientRect
// reads live rather than closing over a snapshot, so floating-ui always measures the truth.
const anchor_reference = computed(() => {
    const el = anchor.value
    if (!el) return null
    // Read once so the computed depends on the bounds and re-runs when the target moves.
    void bounds.x.value, bounds.y.value, bounds.width.value, bounds.height.value
    return {
        getBoundingClientRect: () => el.getBoundingClientRect(),
        contextElement: el,
    }
})

// The cutout. A box the size of the target with an enormous shadow spread, which dims the
// rest of the page without needing a second element or an SVG mask.
const SPOTLIGHT_PAD = 6

const spotlight_style = computed(() => ({
    top: `${bounds.top.value - SPOTLIGHT_PAD}px`,
    left: `${bounds.left.value - SPOTLIGHT_PAD}px`,
    width: `${bounds.width.value + SPOTLIGHT_PAD * 2}px`,
    height: `${bounds.height.value + SPOTLIGHT_PAD * 2}px`,
    boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
    zIndex: 118,
}))

// Deferred to mounted so the canvas has been built and the toolbar painted before the
// first step measures anything.
onMounted(() => {
    tutorialStartIfUnseen()
})
</script>

<template lang="pug">
.tutorial
    //- Both dims are plain elements, and neither is wrapped in AnimatePresence. Motion and
    //- a bound :style fight over the same style attribute — the spotlight's rect is
    //- rewritten every frame, which restarted the opacity animation until it froze part-way
    //- and left the overlay a permanent quarter-visible. AnimatePresence around a teleported
    //- child had a matching problem in the other direction: the outgoing element never
    //- unmounted, so the welcome card stayed painted over the step after it. Only the cards
    //- animate, and they carry no bound style.
    Teleport(to="body")

        //- Centred steps get a flat dim and the card in the middle of the window; there is
        //- no target to cut out.
        .tutorial-centre(
            v-if="is_centred"
            class="fixed inset-0 flex items-center justify-center bg-black/60 pointer-events-none"
            :style="{ zIndex: 118 }"
        )
            Motion(
                class="pointer-events-auto"
                :initial="{ opacity: 0, scale: 0.94 }"
                :animate="{ opacity: 1, scale: 1 }"
                :transition="{ duration: 0.15 }"
            )
                TutorialCard(
                    :step="tutorial_step"
                    :index="tutorial_index"
                    :count="tutorial_count"
                    :isFirst="tutorial_isFirst"
                    :isLast="tutorial_isLast"
                    @next="tutorialNext"
                    @back="tutorialBack"
                    @skip="tutorialSkip"
                )

        //- Anchored steps: spotlight the control, and let the popover place the card beside
        //- it on the side the step asked for.
        .tutorial-spotlight(
            v-if="is_anchored"
            class="fixed rounded-lg outline outline-white/25 pointer-events-none"
            :style="spotlight_style"
        )

    //- Kept mounted only while a step wants it. `:open` is a constant rather than a model:
    //- the popover has no dismissal of its own, so an outside click lands on the table
    //- instead of closing the wizard.
    PopoverRoot(v-if="is_anchored" :modal="false" :open="true")
        PopoverAnchor(:reference="anchor_reference" as="span")
        PopoverPortal
            PopoverContent(
                asChild
                :side="tutorial_step.side ?? 'bottom'"
                :align="tutorial_step.align ?? 'center'"
                :sideOffset="14"
                :collisionPadding="12"
                @interactOutside="event => event.preventDefault()"
                @escapeKeyDown="event => event.preventDefault()"
            )
                Motion(
                    :initial="{ opacity: 0, scale: 0.94 }"
                    :animate="{ opacity: 1, scale: 1 }"
                    :transition="{ duration: 0.15 }"
                    :style="{ zIndex: 120 }"
                )
                    TutorialCard(
                        :step="tutorial_step"
                        :index="tutorial_index"
                        :count="tutorial_count"
                        :isFirst="tutorial_isFirst"
                        :isLast="tutorial_isLast"
                        @next="tutorialNext"
                        @back="tutorialBack"
                        @skip="tutorialSkip"
                    )
</template>
