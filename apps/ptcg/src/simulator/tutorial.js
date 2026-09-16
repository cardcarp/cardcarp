// The table's first-run walkthrough.
//
// Seven steps, each one either centred (welcome, outro) or pinned to a real control. The
// steps do not reach into the components they point at: every target carries a
// `data-tour` attribute and the view resolves it by selector, so moving a button — or
// pointing at a different one — is an attribute change, not a chain of refs and props.
//
// It is also non-blocking on purpose. The overlay never captures the pointer, so the
// player can do the thing being described while it is being described, and the steps that
// have an obvious action (add a seat, sit somewhere else, flip the view) advance
// themselves the moment it happens. Next is there for the ones who would rather read.

import { computed, ref, shallowRef } from 'vue'

import { useProfileStore } from '@cardcarp/core/store/profile.js'
import { openPanelSection, openDeckbox } from './ui.js'
import { useTable } from './use-table.js'

const { hasSeenTutorial, markTutorialSeen } = useProfileStore()

// The key this walkthrough is remembered under in the profile. One id for every game: the
// table behaves identically in all of them, so being shown it once is enough.
export const TUTORIAL_ID = 'table'

// How long to leave the finished step on screen after the player performs its action, so
// the result is visible before the wizard moves on.
const ADVANCE_DELAY = 700

// `anchor` is a selector, or a list of them in most-preferred order — the first selector
// with anything on screen wins, which is how a step can follow a panel while it is open and
// fall back to the button that opens it. Where one selector matches several elements the LAST
// is taken, which is what makes the seat step point at the seat that was just added rather
// than the first in the list. A null anchor means the step is centred in the viewport instead.
//
// `enter` runs when the step becomes current and sets up whatever the step needs in order to
// be about anything — a panel opened so its target is on screen, or the second seat the seat
// step is describing. It never performs the step's own action, which stays the player's.
//
// `needs` asks this app's controls (controls.js) whether the step has anything to point at. A step
// whose control this app does not offer is left out of the walkthrough, rather than spotlighting
// nothing and waiting there.
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
        // Two anchors, most-preferred first. Open the card panel and the step slides out past
        // it rather than sitting on top of the very tabs it is describing — so the player can
        // read the step and drop a deck on the table in the same breath. Falls back to the
        // button while the panel is shut.
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
        // The step is about sitting somewhere other than where you are, so it needs somewhere
        // to point at. A player who read the last step rather than acting on it arrives here
        // with a single seat and a list of one — so make the second seat for them. Guarded
        // rather than unconditional because Back can re-enter this step, and because the
        // player may well have added their own.
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
        // Flip View lives in the panel's Settings section now, so the step has to open it — a
        // collapsed section is no more on screen than a shut panel is.
        enter: () => { openPanelSection('settings') },
    },
    {
        id: 'outro',
        title: 'You’re Ready to Play',
        body: 'The canvas is yours to set up however you like. Find opponents and report bugs anytime on our Discord.',
        anchor: null,
    }
]

// The steps this app's controls leave something to point at. Every step until bindTutorial has the
// controls to ask, which it does before anything can start the walkthrough.
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

// Start and Skip are the same close, and both mark the walkthrough seen: a player who
// dismissed it chose not to see it, and re-offering it on the next load is nagging. It
// stays reachable by hand from the menu.
function close() {
    tutorial_open.value = false
    markTutorialSeen(TUTORIAL_ID)
    // Whichever way it ended, the walkthrough leaves the player looking at an empty mat. Open
    // the deck panel on Decks so the next thing to do is on screen rather than behind an icon.
    openDeckbox()
}

export const tutorialSkip = close
export const tutorialFinish = close

export function tutorialStart() {
    goto(0)
    tutorial_open.value = true
}

// Called once by the view on mount. Only the untouched profile gets the walkthrough unasked;
// everyone else reaches it from the menu — and gets the deck panel instead, which is the same
// pointer at the same moment, minus the six steps they have already read.
export function tutorialStartIfUnseen() {
    if (hasSeenTutorial(TUTORIAL_ID)) {
        openDeckbox()
        return
    }
    tutorialStart()
}

// === Self-advancing steps ===
// One listener per step that has an action, each a no-op unless that step is current. Bound here
// rather than in a component so the rules live beside the steps they belong to; they are gated on
// `tutorial_open`, so they cost nothing the rest of the time.

let advance_timer = 0

function advanceFrom(stepId) {
    if (tutorial_step.value?.id !== stepId) return
    clearTimeout(advance_timer)
    advance_timer = setTimeout(() => {
        // Re-checked on the way out: the step can change during the delay.
        if (tutorial_step.value?.id === stepId) tutorialNext()
    }, ADVANCE_DELAY)
}

// Bound once the table exists, by createSimulatorView (index.js) — this module is imported before the UI
// has a table to listen to, or controls to ask.
export function bindTutorial(table, controls) {
    offered.value = steps.filter(step => !step.needs || step.needs(controls))

    table.seats.count.listen((now, before) => {
        if (now > before) advanceFrom('seat-add')
    })
    table.seats.myId.listen(() => advanceFrom('seat-change'))
    table.seats.myMirror.listen(() => advanceFrom('mirror'))
}
