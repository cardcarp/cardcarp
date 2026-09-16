// The stage — the fixed rectangle a game is designed into, and the one number a plugin author
// needs before they can draw anything.
//
// Before this, the table was an unbounded plane: the grid ran to ±4000, min zoom was derived
// from where the dots stopped, and the only fixed quantity anywhere was a card's height of 150
// world units. That is a weak contract to hand somebody writing a game — "the plane is infinite,
// a card is 150 tall, good luck" — and it is why every existing config carries absolute
// coordinates that mean nothing without reading canvas/tools/card.js first.
//
// So the geometry is stated once, here, and everything else derives from it.
//
// === Regions, not playmats ===
//
// The mistake worth not repeating: a playmat is NOT a primitive. It is an accessory
// (simulator.accessory[] with category "board") that happens to be placed per seat, and building
// the stage out of playmats bakes in the assumption that every part of the table belongs to some
// player. Board games break that immediately — a shared board sits in the middle and belongs to
// nobody.
//
// The stage is therefore partitioned into REGIONS:
//
//     ┌─────────────────────────────────────┐  ─┐
//     │            seat region              │   │ (H - shared.height) / 2
//     ├─────────────────────────────────────┤  ─┤
//     │           shared region             │   │ shared.height  (0 for a TCG)
//     ├─────────────────────────────────────┤  ─┤
//     │            seat region              │   │
//     └─────────────────────────────────────┘  ─┘
//
// A trading-card game sets shared to zero and the two seat regions take the whole stage, which
// is exactly the table cardcarp has always drawn. A board game gives the shared region real
// depth and the seat regions shrink to personal strips. Same arithmetic, one knob, and no game
// has to describe itself as a special case.
//
// === What is NOT here yet ===
//
// Seats around a RING. Three or more players sharing one central board need to sit on more than
// two sides, and the two-sidedness of this table is not in these numbers — it is in the ±1 sign
// flips in seats.js (seatForward, the `turn` factor) and the hard-coded 180° in scene.js
// (mirror_pivot.rotation, and the counter-rotation in get/setWorldRotation). Those all want the
// same generalisation, from a signed flip to a rotation by the seat's own angle, and none of it
// changes the region model below. Deliberately left until a game needs it.

// === The stage ===
//
// The width is fixed and the height is DERIVED. That split is the whole model, and it is what
// lets one arithmetic serve a trading card game, a shared-board game, and anything between.
//
// Width is fixed because lanes are horizontal: how many players fit side by side is a question
// about width, and an answer that moved per game would take the predictability out of the one
// thing the layout most needs to be predictable about. 1920 is also the number an illustrator
// gets handed, so it is worth it staying a number.
//
// Height is derived because the alternative is overruling the game's art. A game knows how deep
// its playmat is and how deep its shared board is; the stage is simply what those add up to:
//
//     stage.height = shared.height + 2 x (seat.height + chrome)
//
// Both terms may be zero, and that is what removes every special case. A TCG declares a seat and
// no shared region. A game played entirely on one central board declares a shared region and no
// seat — there is nothing personal to lay out, and the players' pieces go on the shared board.
// A game with player boards AND a central board declares both. Same formula, no branches.
//
// The consequence to know: the stage's RATIO varies per game, so fit-to-stage letterboxes on a
// screen that does not match it. That is what the world edge (colour and backdrop) is for, and
// it is a far better failure than squashing somebody's playmat into a frame it was not drawn at.

// The colours the table falls back to where a game's config is silent (see What lies beyond the
// world's edge, below).
import { NO_TINT, theme } from './theme.js'

const DEFAULT_STAGE_WIDTH = 1920

// A card's size in world units.
//
// Declared, both dimensions, like everything else that goes on the table — a playmat, a die and
// a marker all state their own width and height, and a card is not a different kind of thing.
//
// It used to be derived twice over: the height as stage.height / 10, and the width from the
// game's card.size aspect. Neither survives. The height cannot come from the stage now that the
// stage is derived FROM the play areas — that would invert, and a game declaring a deeper board
// would get bigger cards, when a deeper board is exactly what you declare to fit more rows. And
// it cannot come from the play area either, because a game may not have one: a shared-board game
// has no seat to measure against.
//
// So it is its own number, in the same place and the same form as every other object's. The
// aspect in game.json (63:88 for all four current games) is the CARD's own proportions, for
// print and for the browser; this is how big it sits on this table.
const DEFAULT_CARD = Object.freeze({ width: 77, height: 108 })

