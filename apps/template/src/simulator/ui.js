import { ref } from 'vue'
import { useStorage } from '@vueuse/core'

export const dialogShortcut_open = ref(false)

export const panel_open = useStorage('cardcarp:panel', true)

export const panel_section = useStorage('cardcarp:panel-sections', {
    card: true,
    multiplayer: true,
    seats: true,
    settings: true,
}, localStorage, { mergeDefaults: true })

export function openPanelSection(id) {
    panel_open.value = true
    if (id) panel_section.value[id] = true
}

export const deckbox_open = ref(false)
export const deckbox_tab = ref('Cards')

export function openDeckbox(tab = 'Decks') {
    deckbox_tab.value = tab
    deckbox_open.value = true
}
