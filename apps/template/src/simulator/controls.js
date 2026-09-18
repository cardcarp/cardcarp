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

const toolbar = {
    deckbox: ToolbarDeckbox,
    accessory: ToolbarAccessory,
}

const selectionToolbars = {
    rect: ToolbarRect,
    arrow: ToolbarArrow,
    text: ToolbarText,
    card: ToolbarCard,
    dice: ToolbarDice,
    counter: ToolbarCounter,
    asset: ToolbarAsset,
}

const panel = {
    card: PanelCard,
    align: PanelAlign,
    multiplayer: PanelMultiplayer,
    seats: PanelSeats,
    settings: PanelSettings,
}

const ZOOM_OUT = ['M3 11a8 8 0 1 0 16 0a8 8 0 1 0-16 0', 'm21 21-4.3-4.3', 'M8 11h6']
const ZOOM_IN = [...ZOOM_OUT, 'M11 8v6']
const EYE = ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'M9 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0']
const EYE_SHUT = [
    'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68',
    'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61',
    'M14.12 14.12a3 3 0 1 1-4.24-4.24',
    'm2 2 20 20',
]
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
    zoom: {
        label: 'Zoom',
        buttons: [
            { icon: ZOOM_OUT, title: 'Zoom out', press: () => useTable().view.zoom(-1) },
            { icon: ZOOM_IN, title: 'Zoom in', press: () => useTable().view.zoom(1) },
        ],
    },

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

    reset: {
        label: 'Reset Table',
        confirm: 'Tap to Confirm',
        press: () => useTable().reset(),
    },
}

const selection = () => useTable().selection.current.get()
const onCardSelection = () => selection().type === 'card'
const onGroupSelection = () => onCardSelection() && !!selection().data?.group
const onGroupableSelection = () => onCardSelection() && !!selection().data?.canGroup
const onUngroupableSelection = () => onCardSelection() && !!selection().data?.canUngroup
const onDiceSelection = () => selection().type === 'dice'
const onHandFocus = () => {
    const { cards, focus } = useTable().hand
    return cards.get().some(entry => entry.handEntryId === focus.get())
}

function revealScry() {
    if (!useTable().cards.selectedGroupId()) return
    openPanelSection('card')
}

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

    'selection.forward': {
        key: 'arrowUp',
        label: 'Send Forward',
        group: 'table',
        action: () => useTable().selection.moveZ(1),
    },
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
    'cards.tapTwice': {
        hint: '2×',
        label: 'Straighten, then Turn Over (tap twice)',
        group: 'card',
    },
    ...drawToHand,
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

const theme = {
    font: 'Google Sans Code, system-ui, sans-serif',

    table: {
        surface: '#1a1a1a',
        edge: '#111111',
        dots: '#333333',
        seam: { dark: '#000000', light: '#ffffff' },
    },

    seats: [
        '202 80.3% 23.9%',
        '0 62.8% 30.6%',
        '143.8 61.2% 20.2%',
        '28.4 72.5% 25.7%',
        '273.6 65.6% 32%',
        '175.9 60.8% 19%',
        '335.9 69% 30.4%',
        '87.6 61.2% 20.2%',
    ],

    selection: {
        outline: '#7dcdff',
        box: '#3c82f0',
        anchor: '#ffffff',
        handle: { fill: '#dddddd', stroke: '#666666' },
        marquee: '#3c82f0',
        piece: '#fbbf24',
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
