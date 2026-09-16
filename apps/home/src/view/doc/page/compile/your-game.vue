<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'start-from-a-dataset', name: 'Start from a dataset' },
    { id: 'write-the-data', name: 'Write the data' },
    { id: 'state-its-vocabulary', name: 'State its vocabulary' },
    { id: 'build-it', name: 'Build it' },
    { id: 'publish-it', name: 'Publish it' },
    { id: 'show-it', name: 'Show it' }
]
</script>

<script setup>
// /compile/your-game
import CodeBlock from '@/part/code-block.vue'

const tree = `
your-game/
├── data/
│   ├── collection/
│   ├── set/
│   ├── oracle/
│   ├── card/
│   ├── format/
│   └── deck/
├── schema/            card, oracle, set, collection, format, deck
├── dataset.yml
├── pyproject.toml
└── .github/workflows/validate.yml
`

const set = `
name: Base

type: Standard

index: 1

subtotal: 102

total: 102

date: '1999-01-09'

collection: Base

publisher: Wizards of the Coast
`

const build = `
pip install .
cardcarp-compile       # repeat until it passes
cardcarp-sets
cardcarp-manifest
`
</script>

<template lang="pug">
.page
    p A dataset for a game cardcarp doesn't cover is a repository shaped like the existing ones. Nothing in Compile has to change for it.

    h2#start-from-a-dataset Start from a dataset
    p Copy the reference dataset's skeleton and leave its data behind: the #[span(class="font-mono text-neutral-300") schema/] folder, #[span(class="font-mono text-neutral-300") dataset.yml], #[span(class="font-mono text-neutral-300") pyproject.toml] and the validate workflow. #[a(href="https://github.com/cardcarp/ptcg" target="_blank" class="text-mist-500 hover:underline") cardcarp/ptcg] is the fullest reference. Its README describes the layout, and its CONTRIBUTING the reasoning behind each rule.

    CodeBlock(:code="tree" label="layout")

    h2#write-the-data Write the data
    p Write collections first, then sets, oracles and cards, and formats and decks last, since they refer to everything else. Each record is one file, and each reference is by name. Folders and filenames are for your own navigation; ids come from the records themselves.

    CodeBlock(:code="set" label="data/set/standard/01-base/01-base.yml")

    h2#state-its-vocabulary State its vocabulary
    p Change #[span(class="font-mono text-neutral-300") schema/] to the fields your game actually has. Then fill in #[span(class="font-mono text-neutral-300") dataset.yml] with the card and deck fields worth filtering on, and your collection types in the order they should appear. See #[router-link(:to="{ name: 'compile-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") Configuration].

    h2#build-it Build it
    CodeBlock(:code="build" label="shell")

    p When something is wrong, #[span(class="font-mono text-neutral-300") cardcarp-compile] names the file and the field, and lists every reference that doesn't resolve. Once it passes, the steps after it won't fail on your data.

    h2#publish-it Publish it
    p Put #[span(class="font-mono text-neutral-300") dist/manifest.json] and #[span(class="font-mono text-neutral-300") dist/sets.json] where an app fetches them, and each card's art under its #[span(class="font-mono text-neutral-300") dir]. See #[router-link(:to="{ name: 'compile-page', params: { slug: 'manifest' } }" class="text-mist-500 hover:underline") The manifest contract].

    h2#show-it Show it
    p An app also needs the game's config: its card size, the filters its archive offers, its deck groups, and for a table, its layout. That lives in the app, not in the dataset. See the #[router-link(:to="{ name: 'deckbox-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") deckbox] and #[router-link(:to="{ name: 'simulator-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") simulator] Configuration pages. With that in place, an app built on both shows the new game, and neither package knows it exists.
</template>
