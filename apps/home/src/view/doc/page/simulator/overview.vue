<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'rules', name: 'Rules, or the absence of them' },
    { id: 'the-surface', name: 'The surface' },
    { id: 'your-ui', name: 'Your UI' },
    { id: 'where-it-sits', name: 'Where it sits' }
]
</script>

<script setup>
// /simulator — the index page of the simulator tree.
import CodeBlock from '@/part/code-block.vue'

const usage = `
import { createTable } from '@cardcarp/simulator'

// The table, as one object. It ships no UI: an app draws its own and wires
// it to the object's state and verbs.
const table = createTable({ assets, relay })
await table.mount(element)

table.seats.roster.listen((rows) => render(rows))
table.cards.shuffle(groupId)
`
</script>

<template lang="pug">
.page
    p #[span(class="font-mono text-neutral-300") @cardcarp/simulator] is the tabletop: a Pixi canvas you play on, seats and hands, dice, counters, arrows and free-form markup, and a multiplayer client that pairs with the relay. It ships as one object with no UI of its own, and installs on its own — a project that wants a table and no card archive builds its interface on this and nothing else.

    CodeBlock(:code="usage" label="usage")

    h2#rules Rules, or the absence of them
    p It enforces none. The table moves objects and shares those movements; who may do what, and when, is left to the players. The relay behind multiplayer is a thin echo server holding canonical canvas state per room, with no notion of turns, legality or winning. That is a deliberate ceiling on what this is: a sandbox for games it has never been taught, not an engine for one it has.

    h2#the-surface The surface
    p The package is roughly 12 thousand lines across 43 files, and almost none of it is anybody else's business. The root hands out #[span(class="font-mono text-neutral-300") createTable], which returns the whole table as one object, a predicate, and a few helpers a UI shares with the canvas. The Pixi scene, the seat arithmetic, the relay client and the tool registry are all reachable by subpath for the case that genuinely needs them; see #[router-link(:to="{ name: 'simulator-page', params: { slug: 'api' } }" class="text-mist-500 hover:underline") API].

    h2#your-ui Your UI
    p The interface is the app's. The package has no components and imports no framework, so a table can be drawn in whatever the project already uses. #[span(class="font-mono text-neutral-300") apps/ptcg] carries a complete one in Vue under #[span(class="font-mono text-neutral-300") src/simulator] — the game's config, the canvas view, the hand, the panels and toolbars, the tutorial and the keyboard — and it reaches the table only through the object #[span(class="font-mono text-neutral-300") createTable] returns; see #[router-link(:to="{ name: 'simulator-page', params: { slug: 'install' } }" class="text-mist-500 hover:underline") Install].

    h2#where-it-sits Where it sits
    p Alongside #[router-link(:to="{ name: 'deckbox' }" class="text-mist-500 hover:underline") the deckbox], over one shared #[span(class="font-mono text-neutral-300") @cardcarp/core]. Install both and they share a config and a manifest, because core is a peer dependency of each. ptcg's table UI has its own deckbox panel in the toolbar — the same card and deck lists, in the toolbar rather than as a page — and it reads the same #[span(class="font-mono text-neutral-300") deck.filter] vocabulary the card archive does.
</template>
