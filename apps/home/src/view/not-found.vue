<script setup>
// The miss. Rendered by the catch-all route, and by the doc shell when a slug
// resolves to no page in its tree — one design for "there is nothing here",
// rather than one per place that can discover it.
//
// It renders INSIDE the home shell, so the sidebar is still there and every
// real destination is one click away. That is the point of doing this as a
// route rather than as a bare page: the fastest recovery from a wrong URL is
// the navigation you already had.
//
// A caller that knows more says more. The catch-all knows only that the path
// matched nothing; the doc shell knows which tree was being read and can offer
// its way back, which is what `message` and `back` are for.
//
// Unlike every other route's view this is a plain panel rather than a
// ScrollArea. It holds two lines and a link, so it never scrolls — and the
// scroll shell actively fights it: Reka lays its viewport's content out as a
// table, which is what `min-h-full` needs a normal block parent to resolve
// against, so vertical centring inside one silently does nothing.
//
// Note this is a 404 in the UI only. The Worker serves the SPA with
// `not_found_handling: single-page-application` (see wrangler.jsonc), so the
// response carrying this page is a 200 — the router is what decides the path
// was a miss, and it does that after the bytes have shipped. Fine for a human;
// worth knowing before you point anything that reads status codes at it.

defineProps({
    // The numeral. A prop because the doc shell may one day want to say
    // something other than 404 with the same layout.
    code: { type: String, default: '404' },

    // Replaces the default recovery sentence when a caller knows what was
    // actually missed. The default sentence carries its own links, so a caller
    // that overrides it should offer `back` as the way out.
    message: { type: String, default: '' },

    // An optional route target rendered under the message — the specific way
    // back, beside the general ones.
    back: { type: Object, default: null },
    backLabel: { type: String, default: '' }
})
</script>

<template lang="pug">
//- `min-w-0` beside the `min-h-0`, matching every other route's shell: this is a
//- flex item in the home shell's row, so its automatic minimum is its CONTENT's
//- minimum rather than zero.
.not-found(
    class="relative flex-1 min-w-0 min-h-0 flex flex-col items-center justify-center gap-6 px-6 py-20 text-center z-10 bg-linear-to-br to-neutral-950 from-neutral-900 rounded-xl overflow-hidden"
    style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0), 0.3px 0.5px 0.9px hsl(0 0 0 / 0), 2px 4px 6.7px hsl(0 0 0 / 0.02), 3.5px 7px 11.7px hsl(0 0 0 / 0.04), 5.1px 10.2px 17.1px hsl(0 0 0 / 0.06), 7.1px 14.2px 23.8px hsl(0 0 0 / 0.07), 9.8px 19.6px 32.9px hsl(0 0 0 / 0.09), 13.6px 27.2px 45.6px hsl(0 0 0 / 0.11), 18.8px 37.5px 62.9px hsl(0 0 0 / 0.13)"
)
    //- Tailwind's own scale, not the site's `text-<n>` one — that is defined up
    //- to --text-10 (2.5rem) and a larger step emits no rule at all rather than
    //- erroring, which reads as the numeral simply not being styled.
    .code(class="text-white/90 text-7xl sm:text-8xl font-light font-stretch-expanded leading-none") {{ code }}

    .message(v-if="message" class="max-w-130 text-4 text-neutral-400 font-light leading-relaxed") {{ message }}

    //- The default sentence puts the site's real destinations inline, the way the
    //- reference does — a wrong URL is usually a near miss for one of three
    //- places, and naming them beats a lone "go home".
    .message(v-else class="max-w-130 text-4 text-neutral-400 font-light leading-relaxed")
        | Check the URL, or head for the
        |
        router-link(:to="{ name: 'deckbox' }" class="text-mist-500 hover:underline") Deckbox
        |
        | docs, the
        |
        router-link(:to="{ name: 'simulator' }" class="text-mist-500 hover:underline") Simulator
        |
        | docs, or browse
        |
        router-link(:to="{ name: 'examples' }" class="text-mist-500 hover:underline") Examples
        | .

    router-link(
        v-if="back"
        :to="back"
        class="group/btn mt-2 px-4 py-2.5 inline-flex items-center gap-1.5 text-3.5 text-neutral-400 font-light bg-black/30 rounded-lg leading-none hover:text-white hover:brightness-125"
        style="box-shadow: inset 0 0 0 1px hsl(0 0 100 / 0.04)"
    )
        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
            path(d="m12 19-7-7 7-7")
            path(d="M19 12H5")
        span {{ backLabel }}
</template>
