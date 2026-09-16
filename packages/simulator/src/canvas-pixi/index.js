// The barrel — and the whole reason this migration can end in a one-line change.
//
// canvas/index.js exports 87 names. Nothing outside canvas/ holds a Konva node except
// multiplayer.js: the seven toolbar components, the five panel components, hand.vue,
// shortcuts.js, seat-setup.js and accessory.js all call FUNCTIONS from this barrel and never
// touch a renderer object. That was not designed as a renderer seam, but it is one.
//
// So the target of this port is not "a Pixi table" — it is this file, presenting the identical
// surface. When every name below is filled in, view/table/index.vue changes its import path and
// Konva is deleted.
//
// Names are added here as each tool lands, so the gap between this file and canvas/index.js IS
// the remaining work, in a form that can be diffed rather than estimated.

import { currentTool } from '../store.js'
import { initTactility, destroyTactility } from './tactility.js'
import { initPoof, destroyPoof } from './poof.js'

import {
    initScene,
    destroyScene,
    getApp,
    getLayers,
    setStageDraggable,
    setLayersListening,
    zoomStageBy,
    panStageBy,
    mirror_view,
    setMirror as _setMirror,
    playmat_hidden,
    playmat_locked,
    setPlaymatHidden,
    setPlaymatLocked,
} from './scene.js'
import { initPointer, destroyPointer, cancelSelecting } from './pointer.js'
export { onDrag, topElementAt } from './pointer.js'
// getApp is the 'is there a canvas yet' check every caller outside this module needs, and the
// one multiplayer.js polls on. Konva's getStage() answered the same question.
export { getApp } from './scene.js'
export { onTransformEnd, getSelectRect, setChromeVisible, pruneSelection, dropFromSelection, withRemoteApply, setSelection } from './selection.js'
// The hand's landing mark. Drawn by the canvas but driven from hand.vue, because the thing being
// dragged is a DOM element and only the hand knows where it is.
export { showDropFootprint, hideDropFootprint } from './selection.js'
import {
    initChips, destroyChips, chip_hidden, chip_locked, setChipsHidden, setChipsLocked,
} from './chip.js'
import { initSelection, broadcastSelectionUI, getSelected, setSelection, dropFromSelection } from './selection.js'
import { initTools, getActiveTool, getActiveToolId, setActiveTool, getToolForNode } from './tools/index.js'
import { refreshAllGroups as cardRefreshAllGroups, clearGroupSizes as cardClearGroupSizes } from './tools/card.js'

// Re-exports — the public canvas API used by Vue components. Identical names to canvas/index.js.
export {
    zoomStage, clientToWorld, mirror_view, getWorldRotation, setWorldRotation,
    getViewportCenter, centerStage, setHomePoint, getStageScale, nameKeepsUpright,
    refreshWorldDecor, refreshWorldEdge, refreshWorldSurface, settleCamera, inspectScene,
} from './scene.js'

export {
    selectionDelete, moveZ, applyMoveZ, alignSelection, applyAlign, selectionUnits,
} from './selection.js'

export {
    addRect,
    changeColor as rectChangeColor,
    applyPatch as rectApplyPatch,
} from './tools/rect.js'
export {
    addArrow,
    changeColor as arrowChangeColor,
    applyPatch as arrowApplyPatch,
} from './tools/arrow.js'
export {
    addText,
    commitTextEdit,
    setTextDraft,
    stageTextColor,
    changeColor as textChangeColor,
    applyPatch as textApplyPatch,
} from './tools/text.js'
export {
    addBoard,
    applyPatch as boardApplyPatch,
} from './tools/board.js'
export {
    addMarker,
    applyPatch as markerApplyPatch,
} from './tools/marker.js'
export {
    addDice,
    roll as diceRoll,
    increment as diceIncrement,
    decrement as diceDecrement,
    changeVariant as diceChangeVariant,
    applyPatch as diceApplyPatch,
    applyRoll as diceApplyRoll,
} from './tools/dice.js'
export {
    addCounter,
    increment as counterIncrement,
    decrement as counterDecrement,
    changeVariant as counterChangeVariant,
    applyPatch as counterApplyPatch,
} from './tools/counter.js'

export {
    addCard,
    addDeck,
    cardWorldSize,
    flip as cardFlip,
    rotate as cardRotate,
    changeSleeveColor as cardChangeSleeveColor,
    draw as cardDraw,
    shuffle as cardShuffle,
    makeGroup as cardMakeGroup,
    ungroup as cardUngroup,
    getGroupDropSpec as cardGetGroupDropSpec,
    mergeIntoGroupTop as cardMergeIntoGroupTop,
    sendToHand as cardSendToHand,
    getSelectedGroupId as cardGetSelectedGroupId,
    getGroupCards as cardGetGroupCards,
    setGroupOrder as cardSetGroupOrder,
    setCardFaceDown as cardSetFaceDown,
    applyPatch as cardApplyPatch,
    applyMerge as cardApplyMerge,
    applyShuffle as cardApplyShuffle,
    refreshAllGroups as cardRefreshAllGroups,
    relayoutGroups as cardRelayoutGroups,
    projectGroupMoves as cardProjectGroupMoves,
    setGroupSizes as cardSetGroupSizes,
    clearGroupSizes as cardClearGroupSizes,
    adoptLocalGroupSize as cardAdoptLocalGroupSize,
    group_revision as cardGroupRevision,
} from './tools/card.js'

