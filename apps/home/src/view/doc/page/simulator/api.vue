<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'create-table', name: 'createTable(options)' },
    { id: 'the-table', name: 'The table' },
    { id: 'wiring-a-ui', name: 'Wiring a UI' },
    { id: 'has-simulator', name: 'hasSimulator(config)' },
    { id: 'helpers', name: 'Helpers' },
    { id: 'subpaths', name: 'Subpaths' },
    { id: 'peer-dependencies', name: 'Peer dependencies' }
]
</script>

<script setup>
// /simulator/api
import CodeBlock from '@/part/code-block.vue'

const root = `
import { createTable, hasSimulator } from '@cardcarp/simulator'
`

const create = `
const table = createTable({
    // Where art lives: a finished URL for a bucket path, the same without its
    // extension, and a card's front and back.
    assets: { assetUrl, assetBase, cardArt, cardBack },
    // The relay's origin, for multiplayer. Left out, it is the local dev relay.
    relay: 'wss://your-relay.example',
    // In development, freeze every value leaving a store so an edit in place throws.
    strict: true,
    // The canvas's colours and font. See setTheme below.
    theme,
})
`

const object = `
await table.mount(element, { deck })  // build the canvas, and deal a ?deck= link
table.unmount()                         // take it down again, leaving any room

table.setGame({ id, config, manifest, error, cardConfig })
table.setArt({ surfaces: { 'bg-table': url }, puff: url })
table.setTheme({ font, table, seats, selection, card, piece, shape })

const off = table.on('reset', () => openDeckList())

table.cards.shuffle(groupId)
table.seats.add()
table.room.start()
`

const store = `
// Every piece of state is a read-only store.
table.seats.roster.get()                          // the value now
const stop = table.seats.roster.listen(           // each change, not the current value
    (rows, previous) => render(rows),
)
const unsubscribe = table.seats.roster.subscribe( // the current value at once, then each change
    (rows) => render(rows),
)
`

const subpath = `
// Reachable, but not a supported surface.
import { stage } from '@cardcarp/simulator/stage.js'
import { tools } from '@cardcarp/simulator/canvas-pixi/tools/index.js'
`
</script>

<template lang="pug">
.page
    p One entry point, and no UI. The root is the table — one object with a lifecycle, the facts it is handed, the moments it announces and a verb for everything on it — and it imports no framework. The interface is the app's to build on it; #[span(class="font-mono text-neutral-300") apps/ptcg] builds one in Vue.

    CodeBlock(:code="root" label="import")

    h2#create-table createTable(options)
    p Makes the table. Called once, before the app mounts: a page holds one table, and a second call is refused. Everything handed in here can be changed later through the table's setters.

    CodeBlock(:code="create" label="src/main.js")

    h2#the-table The table
    p What #[span(class="font-mono text-neutral-300") createTable] returns. The lifecycle and the inputs sit at the top; everything on the table has a namespace of its own — #[span(class="font-mono text-neutral-300") tools], #[span(class="font-mono text-neutral-300") selection], #[span(class="font-mono text-neutral-300") cards], #[span(class="font-mono text-neutral-300") hand], #[span(class="font-mono text-neutral-300") seats], #[span(class="font-mono text-neutral-300") room], #[span(class="font-mono text-neutral-300") dice], #[span(class="font-mono text-neutral-300") counters], #[span(class="font-mono text-neutral-300") rects], #[span(class="font-mono text-neutral-300") arrows], #[span(class="font-mono text-neutral-300") text], #[span(class="font-mono text-neutral-300") view], #[span(class="font-mono text-neutral-300") scenery], #[span(class="font-mono text-neutral-300") accessories] and #[span(class="font-mono text-neutral-300") pointer] — each holding that thing's state and its verbs.

    CodeBlock(:code="object" label="usage")

    p #[span(class="font-mono text-neutral-300") setArt] is the app's furniture, since the package ships none: textures a game config may name as its surface, and the sprite sheet a delete puffs with. Either may be left out.

    p #[span(class="font-mono text-neutral-300") setTheme], and #[span(class="font-mono text-neutral-300") createTable]'s #[span(class="font-mono text-neutral-300") theme] before it, is the app's look. Give the first one to createTable: a fresh profile's first seat is coloured as the table is made. It covers the colours and the font the canvas draws with — the table and its dots, the palette new seats take, the selection chrome, cards, a die's number, and the colour a new shape starts as. The package has no look of its own. It draws anything a theme leaves out in a neutral grey and names it in a warning, and warns once if a table is mounted with no theme at all. #[span(class="font-mono text-neutral-300") apps/ptcg] keeps a complete one in #[span(class="font-mono text-neutral-300") src/simulator/controls.js].

    h2#wiring-a-ui Wiring a UI
    p A UI reads the table's state and calls its verbs, and nothing else. State is handed out read-only, so a UI changes the table only through verbs, and the canvas and the room hear about everything that happens. Verbs are plain functions, safe to take off their namespace. The moments #[span(class="font-mono text-neutral-300") on] listens for are #[span(class="font-mono text-neutral-300") reset], #[span(class="font-mono text-neutral-300") deck-link], #[span(class="font-mono text-neutral-300") card-hover] and #[span(class="font-mono text-neutral-300") card-unhover].

    CodeBlock(:code="store" label="state")

    p Mount the table when the element it draws into exists, and unmount it when that element goes: unmounting also leaves any room the table was in, because the connection belongs to the table rather than to whichever control opened it.

    h2#has-simulator hasSimulator(config)
    p True when #[span(class="font-mono text-neutral-300") config.simulator] is present. The counterpart to #[span(class="font-mono text-neutral-300") @cardcarp/deckbox]'s #[span(class="font-mono text-neutral-300") hasDeckbox], and asked the same way — of a config object, because the package does not own the registry.

    h2#helpers Helpers
    p A few pure functions and constants a UI shares with the table, so what the UI measures and what the canvas does agree: #[span(class="font-mono text-neutral-300") foldName], the name folding card search uses; #[span(class="font-mono text-neutral-300") isDoubleTap], #[span(class="font-mono text-neutral-300") resetDoubleTap] and #[span(class="font-mono text-neutral-300") TAP_MOVE_SLOP]; and #[span(class="font-mono text-neutral-300") LIFT_SCALE] and #[span(class="font-mono text-neutral-300") LIFT_RISE_PX], how a lifted card rises.

    h2#subpaths Subpaths
    p The package exports #[span(class="font-mono text-neutral-300") "./*": "./src/*"], so the Pixi scene, the seat arithmetic, the relay client and the tool registry are all importable. None of it is a supported surface. It is there for the case that genuinely needs it, and it will move.

    CodeBlock(:code="subpath" label="import")

    h2#peer-dependencies Peer dependencies
    p #[span(class="font-mono text-neutral-300") @cardcarp/core] only. Pixi and Motion are regular dependencies of the package, and it needs no framework.
</template>
