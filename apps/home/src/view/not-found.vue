<script setup>
defineProps({
    code: { type: String, default: '404' },
    message: { type: String, default: '' },
    back: { type: String, default: '' },
    backLabel: { type: String, default: '' }
})
</script>

<template lang="pug">
.not-found(
    class="relative flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center gap-6 px-6 py-20 text-center z-10 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl overflow-hidden"
    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
)
    .code(class="text-white/90 text-7xl sm:text-8xl font-light font-stretch-expanded leading-none") {{ code }}

    .message(v-if="message" class="max-w-130 text-4 text-neutral-400 font-light leading-relaxed") {{ message }}

    .message(v-else class="max-w-130 text-4 text-neutral-400 font-light leading-relaxed")
        | Check the URL, or head for the
        |
        a(href="/deckbox" class="text-mist-500 hover:underline") Deckbox
        |
        | docs, the
        |
        a(href="/simulator" class="text-mist-500 hover:underline") Simulator
        |
        | docs, or browse
        |
        a(href="/examples" class="text-mist-500 hover:underline") Examples
        | .

    a(
        v-if="back"
        :href="back"
        class="group/btn mt-2 px-4 py-2.5 inline-flex items-center gap-1.5 text-3.5 text-neutral-400 font-light bg-black/30 rounded-lg leading-none hover:text-white hover:brightness-125"
        style="box-shadow: inset 0 0 0 1px hsl(0 0 100 / 0.04)"
    )
        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
            path(d="m12 19-7-7 7-7")
            path(d="M19 12H5")
        span {{ backLabel }}
</template>
