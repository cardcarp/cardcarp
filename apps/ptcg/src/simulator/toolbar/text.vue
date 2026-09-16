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

// The table, through its object (see use-table.js).
const { current: uiSelection } = useTable().selection
const { setDraft: setTextDraft, stageColor: stageTextColor, commitEdit: commitTextEdit, changeColor: textChangeColor } = useTable().text

const el_textarea = useTemplateRef('el-textarea')
const el_wrap = useTemplateRef('el-wrap')

// Read-only. The draft and a staged colour are written through the text tool's verbs, so the
// selection is replaced rather than edited out from under the canvas.
const ui_selection = useStore(uiSelection)

const isVisible = computed(() => ui_selection.value.type === 'text' || ui_selection.value.type === 'text-edit')
const isEditing = computed(() => ui_selection.value.type === 'text-edit')

// Single-line until the user presses Shift+Enter
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
    // Single-line: let content drive width; mirror + textarea both use white-space:pre
    return { ...base, width: 'max-content' }
})

function handle_keydown(e) {
    if (e.key === 'Enter') {
        if (e.shiftKey) {
            if (!isMultiline.value) {
                // Freeze the current visual width and switch to wrap mode
                frozenWidth.value = el_wrap.value?.offsetWidth ?? ui_selection.value.data?.width
                isMultiline.value = true
            }
            // Let the newline through naturally
        } else {
            e.preventDefault()
            e.target.blur() // commits via handle_blur
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
        // Edit overlay open: stage for the live textarea preview; commitTextEdit applies
        // and broadcasts it on blur.
        stageTextColor(`hsl(${color})`)
    } else {
        // Plain selection: no commit will run, so apply + broadcast right away.
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
        //- Chip previews the current color — the staged one while the edit overlay is
        //- open, otherwise the selected node's. Clicking opens the shared swatch grid.
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

//- CSS Grid auto-size trick: mirror and textarea share the same grid cell.
//- Single-line: container is max-content wide, both children use white-space:pre (no wrap).
//- Multiline (after Shift+Enter): container is frozen-width wide, children use pre-wrap.
.text-edit-wrap(
    v-if="isEditing"
    ref="el-wrap"
    class="absolute z-50 grid outline-2 outline-blue-500 rounded-sm"
    :style="wrapStyle"
)
    //- Mirror: invisible, drives container size
    div(
        aria-hidden="true"
        class="[grid-area:1/1] invisible pointer-events-none select-none"
        :class="isMultiline ? 'whitespace-pre-wrap wrap-break-word' : 'whitespace-pre'"
    ) {{ ui_selection.data.text + '​' }}

    //- Textarea: same cell, stretches to mirror dimensions.
    //- rows="1" cols="1" neutralise browser defaults (rows=2, cols=20) so the
    //- mirror — not the textarea's intrinsic size — drives the grid cell dimensions.
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
