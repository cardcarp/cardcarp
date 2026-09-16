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

// The table, through its object (see use-table.js).
const { focus: handFocusId, setFocus: setHandFocus, cards: hand, flip: flipHandEntry, showFootprint: showDropFootprint, hideFootprint: hideDropFootprint, drop: dropFromHand } = useTable().hand
const { dragging: canvasDragging, dragDiscarded: canvasDragDiscarded } = useTable().pointer
const { mySleeve: ownSeatSleeve } = useTable().seats
const { clientToWorld, scale: getStageScale } = useTable().view
const { worldSize: cardWorldSize, sendToHand: cardSendToHand } = useTable().cards

// Assign
const { card_size, card_config } = useGameStore()
const { width: windowWidth, height: windowHeight } = useWindowSize()
const { card_src, card_back_src } = useImage()

// The seat's hand, as a ref the fan renders from. Cards arrive and leave through @cardcarp/simulator's seats.js
// (addToHand, removeFromHand), never by editing this.
const hand_card_list = useStore(hand)
const own_seat_sleeve = useStore(ownSeatSleeve)
const is_canvas_dragging = useStore(canvasDragging)

const isDropzoneHover = ref(false)

// A face-down hand card shows the sleeve the card will be dealt in — addCard stamps the
// same `hsl(ownSeatSleeve)` onto the node when the card is dropped, so the back you see in
// the fan is the back your opponents will see on the table. It follows the seat, so taking
// over a goldfish repaints the fan in that seat's colour.
const sleeveCss = computed(() => `hsl(${own_seat_sleeve.value})`)

// The art a hand card shows: its front, or — once flipped — the transform back. A flipped
// ordinary card has no back art and returns '', falling through to the sleeve.
function handCardSrc(card) {
    return card.faceDown ? card_back_src(card) : card_src(card)
}

// Hovering (or dragging) a hand card is what aims the H shortcut at it — see shortcuts.js.
function onCardEnter(event, card) {
    setHandFocus(card.handEntryId)
    // Deliberately NOT gated on card.faceDown the way the canvas card is: flipping in hand
    // only stages *how the card will be placed*, and the hand is private to this client
    // anyway, so the player still needs to be able to tell which trap they're about to set.
    // The preview does follow a flip card over, since its two sides are different
    // cards to read.
    const variant = card.faceDown && hasCardBack(card) ? CARD_BACK_VARIANT : ''
    mouseover_cell_card(event, card, null, null, variant)
}

function onCardLeave() {
    // During a drag the pointer can slip off the moving element — and mid-drag is exactly
    // when "actually, place this one face-down" happens — so keep the focus until dragend.
    if (!is_dragging.value) setHandFocus(null)
    mouseleave_cell_card()
}

// A hand entry can leave the fan without the pointer ever leaving it. Empty Hand — the pile
// toolbar's button, or E — drains every card at once, and it is fired from somewhere other
// than the card it removes. The element unmounts with no pointerleave behind it, so the
// preview is left floating over a card that is no longer in the hand.
//
// Worse on an iPad, which is where this shows up: a touch preview is raised by holding a
// card, and once the fan is gone there is nothing left to hover — or to leave — so the stuck
// preview has no way back down at all.
//
// So reconcile against the list rather than trusting the pointer to report the exit. An
// entry that is gone from the hand cannot be the one under the pointer, which is the same
// contract handFocusId already documents. The hide is immediate, not the 150ms leave
// grace: there is no card to move back onto, and an enter still sitting on its timer has to
// be cancelled with it or it opens a preview 200ms after the hand emptied.
watch(hand_card_list, (list) => {
    const focus_id = handFocusId.get()
    if (!focus_id) return
    if (list.some(entry => entry.handEntryId === focus_id)) return

    setHandFocus(null)
    preview_hide()
})

// The hand's own card size, and the single source for both the fan math and the rendered
// element. Width is set on screen, in px; height follows the game's card ratio from the
// manifest, the same source every other card surface reads (see card_ratio in
// composable/game.js).
//
// The two used to disagree. calculateFanPositions was handed `card_size`, which is the
// published card in MILLIMETRES — so the fan was laid out for a 63x88 card while the element
// drew a 100px-wide one. Cards overlapped 49% instead of the 20% the formula intends, and
// since the fan puts a card's top edge at `viewportHeight - cardHeight * 0.9`, 43% of every
// card hung below the bottom of the window. The fan was correct; it was being fed the wrong
// card. One object now feeds both, so they cannot drift apart again.
//
// The width itself rides the viewport. 100px reads right on a desktop table and is much too
// big on a phone: the table is landscape-only below 768px (see dialog-rotate.vue), so the
// narrowest viewport it ever draws into is an iPhone SE turned sideways — 667x375 — where a
// 100px card stands 140px tall, better than a third of the screen, and the fan buries the mat
// it is meant to sit under.
//
// A ramp between two anchors rather than a breakpoint step, because everything downstream
// moves with this number — arc radius, overlap, and the drop band derived from card height —
// so a card that jumps 28px as the window crosses a line drags the whole hand across with it.
// Both ends clamp: a desktop keeps exactly the size it has today, and nothing narrower than
// the SE shrinks further.
const HAND_CARD_WIDTH_MIN = 72
const HAND_CARD_WIDTH_MAX = 100
const HAND_WIDTH_FROM = 667
const HAND_WIDTH_TO = 1280