export { onCanvasAction, emitCanvasAction } from './observer.js'

// === Lifecycle ===
// initCanvas is now ASYNC, because Pixi's Application.init is. That is the one signature change
// the port forces above the barrel: view/table/index.vue's onMounted must await it. Everything
// else on this surface keeps its shape.
export async function initCanvas(container) {
    await initScene(container)
    initSelection()
    initPointer()
    initTools()
    initChips()

    initTactility()
    // Fire and forget: the sheet is fetched while the table is being dealt, so the first delete
    // does not wait on it. A delete that beats it still gets its puff (see poofNodes).
    initPoof()
    resetScenery()

    // Adopt whatever tool the session was already on, and let setTool publish it.
    setTool(currentTool.get())
    return getApp()
}

export function destroyCanvas() {
    destroyPoof()
    destroyTactility()
    destroyChips()
    destroyPointer()
    destroyScene()
}

// Wipe every element from the table, leaving the scenery and the chips. The snapshot-replay
// path calls this before rebuilding, so it has to take the group-size registry with it —
// stale authority outlives the nodes it described and would re-space the incoming piles wrong.
export function clearAllElements() {
    const { board, shape, card, accessory } = getLayers()
    for (const band of [board, shape, card, accessory]) {
        if (!band) continue
        for (const node of [...band.children]) node.destroy()
    }
    cardClearGroupSizes()
    setSelection([])
    broadcastSelectionUI(true)
}

// A node by its multiplayer id, across every element band.
//
// Konva answered this with stage.findOne(predicate) — a full-tree walk running the callback on
// every node, chrome included. There is no such traversal here, and it turns out not to be
// wanted: the bands are the only places an element can be, so the search is four arrays.
export function findNodeById(nodeId) {
    if (!nodeId) return null
    const { board, shape, card, accessory } = getLayers()
    for (const band of [card, accessory, shape, board]) {
        for (const node of band?.children ?? []) {
            if (node.nodeId === nodeId) return node
        }
    }
    return null
}

// === Tools ===
export function setTool(id) {
    cancelSelecting()
    setActiveTool(id)

    // Publish it. A UI's palette lights whichever entry matches `currentTool` (table.tools.current)
    // and calls setTool directly on click, so this write IS the highlight. The port had replaced
    // it with a watcher ON the tool, which meant
    // nothing ever wrote it and every tool button stayed unlit — the click changed the
    // canvas's behaviour and said nothing about it.
    currentTool.set(id)

    // Konva's stage.draggable + per-layer listening. Pan makes clicks pass through to the table
    // instead of grabbing whichever node is under the cursor; a drawing tool silences the same
    // bands so a press starts a shape rather than a selection.
    const isPan = id === 'pan'
    const isDrawing = ['rect', 'arrow', 'text'].includes(id)
    setStageDraggable(isPan)
    setLayersListening({
        shape: !isPan && !isDrawing,
        card: !isPan && !isDrawing,
        board: !isPan && !isDrawing,
        accessory: !isPan && !isDrawing,
    })
}

// === Mirror ===
export function setMirror(value) {
    // Always record the orientation, even before there is a canvas: the seat watcher in
    // view/table/index.vue runs immediately (during setup) so a reload adopts the stored seat's
    // end, and that fires a frame before onMounted builds the scene.
    _setMirror(value)
    if (!getApp()) return

    // Pile slot assignment is perspective-dependent (see relayoutGroup) — re-lay every stack so
    // decks keep fanning toward the viewer after a flip.
    cardRefreshAllGroups()
    broadcastSelectionUI(true)
}

export function toggleMirror() {
    setMirror(!mirror_view.get())
}

// === Hide / lock ===
// The Settings panel's two pairs of toggles, for the table's furniture: the mats everything is
// laid out on, and the chips saying who sits where. Each pair's state lives with the thing it
// acts on — the mats in scene.js next to their band, the chips in chip.js next to the map of
// them — and only the verbs are gathered here.
export { playmat_hidden, playmat_locked, chip_hidden, chip_locked }

function releasePlaymats() {
    if (!playmat_hidden.get() && !playmat_locked.get()) return
    dropFromSelection(node => node.kind === 'board')
}

export function togglePlaymatHidden() {
    setPlaymatHidden(!playmat_hidden.get())
    releasePlaymats()
}

export function togglePlaymatLocked() {
    setPlaymatLocked(!playmat_locked.get())
    releasePlaymats()
}

export function toggleChipsHidden() {
    setChipsHidden(!chip_hidden.get())
}

export function toggleChipsLocked() {
    setChipsLocked(!chip_locked.get())
}

// The state a table opens in, and the state Reset puts it back to: the scenery locked, nothing
// hidden. See canvas/index.js for why locked rather than loose.
export function resetScenery() {
    setPlaymatHidden(false)
    setPlaymatLocked(true)
    // Seat boxes start HIDDEN, unlike the mats. A box is a setup aid — it says which half of the
    // table is whose and who is sitting there — and its name is drawn in the middle of the seat's
    // region, which is exactly where the game gets played. Useful when you arrive, in the way,
    // ever after. See chip.js.
    setChipsHidden(true)
    setChipsLocked(true)
}

export { getSelected, broadcastSelectionUI }
export { getToolForNode, getActiveTool, getActiveToolId }
export { zoomStageBy, panStageBy }
