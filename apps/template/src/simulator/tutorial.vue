<script setup>
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

const anchor = shallowRef(null)

const bounds = useElementBounding(anchor)

function resolveAnchor() {
    const declared = tutorial_step.value?.anchor
    if (!declared) {
        anchor.value = null
        return
    }
    for (const selector of (Array.isArray(declared) ? declared : [declared])) {
        const found = document.querySelectorAll(selector)
        if (found.length) {
            anchor.value = found[found.length - 1]
            return
        }
    }
    anchor.value = null
}

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

onKeyStroke('Escape', () => {
    if (tutorial_open.value) tutorialSkip()
})

const is_centred = computed(() => Boolean(tutorial_step.value) && !tutorial_step.value.anchor)
const is_anchored = computed(() => Boolean(tutorial_step.value?.anchor) && Boolean(anchor.value))

const anchor_reference = computed(() => {
    const el = anchor.value
    if (!el) return null
    void bounds.x.value, bounds.y.value, bounds.width.value, bounds.height.value
    return {
        getBoundingClientRect: () => el.getBoundingClientRect(),
        contextElement: el,
    }
})

const SPOTLIGHT_PAD = 6

const spotlight_style = computed(() => ({
    top: `${bounds.top.value - SPOTLIGHT_PAD}px`,
    left: `${bounds.left.value - SPOTLIGHT_PAD}px`,
    width: `${bounds.width.value + SPOTLIGHT_PAD * 2}px`,
    height: `${bounds.height.value + SPOTLIGHT_PAD * 2}px`,
    boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
    zIndex: 118,
}))

onMounted(() => {
    tutorialStartIfUnseen()
})
</script>

<template lang="pug">
.tutorial
    Teleport(to="body")

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

        .tutorial-spotlight(
            v-if="is_anchored"
            class="fixed rounded-lg outline outline-white/25 pointer-events-none"
            :style="spotlight_style"
        )

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
