// What ptcg's table offers: the tools on the rail and the buttons under them, the toolbars and panel
// sections that follow a selection, the rest of the panel and the rows of its Settings, every key, and
// the colours and font the canvas draws with.
//
// The choices and what they do, in one place. Taking something out of this app is deleting its entry
// here, and everything that mentions it follows: the rail and the panel draw what is listed, the
// keyboard binds what is listed, and the shortcut sheet, the tooltips' key hints and the walkthrough
// read the same lists — so a key that goes leaves the sheet and its tooltip with it, and a panel
// section that goes takes its walkthrough steps along.
//
// Every list is keyed by id and ordered as written. The ids are how the rest of the UI names an entry
// (openPanelSection('seats'), keyHint('cards.shuffle')); the order is the order on screen.
//
// Handed to the UI by createSimulatorView (index.js) and read through useControls (use-controls.js), never
// imported by a component: the toolbars listed here read their key hints from these lists, so one
// importing this file would be importing itself back.

import { openPanelSection } from './ui.js'
import { useTable } from './use-table.js'

import ToolbarDeckbox from './toolbar/deckbox.vue'
import ToolbarAccessory from './toolbar/accessory.vue'

import ToolbarRect from './toolbar/rect.vue'
import ToolbarArrow from './toolbar/arrow.vue'
import ToolbarText from './toolbar/text.vue'
import ToolbarCard from './toolbar/card.vue'
import ToolbarDice from './toolbar/dice.vue'
import ToolbarCounter from './toolbar/counter.vue'
import ToolbarAsset from './toolbar/asset.vue'

import PanelCard from './panel/card.vue'
import PanelAlign from './panel/align.vue'
import PanelMultiplayer from './panel/multiplayer.vue'
import PanelSeats from './panel/seats.vue'
import PanelSettings from './panel/settings.vue'

// === The rail ===
// The tools a player picks up, top to bottom, keyed by the table's own tool ids (table.tools.ids). The
// table knows what each tool does; what it is called, what it looks like and how it behaves in the
// hand are this app's.
//
//   label       what its tooltip calls it
//   icon        path data for a 24-unit stroke icon
//   activeWhen  the tools that light it, where that is more than its own — Move stays lit while a held
//               key pans
//   cursor      the canvas cursor while it is in hand
//   once        back to Move after one use: a shape or a note is placed, not painted
const palette = {
    select: {
        label: 'Move',
        icon: ['M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z'],
        activeWhen: ['select', 'pan'],
    },
    rect: {
        label: 'Rectangle',
        icon: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z'],
        cursor: 'crosshair',
        once: true,
    },
    arrow: {
        label: 'Arrow',
        icon: ['M5 11V5H11', 'M5 5L19 19'],
        cursor: 'crosshair',
        once: true,
    },
    text: {
        label: 'Text',
        icon: ['M12 4v16', 'M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2', 'M9 20h6'],
        cursor: 'text',
        once: true,
    },
}

// The rail's other buttons, under the tools: the deck panel, and the accessories.
const toolbar = {
    deckbox: ToolbarDeckbox,
    accessory: ToolbarAccessory,
}

// The floating toolbars over a selection, keyed by the selection type each is for (uiSelection's
// `type`). The key names the entry rather than filtering it: every one is mounted and decides for
// itself whether the selection is its own, which is what lets the asset toolbar answer to boards and
// markers alike.
const selectionToolbars = {
    rect: ToolbarRect,
    arrow: ToolbarArrow,
    text: ToolbarText,
    card: ToolbarCard,
    dice: ToolbarDice,
    counter: ToolbarCounter,
    asset: ToolbarAsset,
}

// The right panel, top to bottom, keyed by section id — the id a section's collapse is remembered
// under (panel_section in ui.js) and openPanelSection opens.
//
//   card, align         contextual, always first: each draws only for a selection it answers to (align
//                       for any several objects, whatever their type). Figma's convention, and it holds
//                       for the same reason it holds there: what you selected is what you are looking
//                       at, so it belongs where the eye already is rather than below a row of controls
//                       you are not currently using.
//   multiplayer, seats  the room, then the roster.
//   settings            always last: zoom, flip and Reset Table, the controls that act on the whole
//                       surface rather than on anything selected. Last because Reset lives there and is
//                       the one control in the panel that throws the game away (see `settings` below).
//
// The cost is real and was briefly the argument for a fixed section on top instead: a section
// appearing and disappearing shifts everything under it, so selecting a deck pushes the rest down the
// panel. In use that turns out not to matter — the fixed sections are not what anyone is reaching for
// in the moment they select a pile, and the selection appearing under the cursor's own attention is
// worth more than their addresses staying put.
const panel = {
    card: PanelCard,
    align: PanelAlign,
    multiplayer: PanelMultiplayer,
    seats: PanelSeats,
    settings: PanelSettings,
}

