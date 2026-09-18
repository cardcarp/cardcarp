import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

const profile = useStorage('profile', {
    name: "New Player",
    storage: {},
    game: {},
    tutorial: {}
})

const dialog_about_active = ref(false)

export function useProfileStore() {
    
    function initGameData(gameId) {
        if (!gameId) return

        if (!(gameId in profile.value.storage)) {
            profile.value.storage[gameId] = {
                id: 'storage',
                name: 'Storage',
                tagline: 'Default list to keep track of your entire collection',
                context: [],
                total: 0,
                list: {
                    main: {}
                }
            }
        }

        if (!(gameId in profile.value.game)) {
            profile.value.game[gameId] = []
        }
    }

    function gameDecks(gameId) {
        if (!gameId) return []
        return [profile.value.storage[gameId], ...(profile.value.game[gameId] ?? [])].filter(Boolean)
    }

    function hasSeenTutorial(id) {
        return Boolean(profile.value.tutorial?.[id])
    }

    function markTutorialSeen(id, seen = true) {
        if (!profile.value.tutorial) profile.value.tutorial = {}
        profile.value.tutorial[id] = seen
    }

    return {
        profile,
        initGameData,
        gameDecks,
        hasSeenTutorial,
        markTutorialSeen,
        dialog_about_active
    }
}
