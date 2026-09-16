<script setup>
// One featured/collection tile — thumb, title, detail, hover arrow. Shared by
// the landing page and the collection lists.
//
// Where it points comes in from view/home/sources.js: `to` for an internal
// route, `href` for an off-site project — which renders an <a> instead of a
// <router-link>.
//
// There is no default target any more. This used to fall back to a game's
// builder mounted on this site, and there is no such route: a game is its own
// project on its own domain. An item with neither `to` nor `href` — a project
// with no `site` in the list yet — renders as an inert <div> rather than as a
// link into nothing, so an incomplete entry looks unfinished instead of broken.
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
    game: { type: Object, required: true },   // { name, detail, icon, thumb }
    to: { type: Object, default: null },      // internal route target
    href: { type: String, default: '' }       // external URL → renders an <a>
})

// Only bind the attributes that belong to the chosen element — passing a stray
// `href` onto <router-link> would override its own resolved href and break it.
const tag = computed(() => {
    if (props.href) return 'a'
    return props.to ? RouterLink : 'div'
})

const attrs = computed(() => {
    if (props.href) return { href: props.href, target: '_blank', rel: 'noopener noreferrer' }
    return props.to ? { to: props.to } : {}
})
</script>

<template lang="pug">
component(
    :is="tag"
    v-bind="attrs"
    class="group/btn relative block rounded-lg overflow-hidden transition-all duration-500 hover:-translate-y-1"
    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0px 2px 3px hsl(0 0% 0% / 0.04), 0px 4px 5px hsl(0 0% 0% / 0.08), 0px 7px 8px hsl(0 0% 0% / 0.12), 0px 10px 10px hsl(0 0% 0% / 0.16), 0px 12px 12px hsl(0 0% 0% / 0.20)"
)
    .thumb(class="aspect-video bg-black")
        img(class="size-full object-cover transition-all group-hover/btn:brightness-110" :src="game.thumb")
    .text(class="relative px-3 py-4 flex items-center gap-3 bg-linear-to-tr from-neutral-950/90 to-neutral-900/90 overflow-hidden")
        img(class="absolute right-0 h-32 opacity-2" :src="game.icon")
        .text(class="pr-10 w-full flex flex-col gap-1.5 leading-none whitespace-nowrap ")
            .title(class="grow text-3 xl:text-4 text-white font-light truncate") {{ game.name }}
            .ver(class="text-2.75 xl:text-3.5 font-light opacity-50 truncate") {{ game.detail }}
        .arrow(class="absolute right-0 bottom-0 size-10 flex items-center justify-center text-yellow-600 text-center leading-none bg-black rounded-tl-2xl rounded-br-lg px-2 py-1")
            svg(class="size-5 text-white opacity-50 group-hover/btn:opacity-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                path(d="M7 7h10v10")
                path(d="M7 17 17 7")
</template>