// === Settings ===
// The rows of the panel's Settings section, top to bottom: the controls that treat the table as one
// surface rather than acting on anything selected. settings.vue draws three shapes of row —
//
//   buttons   a group of small buttons
//   button    one wide button standing for the whole row
//   confirm   a destructive button: it reads `label`, then `confirm` once pressed, and runs `press`
//             only on the second press
//
// — and a button is:
//
//   icon      path data for a 24-unit stroke icon, or { on, off } where the drawing follows the state
//   title     what hovering it says: a string, or a function of whether it is lit
//   on        a function returning the table store that lights it (a function because the table does
//             not exist yet when this file loads); left out for a button with no state
//   press     what pressing it does
//   tour      its name for the walkthrough (data-tour)

const ZOOM_OUT = ['M3 11a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'm21 21-4.3-4.3', 'M8 11h6']
const ZOOM_IN = [...ZOOM_OUT, 'M11 8v6']
const EYE = ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0']
// Struck through, once the thing is hidden.
const EYE_SHUT = [
    'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68',
    'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61',
    'M14.12 14.12a3 3 0 1 1-4.24-4.24',
    'm2 2 20 20',
]
// The shackle stays open until the thing is locked.
const PADLOCK_BODY = 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z'
const PADLOCK_OPEN = [PADLOCK_BODY, 'M7 11V7a5 5 0 0 1 9.9-1']
const PADLOCK_SHUT = [PADLOCK_BODY, 'M7 11V7a5 5 0 0 1 10 0v4']
const FLIP = [
    'M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5',
    'M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5',
    'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0',
    'm18 22-3-3 3-3',
    'm6 2 3 3-3 3',
]

const settings = {
    // The pointer-driven twin of the = and - keys. Both call the same zoom, so a click and a keypress
    // are the same step (1.25x) and the table's clamps apply either way. No anchor is passed, which
    // zooms about the viewport centre — right for a button, which has no position on the table to zoom
    // toward the way the wheel and pinch do.
    zoom: {
        label: 'Zoom',
        buttons: [
            { icon: ZOOM_OUT, title: 'Zoom out', press: () => useTable().view.zoom(-1) },
            { icon: ZOOM_IN, title: 'Zoom in', press: () => useTable().view.zoom(1) },
        ],
    },

    // Get the furniture out of the way, or nail it down. Two rows, for the two things on the table that
    // are scenery rather than pieces: the mats everything is laid out on, and the boxes that say which
    // half of the table is whose. The boxes start hidden and the mats do not, so the second row usually
    // reads as "show me who is where" rather than "get this out of my way" — which is why it is worth a
    // control at all rather than only a default. Both act on their whole class at once, which is what
    // makes them Settings; a per-object version belongs on that object's own selection toolbar.
    //
    // Hidden and locked stay separate flags even though hiding also puts a thing out of reach, so that
    // unhiding returns it to whichever of the two states the player left it in rather than always
    // handing it back loose. Local to this client, like zoom: a mat you have hidden is still on the
    // table for everyone else, and none of these flags cross the wire.
    playmat: {
        label: 'Playmat',
        buttons: [
            {
                icon: { on: EYE_SHUT, off: EYE },
                title: (on) => (on ? 'Show playmats' : 'Hide playmats'),
                on: () => useTable().scenery.playmatsHidden,
                press: () => useTable().scenery.togglePlaymatsHidden(),
            },
            {
                icon: { on: PADLOCK_SHUT, off: PADLOCK_OPEN },
                title: (on) => (on ? 'Unlock playmats' : 'Lock playmats in place'),
                on: () => useTable().scenery.playmatsLocked,
                press: () => useTable().scenery.togglePlaymatsLocked(),
            },
        ],
    },
    seatBox: {
        label: 'Seat Box',
        buttons: [
            {
                icon: { on: EYE_SHUT, off: EYE },
                title: (on) => (on ? 'Show seat boxes' : 'Hide seat boxes'),
                on: () => useTable().scenery.chipsHidden,
                press: () => useTable().scenery.toggleChipsHidden(),
            },
            {
                icon: { on: PADLOCK_SHUT, off: PADLOCK_OPEN },
                title: (on) => (on ? 'Unlock seat boxes' : 'Lock seat boxes in place'),
                on: () => useTable().scenery.chipsLocked,
                press: () => useTable().scenery.toggleChipsLocked(),
            },
        ],
    },

    // Flip View turns the view to the far end of the table. The orientation is stored on the SEAT, not
    // the client: a seat is an end of the table, so a goldfish left facing the far side keeps facing
    // that way for whoever claims it next. This writes the seat and stops; the table watches the active
    // seat and drives the canvas from it, so there is one path from intent to render. The flag rides the
    // wire as ordinary seat state — peers hold it but never act on it.
    flip: {
        label: 'Flip View',
        button: {
            icon: FLIP,
            on: () => useTable().seats.myMirror,
            press: () => {
                const { myMirror, setMyMirror } = useTable().seats
                setMyMirror(!myMirror.get())
            },
            tour: 'mirror',
        },
    },

    // Last, and behind a rule: the rows above change what you see, and this one destroys what everyone
    // at the table has. Offered online and off — clearing the table is something anyone at it may do,
    // and online it clears it for the whole room.
    reset: {
        label: 'Reset Table',
        confirm: 'Tap to Confirm',
        press: () => useTable().reset(),
    },
}

// === Keys ===
// Every key, keyed by what it does. Bound by shortcuts.js behind the two guards every key shares — none
// fires while typing into a field or while a modal is open — and listed on the shortcut sheet
// (dialog-shortcut.vue) in this order, under these groups.
//
//   key      a useMagicKeys name: a key ('v'), a physical code ('keyS', 'digit1'), or a combination
//            ('shift+arrowDown')
//   keys     several names, any of which fires it
//   label    what the shortcut sheet calls it
//   group    the heading it sits under on the sheet
//   when     a further guard, handed the key state so it can ask about modifiers
//   action   what pressing it does
//   hold     a tool id instead of an action: held, the key puts that tool in hand; released, it hands
//            back whichever tool was there
//   hint     what the sheet and the tooltips print, where the key's own name would not say it
//   sheet    false to leave it off the sheet, or the one line that speaks for several entries
//
// An entry with neither `action` nor `hold` binds nothing. Those describe what the canvas does by
// itself — Alt on a drag, a double tap — so the sheet can mention them; editing one changes only what
// the sheet says.

const selection = () => useTable().selection.current.get()
const onCardSelection = () => selection().type === 'card'
const onGroupSelection = () => onCardSelection() && !!selection().data?.group
// G does whichever of the two the card toolbar is showing. canGroup and canUngroup are mutually
// exclusive by construction (several objects against exactly one pile), so the two entries can share
// the key without ever both firing.
const onGroupableSelection = () => onCardSelection() && !!selection().data?.canGroup
const onUngroupableSelection = () => onCardSelection() && !!selection().data?.canUngroup
const onDiceSelection = () => selection().type === 'dice'
// A hand card is under the pointer (or mid-drag out of the hand). Checked against the list rather than
// the focus alone, so an id left behind by a card that has since been played doesn't keep swallowing
// the key.
const onHandFocus = () => {
    const { cards, focus } = useTable().hand
    return cards.get().some(entry => entry.handEntryId === focus.get())
}

// F opens nothing: the scry list lives in the panel's card section, which is already on screen whenever
// a deck is selected. All the key has left to do is make sure it can be SEEN — the panel may be
// collapsed, or the section within it may be. The section follows the selection on its own.
function revealScry() {
    if (!useTable().cards.selectedGroupId()) return
    openPanelSection('card')
}

// Draw to hand on the number row, where the digit IS the count: an opening hand is one key instead of
// seven presses of the same one, and a mulligan to six is a different key rather than a different
// number of presses. Stops at 9 — 0 reads as ten only if you already know that is what it means, and
// it sits at the wrong end of the row for it. One line on the sheet for all nine, and the first carries
// the range as its hint because that is what the Draw button's tooltip has to say.
const drawToHand = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`cards.draw${i + 1}`, {
    key: `digit${i + 1}`,
    label: `Draw ${i + 1} to Hand`,
    group: 'card',
    when: onGroupSelection,
    action: () => useTable().cards.draw({
        groupId: useTable().cards.selectedGroupId(),
        count: i + 1,
        from: 'top',
        to: 'hand',
    }),
    ...(i === 0 ? { sheet: 'Draw to Hand (1–9 cards)', hint: '1–9' } : { sheet: false }),
}]))

