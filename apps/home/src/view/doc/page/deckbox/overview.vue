<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'what-it-is-not', name: 'What it is not' },
    { id: 'where-it-sits', name: 'Where it sits' }
]
</script>

<script setup>
// /deckbox — the index page of the deckbox tree.
import CodeBlock from '@/part/code-block.vue'

const usage = `
import { Deckbox } from '@cardcarp/deckbox'

// A route component. It reads the loaded game out of @cardcarp/core's
// store, so it takes no props.
{ path: '/deckbox', name: 'deckbox', component: Deckbox }
`
</script>

<template lang="pug">
.page
    p #[span(class="font-mono text-neutral-300") @cardcarp/deckbox] is the card half of the toolkit: an archive you can search and filter, a deck you can edit beside it, and export to print, PDF or file. It ships as one Vue route component and installs on its own — a project that wants a card database and no tabletop mounts this and nothing else.

    CodeBlock(:code="usage" label="router")

    h2#what-it-is-not What it is not
    p It holds no games. Every label, filter, facet and card field comes from the game config the host hands to #[span(class="font-mono text-neutral-300") @cardcarp/core], which is what lets the same component render a Pokémon archive and a Warcraft one without knowing either exists. See #[router-link(:to="{ name: 'deckbox-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") Configuration].

    p It also renders no site chrome. The package used to draw cardcarp.com's menu itself, which meant nobody else could install it; the header now takes a #[span(class="font-mono text-neutral-300") #menu] slot and the host fills it. A project that wants no chrome fills nothing and still renders a working deckbox.

    h2#where-it-sits Where it sits
    p Two packages, one core. #[span(class="font-mono text-neutral-300") @cardcarp/core] owns the game store, the config shape and the manifest; the deckbox and #[router-link(:to="{ name: 'simulator' }" class="text-mist-500 hover:underline") the simulator] are peers that both read it. Installing both gives you one config and one manifest between them, because core is a peer dependency of each rather than a bundled copy inside either.

    p The convention across this repo's own projects is that a game's site routes the table at #[span(class="font-mono text-neutral-300") /] and the deckbox at #[span(class="font-mono text-neutral-300") /deckbox] — the tabletop is what a project exists to be played on, and the archive is what you go and look something up in.
</template>
