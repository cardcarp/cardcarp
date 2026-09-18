<script setup>
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import { whenever } from '@vueuse/core'
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

const { current: uiSelection } = useTable().selection
const { setDraft: setTextDraft, stageColor: stageTextColor, commitEdit: commitTextEdit, changeColor: textChangeColor } = useTable().text

const el_textarea = useTemplateRef('el-textarea')
const el_wrap = useTemplateRef('el-wrap')

const ui_selection = useStore(uiSelection)

const isVisible = computed(() => ui_selection.value.type === 'text' || ui_selection.value.type === 'text-edit')
const isEditing = computed(() => ui_selection.value.type === 'text-edit')

const isMultiline = ref(false)
const frozenWidth = ref(0)

const popoverColor = ref(false)

const wrapStyle = computed(() => {
    const { editX, editY, fontSize, lineHeight, fontFamily, color, height } = ui_selection.value.data ?? {}
    const base = {
        left:       `${editX}px`,
        top:        `${editY}px`,
        fontSize:   `${fontSize}px`,
        lineHeight:  String(lineHeight ?? 1),
        fontFamily,
        color,
    }
    if (isMultiline.value) {
        return { ...base, width: `${frozenWidth.value}px`, minHeight: `${height}px` }
    }
    return { ...base, width: 'max-content' }
})

function handle_keydown(e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            if (!isMultiline.value) {
                frozenWidth.value = el_wrap.value?.offsetWidth ?? ui_selection.value.data?.width
                isMultiline.value = true
            }
        } else {
            e.preventDefault()
            e.target.blur()
        }
    } else if (e.key === 'Escape') {
        e.target.blur()
    }
}

function handle_blur() {
    commitTextEdit(ui_selection.value.data.text)
}

function pick_color(color) {
    if (!isVisible.value) return
    if (isEditing.value) {
        stageTextColor(`hsl(${color})`)
    } else {
        textChangeColor(color)
    }
    popoverColor.value = false
}

whenever(isEditing, async () => {
    isMultiline.value = false
    frozenWidth.value = 0
    await nextTick()
    el_textarea.value?.select()
})
</script>

<template lang="pug">
AnimatePresence
    Motion(
        v-if="isVisible"
        key="toolbar-text"
        :initial="{ opacity: 0, y: 0 }"
        :animate="{ opacity: 1, y: -10 }"
        :exit="{ opacity: 0, y: 0 }"
        class="absolute p-2 flex gap-1 bg-neutral-950 border border-white/5 rounded-xl z-50 -translate-x-1/2 -translate-y-full"
        :style="{ left: `${ui_selection.x}px`, top: `${ui_selection.y}px` }"
    )
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
                                :style="{ backgroundColor: ui_selection?.data?.color }"
                            )

                    TooltipPortal
                        AnimatePresence
                            TooltipContent(asChild align="center" side="top" :sideOffset="4")
                                Motion(:initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.6 }" class="px-3 py-1.5 text-3 text-white bg-black leading-none rounded-full backdrop-blur-sm pointer-events-none z-99")
                                    span Text Color

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

.text-edit-wrap(
    v-if="isEditing"
    ref="el-wrap"
    class="absolute z-50 grid outline-2 outline-blue-500 rounded-sm"
    :style="wrapStyle"
)
    div(
        aria-hidden="true"
        class="[grid-area:1/1] invisible pointer-events-none select-none"
        :class="isMultiline ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'"
    ) {{ ui_selection.data.text + '​' }}

    textarea(
        ref="el-textarea"
        rows="1"
        cols="1"
        :value="ui_selection.data.text"
        @input="setTextDraft($event.target.value)"
        :wrap="isMultiline ? 'soft' : 'off'"
        @blur="handle_blur"
        @keydown="handle_keydown"
        class="[grid-area:1/1] w-full bg-transparent outline-none resize-none overflow-hidden p-0 m-0"
        :class="isMultiline ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'"
    )
</template>