const keys = {
    // --- Navigation ---
    'tool.select': {
        key: 'v',
        label: 'Move',
        group: 'navigation',
        action: () => useTable().tools.set('select'),
    },
    'tool.pan': {
        key: 'space',
        label: 'Pan (hold)',
        group: 'navigation',
        hold: 'pan',
    },
    'view.zoomIn': {
        key: 'equal',
        hint: '+',
        label: 'Zoom In',
        group: 'navigation',
        action: () => useTable().view.zoom(1),
    },
    'view.zoomOut': {
        key: 'minus',
        label: 'Zoom Out',
        group: 'navigation',
        action: () => useTable().view.zoom(-1),
    },

    // --- Anything selected ---
    // Layer order on the vertical arrows, rotation (below, for cards) on the horizontal ones: each key
    // points the way the card moves, which is the whole reason to spend the arrows on them.
    'selection.forward': {
        key: 'arrowUp',
        label: 'Send Forward',
        group: 'table',
        action: () => useTable().selection.moveZ(1),
    },
    // Bare ArrowDown is one layer; with Shift it is the whole way. The guard is what keeps them apart:
    // useMagicKeys leaves `arrowDown` true while Shift is held, so without it a Shift+ArrowDown would
    // fire BOTH entries — a wasted nodes:moveZ at every peer, and a card that took a step before it fell
    // to the bottom.
    'selection.back': {
        key: 'arrowDown',
        label: 'Send Back',
        group: 'table',
        when: (keys) => !keys.shift.value,
        action: () => useTable().selection.moveZ(-1),
    },
    'selection.bottom': {
        key: 'shift+arrowDown',
        label: 'Move to Bottom',
        group: 'table',
        action: () => useTable().selection.moveZ('bottom'),
    },
    // The canvas's own: it reads Alt on the drag itself.
    'selection.duplicate': {
        hint: 'Alt',
        label: 'Duplicate (drag)',
        group: 'table',
    },
    'selection.delete': {
        keys: ['backspace', 'delete'],
        hint: 'bksp',
        label: 'Delete',
        group: 'table',
        action: () => useTable().selection.delete(),
    },
    'dice.roll': {
        key: 'keyL',
        label: 'Roll Dice',
        group: 'table',
        when: onDiceSelection,
        action: () => useTable().dice.roll(),
    },

    // --- Cards ---
    'cards.rotateLeft': {
        key: 'arrowLeft',
        label: 'Rotate Left',
        group: 'card',
        when: onCardSelection,
        action: () => useTable().cards.rotate('ccw'),
    },
    'cards.rotateRight': {
        key: 'arrowRight',
        label: 'Rotate Right',
        group: 'card',
        when: onCardSelection,
        action: () => useTable().cards.rotate('cw'),
    },
    // H reveals/hides whatever card the pointer is on. A hand card wins over the canvas selection — the
    // hand sits on top of the stage, so hovering one is the more specific intent, and it keeps a
    // leftover canvas selection from flipping behind your back while you aim at a card you are about to
    // play face-down (traps, morphs, set cards).
    'cards.flip': {
        key: 'keyH',
        label: 'Reveal / Hide',
        group: 'card',
        when: () => onCardSelection() && !onHandFocus(),
        action: () => useTable().cards.flip(),
    },
    'hand.flip': {
        key: 'keyH',
        label: 'Reveal / Hide in Hand (hover)',
        group: 'card',
        when: onHandFocus,
        action: () => useTable().hand.flipFocused(),
    },
    // Not a key at all — the one card gesture that has to work on a tablet, where there is no keyboard
    // to press H on. The hint is the gesture's shape. Two steps in one gesture: a rotated card
    // straightens, a straight one turns over.
    'cards.tapTwice': {
        hint: '2×',
        label: 'Straighten, then Turn Over (tap twice)',
        group: 'card',
    },
    ...drawToHand,
    // Guarded on a non-empty hand for the same reason the toolbar greys the button: with nothing in
    // hand the key would fire an action with no visible effect.
    'cards.emptyHand': {
        key: 'keyE',
        label: 'Empty Hand to Pile',
        group: 'card',
        when: () => onGroupSelection() && useTable().hand.cards.get().length > 0,
        action: () => useTable().cards.emptyHand(),
    },
    'cards.shuffle': {
        key: 'keyS',
        label: 'Shuffle',
        group: 'card',
        when: onGroupSelection,
        action: () => useTable().cards.shuffle(),
    },
    'cards.scry': {
        key: 'keyF',
        label: 'Scry',
        group: 'card',
        when: onGroupSelection,
        action: revealScry,
    },
    'cards.group': {
        key: 'keyG',
        label: 'Make Group',
        sheet: 'Group / Ungroup',
        group: 'card',
        when: onGroupableSelection,
        action: () => useTable().cards.group(),
    },
    'cards.ungroup': {
        key: 'keyG',
        label: 'Ungroup',
        sheet: false,
        group: 'card',
        when: onUngroupableSelection,
        action: () => useTable().cards.ungroup(),
    },

    // --- Drawing ---
    'tool.rect': {
        key: 'r',
        label: 'Rectangle',
        group: 'draw',
        action: () => useTable().tools.set('rect'),
    },
    'tool.arrow': {
        key: 'a',
        label: 'Arrow',
        group: 'draw',
        action: () => useTable().tools.set('arrow'),
    },
    'tool.text': {
        key: 't',
        label: 'Text',
        group: 'draw',
        action: () => useTable().tools.set('text'),
    },
}

