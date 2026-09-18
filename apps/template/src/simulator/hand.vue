<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { Motion } from 'motion-v'

import { useStore } from './composable/use-store.js'
import { is_dragging, mouseover_cell_card, mouseleave_cell_card, preview_hide } from '@cardcarp/core/store/preview.js'

// Composables
import { useImage } from '@cardcarp/core/composable/image.js'
import { hasCardBack, CARD_BACK_VARIANT } from '@cardcarp/core/card.js'
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useTable } from './use-table.js'
import { isDoubleTap, resetDoubleTap, TAP_MOVE_SLOP, LIFT_SCALE, LIFT_RISE_PX } from '@cardcarp/simulator'

const { focus: handFocusId, setFocus: setHandFocus, cards: hand, flip: flipHandEntry, showFootprint: showDropFootprint, hideFootprint: hideDropFootprint, drop: dropFromHand } = useTable().hand
const { dragging: canvasDragging, dragDiscarded: canvasDragDiscarded } = useTable().pointer
const { mySleeve: ownSeatSleeve } = useTable().seats
const { clientToWorld, scale: getStageScale } = useTable().view
const { worldSize: cardWorldSize, sendToHand: cardSendToHand } = useTable().cards

// Assign
const { card_size, card_config } = useGameStore()
const { width: windowWidth, height: windowHeight } = useWindowSize()
const { card_src, card_back_src } = useImage()

const hand_card_list = useStore(hand)
const own_seat_sleeve = useStore(ownSeatSleeve)
const is_canvas_dragging = useStore(canvasDragging)

const isDropzoneHover = ref(false)

const sleeveCss = computed(() => `hsl(${own_seat_sleeve.value})`)

function handCardSrc(card) {
    return card.faceDown ? card_back_src(card) : card_src(card)
}

function onCardEnter(event, card) {
    setHandFocus(card.handEntryId)
    const variant = card.faceDown && hasCardBack(card) ? CARD_BACK_VARIANT : ''
    mouseover_cell_card(event, card, null, null, variant)
}

function onCardLeave() {
    if (!is_dragging.value) setHandFocus(null)
    mouseleave_cell_card()
}

watch(hand_card_list, (list) => {
    const focus_id = handFocusId.get()
    if (!focus_id) return
    if (list.some(entry => entry.handEntryId === focus_id)) return

    setHandFocus(null)
    preview_hide()
})

const HAND_CARD_WIDTH_MIN = 72
const HAND_CARD_WIDTH_MAX = 100
const HAND_WIDTH_FROM = 667
const HAND_WIDTH_TO = 1280

const handCardWidth = computed(() => {
    const span = HAND_WIDTH_TO - HAND_WIDTH_FROM
    const progress = Math.min(1, Math.max(0, (windowWidth.value - HAND_WIDTH_FROM) / span))
    return Math.round(HAND_CARD_WIDTH_MIN + (HAND_CARD_WIDTH_MAX - HAND_CARD_WIDTH_MIN) * progress)
})

const handCardSize = computed(() => {
    const { width, height } = card_size.value
    if (!(width > 0) || !(height > 0)) return null
    const cardWidth = handCardWidth.value
    return { width: cardWidth, height: cardWidth * (height / width) }
})

const handZoneHeight = computed(() => (handCardSize.value?.height ?? 0) * 0.9)

const handGlowHeight = computed(() => Math.round(handZoneHeight.value * 0.45))

const DROPZONE_GLOW = 'linear-gradient(to top,'
    + ' rgba(59, 130, 246, 0.45) 0%,'
    + ' rgba(59, 130, 246, 0.22) 45%,'
    + ' rgba(59, 130, 246, 0) 100%)'

function trackDropzone(e) {
    isDropzoneHover.value = e.clientY >= windowHeight.value - handZoneHeight.value
}

watch(is_canvas_dragging, (now, prev) => {
    if (now) {
        isDropzoneHover.value = false
        window.addEventListener('pointermove', trackDropzone)
        return
    }

    window.removeEventListener('pointermove', trackDropzone)
    if (prev && isDropzoneHover.value && !canvasDragDiscarded.get()) cardSendToHand()
    isDropzoneHover.value = false
})

onBeforeUnmount(() => {
    window.removeEventListener('pointermove', trackDropzone)
})

function calculateFanPositions(cardsCount, currentWidth, currentHeight) {
    const layout = []

    if (cardsCount === 0) return layout

    const size = handCardSize.value
    if (!size) return layout
    const { width: cardWidth, height: cardHeight } = size

    const containerWidth = Math.min(
        currentWidth * .5,
        Math.max(cardWidth, (cardsCount - 1) * cardWidth * 0.8)
    )

    const angleMax = Math.PI * 0.056
    const arcRadius = containerWidth / (2 * Math.sin(angleMax / 2))

    const offsetX = currentWidth / 2 - containerWidth / 2
    const offsetY = currentHeight - cardHeight * 0.4

    for (let i = 0; i < cardsCount; i++) {
        const progress = cardsCount > 1 ? i / (cardsCount - 1) : 0.5
        const angle = (progress - 0.5) * angleMax

        const x = Math.sin(angle) * arcRadius + containerWidth / 2 - cardWidth / 2 + offsetX
        const y = arcRadius * (1 - Math.cos(angle)) - cardHeight / 2 + offsetY
        const rotateZ = angle * (180 / Math.PI)

        layout.push({ x, y, rotateZ })
    }

    return layout
}

