// composable/set-list.js
//
// The slim set list — the same array as a manifest's data.set_list (categories
// -> collections -> sets), published per game on the CDN at ~85 KB. Anything
// that only needs to *show* the set tree reads this instead of pulling the
// multi-megabyte game manifest.
//
// Lives here rather than in @cardcarp/core because the set tree is a deckbox
// concern and nothing else ever asked for it: dialog-filter-set.vue is the only
// reader there has been. Core is what a card archive and a tabletop both need,
// and a table has no use for a set picker.
import { shallowRef, markRaw } from 'vue'

import { gameDataUrl } from '@cardcarp/core/config.js'

// --- Shape ------------------------------------------------------------------
// Every game publishes the same tree. Each level is scoped by its position in
// it, so its fields carry no prefix — card records are flat and keep theirs
// (set_id, set_name):
//
//   category    { type, card_total, list }
//   collection  { id, name, index, date, card_total, list }
//   set         { id, name, index, type, date, card_total }
//
// What consumers rely on:
//   - `id` is unique across the whole tree, at both levels, so it can be used
//     as a render key and as accordion state.
//   - a category's `type` is its collection's type. A set carries its own
//     `type`, which needn't match the category it sits under: mtg files the
//     Tempest promos as an `extra` set inside the `standard` Tempest.
//   - `card_total` at a level is the sum of the level below it.
//   - array order is render order; nothing here sorts.

// game -> shallowRef(list). Shared so sibling components fetch once; null until
// the request settles.
const cache = new Map()

export function useSetList(game) {
    if (cache.has(game)) return cache.get(game)

    const list = shallowRef(null)
    cache.set(game, list)

    fetch(gameDataUrl(game, 'sets.json'))
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
        })
        .then(data => { list.value = markRaw(data) })
        .catch(error => {
            console.error(`Failed to load set list for ${game}`, error)
            // Drop the entry so a later mount can retry rather than inheriting
            // a cached failure.
            cache.delete(game)
            list.value = []
        })

    return list
}
