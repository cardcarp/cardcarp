import { computed, ref, shallowRef } from 'vue'

import { useProfileStore } from '@cardcarp/core/store/profile.js'
import { openPanelSection, openDeckbox } from './ui.js'
import { useTable } from './use-table.js'

const { hasSeenTutorial, markTutorialSeen } = useProfileStore()

export const TUTORIAL_ID = 'table'

const ADVANCE_DELAY = 700

export const steps = [
    {
        id: 'welcome',
        title: 'Welcome to the Table',
        body: 'This is a freeform canvas. There are no enforced rules or automated logic. You have complete freedom to place, move, and organize cards, decks, and accessories however you like.',
        anchor: null,
    },
    {
        id: 'toolbar',
        title: 'Creation Toolbar',
        body: 'Everything on your board starts here. Use this toolbar to spawn cards, place table accessories like dice and playmats, or draw custom notes and shapes.',
        anchor: '[data-tour="toolbar"]',
        side: 'right',
        align: 'start',
    },
    {
        id: 'deck',
        title: 'Adding Cards',
        body: 'Select a tab to drop single cards (or tokens), load standard prebuilt decks, or pull in your saved Deck Builder creations.',
        anchor: ['[data-tour="deckbox-panel"]', '[data-tour="deckbox"]'],
        needs: ({ toolbar }) => 'deckbox' in toolbar,
        side: 'right',
        align: 'start',
    },
    {
        id: 'seat-add',
        title: 'Seats & Multiplayer',
        body: 'Manage local seats or play online. Add empty seats to control extra hands locally, host a room to get a shareable code, or enter a room code to join an online session.',
        anchor: '[data-tour="seat-add"]',
        needs: ({ panel }) => 'seats' in panel,
        side: 'left',
        align: 'start',
        enter: () => { openPanelSection('seats') },
    },
    {
        id: 'seat-change',
        title: 'Switching Seats',
        body: 'These chips show your current active seat. Click any open seat to hot-sit into it, changing your table perspective and hidden hand.',
        anchor: '[data-tour="seat"]',
        needs: ({ panel }) => 'seats' in panel,
        side: 'left',
        align: 'center',
        enter: () => { const { seats } = useTable(); if (seats.count.get() < 2) seats.add() },
    },
    {
        id: 'mirror',
        title: 'Flip View',
        body: 'View the board from the opposite side of the table. Your perspective rotates 180°, while also localizing cards so they remain facing the new position. The flip belongs to the seat, so it stays whenever swapping.',
        anchor: '[data-tour="mirror"]',
        needs: ({ panel, settings }) => 'settings' in panel && 'flip' in settings,
        side: 'left',
        align: 'center',
        enter: () => { openPanelSection('settings') },
    },
    {
        id: 'outro',
        title: 'You’re Ready to Play',
        body: 'The canvas is yours to set up however you like. Find opponents and report bugs anytime on our Discord.',
        anchor: null,
    }
]

const offered = shallowRef(steps)
const index = ref(0)

export const tutorial_open = ref(false)
export const tutorial_step = computed(() => (tutorial_open.value ? offered.value[index.value] ?? null : null))
export const tutorial_index = computed(() => index.value)
export const tutorial_count = computed(() => offered.value.length)
export const tutorial_isFirst = computed(() => index.value === 0)
export const tutorial_isLast = computed(() => index.value === offered.value.length - 1)

function goto(i) {
    const list = offered.value
    const next = Math.max(0, Math.min(list.length - 1, i))
    index.value = next
    list[next].enter?.()
}

export function tutorialNext() {
    if (tutorial_isLast.value) return tutorialFinish()
    goto(index.value + 1)
}

export function tutorialBack() {
    goto(index.value - 1)
}

function close() {
    tutorial_open.value = false
    markTutorialSeen(TUTORIAL_ID)
    openDeckbox()
}

export const tutorialSkip = close
export const tutorialFinish = close

export function tutorialStart() {
    goto(0)
    tutorial_open.value = true
}

export function tutorialStartIfUnseen() {
    if (hasSeenTutorial(TUTORIAL_ID)) {
        openDeckbox()
        return
    }
    tutorialStart()
}

let advance_timer = 0

function advanceFrom(stepId) {
    if (tutorial_step.value?.id !== stepId) return
    clearTimeout(advance_timer)
    advance_timer = setTimeout(() => {
        if (tutorial_step.value?.id === stepId) tutorialNext()
    }, ADVANCE_DELAY)
}

export function bindTutorial(table, controls) {
    offered.value = steps.filter(step => !step.needs || step.needs(controls))

    table.seats.count.listen((now, before) => {
        if (now > before) advanceFrom('seat-add')
    })
    table.seats.myId.listen(() => advanceFrom('seat-change'))
    table.seats.myMirror.listen(() => advanceFrom('mirror'))
}