const cardPositions = computed(() => {
    return calculateFanPositions(
        hand_card_list.value.length, 
        windowWidth.value, 
        windowHeight.value
    )
})

let grab_frac = { x: 0.5, y: 0.5 }

let down_point = null

function onCardPointerDown(event) {
    down_point = { x: event.clientX, y: event.clientY }

    const rect = event.currentTarget?.getBoundingClientRect()
    if (!rect?.width || !rect?.height) return
    grab_frac = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height,
    }
}

function onCardPointerUp(event, card) {
    const from = down_point
    down_point = null
    if (!from) return

    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > TAP_MOVE_SLOP) {
        resetDoubleTap()
        return
    }

    if (!isDoubleTap(card.handEntryId, event.clientX, event.clientY)) return
    flipHandEntry(card.handEntryId)
}

// Stops iPad Safari from zooming on the double tap that flips a hand card.
function onCardTouchEnd(event) {
    if (event.cancelable) event.preventDefault()
}

function landingPoint(clientX, clientY) {
    const size = cardWorldSize()
    const scale = getStageScale()
    const dx = (grab_frac.x - 0.5) * size.width * scale
    const dy = (grab_frac.y - 0.5) * size.height * scale
    return { ...clientToWorld(clientX - dx, clientY - dy), size }
}

function overHand(clientY) {
    return clientY >= windowHeight.value - handZoneHeight.value
}

function pointOf(event, info) {
    const clientX = info?.point?.x ?? event?.clientX
    const clientY = info?.point?.y ?? event?.clientY
    return clientX == null || clientY == null ? null : { clientX, clientY }
}

const drag_id = ref(null)
const drag_style = ref(null)

function onCardDragStart(event, info, card) {
    is_dragging.value = true
    setHandFocus(card.handEntryId)

    hideDropFootprint()

    const hand = handCardSize.value
    const size = cardWorldSize()
    const scale = getStageScale()
    if (!hand?.width || !(size?.width > 0) || !(scale > 0)) return

    drag_id.value = card.handEntryId
    drag_style.value = {
        transform: `translateY(${-LIFT_RISE_PX * scale}px) scale(${(size.width * scale) / hand.width * LIFT_SCALE})`,
        transformOrigin: `${grab_frac.x * 100}% ${grab_frac.y * 100}%`,
    }
}

function clearDragPose() {
    drag_id.value = null
    drag_style.value = null
}

function onCardDrag(event, info) {
    const at = pointOf(event, info)
    if (!at || overHand(at.clientY)) return hideDropFootprint()

    const { x, y, size } = landingPoint(at.clientX, at.clientY)
    showDropFootprint(x, y, size.width, size.height)
}

function onCardDragEnd(event, info, card) {
    is_dragging.value = false
    hideDropFootprint()
    clearDragPose()

    const at = pointOf(event, info)
    if (!at) return
    if (overHand(at.clientY)) return

    const { x, y } = landingPoint(at.clientX, at.clientY)
    dropFromHand(card, card_config.value, x, y)
    if (handFocusId.get() === card.handEntryId) setHandFocus(null)
}
</script>

<template lang="pug">
    .dropzone-hand(
        :class="{ active: is_canvas_dragging, over: isDropzoneHover }"
        :style="{ height: `${handGlowHeight}px`, backgroundImage: DROPZONE_GLOW }"
        class="absolute left-0 bottom-0 w-full opacity-0 z-40 pointer-events-none transition-[opacity,transform] duration-150 ease-out translate-y-3 [&.over]:translate-y-0 [&.over]:opacity-100"
    )
    .hand(
        :style="{ '--hand-card-w': `${handCardSize?.width ?? 0}px`, '--hand-card-h': `${handCardSize?.height ?? 0}px` }"
        class="group/hand absolute inset-0 w-full h-20 z-40 pointer-events-none touch-manipulation"
    )
        Motion.card(
            v-for="(card, index) in hand_card_list"
            :key="card.handEntryId"
            :drag="true"
            :dragSnapToOrigin="true"
            :style="{ left: `${cardPositions[index]?.x || 0}px`, top: `${cardPositions[index]?.y || 0}px` }"
            :animate="{ rotate: cardPositions[index]?.rotateZ || 0 }"
            :whileHover="{ y: -16, rotate: 0 }"
            :whileDrag="{ rotate: 0 }"
            @pointerdown="onCardPointerDown"
            @pointerup="onCardPointerUp($event, card)"
            @touchend="onCardTouchEnd"
            :onDragStart="(e, info) => onCardDragStart(e, info, card)"
            :onDrag="(e, info) => onCardDrag(e, info)"
            :onDragEnd="(e, info) => onCardDragEnd(e, info, card)"
            class="absolute w-(--hand-card-w) h-(--hand-card-h) z-40 pointer-events-auto"
            style="touch-action: none"
            @pointerenter="onCardEnter($event, card)"
            @pointerleave="onCardLeave"
        )
            .skin(
                :style="drag_id === card.handEntryId ? drag_style : null"
                class="size-full bg-black border border-white/5 rounded-md transition-transform duration-150 ease-out"
            )
                img(
                    v-if="handCardSrc(card)"
                    class="size-full object-cover drag-none"
                    :src="handCardSrc(card)"
                    draggable="false"
                )
                .back(
                    v-else
                    :style="{ backgroundColor: sleeveCss }"
                    class="size-full rounded-md"
                )
</template>