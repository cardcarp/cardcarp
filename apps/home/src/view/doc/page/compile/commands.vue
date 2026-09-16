<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'in-order', name: 'In order' },
    { id: 'cardcarp-compile', name: 'cardcarp-compile' },
    { id: 'cardcarp-sets', name: 'cardcarp-sets' },
    { id: 'cardcarp-manifest', name: 'cardcarp-manifest' },
    { id: 'cardcarp-properties', name: 'cardcarp-properties' },
    { id: 'cardcarp-split', name: 'cardcarp-split' },
    { id: 'python-helpers', name: 'Python helpers' }
]
</script>

<script setup>
// /compile/commands
import CodeBlock from '@/part/code-block.vue'

const order = `
cardcarp-compile      # data/ + schema/         ->  dist/*.json, dist/database.json
cardcarp-sets         # dist/ + dataset.yml      ->  dist/sets.json
cardcarp-manifest     # dist/                    ->  dist/manifest.json
cardcarp-properties   # dist/ + dataset.yml      ->  dist/properties.json
`

const helpers = `
from cardcarp_compile import card_dir, to_kebab_case

to_kebab_case("Cynthia's Roserade")   # 'cynthias-roserade'
card_dir(record)                      # 'standard/01-base/01-base/058-pikachu'
`
</script>

<template lang="pug">
.page
    p Each command runs from the root of a dataset repo and reads and writes paths relative to it.

    h2#in-order In order
    p #[span(class="font-mono text-neutral-300") cardcarp-compile] comes first, because it builds the #[span(class="font-mono text-neutral-300") dist/] files every other step reads. The three after it don't depend on each other.

    CodeBlock(:code="order" label="shell")

    h2#cardcarp-compile cardcarp-compile
    p The build, and the step CI runs. It checks every file under #[span(class="font-mono text-neutral-300") data/] against #[span(class="font-mono text-neutral-300") schema/] and stops at the first that fails, naming the file and the field. A key repeated inside one file is an error too, because YAML would otherwise keep one value and silently lose the other.

    p It then derives every record's id and refuses two records that claim the same one. Next it checks that every reference resolves: a card's set and oracle, a set's collection, a deck's set and every card in its list, and a format's sets, bans and exceptions. It reports all the failures together rather than one at a time. Finally it joins each card with its oracle, set and collection, works out its legality in every format, and writes #[span(class="font-mono text-neutral-300") dist/database.json] alongside a file for each kind of record.

    h2#cardcarp-sets cardcarp-sets
    p Writes #[span(class="font-mono text-neutral-300") dist/sets.json]: the set tree, from collection type to collection to set, with a card total at each level. Collections are ordered by their first release date. Sets are ordered by index, the number first so set 9 comes before set 10, then any suffix so #[span(class="font-mono text-neutral-300") 01a] sits straight after #[span(class="font-mono text-neutral-300") 01]. Sets with no index follow, by date.

    h2#cardcarp-manifest cardcarp-manifest
    p Writes #[span(class="font-mono text-neutral-300") dist/manifest.json], the archive an app loads. It keys every card and deck by id, carries the id inside each record as well, and gives every card a #[span(class="font-mono text-neutral-300") dir]: the path its art is published at. The file is written compact, because it's downloaded whole. See #[router-link(:to="{ name: 'compile-page', params: { slug: 'manifest' } }" class="text-mist-500 hover:underline") The manifest contract].

    h2#cardcarp-properties cardcarp-properties
    p Writes #[span(class="font-mono text-neutral-300") dist/properties.json]: every distinct value of the card and deck fields #[span(class="font-mono text-neutral-300") dataset.yml] lists. It's a reference to fill an app's filter options in from by hand, not a finished ordering.

    h2#cardcarp-split cardcarp-split
    p The inverse of #[span(class="font-mono text-neutral-300") cardcarp-compile]. It rewrites #[span(class="font-mono text-neutral-300") data/card], #[span(class="font-mono text-neutral-300") data/oracle], #[span(class="font-mono text-neutral-300") data/set] and #[span(class="font-mono text-neutral-300") data/collection] from #[span(class="font-mono text-neutral-300") dist/], in schema field order and in the folder layout the records imply. It's for a structural change across thousands of files, and for tidying formatting after one.

    p It rewrites every file it owns, so run it on a clean working tree and read the diff before committing. It never touches #[span(class="font-mono text-neutral-300") data/format] or #[span(class="font-mono text-neutral-300") data/deck]. Both are written by hand, with comments and long text that a round trip through JSON would flatten.

    h2#python-helpers Python helpers
    p A game's own scripts, usually the ones that turn an upstream bulk file into #[span(class="font-mono text-neutral-300") data/], can import the helpers the pipeline itself uses:

    ul
        li #[span(class="font-mono text-neutral-300") to_kebab_case], the rule every id is built with
        li #[span(class="font-mono text-neutral-300") card_dir], a card's path stem
        li #[span(class="font-mono text-neutral-300") save_yml], which writes YAML in the house format
        li #[span(class="font-mono text-neutral-300") load_schema_order] and #[span(class="font-mono text-neutral-300") order_by_schema], for writing fields in schema order

    CodeBlock(:code="helpers" label="python")
</template>