// What a seat's play area is, when it has one. This is the playmat: a player needs no more area
// than that, and spilling outside it is the freeform table working rather than a layout failing.
const DEFAULT_SEAT = Object.freeze({ width: 768, height: 432 })

// The gutter the table leaves around a seat, between its mat and the stage edge. Absolute rather
// than a fraction of a card: the chip carries a player's name, and a name does not want to be
// resized because a game chose bigger cards.
//
// SEAM_GAP only exists when there IS a mat. With no seat the two gaps would be one gap twice.
const SEAM_GAP = 24    // shared edge → the near edge of a mat
const CHIP_GAP = 24    // far edge of a mat (or the shared edge) → the near edge of its chip
export const CHIP_BOX = Object.freeze({ width: 180, height: 60 })

// Between neighbouring seats on the same side, and between the outermost seat and the stage edge.
const LANE_GAP = 128

// What lies beyond the world's edge.
//
// The world is a rectangle now, so for the first time there is an outside — and it has to look
// like one, or the camera's resistance at the edge reads as a bug rather than as a boundary. The
// dots stopping does most of that work; this is the ground they stop on.
//
// The surface is the table itself, and the edge is the ground beyond it. Their colours are the
// theme's (theme.js `table.surface` and `table.edge`) unless a game's config says otherwise — read
// when the stage is configured rather than held here, so a theme given after this module loads is
// the one a game falls back to.

// The table's own surface, as a repeating pattern.
//
// The counterpart to the edge, and deliberately the same three fields — a colour painted
// underneath regardless, an extensionless bucket path, and how big one tile is. A game that
// declares nothing gets the flat colour the table has always been, which is why this is a
// default rather than a required block.
//
// `scale` is how many world units one texture pixel covers, so a 256px tile at scale 1 is 256
// units across — a bit over three card widths. Stated in world units rather than screen pixels
// because the surface lives INSIDE the camera: the grain has to belong to the table and grow
// when you zoom into it, the way the dots and the playmats do. A pattern pinned to the screen
// would swim under the cards as you pan, which is the one thing a surface must not do.
//
// It also covers the un-repeated case without a second property. The stage is 1920 wide, so a
// 1920x1080 image at scale 1 lands exactly once across a two-seat table; it only repeats when
// the table grows past its own stage, which is the right answer for a floor anyway.
//
// `img` names one of two things, told apart by whether it has a path in it. A bare name is one
// of the TABLE's own textures, shipped with the client and bundled (see canvas-pixi/surface.js)
// — the wood is table furniture in the way the grid dots are, and every game gets to use it. A
// path is a bucket asset belonging to a game, exactly like `edge.img` and an accessory's art.
// One field, because from the config's side it is one question: what is on the table.
//
// `alpha` and `tint` are what make a texture a SURFACE rather than a wallpaper. The art that
// arrives is usually lit for its own sake — a photographed wood is a pale, bright thing — and a
// table has to sit under cards without competing with them. Tint multiplies the texture toward
// a colour and alpha blends it against `color` underneath, so one piece of art covers "an oak
// table" and "a faint grain over near-black" without needing two files.
const DEFAULT_SURFACE = Object.freeze({
    img: '',
    scale: 1,
    alpha: 1,
    tint: NO_TINT,
})

// === Active geometry ===
//
// Held in a plain object rather than exported as constants, because it comes from the game's
// config and the config arrives asynchronously. Everything below reads through the accessors, so
// a consumer that runs before the config lands gets the trading-card-game defaults — the right
// answer for the four games that ship today and a harmless one for the rest, since configureStage
// runs before any seat is placed.
let active = {
    width: DEFAULT_STAGE_WIDTH,
    card: DEFAULT_CARD,
    seat: DEFAULT_SEAT,
    shared: Object.freeze({ width: 0, height: 0 }),
    edge: Object.freeze({ color: theme().table.edge, img: '' }),
}

