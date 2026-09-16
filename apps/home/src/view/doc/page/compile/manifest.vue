<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'what-is-published', name: 'What is published' },
    { id: 'manifest-json', name: 'manifest.json' },
    { id: 'sets-json', name: 'sets.json' },
    { id: 'card-art', name: 'Card art' },
    { id: 'what-an-app-relies-on', name: 'What an app relies on' },
    { id: 'deck-lists-in-and-out', name: 'Deck lists in and out' }
]
</script>

<script setup>
// /compile/manifest
import CodeBlock from '@/part/code-block.vue'

const files = `
https://storage.cardcarp.com/game/{game}/data/manifest.json
https://storage.cardcarp.com/game/{game}/data/sets.json
https://storage.cardcarp.com/game/{game}/card/{dir}.avif
`

const shape = `
{
  "card_dict": {
    "base-058": {
      "id": "base-058",
      "name": "Pikachu",
      "set_id": "base",
      "card_index": "058",
      "oracle_id": "pikachu-base-058",
      "category": ["Pokémon"],
      "type": ["Lightning"],
      "hp": 40,
      "rarity": "Common",
      "dir": "standard/01-base/01-base/058-pikachu",
      "legal": ["unlimited"]
    }
  },
  "deck_dict": {
    "legendary-collection-lava": {
      "id": "legendary-collection-lava",
      "name": "Lava",
      "group_id": "legendary-collection",
      "format": ["Standard"],
      "list": {
        "main": {
          "legendary-collection-070": 4,
          "legendary-collection-037": 3
        }
      }
    }
  }
}
`

const deckList = `
4 Pikachu base 058
1 Jirachi xy-black-star 067a
`
</script>

<template lang="pug">
.page
    p Compile's output and the apps meet in two published files and a folder of art. This page covers what each side can rely on from the other.

    h2#what-is-published What is published
    p For each of cardcarp's own games:

    CodeBlock(:code="files" label="urls")

    p A game's config isn't among them. Its card size, its filters and its deck groups are bundled into the app that shows the game, because an app needs them before any card has loaded. See #[router-link(:to="{ name: 'deckbox-page', params: { slug: 'configuration' } }" class="text-mist-500 hover:underline") the deckbox's Configuration].

    h2#manifest-json manifest.json
    p The archive: every card and every deck the game has, each keyed by its id. #[span(class="font-mono text-neutral-300") @cardcarp/core] fetches it when a game loads, without holding up the page, so the route renders straight away and fills in when the file lands. The card and deck lists the apps read are built from it.

    CodeBlock(:code="shape" label="manifest.json — one card and one deck, trimmed")

    p A card carries its whole joined record: the printing, its oracle's mechanics, its set and collection, and its legality in each format. A deck's #[span(class="font-mono text-neutral-300") list] is its cards by group, as card id and quantity.

    h2#sets-json sets.json
    p The set tree on its own, a few kilobytes against the manifest's megabytes, so a set picker can open before the archive has arrived. It runs from type to collection to set, with a card total at every level.

    h2#card-art Card art
    p Each card's art is published under its #[span(class="font-mono text-neutral-300") dir], with a suffix for variant art. The dir is built from the card's collection type, collection, set and index, so it stays put for as long as those do.

    h2#what-an-app-relies-on What an app relies on
    ul
        li #[strong Ids are stable.] Each comes from its record's own fields, so it changes only when those do, such as a card moving set or a set being renamed.
        li #[strong Every reference resolves.] A deck never lists a card the archive doesn't have, because the build that wrote the manifest refuses to finish otherwise.
        li #[strong A dir is an address.] Changing how dirs are built would move every image, which is why the pipeline reads every numbering scheme rather than asking a game to renumber.
        li #[strong Records carry their own id.] A card taken out of #[span(class="font-mono text-neutral-300") card_dict] still says what it is.

    h2#deck-lists-in-and-out Deck lists in and out
    p The deckbox exports a deck as one line per card, giving the quantity, name, set id and card index, and imports the same format back.

    CodeBlock(:code="deckList" label="deck list")

    p The id it looks up is the set id and the index joined with a hyphen, which is exactly how Compile keys a card. So the deckbox can read back any list it writes, including promos and variants whose index carries a letter.
</template>
