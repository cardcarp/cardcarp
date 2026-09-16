// The table as one object: what an app creates, and the only door its UI uses.
//
//   const table = createTable({ assets, relay, strict, theme })
//   const off = table.on('reset', () => …)
//   await table.mount(element, { deck })
//   table.setGame({ id, config, manifest, error, cardConfig })
//   table.cards.shuffle(groupId)
//   table.unmount()
//
// It gathers what used to be reached for module by module:
//
//   lifecycle   mount, unmount and destroy, and inspect for a debugger
//   inputs      setGame, setAssets, setRelay, setArt, setTheme — what the table is handed rather than reads
//   moments     on(name, fn), for what the table announces (see events.js), and reset()
//   the table   a namespace per thing on it — tools, selection, cards, hand, seats, room, dice,
//               counters, rects, arrows, text, view, scenery, accessories, pointer — each holding
//               that thing's state and its verbs
//
// State is handed out read-only (state/store.js readonly): a UI renders from it and changes the
// table only through the verbs, so the canvas and the room hear about everything that happens. Verbs
// are plain functions, safe to take off their namespace: `const { shuffle } = table.cards`.
//
// One table per page, by design. The stores behind this are module state, so a second table would
// be a second handle on the same one, and createTable refuses to make it.

import * as canvas from './canvas-pixi/index.js'
import * as tactility from './canvas-pixi/tactility.js'
import { toolIds } from './canvas-pixi/tools/index.js'
import { setPuffSheet } from './canvas-pixi/poof.js'
import { setSurfaceTextures } from './canvas-pixi/surface.js'
import * as mp from './multiplayer.js'
import {
    addSeat, canAddSeat, claimSeat, flipHandEntry, hand, mySeatId, ownSeatMirror, ownSeatSleeve,
    removeSeat, resetSeatLayout, seatCount, seatLayoutStale, seatRoster, seats, setOwnSeatMirror,
    setSeatCreatedHook, startSeats, updateSeat,
} from './seats.js'
import {
    canvasDragDiscarded, canvasDragging, canvasPressActive, currentTool, handFlipFocused, handFocusId,
    uiSelection,
} from './store.js'
import { onTableEvent } from './events.js'
import { setGame as adoptGame } from './game.js'
import { setAssetResolvers } from './assets.js'
import { setTheme as adoptTheme, warnIfUnthemed } from './theme.js'
import { derived, readonly, setStrict } from './state/store.js'
import { configureStage, tableFocus } from './stage.js'
import { cancelOpeningDefaults, onSeatAdded, resetTable, spawnOpeningDefaults, startSeatSetup } from './seat-setup.js'
import { cancelQueryDeck, dealQueryDeck } from './deck-link.js'
import { buildDeckDict } from './deal.js'
import { accessoryList, adderFor } from './accessory.js'

let created = false