// Adopt a game's geometry, which is spread across the config by WHO each part belongs to
// rather than gathered under one heading:
//
//     "card":  { "width": 77, "height": 108 },
//     "table": { "edge": { "color": "#0d0f14", "img": "game/wow/asset/backdrop" } },
//     "deal":  {
//       "player": { "seat":   { "width": 768, "height": 432 }, ... },
//       "game":   { "shared": { "width": 1200, "height": 400 }, ... }
//     }
//
// An area is a thing that gets dealt — the player is dealt a seat, the table is dealt its shared
// board — and each sits with the accessories and deck positions measured inside it, which is the
// only place a reader can check that those coordinates fit. `table` keeps what is genuinely
// nobody's: the stage's width and what lies beyond the world's edge.
//
// Both areas are optional, and each is allowed to be nothing:
//
//   seat, no shared      a trading card game — two playmats facing across a seam.
//   shared, no seat      one board everybody plays on; nobody has a personal area.
//   both                 player boards around a central one.
//
// `edge.img` is an extensionless bucket path, exactly like an accessory's `img.game`, and tiles
// in world units — so it is the floor the table stands on rather than wallpaper behind it, and
// it moves and scales with the table. The colour is painted underneath regardless, so an image
// that fails to load degrades to a surround rather than to nothing.
export function configureStage(config) {
    const sim = config?.simulator
    const table = sim?.table
    const seat = sim?.deal?.player?.seat
    const width = Number(table?.stage?.width)

    const surfaceScale = Number(table?.surface?.scale)
    const surfaceAlpha = Number(table?.surface?.alpha)

    active = {
        width: width > 0 ? width : DEFAULT_STAGE_WIDTH,
        card: sizeOr(sim?.card, DEFAULT_CARD),
        // `seat: {}` and an absent seat are different statements — the first says this game has
        // no personal area, the second says it did not think about it — so a declared zero is
        // honoured while a missing block falls back.
        seat: seat ? sizeOr(seat, { width: 0, height: 0 }) : DEFAULT_SEAT,
        shared: sizeOr(sim?.deal?.game?.shared, { width: 0, height: 0 }),
        edge: Object.freeze({
            color: table?.edge?.color ?? theme().table.edge,
            img: typeof table?.edge?.img === 'string' ? table.edge.img : '',
        }),
        surface: Object.freeze({
            color: table?.surface?.color ?? theme().table.surface,
            img: typeof table?.surface?.img === 'string' ? table.surface.img : DEFAULT_SURFACE.img,
            // A zero or negative scale would collapse the tile to nothing and take the whole
            // surface with it, so it falls back rather than being clamped to something arbitrary.
            scale: surfaceScale > 0 && Number.isFinite(surfaceScale) ? surfaceScale : DEFAULT_SURFACE.scale,
            // Clamped rather than refused: every value in 0..1 is a meaningful amount of
            // texture, so there is no wrong answer to fall back FROM — only a range to stay in.
            alpha: Number.isFinite(surfaceAlpha) ? Math.min(1, Math.max(0, surfaceAlpha)) : DEFAULT_SURFACE.alpha,
            tint: table?.surface?.tint ?? DEFAULT_SURFACE.tint,
        }),
    }
    return active
}

export function edgeStyle() {
    return active.edge
}

export function surfaceStyle() {
    return active.surface
}

function sizeOr(value, fallback) {
    const width = Number(value?.width)
    const height = Number(value?.height)
    return Object.freeze({
        width: width >= 0 && Number.isFinite(width) ? width : fallback.width,
        height: height >= 0 && Number.isFinite(height) ? height : fallback.height,
    })
}

// === Derived geometry ===

// The gutter between a seat's play area and the stage edge. The seam gap only exists when there
// is a mat to hold off the middle; with no seat, one gap separates the shared region from the
// chip and that is all.
function chrome() {
    return (active.seat.height > 0 ? SEAM_GAP : 0) + CHIP_GAP + CHIP_BOX.height
}

// The gap between a seat's play area and its chip — and, for a game with no seat, between the
// shared board and the chip. Exported because it is where a seat box starts, which is a thing
// worth naming rather than restating as 24.
export function chipGap() {
    return CHIP_GAP
}

// How deep one seat's own end of the table is: its area plus its gutter.
export function seatDepth() {
    return active.seat.height + chrome()
}

export function stageSize() {
    return {
        width: active.width,
        height: active.shared.height + 2 * seatDepth(),
    }
}

// Both dimensions, for anything drawing a card; the height alone for the many places that only
// ever wanted a card-sized length.
export function cardSize() {
    return active.card
}

export function cardHeight() {
    return active.card.height
}

// Where a seat's chip sits: its CENTRE, measured out from the origin. It lands exactly on the
// stage edge, which is not a coincidence to maintain by hand — the stage's height is derived
// from this, so the budget closes by construction rather than by arithmetic that has to be
// rechecked every time a number moves.
export function anchorY() {
    return active.shared.height / 2 + seatDepth() - CHIP_BOX.height / 2
}

