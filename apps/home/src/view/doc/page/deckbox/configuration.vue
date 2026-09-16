<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'bundled-not-fetched', name: 'Bundled, not fetched' },
    { id: 'asking-what-a-config-has', name: 'Asking what a config has' },
    { id: 'the-archives', name: 'The archives' }
]
</script>

<script setup>
// /deckbox/configuration
import CodeBlock from '@/part/code-block.vue'

const layout = `
src/data/game/wow/config/
├── game.json         name, dataset, card — required
├── deck.json         the deck vocabulary — absent = no decks
└── simulator.json    the table — absent = no table
`

const provide = `
provideGameConfigs(gameConfigsFromGlob(
    import.meta.glob('./data/game/*/config/*.json', { eager: true, import: 'default' }),
))

// Or hand core the object directly:
provideGameConfigs({
    wow: { game: gameJson, deck: deckJson },
})
`

const has = `
import { hasDeckbox } from '@cardcarp/deckbox'
import { hasSimulator } from '@cardcarp/simulator'

const links = computed(() => [
    hasSimulator(config.value) && { to: '/', label: 'Table' },
    hasDeckbox(config.value) && { to: '/deckbox', label: 'Cards' },
].filter(Boolean))
`
</script>

<template lang="pug">
.page
    p A game publishes its config as three files, merged by core into the single #[span(class="font-mono text-neutral-300") config] object everything downstream reads. Two of the three are optional, and that is how a project says what it is: a deployment with no #[span(class="font-mono text-neutral-300") simulator.json] genuinely has no table, and one with no #[span(class="font-mono text-neutral-300") deck.json] has no decks.

    CodeBlock(:code="layout" label="config")

    p They are named for what they DESCRIBE rather than for the app that reads them, because the readers do not divide the way the apps do — the table's own deckbox panel reads #[span(class="font-mono text-neutral-300") deck.filter] for its format and theme facets, and #[span(class="font-mono text-neutral-300") card.size] is what the simulator derives a card's world size from.

    h2#bundled-not-fetched Bundled, not fetched
    p Config is bundled with the app; the archives are fetched. That line is drawn by what each thing is rather than by how big it is. A config is the other half of a contract the code defines, so it belongs in the repo beside the code that reads it — splitting the two across a network boundary lets a schema change and its instances drift silently, with no commit containing both halves.

    CodeBlock(:code="provide" label="src/main.js")

    p Core is handed the registry rather than discovering it, which is the whole difference between a package and an app: core cannot know which games exist, because a third party's project ships a game this repo has never heard of. What core knows is the shape.

    h2#asking-what-a-config-has Asking what a config has
    p Both packages export a predicate so a host offering two halves can ask before it offers a link to one. Each is asked of a config rather than of a game name — the host holds the registry, and the package does not.

    CodeBlock(:code="has" label="app.vue")

    h2#the-archives The archives
    p Two remote files per game, fetched rather than bundled: #[span(class="font-mono text-neutral-300") sets.json] (3–22 KB, the set tree) and #[span(class="font-mono text-neutral-300") manifest.json] (1–25 MB, the card and deck dictionaries). The manifest does not block routing — the deckbox renders its skeletons off core's #[span(class="font-mono text-neutral-300") loading] flag while the archive is in flight, which for a large game is several seconds.
</template>
