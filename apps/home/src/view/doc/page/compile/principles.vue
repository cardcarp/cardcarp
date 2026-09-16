<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'yaml-is-the-source', name: 'YAML is the source' },
    { id: 'ids-come-from-the-record', name: 'Ids come from the record' },
    { id: 'references-are-names', name: 'References are names' },
    { id: 'the-round-trip', name: 'The round trip' },
    { id: 'a-printing-is-not-its-mechanics', name: 'A printing is not its mechanics' },
    { id: 'no-game-in-the-code', name: 'No game in the code' },
    { id: 'any-numbering', name: 'Any numbering' }
]
</script>

<script setup>
// /compile/principles
import CodeBlock from '@/part/code-block.vue'

const card = `
oracle: raticate-base-040

index: '040'

rarity: Uncommon

artist: Ken Sugimori

set: Base
`
</script>

<template lang="pug">
.page
    p These hold for every dataset Compile builds. Each game's own curation rules, such as what counts as a set or which printing wins when two disagree, live in that game's repository. #[a(href="https://github.com/cardcarp/ptcg/blob/main/CONTRIBUTING.md" target="_blank" class="text-mist-500 hover:underline") ptcg's CONTRIBUTING] has the fullest set.

    h2#yaml-is-the-source YAML is the source
    p A dataset is its #[span(class="font-mono text-neutral-300") data/] folder, one YAML file to a record. #[span(class="font-mono text-neutral-300") dist/] is output: it's rebuilt from #[span(class="font-mono text-neutral-300") data/] on every run and never committed. Anything worth keeping is written in YAML, where a contributor can find it, read it and change it in a pull request.

    CodeBlock(:code="card" label="data/card/standard/01-base/01-base/040-raticate.yml")

    h2#ids-come-from-the-record Ids come from the record
    p No file contains its own id. A collection's and a set's come from its name. A card's comes from its set and its printed index, an oracle's from its name and the printing it first appeared in, and a deck's from its set and its name, all kebab-cased at build time. Base and 040 make #[span(class="font-mono text-neutral-300") base-040].

    p Because the id is derived, a filename is free to be whatever helps an editor find the file, and renaming one changes nothing. Two records that derive the same id fail the build, and the error names both files.

    h2#references-are-names References are names
    p A card says #[span(class="font-mono text-neutral-300") set: Base], not an id, and the build turns the name into one. An oracle is the one exception, written as its id, because thousands of cards share a name and the name alone can't pick out one oracle.

    p Checking against the schema only ever sees one file, so on its own it can't tell whether that set exists. The reference check that follows looks across the whole dataset, and reports every reference that doesn't resolve.

    h2#the-round-trip The round trip
    p #[span(class="font-mono text-neutral-300") cardcarp-split] is the exact inverse of #[span(class="font-mono text-neutral-300") cardcarp-compile] for the records it owns. That makes a structural change to thousands of files a matter of changing #[span(class="font-mono text-neutral-300") dist/] and splitting it back out.

    p Hand-written files stay outside that loop on purpose. Formats and decks carry comments and long text that a trip through JSON would flatten, and neither is large enough for a bulk edit to be worth the risk.

    h2#a-printing-is-not-its-mechanics A printing is not its mechanics
    p An oracle holds what a card does, meaning its rules and its type, and every printing of that card shares it. A card holds one printing: its set, its index, its artist, its rarity. That split decides where a field belongs.

    p A regulation mark is printed on a card, so it's written on the card. The pool of every mark an oracle has been printed under is gathered at build time rather than stored, and legality checks the pool, because a player may use any printing whose mark is legal. Stored on the oracle instead, a modern mark would spread back onto a card printed years before the mark existed.

    h2#no-game-in-the-code No game in the code
    p Nothing in Compile names a game. What a valid record is lives in the schema. The fields worth filtering on, and the order collection types appear in, live in #[span(class="font-mono text-neutral-300") dataset.yml]. A difference between two games is data, never a branch in the pipeline. See #[router-link(:to="{ name: 'compile-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") Configuration].

    h2#any-numbering Any numbering
    p Games number things differently. Pokémon uses plain integers. Warcraft uses zero-padded strings, with companion sets like #[span(class="font-mono text-neutral-300") 01a] and named reprint lines like #[span(class="font-mono text-neutral-300") reborn-01], and many of its sets have no number at all.

    p The pipeline reads all of them the same way: it takes the number where there is one and keeps the rest. A card's art path therefore comes out the same whichever scheme produced it, and no game ever has to renumber its data to fit another's. A card's own index goes into its path exactly as printed, so #[span(class="font-mono text-neutral-300") 040] stays #[span(class="font-mono text-neutral-300") 040].
</template>
