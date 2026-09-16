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
// /compile — the index page of the Compile tree.
import CodeBlock from '@/part/code-block.vue'

const usage = `
pip install .          # once, in a game's dataset repo
cardcarp-compile       # check the YAML and build dist/
cardcarp-sets          # the set tree
cardcarp-manifest      # the archive the apps load
`
</script>

<template lang="pug">
.page
    p Compile is the build every cardcarp dataset runs. A game's cards, sets, oracles and decks are written as YAML, one record to a file. Compile checks every file against the game's schema, checks that every reference between records resolves, and writes the JSON that #[router-link(:to="{ name: 'deckbox' }" class="text-mist-500 hover:underline") the deckbox] and #[router-link(:to="{ name: 'simulator' }" class="text-mist-500 hover:underline") the simulator] load.

    CodeBlock(:code="usage" label="shell")

    p It is Python rather than an npm package, because the people it serves are editing card data rather than building an app. Each game is its own repository holding nothing but its data and its schema, and Compile is the one copy of the pipeline they all install. A fix made here reaches every game at once.

    h2#what-it-is-not What it is not
    p It holds no game. What makes a dataset Pokémon or Warcraft is its schema, which says what a valid record is, and a short #[span(class="font-mono text-neutral-300") dataset.yml], which names the fields worth filtering on and the order its collection types appear in. See #[router-link(:to="{ name: 'compile-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") Configuration].

    p It doesn't publish. It writes #[span(class="font-mono text-neutral-300") dist/] inside the game's repository, and getting the archive and the card art to where an app fetches them is the game's own step. See #[router-link(:to="{ name: 'compile-page', params: { slug: 'manifest' } }" class="text-mist-500 hover:underline") The manifest contract].

    p And it doesn't ingest. A game whose data starts upstream, as a bulk file from someone else, keeps its own import scripts and runs Compile on what they write. Those scripts can use the same helpers the pipeline does; see #[router-link(:to="{ name: 'compile-page', params: { slug: 'commands' } }" class="text-mist-500 hover:underline") Commands].

    h2#where-it-sits Where it sits
    p Compile is the producer and the apps are the consumers. A dataset repo runs Compile, its output is published, and #[span(class="font-mono text-neutral-300") @cardcarp/core] fetches it for the deckbox and the simulator. Nothing in an app imports Compile, and nothing Compile does knows an app exists. The published archive is the whole of the contract between them.

    p The reference dataset is #[a(href="https://github.com/cardcarp/ptcg" target="_blank" class="text-mist-500 hover:underline") cardcarp/ptcg]. #[a(href="https://github.com/cardcarp/wow" target="_blank" class="text-mist-500 hover:underline") cardcarp/wow] builds from the same package, with its own schema and its own vocabulary.
</template>
