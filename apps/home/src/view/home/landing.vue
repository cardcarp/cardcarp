<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

import { Motion } from "motion-v"

// UI
import {
    ScrollAreaRoot,
    ScrollAreaScrollbar,
    ScrollAreaThumb,
    ScrollAreaViewport
} from 'reka-ui'

import Card from './card.vue'
import { pick, linkProps } from './sources.js'

// State
import { useProfileStore } from '@cardcarp/core/store/profile.js'

// Assign
const { dialog_about_active } = useProfileStore()

const featured = pick([
    'mtg',
    'ptcg',
    'wow',
    'naruto-card-game'
])


const videoDiceSource = ref('')
const videoCardSource = ref('')

function setTransparentVideoSource() {
  const isAppleWebKit =
    /Safari/i.test(navigator.userAgent) &&
    !/Chrome|Android|Edg/i.test(navigator.userAgent)

    videoDiceSource.value = isAppleWebKit
    ? 'https://storage.cardcarp.com/site/image/home-hero-dice.mp4'
    : 'https://storage.cardcarp.com/site/image/home-hero-dice.webm'

    videoCardSource.value = isAppleWebKit
    ? 'https://storage.cardcarp.com/site/image/home-hero-card.mp4'
    : 'https://storage.cardcarp.com/site/image/home-hero-card.webm'
}

const sliderContainer = ref(null)
const sliderTrack = ref(null)
const maxPan = ref(0)

const slide_list = [
    {
        link: "https://ptcg.cardcarp.com",
        thumb: "https://storage.cardcarp.com/game/ptcg/asset/preview.avif"
    },
    {
        link: "https://wow.cardcarp.com",
        thumb: "https://storage.cardcarp.com/game/wow/asset/preview.avif"
    },
    {
        link: "https://ptcg.cardcarp.com",
        thumb: "https://storage.cardcarp.com/game/ptcg/asset/preview.avif"
    },
    {
        link: "https://wow.cardcarp.com",
        thumb: "https://storage.cardcarp.com/game/wow/asset/preview.avif"
    },
    {
        link: "https://ptcg.cardcarp.com",
        thumb: "https://storage.cardcarp.com/game/ptcg/asset/preview.avif"
    },
    {
        link: "https://wow.cardcarp.com",
        thumb: "https://storage.cardcarp.com/game/wow/asset/preview.avif"
    }
]

function updatePan() {
  const trackEl = sliderTrack.value?.$el || sliderTrack.value
  const containerEl = sliderContainer.value
  if (trackEl && containerEl) {
    const distance = trackEl.scrollWidth - containerEl.clientWidth
    maxPan.value = distance > 0 ? -distance : 0
  }
}

onMounted(async function () {
  setTransparentVideoSource()
  await nextTick()
  updatePan()
  window.addEventListener('resize', updatePan)
})

onUnmounted(function () {
  window.removeEventListener('resize', updatePan)
})

</script>