const handCardWidth = computed(() => {
    const span = HAND_WIDTH_TO - HAND_WIDTH_FROM
    const progress = Math.min(1, Math.max(0, (windowWidth.value - HAND_WIDTH_FROM) / span))
    // Rounded so the element's box and border land on whole pixels — the fan positions it
    // feeds are fractional either way, but the card's own edges are what you look at.
    return Math.round(HAND_CARD_WIDTH_MIN + (HAND_CARD_WIDTH_MAX - HAND_CARD_WIDTH_MIN) * progress)
})

const handCardSize = computed(() => {
    const { width, height } = card_size.value
    // Belt and braces: card_size falls back to a real card when the manifest hasn't landed,
    // so this only fires for a manifest that ships a zero. Without it every fan position,
    // and the drop zone with them, would be NaN.
    if (!(width > 0) || !(height > 0)) return null
    const cardWidth = handCardWidth.value
    return { width: cardWidth, height: cardWidth * (height / width) }
})

// How far up the window the fan reaches — 90% of a card stands above the fold, so this is
// exactly the band the cards occupy. Anything within it counts as "in the hand", in both
// directions: dropping a card INTO the hand (below) and deciding that a card dragged OUT of
// it was released on the board rather than let go over the fan (onCardDragEnd).
//
// Derived rather than fixed, because the two have to move together. A taller card judged
// against the old flat 80px would have had its upper half count as "the board", so releasing
// a card over the top of the fan would deal it to the table instead of snapping it back.
const handZoneHeight = computed(() => (handCardSize.value?.height ?? 0) * 0.9)

// How tall the GLOW is, which is a different question from how tall the zone is.
//
// They used to be the same number, and that was the whole problem: the zone has to be deep
// enough to catch a release comfortably, and a solid slab of blue that deep is a wall. It read
// as a modal state — half the screen has changed colour — when all it has to say is "down here
// is your hand". The zone stays exactly as it was; only what is drawn for it shrinks.
//
// Still derived from the zone rather than fixed, so the two cannot drift apart on a viewport
// where the cards are small: the glow is always well inside the region it describes, never a
// mark hanging outside the area it claims to be about.
const handGlowHeight = computed(() => Math.round(handZoneHeight.value * 0.45))

// Brightest along the very bottom of the window and gone by the top of the glow, so the light
// reads as coming from the hand rather than as a panel laid over the table. Stopping at 0.45
// rather than at full blue keeps the cards behind it legible while it is up — this is an
// affordance, not a curtain.
//
// blue-500 (#3b82f6), the same blue the filled band used, so nothing about the colour language
// changes — only its weight.
const DROPZONE_GLOW = 'linear-gradient(to top,'
    + ' rgba(59, 130, 246, 0.45) 0%,'
    + ' rgba(59, 130, 246, 0.22) 45%,'
    + ' rgba(59, 130, 246, 0) 100%)'

// Whether the pointer is over the hand, decided by geometry rather than by hover.
//
// This used to be @pointerenter/@pointerleave on the dropzone plus a CSS :hover rule, and
// both are mouse-only. During a TOUCH drag the browser sets implicit pointer capture on the
// element that received pointerdown — the canvas — so every subsequent pointer event is
// dispatched to the canvas and the dropzone is never entered or left. :hover never resolves
// on touch either, so on an iPad the zone did not even slide up to show it was there: no
// affordance, and no drop.
//
// Listening at window level works under that capture because capture changes the event's
// TARGET, not whether it bubbles — the canvas gets the event and it still reaches window.
// Only bound while a canvas drag is actually in flight, so it costs nothing at rest.
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
    // Unless the table already claimed it. This zone is the bottom band of the window and the
    // table's discard bands run down its left and right edges, so near the bottom corners a
    // single release lands in both — and a card thrown off the table has not been put into
    // anybody's hand. See canvasDragDiscarded in @cardcarp/simulator's store.js for why the fact is passed rather than inferred
    // from what is left in the selection.
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

