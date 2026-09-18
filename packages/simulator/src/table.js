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

    setStrict(strict)
    if (theme !== undefined) adoptTheme(theme)
    if (assets) setAssetResolvers(assets)
    mp.setRelayUrl(relay)

    mp.startMultiplayer()
    const stops = [startSeats(), startSeatSetup()]

    const followSeat = () => {
        canvas.setHomePoint(tableFocus())
        canvas.setMirror(ownSeatMirror.get())
        canvas.centerStage()
    }
    followSeat()
    stops.push(derived([mySeatId, ownSeatMirror], ([id, mirror]) => `${id}|${mirror}`).listen(followSeat))

    stops.push(seatCount.listen(() => canvas.refreshWorldDecor()))

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

    function setArt({ surfaces = {}, puff = null } = {}) {
        setSurfaceTextures(surfaces)
        setPuffSheet(puff)
        canvas.refreshWorldSurface()
    }

    function setTheme(theme) {
        adoptTheme(theme)
        if (adopted_config !== undefined) configureStage(adopted_config)
        canvas.refreshWorldSurface()
        canvas.refreshWorldEdge()
    }

    let mounted = false

    async function mount(element, { deck = null } = {}) {
        if (mounted) return
        mounted = true
        warnIfUnthemed()
        await canvas.initCanvas(element)

        setSeatCreatedHook(onSeatAdded)

        spawnOpeningDefaults().then(() => dealQueryDeck(deck))
    }

    function unmount() {
        if (!mounted) return
        mounted = false

        setSeatCreatedHook(null)
        cancelOpeningDefaults()
        cancelQueryDeck()

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
        inspect: () => ({ ...canvas.inspectScene(), modules: { canvas, tactility } }),

        setGame,
        setAssets: (resolvers) => setAssetResolvers(resolvers),
        setRelay: (url) => mp.setRelayUrl(url),
        setArt,
        setTheme,

        on: onTableEvent,
        reset: () => resetTable(),

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
