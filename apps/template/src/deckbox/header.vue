<script setup>
// Core
import { computed } from 'vue'

// Libraries
import { Motion } from 'motion-v'

// UI
import {
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuPortal,
    DropdownMenuRoot,
    DropdownMenuTrigger,

    TooltipContent, 
    TooltipPortal, 
    TooltipRoot, 
    TooltipTrigger
} from 'reka-ui'

// State
import { useState } from '@cardcarp/deckbox/state.js'
import { useProfileStore } from '@cardcarp/core/store/profile.js'

// Assign
const { is_desktop, panel_left_content, panel_center_content, panel_right_content, panel_right_open } = useState()
const { dialog_about_active } = useProfileStore()

const center_shift = computed(() => {
    if (!is_desktop.value) return 0

    return (panel_left_content.value ? 160 : 0) - (panel_right_content.value ? 160 : 0)
})

</script>

<template lang="pug">
.header(
    class="relative flex-none pl-3 pr-4 h-14 grid items-center bg-linear-to-b from-neutral-900 to-neutral-950 rounded-t-2xl"
    style="grid-template-columns: 1fr auto 1fr; box-shadow: inset 0 -1px 0 0 hsl(0 0 100 / 0.1 ), inset 0 -3px 0 0 black"
)
    .left(class="flex justify-start items-center gap-2 header-compact")

        slot(name="menu")
        
        .btns(
            class="group/textarea relative h-9 flex justify-center items-center gap-2 bg-neutral-950 rounded-full"
        )
            .d(
                class="absolute inset-0 size-full rounded-full"
                style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
            )
            TooltipRoot(:delayDuration="100")
                TooltipTrigger
                    .btn(
                        @click="panel_left_content = (panel_left_content == 'filter' ? null : 'filter')" 
                        class="flex-none relative w-12 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 hover:text-white"
                        :class="{'bg-white! text-black!': panel_left_content == 'filter'}"
                    )
                        svg(class="flex-none size-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M13.354 3H3a1 1 0 0 0-.742 1.67l7.225 7.989A2 2 0 0 1 10 14v6a1 1 0 0 0 .553.895l2 1A1 1 0 0 0 14 21v-7a2 2 0 0 1 .517-1.341l1.218-1.348")
                            path(d="M16 6h6")
                            path(d="M19 3v6")
                TooltipPortal
                    TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }" 
                            :animate="{ opacity: 1, scale: 1 }"
                            class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                        )
                            .text(class="text-3") Filter

    .center(
        class="flex justify-center items-center header-compact"
        :style="{ transform: `translateX(${center_shift}px)` }"
    )
        .btns(
            class="group/textarea relative h-9 flex justify-center items-center bg-neutral-950 rounded-full"
        )
            .d(
                class="absolute inset-0 size-full rounded-full"
                style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
            )
            TooltipRoot(:delayDuration="100")
                TooltipTrigger
                    .btn(
                        @click="panel_center_content = 'card'" 
                        class="flex-none relative w-12 h-8 flex items-center justify-center rounded-full from-emerald-500 to-indigo-500 hover:bg-neutral-800 hover:text-white"
                        :class="{'bg-linear-to-br! text-white!': panel_center_content == 'card'}"
                    )
                        svg(class="flex-none size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="M14.832 8.445a1 1 0 00-1.589-.098l-2.075 3.098a1 1 0 000 1.11l2 3a1 1 0 001.664 0l2-3a1 1 0 000-1.11z"/>
                            <path d="m7.18 20.827-5-11a2 2 0 01.993-2.647L7 5.44"/>
                            <rect x="7" y="2" width="14" height="20" rx="2"/>                
                TooltipPortal
                    TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }" 
                            :animate="{ opacity: 1, scale: 1 }" 
                            class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                        )
                            .text(class="text-3") Cards

            TooltipRoot(:delayDuration="100")
                TooltipTrigger
                    .btn(
                        @click="panel_center_content = 'deck'" 
                        class="relative w-12 h-8 flex items-center justify-center rounded-full from-emerald-500 to-indigo-500 hover:bg-neutral-800 hover:text-white"
                        :class="{'bg-linear-to-br! text-white!': panel_center_content == 'deck'}"
                    )
                        svg(class="flex-none size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M11.6292 20.9991H4.5022C3.97176 20.9991 3.46306 20.7884 3.08798 20.4134C2.71291 20.0383 2.5022 19.5296 2.5022 18.9991V4.99915C2.5022 4.46871 2.71291 3.96 3.08798 3.58493C3.46306 3.20986 3.97176 2.99915 4.5022 2.99915H18.5022C19.0326 2.99915 19.5413 3.20986 19.9164 3.58493C20.2915 3.96 20.5022 4.46871 20.5022 4.99915V10.1241")
                            path(d="M2.5022 8.99915H20.5022")
                            path(d="M19.1776 14.827C19.3347 15.0739 19.544 15.2832 19.7909 15.4403L22.1376 16.9344L19.7909 18.4276C19.544 18.5847 19.3347 18.794 19.1776 19.0409L17.6844 21.3876L16.1903 19.0409C16.0332 18.794 15.8239 18.5847 15.577 18.4276L13.2303 16.9344L15.577 15.4403C15.8239 15.2832 16.0332 15.0739 16.1903 14.827L17.6844 12.4803L19.1776 14.827Z")
                TooltipPortal
                    TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }" 
                            :animate="{ opacity: 1, scale: 1 }"
                            class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                        )
                            .text(class="text-3") Decks

            TooltipRoot(:delayDuration="100")
                TooltipTrigger
                    .btn(
                        @click="panel_center_content = 'list'" 
                        class="relative w-12 h-8 flex items-center justify-center rounded-full from-emerald-500 to-indigo-500 hover:bg-neutral-800 hover:text-white"
                        :class="{'bg-linear-to-br! text-white!': panel_center_content == 'list'}"
                    )
                        svg(class="flex-none size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            <path d="M19.1776 12.827C19.3347 13.0739 19.544 13.2832 19.7909 13.4403L22.1376 14.9344L19.7909 16.4276C19.544 16.5847 19.3347 16.794 19.1776 17.0409L17.6844 19.3876L16.1903 17.0409C16.0332 16.794 15.8239 16.5847 15.577 16.4276L13.2303 14.9344L15.577 13.4403C15.8239 13.2832 16.0332 13.0739 16.1903 12.827L17.6844 10.4803L19.1776 12.827Z"/>
                            <path d="M21 5H3"/>
                            <path d="M10 12H3"/>
                            <path d="M10 19H3"/>
                TooltipPortal
                    TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }" 
                            :animate="{ opacity: 1, scale: 1 }"
                            class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                        )
                            .text(class="text-3") Deck List

    .right(class="flex justify-end items-center gap-2 header-compact")
        .btns(
            class="group/textarea relative h-9 flex justify-center items-center bg-neutral-950 rounded-full"
        )
            .d(
                class="absolute inset-0 size-full rounded-full"
                style="box-shadow: inset 0 -1px 0 0 hsl(0 0 16), inset 0 2px 2px 1px black, inset 0 0 20px 0 hsl(0 0 2)"
            )
            TooltipRoot(:delayDuration="100")
                TooltipTrigger
                    .btn(
                        @click="panel_right_open('saved')"
                        class="btn-saved relative w-12 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 hover:text-white"
                        :class="{'bg-white! text-black!': panel_right_content == 'saved'}"
                    )
                        svg(class="flex-none size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M11.6292 20.9991H4.5022C3.97176 20.9991 3.46306 20.7884 3.08798 20.4134C2.71291 20.0383 2.5022 19.5296 2.5022 18.9991V4.99915C2.5022 4.46871 2.71291 3.96 3.08798 3.58493C3.46306 3.20986 3.97176 2.99915 4.5022 2.99915H18.5022C19.0326 2.99915 19.5413 3.20986 19.9164 3.58493C20.2915 3.96 20.5022 4.46871 20.5022 4.99915V10.1241")
                            path(d="M14.1222 17.7992C13.9118 17.5798 13.748 17.3201 13.6408 17.0358C13.5335 16.7514 13.485 16.4482 13.4981 16.1446C13.5112 15.841 13.5857 15.5431 13.7171 15.2691C13.8484 14.995 14.034 14.7504 14.2625 14.55C14.491 14.3496 14.7577 14.1976 15.0466 14.1031C15.3355 14.0087 15.6405 13.9737 15.9433 14.0004C16.246 14.027 16.5402 14.1147 16.8082 14.2582C17.0761 14.4017 17.3122 14.5979 17.5022 14.8352C17.6931 14.6004 17.9294 14.4066 18.1969 14.2653C18.4644 14.124 18.7577 14.0381 19.0592 14.0127C19.3608 13.9873 19.6643 14.0231 19.9517 14.1177C20.2391 14.2124 20.5044 14.364 20.7318 14.5636C20.9592 14.7632 21.1441 15.0066 21.2753 15.2792C21.4065 15.5519 21.4813 15.8482 21.4954 16.1504C21.5094 16.4527 21.4623 16.7546 21.357 17.0383C21.2516 17.3219 21.0901 17.5814 20.8822 17.8012L18.2562 20.6572C18.1625 20.765 18.0467 20.8515 17.9167 20.9108C17.7867 20.9701 17.6455 21.0008 17.5027 21.0008C17.3598 21.0008 17.2186 20.9701 17.0886 20.9108C16.9586 20.8515 16.8428 20.765 16.7492 20.6572L14.1222 17.7992Z")
                            path(d="M2.5022 8.99915H20.5022")

                TooltipPortal
                    TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }"
                            :animate="{ opacity: 1, scale: 1 }"
                            class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                        )
                            .text(class="text-3") Saved

            TooltipRoot(:delayDuration="100")
                TooltipTrigger
                    .btn(
                        @click="panel_right_open('build')"
                        class="btn-build relative w-12 h-8 flex items-center justify-center rounded-full hover:bg-neutral-800 hover:text-white"
                        :class="{'bg-white! text-black!': panel_right_content == 'build'}"
                    )
                        svg(class="flex-none size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2")
                            rect(x="14" y="2" width="8" height="8" rx="1")
                TooltipPortal
                    TooltipContent(asChild align="center" side="bottom" :sideOffset="4")
                        Motion(
                            :initial="{ opacity: 0, scale: 0 }" 
                            :animate="{ opacity: 1, scale: 1 }"
                            class="px-2 py-1.5 text-white bg-black/50 leading-none rounded-full pointer-events-none z-100"
                        )
                            .text(class="text-3") Build
</template>