// Where inside the card the player took hold of it, as a 0..1 fraction of its box. Captured
// on pointerdown rather than at dragstart, because by dragstart the hover lift and the
// drag transform have already moved the element under the cursor.
let grab_frac = { x: 0.5, y: 0.5 }

// Where this press started, for telling a tap apart from the beginning of a drag. Motion
// owns the drag itself, so the only question left here is whether the pointer stayed put.
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

// Double tap a hand card to stage it face-down (or face-up again) — the touchscreen's way in
// to what H does with a pointer, since a tablet has no hover to aim that key with. The flag
// is local staging, exactly as H leaves it: dropFromHand carries it onto the table.
//
// Nothing is un-rotated here the way the canvas does it. A hand card's angle is the fan's
// layout, not something the player set, and it is already reset while the card is lifted.
function onCardPointerUp(event, card) {
    const from = down_point
    down_point = null
    if (!from) return

    // Released somewhere else: a drag, not a tap — and not half of a double tap either.
    if (Math.hypot(event.clientX - from.x, event.clientY - from.y) > TAP_MOVE_SLOP) {
        resetDoubleTap()
        return
    }

    if (!isDoubleTap(card.handEntryId, event.clientX, event.clientY)) return
    flipHandEntry(card.handEntryId)
}

// iPad, and the only reason this handler exists.
//
// A double tap on a hand card is OUR gesture (see onCardPointerUp), and Safari wants the same
// one for its double-tap page zoom. The documented way to say no is `touch-action` — the card
// carries `none`, and #app carries `manipulation` above it (see style/main.css) — and on a real
// iPad the page still zooms out from under the flip. Whatever WebKit is deciding there, it is
// not the value this element declares.
//
// So the gesture is refused a second way, one that predates touch-action and does not depend on
// how far up the tree WebKit is willing to look: preventing the default of `touchend` cancels
// the tap's default actions for that sequence, page zoom among them. It costs nothing here —
// pointerup has already fired by the time this runs, so the flip is done, and nothing on a hand
// card is driven by the synthesised click that this also suppresses.
//
// Not `touchstart`: preventing that one is what breaks the drag, since Motion moves the card on
// the pointer events the touch sequence goes on to generate.
function onCardTouchEnd(event) {
    if (event.cancelable) event.preventDefault()
}

// Where on the table this card would land if it were let go right now, in world coordinates.
//
// Put down where it was picked up FROM, rather than centred on the cursor.
//
// A canvas card's x/y IS its centre (addCard offsets the group by half its size), so
// passing the raw pointer moved whichever corner the player had hold of into the middle —
// the card visibly jumped on release. Dragging a card already ON the canvas doesn't do
// that (the drag moves by pointer delta, preserving the grab point), so the hand was the one
// place in the app where a card slipped out from under the cursor.
//
// The hand renders cards at a fixed DOM size while the table renders them at the current
// zoom, so the grab point can't be carried across as pixels — it's carried as a fraction
// of the card and re-expressed against the card's on-screen size on the table.
//
// Offsetting in SCREEN space and converting once is also what keeps this correct while
// mirrored: cards counter-rotate to stay upright, so their visual axes match the screen's,
// and clientToWorld handles the reflection.
//
// Read on every drag frame as well as on release, so the footprint and the placement are the
// same arithmetic and cannot drift — a mark that lands somewhere other than the card is worse
// than no mark.
function landingPoint(clientX, clientY) {
    const size = cardWorldSize()
    const scale = getStageScale()
    const dx = (grab_frac.x - 0.5) * size.width * scale
    const dy = (grab_frac.y - 0.5) * size.height * scale
    return { ...clientToWorld(clientX - dx, clientY - dy), size }
}

// Released below this line and the card snaps back into the hand instead of being played, so
// there is nothing to mark and nowhere to land.
function overHand(clientY) {
    return clientY >= windowHeight.value - handZoneHeight.value
}

function pointOf(event, info) {
    const clientX = info?.point?.x ?? event?.clientX
    const clientY = info?.point?.y ?? event?.clientY
    return clientX == null || clientY == null ? null : { clientX, clientY }
}

// While a card is out of the hand it is drawn at the size it will LAND at, raised and a shade
// enlarged — the held pose, in DOM, matching what tactility does to a card picked up off the
// table (see liftPose in tactility/core.js).
//
// This is what makes the footprint legible rather than decorative. The hand renders at a fixed
// DOM size and the table renders at the current zoom, so on a zoomed-out table the landing rect
// is half the size of the card you are dragging and sits entirely underneath it — the mark was
// being drawn correctly and covered completely. Sizing the card to its landing rect and then
// lifting it is the same trick the canvas plate relies on: the card floats, and the amber shows
// at the near edge.
//
// The transform origin is the GRAB POINT, not the centre. The landing rect preserves where the
// card was picked up (see landingPoint), so its centre sits at -(grab - 0.5) x landingSize from
// the pointer while the DOM card's sits at -(grab - 0.5) x handSize. Scaling about the grab
// point maps one onto the other exactly; scaling about the centre would leave the card and its
// own footprint out of register by more the further from centre you grabbed.
const drag_id = ref(null)
const drag_style = ref(null)

