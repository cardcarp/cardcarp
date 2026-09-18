<script setup>
//Core
import { ref } from 'vue'

// Libraries
import { find, sum, values } from 'lodash'
import { AnimatePresence, Motion, motion } from 'motion-v'

// Stores
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useState } from '@cardcarp/deckbox/state.js'

// UI
import {
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionRoot,
    AccordionTrigger,

    CheckboxIndicator,
    CheckboxRoot,

    DropdownMenuArrow,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuItemIndicator,
    DropdownMenuLabel,
    DropdownMenuPortal,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuRoot,
    DropdownMenuSeparator,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,

    RadioGroupIndicator,
    RadioGroupItem,
    RadioGroupRoot,

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,

    SelectContent,
    SelectGroup,
    SelectItem,
    SelectItemIndicator,
    SelectItemText,
    SelectLabel,
    SelectPortal,
    SelectRoot,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
    SelectViewport,

    SliderRange,
    SliderRoot,
    SliderThumb,
    SliderTrack,

    TooltipArrow,
    TooltipContent,
    TooltipPortal,
    TooltipRoot,
    TooltipTrigger
} from 'reka-ui'



// Assignments
const { config } = useGameStore()
const { search_active, set_column, column_active, column_max, panel_center_content } = useState()

</script>

<template lang="pug">
.display(class="relative pt-3 pb-4 flex flex-col")

    .models(class="px-2 flex flex-col gap-4")

        .layout(
            v-if="panel_center_content !== 'deck'"
            class="relative pl-2 h-10 flex items-center hover:bg-neutral-900 rounded"
        )
            .label(class="flex-1") Appearance
            SelectRoot(v-model="search_active.layout")
                SelectTrigger(
                    class="group/btn flex-1 min-w-0 px-1 pt-1.25 pb-1 bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    .pill(
                        class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                    )
                        .icon(class="flex-none size-4")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                template(v-if="search_active.layout === 'grid'")
                                    circle(cx="12" cy="5" r="1")
                                    circle(cx="19" cy="5" r="1")
                                    circle(cx="5" cy="5" r="1")
                                    circle(cx="12" cy="12" r="1")
                                    circle(cx="19" cy="12" r="1")
                                    circle(cx="5" cy="12" r="1")
                                    circle(cx="12" cy="19" r="1")
                                    circle(cx="19" cy="19" r="1")
                                    circle(cx="5" cy="19" r="1")
                                template(v-else)
                                    path(d="M12 3v18")
                                    rect(width="18" height="18" x="3" y="3" rx="2")
                                    path(d="M3 9h18")
                                    path(d="M3 15h18")
                        SelectValue(class="grow capitalize truncate") {{ search_active.layout }}
                        .chevron(class="w-3")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m6 9 6 6 6-6")

                SelectPortal(disabled)
                    SelectContent(
                        side="bottom"
                        position="popper"
                        :sideOffset="-2"
                        class="min-w-(--reka-select-trigger-width) p-1.5 pb-1 bg-black rounded-b-lg z-50"
                    )
                        SelectViewport(
                            class="w-full max-h-(--reka-select-content-available-height) overflow-y-auto p-1.5 text-left text-3 font-light bg-neutral-900 rounded"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            SelectItem(class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white" value="grid")
                                SelectItemText(class="grow capitalize") Grid
                                svg(v-show="search_active.layout === 'grid'" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")
                            SelectItem(class="px-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white" value="table")
                                SelectItemText(class="grow capitalize") Table
                                svg(v-show="search_active.layout === 'table'" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")

        .columns(
            v-if="search_active.layout === 'grid'"
            class="relative pl-2 h-10 flex items-center hover:bg-neutral-900 rounded"
        )
            .label(class="flex-1") Card Size
            .value(class="pr-2 flex-1 flex items-center gap-2")
                SliderRoot(
                    :model-value="[column_active]"
                    @update:model-value="set_column($event[0])"
                    :min="1"
                    :max="column_max"
                    :step="1"
                    class="relative px-2 py-1.75 pb-1.5 flex items-center select-none touch-none w-full bg-black rounded-full"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    SliderTrack(class="bg-neutral-800 relative grow rounded-full h-1")
                        SliderRange(class="absolute bg-yellow-500 rounded-full h-full")
                    SliderThumb(class="block size-5 bg-white rounded-full outline-none")


        .sort(class="relative pl-2 h-10 flex items-center hover:bg-neutral-900 rounded")
            .label(class="flex-1") Sort
            SelectRoot(v-model="search_active.sort")
                SelectTrigger(
                    class="group/btn flex-1 min-w-0 px-1 pt-1.25 pb-1 bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    .pill(
                        class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                    )
                        .icon(class="flex-none size-4")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                template(v-if="search_active.sort === 'random'")
                                    rect(width="12" height="12" x="2" y="10" rx="2" ry="2")
                                    path(d="m17.92 14 3.5-3.5a2.24 2.24 0 0 0 0-3l-5-4.92a2.24 2.24 0 0 0-3 0L10 6")
                                    path(d="M6 18h.01")
                                    path(d="M10 14h.01")
                                    path(d="M15 6h.01")
                                    path(d="M18 9h.01")
                                template(v-else)
                                    path(d="m3 16 4 4 4-4")
                                    path(d="M7 20V4")
                                    path(d="m21 8-4-4-4 4")
                                    path(d="M17 4v16")
                        SelectValue(class="grow capitalize truncate") {{ search_active.sort }}
                        .chevron(class="w-3")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m6 9 6 6 6-6")

                SelectPortal(disabled)
                    SelectContent(
                        side="bottom"
                        position="popper"
                        :sideOffset="-2"
                        class="min-w-(--reka-select-trigger-width) p-1.5 pb-1 bg-black rounded-b-lg z-50"
                    )
                        SelectViewport(
                            class="w-full max-h-(--reka-select-content-available-height) overflow-y-auto p-1.5 text-left text-3 font-light bg-neutral-900 rounded"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            SelectItem(v-for="(item, key) in config?.card?.sort" :value="key" class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                SelectItemText(class="grow capitalize") {{ item.label }}
                                svg(v-show="search_active.sort === key" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")
                            SelectItem(value="random" class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                SelectItemText(class="grow capitalize") Random
                                svg(v-show="search_active.sort === 'random'" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")

        .order(class="relative pl-2 h-10 flex items-center hover:bg-neutral-900 rounded")
            .label(class="flex-1") Order
            SelectRoot(v-model="search_active.direction")
                SelectTrigger(
                    class="group/btn flex-1 min-w-0 px-1 pt-1.25 pb-1 bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    .pill(
                        class="relative px-2 py-2 flex items-center gap-2 text-left text-3 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                    )
                        .icon(class="flex-none size-4")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                template(v-if="search_active.direction === 'asc'")
                                    path(d="m3 16 4 4 4-4")
                                    path(d="M7 20V4")
                                    path(d="M20 8h-5")
                                    path(d="M15 10V6.5a2.5 2.5 0 0 1 5 0V10")
                                    path(d="M15 14h5l-5 6h5")
                                template(v-else)
                                    path(d="m3 16 4 4 4-4")
                                    path(d="M7 4v16")
                                    path(d="M15 4h5l-5 6h5")
                                    path(d="M15 20v-3.5a2.5 2.5 0 0 1 5 0V20")
                                    path(d="M20 18h-5")
                        SelectValue(class="grow capitalize truncate") {{ search_active.direction }}
                        .chevron(class="w-3")
                            svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                path(d="m6 9 6 6 6-6")

                SelectPortal(disabled)
                    SelectContent(
                        side="bottom"
                        position="popper"
                        :sideOffset="-2"
                        class="min-w-(--reka-select-trigger-width) p-1.5 pb-1 bg-black rounded-b-lg z-50"
                    )
                        SelectViewport(
                            class="w-full max-h-(--reka-select-content-available-height) overflow-y-auto p-1.5 text-left text-3 font-light bg-neutral-900 rounded"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            SelectItem(v-for="item in ['asc', 'desc']" :value="item" class="pl-1.5 h-6.5 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                SelectItemText(class="grow capitalize") {{ item }}
                                svg(v-show="search_active.direction === item" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    circle(cx="12.1" cy="12.1" r="1")
</template>
