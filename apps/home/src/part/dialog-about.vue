<script setup>
// Core
import { ref } from 'vue'

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

    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport,

    VisuallyHidden
} from 'reka-ui'

// Stores
import { useProfileStore } from '@cardcarp/core/store/profile.js'

// Assign
const { dialog_about_active } = useProfileStore()

const tab = ref('about')

</script>

<template lang="pug">
DialogRoot(:modal="true" v-model:open="dialog_about_active")
    DialogPortal
        DialogOverlay(asChild)
            Motion(
                :initial="{ opacity: 0 }" 
                :animate="{ opacity: 1 }"
                :transition="{  ease: 'linear',  duration: 0.2 }"
                class="fixed inset-0 bg-black/80 backdrop-blur-xs z-99"
                @click="dialog_about_active = false"
            )
        DialogContent(
            asChild 
            @interact-outside="event => {return event.preventDefault()}"
        )
            Motion( 
                :initial="{ opacity: 0, y: 10 }" 
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ ease: 'inertia', delay: 0.1 }"
                class="fixed top-1/2 left-1/2 w-180 max-w-[85vw] max-h-[85vh] flex flex-col overflow-hidden text-4 rounded-xl -translate-x-1/2 -translate-y-1/2 z-100"
                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13);"
            )
                VisuallyHidden(asChild)
                    DialogTitle
                VisuallyHidden(asChild)
                    DialogDescription(:aria-describedby="undefined")

                .content(class="flex flex-1 min-h-0")

                    .left(
                        class="hidden md:flex w-60 py-2 flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl"
                        style="box-shadow: inset -1px 0 0 0 hsl(0 0 12), inset -3px 0 0 0 hsl(0 0 0)"
                    )

                        .btns(class="mt-2 flex flex-col font-light leading-none")
                            .btn(
                                @click="tab = 'about'" 
                                class="group/btn relative"                                
                            )
                                .tab(
                                    class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
                                    :class="tab === 'about' ? 'block!' : ''"
                                )
                                .padding(class="px-4")
                                    .pill(
                                        class="size-7 md:size-auto md:px-3 md:py-2 flex justify-center md:justify-start items-center gap-3 group-hover/btn:text-white rounded-lg cursor-pointer"
                                        :class="tab === 'about' ? 'bg-white/3 text-white!' : ''"
                                    )
                                        svg(class="relative size-4 md:size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                                            <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/>
                                            <path d="M18 12v.5"/>
                                            <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/>
                                            <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>
                                            <path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/>
                                            <path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/>
                                        span(class="relative hidden md:block") About
                            .btn(
                                @click="tab = 'privacy'" 
                                class="group/btn relative"                                
                            )
                                .tab(
                                    class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
                                    :class="tab === 'privacy' ? 'block!' : ''"
                                )
                                .padding(class="px-4")
                                    .pill(
                                        class="size-7 md:size-auto md:px-3 md:py-2 flex justify-center md:justify-start items-center gap-3 group-hover/btn:text-white rounded-lg cursor-pointer"
                                        :class="tab === 'privacy' ? 'bg-white/3 text-white!' : ''"
                                    )
                                        svg(class="relative size-4 md:size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="M14 18a2 2 0 0 0-4 0")
                                            path(d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11")
                                            path(d="M2 11h20")
                                            circle(cx="17" cy="18" r="3")
                                            circle(cx="7" cy="18" r="3")
                                        span(class="relative hidden md:block") Privacy
                            .btn(
                                @click="tab = 'legal'" 
                                class="group/btn relative"                                
                            )
                                .tab(
                                    class="absolute hidden left-0 top-0 w-1 h-full bg-linear-to-b from-sky-500 to-rose-500 rounded-r"
                                    :class="tab === 'legal' ? 'block!' : ''"
                                )
                                .padding(class="px-4")
                                    .pill(
                                        class="size-7 md:size-auto md:px-3 md:py-2 flex justify-center md:justify-start items-center gap-3 group-hover/btn:text-white rounded-lg cursor-pointer"
                                        :class="tab === 'legal' ? 'bg-white/3 text-white!' : ''"
                                    )
                                        svg(class="relative size-4 md:size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                                            path(d="M12 3v18")
                                            path(d="m19 8 3 8a5 5 0 0 1-6 0zV7")
                                            path(d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1")
                                            path(d="m5 8 3 8a5 5 0 0 1-6 0zV7")
                                            path(d="M7 21h10")
                                        span(class="relative hidden md:block") Legal

                    ScrollAreaRoot(class="flex-1 min-w-0 min-h-0 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-r-xl" type="auto")
                        ScrollAreaViewport(class="h-full")

                            .btns(
                                class="md:hidden flex font-light leading-none bg-linear-to-b to-neutral-950 from-neutral-900"
                                style="box-shadow: 0 2px 0 0 hsl(0 0 0), 0 3px 0 0 hsl(0 0 15)"
                            )
                                .btn(
                                    @click="tab = 'about'" 
                                    class="group/btn relative"                                
                                )
                                    .tab(
                                        class="absolute hidden left-0 bottom-0 w-full h-1 bg-linear-to-r from-sky-500 to-rose-500 rounded-t"
                                        :class="tab === 'about' ? 'block!' : ''"
                                    )
                                    .padding(class="")
                                        .pill(
                                            class="px-4 pt-2 pb-3 flex justify-center items-center"
                                            :class="tab === 'about' ? 'bg-white/3 text-white!' : ''"
                                        )
                                            svg(class="relative size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                                                <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z"/>
                                                <path d="M18 12v.5"/>
                                                <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86"/>
                                                <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33"/>
                                                <path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4"/>
                                                <path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98"/>
                                            span(class="relative hidden md:block") About
                                .btn(
                                    @click="tab = 'privacy'" 
                                    class="group/btn relative"                                
                                )
                                    .tab(
                                        class="absolute hidden left-0 bottom-0 w-full h-1 bg-linear-to-r from-sky-500 to-rose-500 rounded-t"
                                        :class="tab === 'privacy' ? 'block!' : ''"
                                    )
                                    .padding(class="")
                                        .pill(
                                            class="px-4 pt-2 pb-3 flex justify-center items-center"
                                            :class="tab === 'privacy' ? 'bg-white/3 text-white!' : ''"
                                        )
                                            svg(class="relative size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M14 18a2 2 0 0 0-4 0")
                                                path(d="m19 11-2.11-6.657a2 2 0 0 0-2.752-1.148l-1.276.61A2 2 0 0 1 12 4H8.5a2 2 0 0 0-1.925 1.456L5 11")
                                                path(d="M2 11h20")
                                                circle(cx="17" cy="18" r="3")
                                                circle(cx="7" cy="18" r="3")
                                            span(class="relative hidden md:block") Privacy
                                .btn(
                                    @click="tab = 'legal'" 
                                    class="group/btn relative"                                
                                )
                                    .tab(
                                        class="absolute hidden left-0 bottom-0 w-full h-1 bg-linear-to-r from-sky-500 to-rose-500 rounded-t"
                                        :class="tab === 'legal' ? 'block!' : ''"
                                    )
                                    .padding(class="")
                                        .pill(
                                            class="px-4 pt-2 pb-3 flex justify-center items-center"
                                            :class="tab === 'legal' ? 'bg-white/3 text-white!' : ''"
                                        )
                                            svg(class="relative size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round")
                                                path(d="M12 3v18")
                                                path(d="m19 8 3 8a5 5 0 0 1-6 0zV7")
                                                path(d="M3 7h1a17 17 0 0 0 8-2 17 17 0 0 0 8 2h1")
                                                path(d="m5 8 3 8a5 5 0 0 1-6 0zV7")
                                                path(d="M7 21h10")
                                            span(class="relative hidden md:block") Legal

                            .grid(class="px-6 py-6 grid-cols-[minmax(0,1fr)]")
                                Motion(
                                    class="col-start-1 row-start-1"
                                    :animate="{ opacity: tab === 'about' ? 1 : 0, visibility: tab === 'about' ? 'visible' : 'hidden' }" 
                                    :style="{ pointerEvents: tab === 'about' ? 'auto' : 'none' }"
                                    :transition="{ duration: 0.2 }"
                                )
                                    .header(class="flex flex-col gap-4 text-left leading-none")
                                        .title(class="text-white text-5 font-light") Yo! ✌️
                                    .divider-dark(class="mt-5 w-full h-0.5 bg-black")
                                    .divider-light(class="w-full h-px bg-white/8")
                                    .settings(class="mt-5")

                                        .section(class="prose text-text text-3.5! font-light")
                                            p(class="mt-0")  I'm Ben! This is an independent, community-driven project and is not affiliated with, endorsed by, sponsored by, or connected to any publisher or intellectual property owner.
                                            p For inquiries, email: <a target="_blank" class="text-sky-500 font-light hover:text-sky-500" href="mailto:ben@cardcarp.com">ben@cardcarp.com</a>. 
                                            p Updates are posted on my <a target="_blank" href="https://buymeacoffee.com/benjamelon" class="text-fuchsia-500 font-light hover:text-fuchsia-500">buymeacoffee</a>.
                                            p Otherwise, I hope you enjoy!
                                            p(class="mt-6 mb-4 flex items-center gap-2") <span class="relative text-3">🍉</span> Ben

                                Motion(
                                    class="col-start-1 row-start-1"
                                    :animate="{ opacity: tab === 'privacy' ? 1 : 0, visibility: tab === 'privacy' ? 'visible' : 'hidden' }" 
                                    :style="{ pointerEvents: tab === 'privacy' ? 'auto' : 'none' }"
                                    :transition="{ duration: 0.2 }"
                                )
                                    .header(class="flex flex-col gap-4 text-left leading-none")
                                        .title(class="text-white text-5 font-light") Privacy
                                    .divider-dark(class="mt-5 w-full h-0.5 bg-black")
                                    .divider-light(class="w-full h-px bg-white/8")
                                    .settings(class="mt-5")

                                        .section(class="text-3 font-mono font-light *:mb-6")
                                            p This site is a landing page and documentation, nothing more. There are no accounts and no profiles here, nothing to sign into, and nothing about you stored in your browser.
                                            p I do count page visits to see which tools people are reading about, so I know where to spend my time. That is counted at the server, from requests Cloudflare already handles. No cookies, no fingerprinting, no cross-site tracking. I only ever see totals, never individual people or sessions.
                                            p The game sites are separate. Decks, collections, and settings live in your browser's local storage on that game's own subdomain. You can export or wipe that data from the Profile menu on each of those sites.
                                            p Each game site does have a simulator which has a multiplayer relay. While I do not see this relay data, Cloudflare does, to some trivial extent.


                                Motion(
                                    class="col-start-1 row-start-1"
                                    :animate="{ opacity: tab === 'legal' ? 1 : 0, visibility: tab === 'legal' ? 'visible' : 'hidden' }" 
                                    :style="{ pointerEvents: tab === 'legal' ? 'auto' : 'none' }"
                                    :transition="{ duration: 0.2 }"
                                )
                                    .header(class="flex flex-col gap-4 text-left leading-none")
                                        .title(class="text-white text-5 font-light") Legal
                                    .divider-dark(class="mt-5 w-full h-0.5 bg-black")
                                    .divider-light(class="w-full h-px bg-white/8")
                                    .settings(class="mt-5")

                                        .section(class="text-3 font-mono font-light *:mb-6")
                                            p Card data and images are strictly for educational study, historical preservation, and personal, non-commercial use.
                                            p All trademarks, copyrights, and artwork remain the exclusive property of their respective rights holders. 
                                            p No challenge to any intellectual property rights is intended, nor is there intent to compete with sales or commercial distributions of these intellectual properties.

                        ScrollAreaScrollbar(orientation="vertical" class="flex select-none touch-none p-0.5 z-90 bg-transparent w-2.5")
                            ScrollAreaThumb(class="flex-1 bg-white/10 rounded-full relative")
</template>