<template lang="pug">
ScrollAreaRoot(
    class="group/scroll relative flex-1 min-w-0 min-h-0 flex flex-col z-10 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl overflow-hidden"
    type="auto"
    style="--reka-scroll-area-thumb-width: 4px; box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
)
    ScrollAreaViewport(class="relative flex-1 min-h-0 w-full")

        .blur-wrapper(class="absolute inset-0 pointer-events-none z-50")
            .blur(class="sticky top-0 w-full h-10 backdrop-blur-3xl mask-b-from-0")

        .bg(class="absolute w-full h-100 mask-b-from-5% opacity-5 lg:opacity-50")
            video(
                class="absolute top-2 md:top-10 left-2 md:left-10 size-20 sm:size-30 lg:size-40" 
                :src="videoDiceSource"
                autoplay
                loop
                muted
                playsinline
            )

            video(
                class="absolute -top-20 -right-50 md:-top-12 md:-right-30 lg:-top-30 lg:-right-80 size-100 sm:size-130 lg:size-200" 
                :src="videoCardSource"
                autoplay
                loop
                muted
                playsinline
            )

        .lead(class="relative pt-8 xl:pt-18 px-4")
            .title(class="mx-auto max-w-100 lg:max-w-120 xl:max-w-180 text-xl lg:text-2xl xl:text-4xl text-center font-black font-stretch-expanded bg-clip-text text-transparent leading-snug bg-linear-to-br from-sky-500 to-rose-500") Open-Source Tools to Bring Tabletop Games Online
            .subtitle(class="hidden md:block mt-4 mx-auto text-mauve-500 text-center text-sm lg:text-base xl:text-lg font-extralight") v0.1.0 released on September 18, 2026

        .section(class="")
            .slider-container(
                ref="sliderContainer"
                class="relative flex flex-col gap-8 w-screen overflow-hidden left-1/2 -translate-x-1/2"
            )
                .slider-track(
                    ref="sliderTrack"
                    class="relative py-10 xl:py-18 flex gap-8 w-max hover:[animation-play-state:paused]"
                    :style="{ '--pan-distance': `${maxPan}px` }"
                )
                    a(
                        v-for="item in slide_list"
                        :href="item.link"
                        target="_blank"
                        class="w-80 sm:w-96 md:w-120 aspect-video shrink-0 bg-cover rounded hover:-translate-y-4 transition-transform"
                        style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0px 2px 3px hsl(0 0% 0% / 0.04), 0px 4px 5px hsl(0 0% 0% / 0.08), 0px 7px 8px hsl(0 0% 0% / 0.12), 0px 10px 10px hsl(0 0% 0% / 0.16), 0px 12px 12px hsl(0 0% 0% / 0.20)"
                        :style="{ backgroundImage: `url(${item.thumb})`}" 
                    )

        .section(class="px-10")
            .lead(class="mx-auto max-w-160 flex justify-center text-white text-5xl text-center font-normal font-stretch-50% leading-snug")
                .group(class="relative") 
                    .title(class="text-white") Compile
                    .icon(class="absolute top-0 -right-4")
                        svg(class="relative size-6 text-mist-500 mask-b-from-50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M18 19a5 5 0 0 1-5-5v8")
                            path(d="M9 20H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H20a2 2 0 0 1 2 2v5")
                            circle(cx="13" cy="12" r="2")
                            circle(cx="20" cy="19" r="2")

            .subtitle(class="mx-auto max-w-100 text-neutral-500 text-center text-balance text-base font-light") CLI tool to transform, split, and structure card data for web performance.
            
            .cta(class="mx-auto mt-4 text-center")
                a(
                    href="/compile"
                    class="px-2.5 py-1 bg-linear-to-br from-mist-900 to-mist-950 text-mist-300 text-2.75 xl:text-3 hover:brightness-110 leading-none rounded-full"
                    style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0 / .5)"
                ) Documentation

        .section(class="px-10 mt-10 md:mt-20")
            .lead(class="mx-auto max-w-160 flex justify-center text-white text-5xl text-center font-normal font-stretch-50% leading-snug")
                .group(class="relative") 
                    .title(class="text-white") Deckbox
                    .icon(class="absolute top-0 -right-4")
                        svg(class="relative size-6 text-sky-500 mask-b-from-50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M10 22V7a1 1 0 0 0-1-1H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5a1 1 0 0 0-1-1H2")
                            rect(x="14" y="2" width="8" height="8" rx="1")

            .subtitle(class="mx-auto max-w-100 text-neutral-500 text-center text-balance text-base font-light") Browse, search, filter, collect, analysis, print, and export card collections.
            
            .cta(class="mx-auto mt-4 text-center")
                a(
                    href="/deckbox"
                    class="px-2.5 py-1 bg-linear-to-br from-sky-900 to-sky-950 text-sky-400 text-2.75 xl:text-3 hover:brightness-110 leading-none rounded-full"
                    style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0 / .5)"
                ) Documentation

        .section(class="mt-10 md:mt-20")
            .lead(class="mx-auto max-w-160 flex justify-center text-white text-5xl text-center font-normal font-stretch-50% leading-snug")
                .group(class="relative") 
                    .title(class="text-white") Simulator
                    .icon(class="absolute top-0 -right-4")
                        svg(class="relative size-6 text-rose-500 mask-b-from-50%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M12.034 12.681a.498.498 0 0 1 .647-.647l9 3.5a.5.5 0 0 1-.033.943l-3.444 1.068a1 1 0 0 0-.66.66l-1.067 3.443a.5.5 0 0 1-.943.033z")
                            path(d="M5 3a2 2 0 0 0-2 2")
                            path(d="M19 3a2 2 0 0 1 2 2")
                            path(d="M5 21a2 2 0 0 1-2-2")
                            path(d="M9 3h1")
                            path(d="M9 21h2")
                            path(d="M14 3h1")
                            path(d="M3 9v1")
                            path(d="M21 9v2")
                            path(d="M3 14v1")
                
            .subtitle(class="mx-auto max-w-100 text-neutral-500 text-center text-balance text-base font-light") Drag, drop, flip, shuffle, stack, and layout interactive card games on WebGL.
            
            .cta(class="mx-auto mt-4 text-center")
                a(
                    href="/simulator"
                    class="px-2.5 py-1 bg-linear-to-br from-rose-900 to-rose-950 text-rose-400 text-2.75 xl:text-3 hover:brightness-110 leading-none rounded-full"
                    style="box-shadow: inset 0 1px 1px 0 hsl(0 0 100 / .1), 0 2px 2px 0 hsl(0 0 0 / .5)"
                ) Documentation

        .dividers(class="mt-12 md:mt-20 px-6 flex items-center justify-center gap-4")
            .left(class="flex-1")
                .divider-dark(class="w-full h-0.5 bg-black")
                .divider-light(class="w-full h-px bg-white/5")
            .center()
                svg(class="w-20 text-white opacity-5" viewBox="0 0 300 35" fill="currentColor")
                    path(d="M19.7457 34.1963C9.64055 34.1963 0.0500488 29.7519 0.0500488 17.5759C0.0500488 7.29817 7.76923 0.909283 19.2311 0.909283C30.0379 0.909283 37.0086 6.51114 38.3653 14.2426C27.9327 14.9371 24.2836 15.0297 24.2836 15.0297C23.6287 12.2519 21.9912 9.98336 19.2311 9.98336C15.582 9.98336 13.851 13.1778 13.851 17.4834C13.851 21.65 15.9095 24.8445 19.3714 24.8445C22.4123 24.8445 24.19 23.1315 24.7514 19.2889C34.108 19.613 38.8799 20.0297 38.8799 20.0297C38.2717 28.5482 30.88 34.1963 19.7457 34.1963Z")
                    path(d="M38.222 32.6685C38.222 32.6685 42.1986 18.5945 47.485 1.27965C57.2159 1.04817 67.1339 1.04817 67.1339 1.04817C67.1339 1.04817 71.3911 15.9093 76.163 34.3815C76.163 34.3815 67.976 34.2889 62.5491 34.3815C62.5491 34.3815 62.1749 32.6222 61.4731 29.4278C59.2275 29.3815 56.0931 29.3352 51.9294 29.3352L51.2277 32.7148C51.2277 32.7148 43.1342 32.5759 38.222 32.6685ZM56.6545 8.40928C56.0931 10.6778 55.0639 15.0759 53.8007 20.6778C55.251 20.7241 57.0755 20.7241 59.555 20.7241C58.7129 17.2056 57.7773 13.0389 56.6545 8.40928Z")
                    path(d="M99.2993 34.613C99.2993 34.613 97.2409 31.0019 93.6386 25.0297C92.5626 25.0759 91.4398 25.0759 90.317 25.0759C90.317 27.4834 90.4106 30.4463 90.4574 33.4556C90.4574 33.4556 83.0189 33.363 78.0131 33.5019C78.0131 33.5019 78.247 21.6037 78.2002 2.11299C83.4867 0.955581 88.3053 0.400024 92.5626 0.400024C104.445 0.400024 111.978 5.12225 111.931 12.9926C111.884 17.9926 109.498 21.0482 105.662 22.8074C107.252 25.2611 109.404 28.5019 112.445 32.9C112.445 32.9 106.738 33.5019 99.2993 34.613ZM90.1767 17.0204C91.2527 17.1593 92.2819 17.2056 93.2176 17.2056C97.1005 17.2056 99.7204 16.0945 99.7204 13.2241C99.7204 11.0019 97.8023 9.24262 93.8725 9.24262C92.7965 9.24262 91.5334 9.3815 90.1299 9.70558C90.2234 14.5667 90.1767 17.0204 90.1767 17.0204Z")
                    path(d="M127.199 24.8445C127.199 24.8445 128.041 24.8908 128.462 24.8908C133.983 24.8908 136.977 22.5297 136.977 17.4834C136.977 13.1778 134.778 10.2611 129.024 10.2611C128.369 10.2611 127.667 10.2611 126.918 10.3537C127.012 20.9093 127.199 24.8445 127.199 24.8445ZM114.334 33.7334C114.568 11.1408 114.381 1.9741 114.381 1.9741C119.246 1.23336 123.644 0.816691 127.573 0.816691C142.918 0.816691 150.684 6.51114 150.684 17.5297C150.684 28.9185 142.076 34.3815 125.234 34.3815C121.913 34.3815 118.264 34.15 114.334 33.7334Z")
                    path(d="M172.247 33.9185C161.16 33.9185 152.551 29.0111 152.551 17.8537C152.551 7.94632 160.271 1.74262 171.732 1.74262C182.539 1.74262 189.51 7.15928 190.867 14.8908C181.042 14.6593 176.504 14.8445 176.504 14.8445C175.943 12.5297 174.493 10.8167 171.732 10.8167C168.224 10.8167 166.352 13.5945 166.352 17.7611C166.352 22.2056 168.879 24.5667 171.873 24.5667C174.493 24.5667 176.738 23.0852 177.206 19.8445C186.703 19.8445 191.428 19.5667 191.428 19.5667C190.82 28.0852 183.381 33.9185 172.247 33.9185Z")
                    path(d="M190.769 33.4556C190.769 33.4556 194.98 19.4741 200.266 2.15928C209.997 1.9278 219.915 1.9278 219.915 1.9278C219.915 1.9278 223.377 14.613 228.757 33.0852C228.757 33.0852 220.57 32.9926 215.143 33.0852C215.143 33.0852 214.862 32.0204 214.394 29.8908C212.102 29.8445 208.874 29.7982 204.57 29.7982L203.775 33.5019C203.775 33.5019 195.681 33.363 190.769 33.4556ZM209.436 9.24262C208.874 11.4648 207.798 15.7241 206.535 21.1408C207.985 21.1871 209.81 21.1871 212.289 21.1871L209.436 9.24262Z")
                    path(d="M252.407 35.4C252.407 35.4 250.114 31.3722 246.512 25.4463C245.343 25.4926 244.126 25.4926 242.91 25.4926C242.91 28.1315 243.003 31.2334 243.05 34.2889C243.05 34.2889 235.612 34.1963 230.606 34.3352C230.606 34.3352 230.84 22.2056 230.793 2.71484C235.892 1.9741 240.384 1.65002 244.313 1.65002C258.161 1.65002 264.57 6.09447 264.57 13.6871C264.57 18.0389 262.372 21.0482 258.395 22.9926C259.939 25.4 262.044 28.5482 264.991 32.8537C264.991 32.8537 259.798 33.8722 252.407 35.4ZM242.769 17.4834C243.612 17.5297 244.407 17.5759 245.155 17.5759C250.161 17.5759 252.313 16.2797 252.313 13.4556C252.313 11.3259 250.863 9.4741 245.857 9.4741C244.921 9.4741 243.892 9.56669 242.723 9.70558C242.816 14.5667 242.769 17.4834 242.769 17.4834Z")
                    path(d="M266.881 33.5482C266.881 33.5482 267.115 21.8352 267.068 2.39076C271.7 1.65002 275.957 1.23336 279.793 1.23336C292.471 1.23336 300.05 5.16854 300.05 14.3815C300.05 23.9185 292.144 27.0667 282.927 27.0667C281.851 27.0667 280.822 27.0667 279.746 26.9741L279.887 33.5019C279.887 33.5019 271.887 33.4556 266.881 33.5482ZM279.559 10.1685C279.559 10.1685 279.512 12.7148 279.606 18.7334C280.354 18.8259 281.056 18.8259 281.711 18.8259C285.547 18.8259 287.699 17.2982 287.699 14.1963C287.699 11.6963 285.922 9.98336 282.179 9.98336C281.384 9.98336 280.495 10.0297 279.559 10.1685Z")
            .right(class="flex-1")
                .divider-dark(class="w-full h-0.5 bg-black")
                .divider-light(class="w-full h-px bg-white/5")

        .section(class="mt-10 pb-10 px-6")
            svg(class="mx-auto text-yellow-500" width="21" height="44" viewBox="0 0 21 39" fill="currentColor" xmlns="http://www.w3.org/2000/svg")
                g(opacity="1.0" class="fill-rose-500")
                    circle(cx="10.5" cy="39" r="1.5")
                    circle(cx="7.5" cy="35.5" r="1.5")
                    circle(cx="4.5" cy="32.5" r="1.5")
                    circle(cx="1.5" cy="29.5" r="1.5")
                    circle(cx="16.5" cy="32.5" r="1.5")
                    circle(cx="19.5" cy="29.5" r="1.5")
                    circle(cx="13.5" cy="35.5" r="1.5")
                g(opacity="0.8" class="fill-fuchsia-500")
                    circle(cx="10.5" cy="31.5" r="1.5")
                    circle(cx="7.5" cy="28.5" r="1.5")
                    circle(cx="4.5" cy="25.5" r="1.5")
                    circle(cx="1.5" cy="22.5" r="1.5")
                    circle(cx="13.5" cy="28.5" r="1.5")
                    circle(cx="16.5" cy="25.5" r="1.5")
                    circle(cx="19.5" cy="22.5" r="1.5")
                g(opacity="0.6" class="fill-violet-500")
                    circle(cx="10.5" cy="24.5" r="1.5")
                    circle(cx="7.5" cy="21.5" r="1.5")
                    circle(cx="4.5" cy="18.5" r="1.5")
                    circle(cx="1.5" cy="15.5" r="1.5")
                    circle(cx="13.5" cy="21.5" r="1.5")
                    circle(cx="16.5" cy="18.5" r="1.5")
                    circle(cx="19.5" cy="15.5" r="1.5")
                g(opacity="0.4" class="fill-blue-500")
                    circle(cx="10.5" cy="17.5" r="1.5")
                    circle(cx="7.5" cy="14.5" r="1.5")
                    circle(cx="4.5" cy="11.5" r="1.5")
                    circle(cx="1.5" cy="8.5" r="1.5")
                    circle(cx="13.5" cy="14.5" r="1.5")
                    circle(cx="16.5" cy="11.5" r="1.5")
                    circle(cx="19.5" cy="8.5" r="1.5")
                g(opacity="0.2" class="fill-sky-500")
                    circle(cx="10.5" cy="10.5" r="1.5")
                    circle(cx="7.5" cy="7.5" r="1.5")
                    circle(cx="4.5" cy="4.5" r="1.5")
                    circle(cx="1.5" cy="1.5" r="1.5")
                    circle(cx="13.5" cy="7.5" r="1.5")
                    circle(cx="16.5" cy="4.5" r="1.5")
                    circle(cx="19.5" cy="1.5" r="1.5")
            .lead(class="pt-6")
                .title(class="mx-auto max-w-160 text-white text-xl lg:text-2xl xl:text-4xl text-center font-normal font-stretch-50% leading-snug") Oye!
                .subtitle(class="mt-3 mx-auto max-w-90 text-neutral-500 text-center text-3.25 font-light") This is an independent, community-driven project and is not affiliated with, endorsed by, sponsored by, or connected to any publisher or intellectual property owner.
            
            .cta(class="group/textarea mx-auto mt-6 max-w-50 flex flex-col gap-2")
                .btn(
                    @click="dialog_about_active = true"
                    class="relative px-4 w-full h-8.5 flex items-center justify-center gap-1.5 text-3.75 text-white bg-linear-to-br from-sky-500 to-violet-500 rounded hover:brightness-110 cursor-pointer"
                    style="box-shadow: inset 0 1px 2px 0 hsl(0 0 100 / .5), 0 2px 2px 0 hsl(0 0 0)"
                )
                    .text(class="") About

                a(
                    href="https://chat.cardcarp.com"
                    target="_blank"
                    class="relative px-4 w-full h-8.5 flex items-center justify-center gap-1.5 text-3.75 text-white bg-linear-to-br from-slate-800 to-zinc-500 rounded hover:brightness-110"
                    style="box-shadow: inset 0 1px 2px 0 hsl(0 0 100 / .2), 0 2px 2px 0 hsl(0 0 0)"
                )
                    .text(class="") Discord

                a(
                    href="https://patronage.cardcarp.com"
                    target="_blank"
                    class="relative px-4 w-full h-8.5 flex items-center justify-center gap-1.5 text-3.75 text-white bg-linear-to-br from-fuchsia-700 to-rose-700 rounded hover:brightness-110"
                    style="box-shadow: inset 0 1px 2px 0 hsl(0 0 100 / .5), 0 2px 2px 0 hsl(0 0 0)"
                )
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        path(d="M10 2v2")
                        path(d="M14 2v2")
                        path(d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1")
                        path(d="M6 2v2")
                    .text(class="") Patronage

    ScrollAreaScrollbar(
        orientation="vertical"
        class="absolute flex pr-1 py-2 select-none touch-none rounded-full z-51"
    )
        ScrollAreaThumb(class="flex-1 bg-white/30 rounded hover:bg-white")
</template>

<style scoped>
    .slider-track {
        animation: pan 100s linear infinite alternate;
        will-change: transform;
    }
    @keyframes pan {
        from {
            transform: translateX(0);
        }
        to {
            transform: translateX(var(--pan-distance, 0px));
        }
    }
</style>