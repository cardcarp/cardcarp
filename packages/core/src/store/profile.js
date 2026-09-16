import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

const profile = useStorage('profile', {
    name: "New Player",
    storage: {},
    game: {},
    // Which one-time walkthroughs this profile has already been shown, keyed by id
    // ('table' is the only one so far). Deliberately a map rather than a boolean so a
    // second wizard is a new key, not a new field.
    //
    // Profiles written before this existed have no `tutorial` at all — useStorage does not
    // merge new defaults into a stored object — and a missing key reads as "not seen",
    // which is the behaviour a first run wants anyway.
    tutorial: {}
})

const dialog_about_active = ref(false)

export function useProfileStore() {
    
    // Standard named function declaration
    function initGameData(gameId) {
        if (!gameId) return

        // VueUse's useStorage is deeply reactive by default, 
        // so direct property assignment here will correctly trigger UI updates and storage saves.
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

    // The player's decks for a game — storage pinned first, then their saved
    // decks. Shared by @cardcarp/deckbox's right panel and the table's deckbox so
    // both list the same records.
    function gameDecks(gameId) {
        if (!gameId) return []
        return [profile.value.storage[gameId], ...(profile.value.game[gameId] ?? [])].filter(Boolean)
    }

    // One-time walkthroughs. Seen is sticky and per-profile, not per-game: the table works
    // the same way in every game, so being walked through it once is enough.
    function hasSeenTutorial(id) {
        return Boolean(profile.value.tutorial?.[id])
    }

    function markTutorialSeen(id, seen = true) {
        // Older stored profiles predate the key entirely — create it before writing rather
        // than assigning into undefined.
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
