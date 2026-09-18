import { shallowRef, markRaw } from 'vue'

import { setsUrl } from '@cardcarp/core/storage.js'

const cache = new Map()

export function useSetList(game) {
    if (cache.has(game)) return cache.get(game)

    const list = shallowRef(null)
    cache.set(game, list)

    const url = setsUrl(game)
    const request = url ? fetch(url) : Promise.reject(new Error('no sets location declared (see provideStorage)'))

    request
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            return response.json()
        })
        .then(data => { list.value = markRaw(data) })
        .catch(error => {
            console.error(`Failed to load set list for ${game}`, error)
            cache.delete(game)
            list.value = []
        })

    return list
}