// The seat's play area, in the seat's local frame — the anchor at the origin, +y pointing away
// from the seam, which is the frame every per-seat coordinate in a config is measured in.
//
// It is the MAT, not the whole seat region. A play area needs to be no bigger than the playmat:
// a player will spill outside it constantly, and that is the point of a freeform table rather
// than a problem to design around. The chrome between the mat and the stage edge — the seam gap,
// the chip gap, the chip itself — is not part of anybody's area; it is the gutter the table
// leaves around one.
//
// Which is what lets a config have ONE placement vocabulary instead of two. `deal.player.deck`
// already measures its landing spots as x/y from the mat's top-left, read off the mat art the way
// you would measure anything in an image editor; making this the same rectangle means the seat's
// kit is placed the same way, by the same function, against the same corner.
export function seatBox() {
    const { width, height } = active.seat
    return {
        x: -width / 2,
        y: -(anchorY() - active.shared.height / 2 - SEAM_GAP),
        width,
        height,
    }
}

// The shared board's frame — the same corner-origin rectangle a seat box is, read the same way,
// and the frame a shared placement is measured in.
//
// It needs no seat and no turning: the shared region belongs to the table rather than to anybody
// at it, so there is one of it and it sits square on the origin. Which is why this is its own
// function rather than a parameter to seatPoint — "which seat" is a question with no answer here.
//
// Zero-height for a game that has none, which callers read as "there is no shared area" without
// a separate flag. Its width defaults to the stage's, so a game that declares only a depth gets
// a band across the table rather than a sliver.
export function sharedBox() {
    const { width, height } = active.shared
    return {
        x: -(width || active.width) / 2,
        y: -height / 2,
        width: width || active.width,
        height,
    }
}

// A point in the shared board's frame, turned into a world position — the counterpart to
// seats.js seatPoint, and deliberately the same shape of thing: x/y from the top-left, saying
// where the object's centre goes. One vocabulary, whether a thing belongs to a player or to
// everyone.
export function sharedPoint(point) {
    const box = sharedBox()
    return {
        x: box.x + (Number(point?.x) || 0),
        y: box.y + (Number(point?.y) || 0),
    }
}

// === Lanes ===
//
// Seats sharing a side sit in lanes, side by side, and the whole table is one table — as opposed
// to the arrangement this replaced, where each facing PAIR claimed a private stage of its own and
// stepped a full 1920 away from its neighbours.
//
// That was ownership thinking, and it was wrong about how these games are actually played. Four
// players at a Commander table are not four tables; they are four mats around one, everybody
// looking at the same middle. So a side holds as many mats as it can fit, the table only grows
// when they stop fitting, and every seat's camera looks at the same place — which end you are
// sitting at is expressed by the flip and by nothing else.
export function laneStep() {
    // A game with no personal area still seats people side by side; the chip is the smallest
    // thing that must not overlap, so it becomes the lane when there is no mat to be one.
    return (active.seat.width || CHIP_BOX.width) + LANE_GAP
}

// How many seats one side of the stage holds before the table has to grow. Derived rather than
// declared: a game with a wide shared region and narrow mats gets a different answer for free,
// and nothing anywhere has to know the number four.
export function lanesPerSide() {
    return Math.max(1, Math.floor((active.width + LANE_GAP) / laneStep()))
}

// Lane centres are symmetric about the origin and depend on how many seats that side actually
// holds, so one player sits in the middle and two straddle it. Which means a side re-centres
// when somebody joins it — see seatLayoutStale, and the note there about what that costs.
export function laneX(index, count) {
    return (index - (Math.max(1, count) - 1) / 2) * laneStep()
}

// The bounds the camera may not leave — one stage per facing pair, laid left to right from the
// first pair's own stage, which is centred on the origin.
//
// Seats rather than pairs as the argument because that is what the caller has; the halving is
// this module's business. One pair minimum, so an empty table still has somewhere to be.
export function worldRect(seatCount = 1) {
    const lanes = Math.max(1, Math.ceil((Number(seatCount) || 1) / 2))
    const span = active.seat.width || CHIP_BOX.width
    const content = lanes * span + (lanes - 1) * LANE_GAP
    const width = Math.max(active.width, content + LANE_GAP * 2)
    return {
        x: -width / 2,
        y: -stageSize().height / 2,
        width,
        height: stageSize().height,
    }
}

// The one point every seat's camera looks at. There is no per-seat framing any more: everybody
// is at the same table, and which end you are at is said by the flip.
export function tableFocus() {
    return { x: 0, y: 0 }
}

