<script setup>
// The shared dialog frame: dimmed/blurred overlay, the floating rounded box,
// and the accessibility title/description. Modelled on dialog-probability.vue.
//
// It is deliberately unopinionated about the interior — drop a <DialogScroll>
// (and optionally a pinned header before it) into the default slot. The box is
// a flex column, so a `flex-none` header + `flex-1` scroll area lay out cleanly.
//
// `size="full"` swaps the centred, width-capped panel for a frame inset 20px
// from the window with no chrome of its own — for content that is its own box
// (an enlarged card), where the panel would only shrink it.

// Core
import { computed } from 'vue'

// Libraries
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

const props = defineProps({
    // Whether the dialog is shown. Controlled by the caller's store flag.
    open: { type: Boolean, default: false },
    // Width utility for the box (e.g. 'w-140', 'w-180', 'w-200').
    width: { type: String, default: 'w-180' },
    // 'box'  — centred panel capped by `width` / 85vw / 85vh.
    // 'full' — chromeless frame filling the window inset by 20px.
    size: { type: String, default: 'box' },
    // Stacking level. A dialog opened over another passes layer 1 so its
    // overlay clears the dialog beneath it — DOM order can't do this on its
    // own, since z-index outranks it and every layer-0 box sits at 100.
    layer: { type: Number, default: 0 },
    // Accessible name/description (visually hidden). Optional but encouraged.
    title: { type: String, default: '' },
    description: { type: String, default: '' }
})

const emit = defineEmits(['close'])

// Two z-indexes per layer: overlay below, box above. Applied inline rather
// than as `z-*` utilities so a layer is arithmetic, not a class Tailwind has
// to have seen at build time.
const z_overlay = computed(() => 99 + props.layer * 2)
const z_box = computed(() => 100 + props.layer * 2)

// Swapped wholesale rather than appended: 'full' contradicts half the box
// utilities (position, size caps, transform), and merged Tailwind classes of
// equal specificity resolve by stylesheet order, not by attribute order.
const box_class = computed(() =>
    props.size === 'full'
        // Click-through: the box covers the overlay everywhere but the 20px
        // border, so without this the overlay only closes on a sliver of edge.
        // Important, because Reka sets `pointer-events: auto` inline on modal
        // content. Interactive content in a 'full' dialog opts back in with
        // `pointer-events-auto` on itself.
        ? '@container/dialog fixed inset-5 flex justify-center items-center text-4 pointer-events-none!'
        : ['@container/dialog fixed top-1/2 left-1/2 max-w-[85vw] max-h-[85vh] flex flex-col bg-black text-4 rounded-xl -translate-x-1/2 -translate-y-1/2', props.width]
)

const box_style = computed(() => ({
    zIndex: z_box.value,
    ...(props.size === 'full' ? {} : {
        boxShadow: '0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)'
    })
}))

function close() {
    emit('close')
}

// On open, Reka focuses the first tabbable descendant (often a scroll viewport).
// Let a dialog opt out by marking its preferred element with `autofocus`.
function onOpenAutoFocus(event) {
    const el = document.querySelector('[autofocus]')
    if (!el) return
    event.preventDefault()
    el.focus()
}
</script>

<template lang="pug">
DialogRoot(:modal="true" :open="open" @update:open="value => { if (!value) close() }")
    DialogPortal
        DialogOverlay(asChild)
            Motion(
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ ease: 'linear', duration: 0.2 }"
                class="fixed inset-0 bg-black/80 backdrop-blur-xs"
                :style="{ zIndex: z_overlay }"
                @click="close"
            )
        DialogContent(asChild @interact-outside="event => event.preventDefault()" @open-auto-focus="onOpenAutoFocus")
            Motion(
                :initial="{ opacity: 0, y: 0, scale: 0.9 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :transition="{ ease: 'inertia', delay: 0.1 }"
                :class="box_class"
                :style="box_style"
            )
                VisuallyHidden(asChild)
                    DialogTitle {{ title }}
                VisuallyHidden(asChild)
                    DialogDescription {{ description }}

                slot
</template>