export function createTable({ assets = null, relay = null, strict = false, theme = undefined } = {}) {
    if (created) throw new Error('[table] a page holds one table, and createTable has already made it')
    created = true

    // First, so every value that leaves a store is frozen in development from the start.
    setStrict(strict)
    // The look, before anything is made in it: starting the seats below deals a fresh profile its
    // first seat, in the theme's first seat colour. A theme given only later would find that seat
    // already wearing the neutral fallback.
    if (theme !== undefined) adoptTheme(theme)
    if (assets) setAssetResolvers(assets)
    mp.setRelayUrl(relay)

    // What used to run as the modules loaded: the seat migration and the hand's push to the relay,
    // the listener that settles a new seat, a peer's reset, and the seats' transport. Started here,
    // once, so importing the table does nothing until a page asks for one.
    mp.startMultiplayer()
    const stops = [startSeats(), startSeatSetup()]

    // The active seat drives the view: which way round the table is, and where "centred" is. One path
    // from seat state to render — the mirror button, sitting somewhere else and a snapshot restoring
    // seats all arrive as a change to the active seat's id or mirror. A seat claim is arbitrated by
    // the relay when online, so this follows the seat rather than the click. Run now as well, so a
    // reload adopts the stored seat's end before there is a canvas: setMirror records it and
    // initScene applies it.
    const followSeat = () => {
        canvas.setHomePoint(tableFocus())
        canvas.setMirror(ownSeatMirror.get())
        // Unconditional: setMirror does nothing when the value has not changed, but a seat swap should
        // recentre either way rather than leave you wherever you had wandered to.
        canvas.centerStage()
    }
    followSeat()
    stops.push(derived([mySeatId, ownSeatMirror], ([id, mirror]) => `${id}|${mirror}`).listen(followSeat))

    // A new pair widens the world by a whole stage. Only the decoration has to hear about it — every
    // layout position is computed from its own seat's anchor — but the dots and the seam are what tell
    // the player the world got bigger.
    stops.push(seatCount.listen(() => canvas.refreshWorldDecor()))

    // === Inputs ===

    // The game, as it lands (see game.js), and with a new config the table's shape. Seat anchors are
    // derived from the geometry, so a config that moves it moves where every anchor belongs: anchors
    // only, not a re-deal, because the opening deal waits for the config before laying anything out.
    let adopted_config
    function setGame(game = {}) {
        adoptGame(game)
        const config = game.config ?? null
        if (config === adopted_config) return
        adopted_config = config
        configureStage(config)
        canvas.refreshWorldDecor()
        canvas.refreshWorldSurface()
        canvas.refreshWorldEdge()
        if (seatLayoutStale()) resetSeatLayout()
    }

    // An app's furniture: textures a game config can name, and the sheet a delete puffs with. Either
    // may be absent; the table ships no art of its own.
    function setArt({ surfaces = {}, puff = null } = {}) {
        setSurfaceTextures(surfaces)
        setPuffSheet(puff)
        canvas.refreshWorldSurface()
    }

    // An app's look for the canvas: its colours and its font (see theme.js). Anything it leaves out
    // draws in a neutral grey, and the table names what it filled in. createTable takes the first one,
    // and should, since the first seat is coloured as the table is made; this is for changing it later.
    // The table's surface and edge follow at once, and what is already on the table keeps the look it
    // was drawn in until it is next redrawn.
    function setTheme(theme) {
        adoptTheme(theme)
        // Where a game's config is silent, its surface and edge are the theme's — so the config already
        // held is adopted again, to pick the new ones up.
        if (adopted_config !== undefined) configureStage(adopted_config)
        canvas.refreshWorldSurface()
        canvas.refreshWorldEdge()
    }

    // === Lifecycle ===

    let mounted = false

    async function mount(element, { deck = null } = {}) {
        if (mounted) return
        mounted = true
        // A table no one themed still draws, in greys. Said once, here, where it first shows.
        warnIfUnthemed()
        await canvas.initCanvas(element)

        // After the canvas: a seat's kit needs a scene to be dealt onto.
        setSeatCreatedHook(onSeatAdded)

        // Chained, not run alongside: the opening deal ends by clearing the placed-seats flag, and a
        // ?deck= deal made before that would lose its opening-deal status. Not awaited — both wait on
        // downloads, and a mount has no reason to.
        spawnOpeningDefaults().then(() => dealQueryDeck(deck))
    }

    function unmount() {
        if (!mounted) return
        mounted = false

        // Before the canvas goes, so nothing can be dealt onto a scene that is going away.
        setSeatCreatedHook(null)
        cancelOpeningDefaults()
        cancelQueryDeck()

        // The room belongs to the table, not to whichever panel opened it: leaving the table leaves the
        // room rather than holding one of its seats open behind a page that no longer shows it.
        mp.disconnect()
        mp.detachMultiplayer()
        canvas.destroyCanvas()
    }

    function destroy() {
        unmount()
        for (const stop of stops.splice(0)) stop()
        created = false
    }

    const ro = readonly
    const ns = (members) => Object.freeze(members)

    return Object.freeze({
        mount,
        unmount,
        destroy,
        // A handle onto the live scene and the modules behind it, for a debugger — not an API.
        inspect: () => ({ ...canvas.inspectScene(), modules: { canvas, tactility } }),

        setGame,
        setAssets: (resolvers) => setAssetResolvers(resolvers),
        setRelay: (url) => mp.setRelayUrl(url),
        setArt,
        setTheme,

        on: onTableEvent,
        reset: () => resetTable(),

        // What a player can pick up: the ids `set` takes. Which of them a UI puts in reach, and what it
        // calls them, is the UI's — the table carries no labels, icons or keys.
        tools: ns({
            current: ro(currentTool),
            ids: toolIds,
            set: canvas.setTool,
        }),

        selection: ns({
            current: ro(uiSelection),
            delete: mp.selectionDelete,
            align: mp.selectionAlign,
            moveZ: mp.moveZ,
        }),

        cards: ns({
            add: mp.addCard,
            addDeck: mp.addDeck,
            buildDeck: buildDeckDict,
            draw: mp.cardDraw,
            shuffle: mp.cardShuffle,
            flip: mp.cardFlip,
            rotate: mp.cardRotate,
            group: mp.cardMakeGroup,
            ungroup: mp.cardUngroup,
            emptyHand: mp.cardEmptyHand,
            sendToHand: mp.cardSendToHand,
            setGroupOrder: mp.cardSetGroupOrder,
            groupCards: mp.cardGetGroupCards,
            selectedGroupId: mp.cardGetSelectedGroupId,
            changeSleeve: mp.cardChangeSleeveColor,
            worldSize: canvas.cardWorldSize,
            groupRevision: ro(canvas.cardGroupRevision),
        }),

        hand: ns({
            cards: ro(hand),
            focus: ro(handFocusId),
            setFocus: (handEntryId) => handFocusId.set(handEntryId ?? null),
            flip: flipHandEntry,
            flipFocused: handFlipFocused,
            drop: mp.dropFromHand,
            showFootprint: canvas.showDropFootprint,
            hideFootprint: canvas.hideDropFootprint,
        }),

        seats: ns({
            list: ro(seats),
            myId: ro(mySeatId),
            roster: ro(seatRoster),
            count: ro(seatCount),
            canAdd: ro(canAddSeat),
            mySleeve: ro(ownSeatSleeve),
            myMirror: ro(ownSeatMirror),
            add: addSeat,
            claim: claimSeat,
            remove: removeSeat,
            update: updateSeat,
            setMyMirror: setOwnSeatMirror,
        }),

        room: ns({
            status: ro(mp.connectionStatus),
            code: ro(mp.roomCode),
            error: ro(mp.connectionError),
            CODE_MIN: mp.ROOM_CODE_MIN,
            normalizeCode: mp.normalizeRoomCode,
            isValidCode: mp.isValidRoomCode,
            // The canvas listeners that stream a room's moves are attached on the way in, as they always
            // were: offline nothing needs them.
            start: () => { mp.initMultiplayer(); return mp.startRoom() },
            connect: (code, ticket) => { mp.initMultiplayer(); return mp.connect(code, ticket) },
            disconnect: mp.disconnect,
        }),

        dice: ns({
            roll: mp.diceRoll,
            increment: mp.diceIncrement,
            decrement: mp.diceDecrement,
            changeVariant: mp.diceChangeVariant,
        }),

        counters: ns({
            increment: mp.counterIncrement,
            decrement: mp.counterDecrement,
            changeVariant: mp.counterChangeVariant,
        }),

        rects: ns({ changeColor: mp.rectChangeColor }),
        arrows: ns({ changeColor: mp.arrowChangeColor }),

        text: ns({
            changeColor: mp.textChangeColor,
            commitEdit: mp.commitTextEdit,
            setDraft: canvas.setTextDraft,
            stageColor: canvas.stageTextColor,
        }),

        view: ns({
            zoom: canvas.zoomStage,
            clientToWorld: canvas.clientToWorld,
            scale: canvas.getStageScale,
        }),

        scenery: ns({
            playmatsHidden: ro(canvas.playmat_hidden),
            playmatsLocked: ro(canvas.playmat_locked),
            chipsHidden: ro(canvas.chip_hidden),
            chipsLocked: ro(canvas.chip_locked),
            togglePlaymatsHidden: canvas.togglePlaymatHidden,
            togglePlaymatsLocked: canvas.togglePlaymatLocked,
            toggleChipsHidden: canvas.toggleChipsHidden,
            toggleChipsLocked: canvas.toggleChipsLocked,
        }),

        accessories: ns({
            list: accessoryList,
            adderFor,
        }),

        pointer: ns({
            dragging: ro(canvasDragging),
            dragDiscarded: ro(canvasDragDiscarded),
            pressed: ro(canvasPressActive),
        }),
    })
}