// === Theme ===
// How the canvas looks: its colours and the one font it draws words in, handed to the table by
// createSimulatorView (table.setTheme). The table keeps a neutral grey for anything left out and names
// it in a warning, so a line missing here shows up in the console rather than as a guess.
//
// CSS colours, written the way the stylesheet writes them. Keep them opaque — the table applies alphas
// of its own. The seat palette is spelled as bare HSL triples, because that is how a seat's sleeve is
// stored and sent to the room. @cardcarp/simulator's theme.js says what each value paints.
const theme = {
    // Its webfonts come from the stylesheet's @font-face. The table waits for the first family in the
    // stack before it measures any text.
    font: 'Google Sans Code, system-ui, sans-serif',

    table: {
        surface: '#1a1a1a',
        // A shade darker than the surface rather than another hue: the world's edge should register
        // without announcing itself, since it is a fact about the table's size and not a thing anyone
        // plays with.
        edge: '#111111',
        dots: '#333333',
        seam: { dark: '#000000', light: '#ffffff' },
    },

    // New seats take these in order. Saturated, and in a rotation that keeps neighbouring seats far
    // apart in hue — deliberately not the swatch order (toolbar/shared/colors.js), which opens on five
    // greys and would deal the first two players near-identical near-black backs.
    seats: [
        '202 80.3% 23.9%',   // blue
        '0 62.8% 30.6%',     // red
        '143.8 61.2% 20.2%', // green
        '28.4 72.5% 25.7%',  // amber
        '273.6 65.6% 32%',   // violet
        '175.9 60.8% 19%',   // teal
        '335.9 69% 30.4%',   // pink
        '87.6 61.2% 20.2%',  // olive
    ],

    // Blue for what you can reshape, amber for what you can pick up. The two selection styles differ in
    // colour as well as shape, which is what makes the rule legible without anyone explaining it — and
    // what tells a mixed selection's boxes from its rings at a glance. Red for either, held off the
    // table: there, the fact that matters is what letting go will do, and it is the same fact for both.
    selection: {
        outline: '#7dcdff',
        box: '#3c82f0',
        anchor: '#ffffff',
        handle: { fill: '#dddddd', stroke: '#666666' },
        marquee: '#3c82f0',
        piece: '#fbbf24',
        // One near-black hairline outside the amber, so a bright ring on pale card art keeps its edge.
        separator: '#0a0a0a',
        discard: '#dc2626',
    },

    card: {
        sleeve: '#1a1a1a',
        edge: '#ffffff',
        hover: '#60a5fa',
        shadow: '#000000',
        count: { fill: '#ffffff', stroke: '#000000' },
    },

    piece: { value: '#ffffff' },

    shape: { rect: 'hsl(0 0% 4%)', arrow: 'hsl(0 0% 90%)', text: 'white' },
}

export default { palette, toolbar, selectionToolbars, panel, settings, keys, theme }