function onCardDragStart(event, info, card) {
    is_dragging.value = true
    setHandFocus(card.handEntryId)

    // Any mark orphaned by a drag that ended without its dragend (a cancelled gesture, a
    // pointer lost out of the window) goes now, before this one draws its own.
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

// The card being dragged is a DOM element floating over the canvas, so it has no node on the
// table to wear the amber plate a carried card wears. It gets the same mark drawn free-standing
// instead — the canvas knows how to draw it, and only the hand knows where.
function onCardDrag(event, info) {
    const at = pointOf(event, info)
    if (!at || overHand(at.clientY)) return hideDropFootprint()

    const { x, y, size } = landingPoint(at.clientX, at.clientY)
    showDropFootprint(x, y, size.width, size.height)
}

function onCardDragEnd(event, info, card) {
    is_dragging.value = false
    // Unconditionally, and first: every path out of a drag ends here, including the ones that
    // return early below.
    hideDropFootprint()
    clearDragPose()

    const at = pointOf(event, info)
    if (!at) return
    if (overHand(at.clientY)) return // released inside the hand → snap back

    const { x, y } = landingPoint(at.clientX, at.clientY)
    dropFromHand(card, card_config.value, x, y)
    // The entry is gone from the hand — drop the focus with it. A snap-back keeps its focus
    // (no pointerleave fires when the card lands back under the cursor).
    if (handFocusId.get() === card.handEntryId) setHandFocus(null)
}
</script>

<template lang="pug">
    //- `over` is driven by the pointer's position, not :hover — see trackDropzone. That is
    //- what makes the zone reveal itself on a touch drag as well as a mouse one.
    //-
    //- A glow rising off the bottom of the window rather than a filled band. The gradient IS
    //- the effect — a linear-gradient to transparent costs one paint, where a drop-shadow or a
    //- blur would put a filter pass over a full-width element every frame it animates. Cheaper
    //- and softer at the same time, so there is no trade to make here.
    //-
    //- The element is decorative only (pointer-events-none) and its height is the glow's, not
    //- the zone's — see handGlowHeight. Nothing measures this box; trackDropzone does the
    //- geometry itself.
    .dropzone-hand(
        :class="{ active: is_canvas_dragging, over: isDropzoneHover }"
        :style="{ height: `${handGlowHeight}px`, backgroundImage: DROPZONE_GLOW }"
        class="absolute left-0 bottom-0 w-full opacity-0 z-40 pointer-events-none transition-[opacity,transform] duration-150 ease-out translate-y-3 [&.over]:translate-y-0 [&.over]:opacity-100"
    )
    //- The card size rides down as custom properties rather than as a :style on the Motion
    //- element itself — a reactive style binding there competes with motion's own writes to
    //- the same attribute. The existing left/top binding is settled enough to get away with
    //- it; there is no reason to add more.
    .hand(
        :style="{ '--hand-card-w': `${handCardSize?.width ?? 0}px`, '--hand-card-h': `${handCardSize?.height ?? 0}px` }"
        class="group/hand absolute inset-0 w-full h-20 z-40 pointer-events-none touch-manipulation"
    )
        //- handEntryId is the stable per-entry key — card.id repeats for duplicate copies
        //- of the same card, and an index suffix reshuffles element identity whenever a
        //- card leaves the middle of the hand (wrong card animating / previewing).
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
            //- The card's SKIN, separate from the box Motion positions. Motion owns the outer
            //- element's transform for the whole length of a drag, so the held pose cannot go
            //- there — writing y or scale into whileDrag puts them on the same motion values
            //- drag is setting every frame, and drag wins. An inner element has a transform
            //- nobody else is touching.
            //-
            //- Eased over roughly the length of the canvas's own pick-up (TRANSITION.lift), so
            //- the card rises into the hold instead of snapping to it.
            .skin(
                :style="drag_id === card.handEntryId ? drag_style : null"
                class="size-full bg-black border border-white/5 rounded-md transition-transform duration-150 ease-out"
            )
                //- Flipped with H while hovered — a flat sleeve fill, matching how the canvas
                //- draws a face-down card (@cardcarp/simulator's canvas-pixi/tools/card.js paintFace). Dropping it on the
                //- table hands the same flag to addCard, so it lands back-side up. Transform
                //- cards have real art on that back and show it here too, so what you stage in
                //- hand is what the table gets.
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