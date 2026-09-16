<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'bundled-not-fetched', name: 'Bundled, not fetched' },
    { id: 'card-art', name: 'Card art' },
    { id: 'table-textures', name: 'Table textures' }
]
</script>

<script setup>
// /simulator/configuration
import CodeBlock from '@/part/code-block.vue'

const layout = `
// src/simulator/config.js — one module, a comment block per part
export default {
    game,        // name, dataset, card — required
    deck,        // the deck vocabulary — absent = no decks
    simulator,   // the table — absent = no table
}
`

const surface = `
table: {
    surface: {
        color: '#1a1a1a',
        img: 'bg-table',
        scale: 0.5,
        tint: '#6b5f52',
        alpha: 0.5,
    },
},
`

const has = `
import { hasSimulator } from '@cardcarp/simulator'

// Asked of a config, not of a game name: the host holds the registry.
const links = computed(() => [
    hasSimulator(config.value) && { to: '/', label: 'Table' },
].filter(Boolean))
`
</script>

<template lang="pug">
.page
    p A game's config has three parts, merged by core into one #[span(class="font-mono text-neutral-300") config] object. #[span(class="font-mono text-neutral-300") simulator] is the table's, and it is optional by design — its absence is how a project says this instance has no table at all. The form the parts take is the app's business, since core is only handed the object: #[span(class="font-mono text-neutral-300") apps/ptcg] writes all three in one module, #[span(class="font-mono text-neutral-300") src/simulator/config.js], with the reasons beside the values, and a host with several games can glob a folder of JSON per game with #[span(class="font-mono text-neutral-300") gameConfigsFromGlob]. Either way it stays plain data: parts of it travel to the room inside node payloads.

    CodeBlock(:code="layout" label="config")

    p The parts are named for what they describe rather than for the app that reads them, and the table is the reason that distinction earns its keep: it reads #[span(class="font-mono text-neutral-300") card.size] out of #[span(class="font-mono text-neutral-300") game] to derive a card's world size, and #[span(class="font-mono text-neutral-300") filter] out of #[span(class="font-mono text-neutral-300") deck] for its toolbar's format and theme facets. A part called #[span(class="font-mono text-neutral-300") deckbox] would be a name that lies to the simulator reading it.

    CodeBlock(:code="has" label="app.vue")

    h2#bundled-not-fetched Bundled, not fetched
    p Config ships with the app. The archives — #[span(class="font-mono text-neutral-300") sets.json] and #[span(class="font-mono text-neutral-300") manifest.json], the latter up to about 25 MB — are fetched at runtime from wherever your CDN base points. The split is by what each thing is rather than by size: a config is the other half of a contract the code defines, and keeping it in the repo is what stops a schema change and its instances drifting apart silently.

    h2#card-art Card art
    p Art URLs are derived from the config, which is the last cardcarp-specific thing a host has to supply and the reason a third party's game works here at all. The host it points at must allow cross-origin reads — Pixi's worker fetch and its WebGL texture upload both refuse an opaque response, even where a plain #[span(class="font-mono text-neutral-300") &lt;img&gt;] would have loaded it happily. A bucket whose CORS allowlist covers your production origin but not your development one is the common shape of this. cardcarp's names both, so development reads the bucket exactly as production does — and a missing origin shows up before a deploy rather than after it.

    h2#table-textures Table textures
    p The table's surface can wear a texture. Its #[span(class="font-mono text-neutral-300") img] is either a bucket path — anything with a slash in it, like #[span(class="font-mono text-neutral-300") game/wow/asset/felt] — or a bare name, which is looked up among the textures the app named with #[span(class="font-mono text-neutral-300") table.setArt({ surfaces })]. The simulator ships no texture of its own, so a name nobody passed falls back to the flat table colour and says so in the console.

    CodeBlock(:code="surface" label="config.js — simulator")
</template>