// Which of a rectangle's sides is this point past?
//
// The world became a rectangle when the stage did, and that gave the table an OUTSIDE for the
// first time — the ground layer_edge paints, the thing the camera's rubber band pushes against.
// Which lets dropping something there MEAN something: off the table is where a piece goes to be
// discarded (see pointer.js).
//
// Strictly past, so the boundary itself is still table. That is not a detail — a rule that
// reached back INSIDE the rectangle is what this was first, and it made the discard feel like
// it was guessing, because the cursor would be plainly over the felt while the chrome said the
// object was about to be destroyed. `depth` survives for callers that genuinely want tolerance,
// but it defaults to none, and the discard asks for none.
//
// === Why four answers and not one ===
//
// Because the four sides are not interchangeable to the player. The bottom of the screen is
// where the hand rail lives, and releasing a card there already means something — it goes into
// your hand (see hand.vue's trackDropzone). One side has to be excluded, so the caller has to
// be able to ask about them one at a time. Left/right/top/bottom are named from the RECT's own
// axes; which of them faces the player's chin is a question about the camera and the mirror,
// and it is answered in scene.js by handing this a screen-space rectangle.
//
// Here rather than in scene.js for the reason the camera arithmetic is: it is geometry, the
// renderer adds nothing to it, and it is worth a test.
export function edgeBands(point, rect, depth = 0) {
    const none = { left: false, right: false, top: false, bottom: false }
    if (!point || !rect) return none
    // A tolerance deeper than half the rect would answer "yes" everywhere, including the middle
    // of the table. Nothing sane asks for that, but the failure would be a table that deletes
    // whatever you pick up, so it is worth one line to make impossible.
    const d = Math.max(0, Math.min(depth, rect.width / 2, rect.height / 2))
    return {
        left: point.x < rect.x + d,
        right: point.x > rect.x + rect.width - d,
        top: point.y < rect.y + d,
        bottom: point.y > rect.y + rect.height - d,
    }
}

// === Camera arithmetic ===
//
// Pure, and here rather than in scene.js, because it is geometry rather than rendering and
// because it is the part worth testing: it was written wrong once already (see the note on
// rubberBand) and nothing about a Pixi camera is needed to check it.

// The interval a camera's position may take on one axis, so that the viewport stays inside the
// world. `position` is where world 0 lands on screen, so the viewport shows world coordinates
// from -position/scale to (span - position)/scale; requiring that to sit inside [from, from +
// extent] rearranges to a straight interval.
//
// When the viewport is BIGGER than the world on that axis there is no such interval — every
// position leaves a gap — so the axis is locked to centred instead. That is the ordinary case
// vertically: the world is one stage tall however many pairs it holds, so a tall window pins the
// table to the middle rather than letting it drift.
export function cameraInterval(span, from, extent, scale) {
    const min = span - (from + extent) * scale
    const max = -from * scale
    if (min <= max) return { min, max, locked: false }
    const middle = (min + max) / 2
    return { min: middle, max: middle, locked: true }
}

// Apple's rubber band: how far past the edge a pull of `overflow` actually moves the view.
//
// (|x| · v · C) / (v + C · |x|), signed. It is asymptotic to v — the viewport, NOT v · C, which
// is what the first version of this comment claimed. The practically useful number is what a
// full-viewport drag buys you: at |x| = v it returns v · C / (1 + C), about a third of a
// viewport. So the edge has weight and a long pull keeps giving a little, but never much.
export const RUBBER_C = 0.55

export function rubberBand(overflow, viewport) {
    const d = Math.abs(overflow)
    if (!(viewport > 0) || d === 0) return 0
    return Math.sign(overflow) * ((d * viewport * RUBBER_C) / (viewport + RUBBER_C * d))
}

// A refused zoom, as a displacement over normalised time.
//
// Pure and here for the same reason rubberBand is: it is the whole substance of the effect, it
// is trivially wrong in ways that are invisible in a screenshot (a shake that ends off-centre
// leaves the table permanently nudged), and none of it needs a renderer to check.
//
// A decaying sine: `sin(2π · cycles · t) · amplitude · (1 - t)`. Zero at both ends by
// construction — which is the property that matters, since the caller restores the base position
// on completion and any drift would fight it.
export const SHAKE_CYCLES = 3

export function shakeOffset(t, amplitude) {
    if (!(t > 0) || t >= 1) return 0
    return Math.sin(t * Math.PI * 2 * SHAKE_CYCLES) * amplitude * (1 - t)
}
