<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'dataset-yml', name: 'dataset.yml' },
    { id: 'why-it-is-per-game', name: 'Why it is per game' },
    { id: 'the-schema', name: 'The schema' }
]
</script>

<script setup>
// /compile/configuration
import CodeBlock from '@/part/code-block.vue'

const ptcg = `
# Card fields worth filtering on. Written to dist/properties.json.
card_properties:
  - layout
  - category
  - trait
  - type
  - rarity
  - regulation

# Deck fields worth filtering on.
deck_properties:
  - format
  - group
  - theme
  - complexity
  - division

# Collection types, in display order. The first is this game's primary type.
collection_types:
  - Standard
  - Starter
  - Extra
`

const wow = `
card_properties:
  - layout
  - category
  - trait
  - faction
  - class
  - type
  - combat
  - rarity
  - regulation

deck_properties:
  - format
  - group
  - theme
  - complexity
  - division

collection_types:
  - Set
  - Raid
  - Dungeon
  - Starter
  - Promo
  - Craft
  - Badge
  - Token
  - Extra
`
</script>

<template lang="pug">
.page
    p Compile runs the same code for every game. A game decides two things for itself: what its records look like, in #[span(class="font-mono text-neutral-300") schema/], and a little vocabulary, in #[span(class="font-mono text-neutral-300") dataset.yml].

    h2#dataset-yml dataset.yml
    p It sits at the root of the dataset repo and holds three lists. All three are required.

    ul
        li #[span(class="font-mono text-neutral-300") card_properties] are the card fields worth filtering on. #[span(class="font-mono text-neutral-300") cardcarp-properties] collects every distinct value of each into #[span(class="font-mono text-neutral-300") dist/properties.json].
        li #[span(class="font-mono text-neutral-300") deck_properties] are the same, for decks.
        li #[span(class="font-mono text-neutral-300") collection_types] is the order a game's collection types appear in #[span(class="font-mono text-neutral-300") dist/sets.json]. The first is the game's primary type. A type the data uses but the list leaves out still appears, after the listed ones, so forgetting one never drops a set.

    CodeBlock(:code="ptcg" label="dataset.yml — ptcg")

    p If the file is missing, or a list is absent, the step that needs it stops and names what's missing. #[span(class="font-mono text-neutral-300") cardcarp-compile] doesn't read it, so a pull request that only changes cards is checked without it.

    h2#why-it-is-per-game Why it is per game
    p Warcraft's lists show why this isn't built into the pipeline. Faction, class and combat are Warcraft mechanics, and a Raid or a Dungeon has no Pokémon equivalent. When the pipeline carried Pokémon's lists, a second game quietly lost its own filters and saw its collection types in the wrong order. Nothing failed; the output was just wrong.

    CodeBlock(:code="wow" label="dataset.yml — wow")

    h2#the-schema The schema
    p Everything else a game decides lives in #[span(class="font-mono text-neutral-300") schema/]: one cerberus schema for each kind of record, namely card, oracle, set, collection, format and deck. It says which fields exist, which are required and what each one holds, and #[span(class="font-mono text-neutral-300") cardcarp-compile] checks every file against it.

    p The schema's key order is also the order #[span(class="font-mono text-neutral-300") cardcarp-split] writes fields in, so the schema and the files it checks always read the same way.
</template>
