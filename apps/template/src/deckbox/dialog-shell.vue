<script setup>
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
    open: { type: Boolean, default: false },
    width: { type: String, default: 'w-180' },
    size: { type: String, default: 'box' },
    layer: { type: Number, default: 0 },
    title: { type: String, default: '' },
    description: { type: String, default: '' }
})

const emit = defineEmits(['close'])

const z_overlay = computed(() => 99 + props.layer * 2)
const z_box = computed(() => 100 + props.layer * 2)

const box_class = computed(() =>
    props.size === 'full'
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
