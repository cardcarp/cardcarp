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
export { getApp } from './scene.js'
export { onTransformEnd, getSelectRect, setChromeVisible, pruneSelection, dropFromSelection, withRemoteApply, setSelection } from './selection.js'
export { showDropFootprint, hideDropFootprint } from './selection.js'
import {
    initChips, destroyChips, chip_hidden, chip_locked, setChipsHidden, setChipsLocked,
} from './chip.js'
import { initSelection, broadcastSelectionUI, getSelected, setSelection, dropFromSelection } from './selection.js'
import { initTools, getActiveTool, getActiveToolId, setActiveTool, getToolForNode } from './tools/index.js'
import { refreshAllGroups as cardRefreshAllGroups, clearGroupSizes as cardClearGroupSizes } from './tools/card.js'

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

export async function initCanvas(container) {
    await initScene(container)
    initSelection()
    initPointer()
    initTools()
    initChips()

    initTactility()
    initPoof()
    resetScenery()

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

export function setTool(id) {
    cancelSelecting()
    setActiveTool(id)

    currentTool.set(id)

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

export function setMirror(value) {
    _setMirror(value)
    if (!getApp()) return

    cardRefreshAllGroups()
    broadcastSelectionUI(true)
}

export function toggleMirror() {
    setMirror(!mirror_view.get())
}

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

export function resetScenery() {
    setPlaymatHidden(false)
    setPlaymatLocked(true)
    setChipsHidden(true)
    setChipsLocked(true)
}

export { getSelected, broadcastSelectionUI }
export { getToolForNode, getActiveTool, getActiveToolId }
export { zoomStageBy, panStageBy }
