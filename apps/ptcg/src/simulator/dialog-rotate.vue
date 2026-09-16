<script setup>
// The table in portrait, on a phone-sized screen, is not a layout problem to be solved: the
// mat is a landscape surface with a fan of cards along the bottom edge, a toolbar down one
// side and a panel down the other. Shrink the long edge to a phone's width and there is no
// arrangement of those left. So this asks for the one thing that does fix it.
//
// Table route only, by virtue of where it is mounted. The deck builder and the browse pages
// are ordinary scrolling documents and are welcome to be tall.

// Core
import { useMediaQuery } from '@vueuse/core'

// UI
import { Motion } from 'motion-v'

// Where the table stops working. Deliberately NOT a Tailwind breakpoint: the number that
// matters is the SHORT edge of a device held upright, and it is a judgement about how much
// mat is left rather than about columns. At 48rem (768px) a phone in portrait is gated and a
// full-size tablet is not — the one to move if that line turns out to be in the wrong place.
const MAX_WIDTH = '48rem'

// Three conditions, and each of them is load-bearing:
//
//   orientation — the state we are objecting to, and the only one the player can change.
//   max-width   — how far it has to rotate to be worth asking. Read in the CURRENT
//                 orientation, so rotating swaps in the long edge and the gate lifts by
//                 itself, with no second rule to keep in step.
//   pointer     — "turn your device sideways" is nonsense advice to somebody at a desk who
//                 has merely made their window narrow. A coarse pointer is a device that
//                 can be turned.
const needs_landscape = useMediaQuery(
    `(orientation: portrait) and (max-width: ${MAX_WIDTH}) and (pointer: coarse)`
)
</script>

<template lang="pug">
//- Teleported for the same reason the walkthrough is: everything else on this route that has
//- to cover the table already lives at the end of body, and a gate that argued about stacking
//- contexts with them would be a gate with a hole in it.
Teleport(to="body")
    //- Above the whole range in use — dialogs at 99–102, the walkthrough at 118–120, the card
    //- preview at 300 (see preview-card.vue). Opaque rather than dimmed, and pointer-events
    //- live: nothing behind this is meant to be read or touched, including a walkthrough that
    //- started before the device was turned. It picks up where it left off on the way out.
    .dialog-rotate(
        v-if="needs_landscape"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rotate-title"
        class="fixed inset-0 p-8 flex flex-col items-center justify-center gap-6 text-center bg-neutral-950 select-none z-400"
    )
        //- The icon performs the ask: a phone stood upright, turning onto its side, waiting
        //- there a beat, and returning to start it again.
        Motion(
            class="text-neutral-500"
            :animate="{ rotate: [0, 0, -90, -90, 0] }"
            :transition="{ duration: 3.2, times: [0, 0.15, 0.45, 0.8, 1], repeat: Infinity, ease: 'easeInOut' }"
        )
            svg(class="size-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                rect(x="6" y="2" width="12" height="20" rx="2.5")
                path(d="M10.5 18.5h3")

        .copy(class="flex flex-col gap-2 max-w-80")
            .title(id="rotate-title" class="text-5 text-white leading-tight") Turn your device sideways
            .body(class="text-3.25 text-neutral-400 leading-snug") The table is a landscape surface — the mat, your hand, and the panels need the long edge of your screen.

        .hint(class="font-mono text-2.75 text-neutral-600 leading-none") Nothing happening? Check rotation lock.
</template>
