// Tactility — the motion vocabulary that makes a drawn table feel like a wooden one.
//
// Three moments, and only three, because they are the three a player's hands would notice:
//
//   flutter — a card arriving on the table. It comes in lifted, tilted and a shade too big,
//             and falls to rest. Cards that simply appear read as data; cards that land read
//             as objects.
//   stack   — cards in a pile sit a fraction crooked. A perfectly aligned stack is the single
//             clearest tell that a table is rendered rather than dealt.
//   settle  — a card let go of overshoots slightly and springs back, the way something with
//             mass does when it meets a surface.
//
// PURE. No renderer, no framework, no DOM, no imports. Numbers in, numbers out. Everything
// here is the vocabulary itself; binding it to something that can draw is one adapter's job
// (./index.js is the Konva one). That separation is the point — the same vocabulary should
// survive a move to Pixi, or a lift into a library other people's tables can import.
//
// A pose is { rot, x, y, scale, lift }: a purely visual displacement from where a card actually
// is. Nothing in here ever describes where a card *is* — that stays the renderer's and the
// relay's business, and keeping the two apart is what makes all of this free to run
// unsynchronised. See the note on authority in the adapter.
//
// === lift, and why it is a pose field rather than the adapter's business ===
//
// `lift` is how far off the table the card is, 0 (flat on it) to 1 (held in a hand above it).
// It is not a displacement like the other three — it is the CAUSE of a displacement, and the
// adapter decides what a lifted card looks like: bigger, raised, and casting a shadow that
// falls further the higher it goes.
//
// It lives here rather than in the adapter because height is the thing the vocabulary is
// actually describing at every moment. A card arriving is falling from a height. A card being
// dropped is landing from one. A card in a pile is a hair above the one beneath it. Those were
// all being approximated with `scale` before, which is why an arriving card read as zooming
// rather than falling — scale alone is ambiguous between "nearer" and "bigger", and only a
// shadow disambiguates it.
//
// The first renderer this vocabulary had could not draw a shadow at all (Konva has no cheap
// one), so height had nowhere to go. That is no longer the constraint, and the vocabulary
// should not keep the shape of a limit that has been lifted.

// === Seeded jitter ===
//
// The crookedness of a stacked card has to satisfy two things that rule out Math.random:
//
//   1. It must be STABLE. A card that re-rolls its angle every relayout makes the pile
//      shimmer, and relayouts happen constantly — every peer drag packet triggers one.
//   2. It must AGREE between players. Two people looking at one deck have to see one deck.
//
// Both fall out of deriving the angle from the card's id. The relay already agrees on node
// ids, so the angles agree for free — every player sees the same crooked pile, and not one
// byte is added to the wire to do it.

const FNV_OFFSET = 2166136261
const FNV_PRIME = 16777619

// FNV-1a. Chosen for being short, dependency-free and well-distributed over the short
// string-ish ids that land here; nothing depends on its cryptographic properties.
export function hashSeed(value) {
    let hash = FNV_OFFSET
    const text = String(value ?? '')
    for (let i = 0; i < text.length; i++) {
        hash ^= text.charCodeAt(i)
        hash = Math.imul(hash, FNV_PRIME)
    }
    return hash >>> 0
}

// One deterministic number in [0, 1) per (seed, salt). The salt is what lets a single card
// id yield several independent-looking values — rotation, x drift, y drift — without hashing
// three different strings.
export function seededUnit(seed, salt = 0) {
    let hash = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0
    hash ^= hash >>> 16
    hash = Math.imul(hash, 0x21f0aaad)
    hash ^= hash >>> 15
    hash = Math.imul(hash, 0x735a2d97)
    hash ^= hash >>> 15
    return (hash >>> 0) / 4294967296
}

// [0, 1) → [-1, 1)
function signed(unit) {
    return unit * 2 - 1
}

// === The numbers ===
//
// Tuned small on purpose. The failure mode of this whole idea is a table that looks drunk:
// tactility reads as quality right up until a player notices it, and then it reads as a bug.
// A degree and a half of tilt is felt without being seen. Every one of these is a knob a
// game using this as a library would want to turn, so they are exported rather than inlined.

// === Lengths are card-heights, not world units ===
//
// Every _PX constant below was calibrated by eye against a card 150 world units tall, back when
// that was a hard-coded number in canvas/tools/card.js. It is not one any more: a card is one
// tenth of the stage's depth (stage.js), so a game that declares a different stage moves it.
//
// Left absolute, all of this would silently go wrong — not break, which would be easier, but
// read 28% too strong at the current stage, turning the lift into a hop and the stack jitter
// into sloppiness. So each one is stated as the fraction of a card it always was, multiplied
// through by the card the vocabulary is being spoken at.
//
// CARD is duplicated from stage.js's default rather than imported because this file is PURE — no
// renderer, no framework, no imports — and that is worth more than the duplication. stage.test.mjs
// asserts the two agree, so the copy cannot drift without a test saying so.
//
// It tracks the DEFAULT, not whatever a game declares. A game that declares a different card
// height gets motion calibrated for the default one — lengths that are a few percent off rather
// than wrong, and the alternative is threading a card height through a vocabulary whose whole
// value is that it takes numbers and returns numbers. Worth revisiting if a game ever declares
// something far from 108.
const CARD = 108                        // stage.js DEFAULT_CARD_HEIGHT

export const STACK_ROTATION_DEG = 1.6   // most a resting card leans
export const STACK_DRIFT_PX = CARD * (1.1 / 150)    // most a resting card sits off-centre
export const SPAWN_LIFT_PX = CARD * (26 / 150)      // how high an arriving card starts above its place
export const SPAWN_ROTATION_DEG = 7     // how tilted it starts
export const SPAWN_SCALE = 1.06         // how much nearer the eye it starts
export const SETTLE_KICK_DEG = 3.5      // the jolt a dropped card is displaced by
export const SETTLE_KICK_PX = CARD * (4 / 150)

// A held card: picked up off the table and carried. Tuned so the card reads as being between
// the player's fingers and the table rather than merely selected — the tell is the shadow the
// adapter draws under it, which is what `lift` is for.
export const LIFT_SCALE = 1.07          // how much nearer the eye a held card sits
export const LIFT_TILT_DEG = 1.2        // the slight cant of something held, not laid down

// How far a held card floats above its own place — and this one has a floor it must clear.
//
// The selection chrome draws that place as a translucent footprint at the card's REST pose (see
// the landing plate in canvas-pixi/selection.js), so the whole point is that the card is visibly
// off it. But LIFT_SCALE makes the card BIGGER, overhanging the footprint by
// height * (LIFT_SCALE - 1) / 2 on every side — about 5px on a 150px card. A rise of 7 left
// under two pixels of footprint showing, which is to say none.
//
// 16 clears the overhang with room to read. Raising this makes the card float higher and the
// landing spot plainer; lowering it past ~7 hides the spot entirely and the plate stops being
// worth drawing.
export const LIFT_RISE_PX = CARD * (16 / 150)

export const REST_POSE = Object.freeze({ rot: 0, x: 0, y: 0, scale: 1, lift: 0 })

// Where a card comes to rest: flat if it is loose on the table, crooked if it is in a pile.
// One function for both, because settle and stack have to agree on the target or a dropped
// card springs to one angle and the next relayout snaps it to another.
export function restingPose(id, stacked) {
    if (!stacked) return REST_POSE
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 1)) * STACK_ROTATION_DEG,
        x: signed(seededUnit(seed, 2)) * STACK_DRIFT_PX,
        y: signed(seededUnit(seed, 3)) * STACK_DRIFT_PX,
        scale: 1,
        // A card in a pile is resting ON the pile, not held above it. The stack's own fan is
        // what says there is depth there; a per-card shadow inside a deck would be sixty
        // overlapping smudges.
        lift: 0,
    }
}

// Where an arriving card starts. Always above its resting place — gravity is the one
// direction a player already expects — with the sideways component kept small so a dealt
// row doesn't look blown across the table.
export function spawnPose(id) {
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 11)) * SPAWN_ROTATION_DEG,
        x: signed(seededUnit(seed, 12)) * SPAWN_LIFT_PX * 0.4,
        y: -SPAWN_LIFT_PX * (0.7 + seededUnit(seed, 13) * 0.6),
        scale: SPAWN_SCALE,
        // Fully off the table, which is what makes the arrival a FALL rather than a zoom: the
        // shadow starts wide and far from the card and closes on it as the card lands.
        lift: 1,
    }
}

// The displacement a card is kicked to at the instant it is let go, and springs back from.
// Small, because the spring's overshoot does most of the work of selling the weight.
export function settlePose(id) {
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 21)) * SETTLE_KICK_DEG,
        x: signed(seededUnit(seed, 22)) * SETTLE_KICK_PX,
        y: -SETTLE_KICK_PX * (0.6 + seededUnit(seed, 23) * 0.8),
        scale: 1.02,
        lift: 0.15,
    }
}

// A card in the player's hand, mid-drag: off the table and carried. The tilt is seeded so two
// cards held at once are not identical, but it is small — a held card is steadied by the hand
// holding it, and anything larger reads as dropped rather than carried.
export function liftPose(id) {
    const seed = hashSeed(id)
    return {
        rot: signed(seededUnit(seed, 31)) * LIFT_TILT_DEG,
        x: 0,
        y: -LIFT_RISE_PX,
        scale: LIFT_SCALE,
        lift: 1,
    }
}

// Linear blend between two poses.
//
// Deliberately NOT clamped to [0, 1]. The settle transition is a spring run over a 0→1
// scalar, and a spring overshoots its target — t arrives as 1.08, then 0.97, then 1.01. Left
// unclamped those become real overshoot in rotation and position, which is the entire reason
// a spring was worth reaching for. Clamping here would quietly flatten it back to an ease.
export function mixPose(from, to, t) {
    return {
        rot: from.rot + (to.rot - from.rot) * t,
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        scale: from.scale + (to.scale - from.scale) * t,
        lift: from.lift + (to.lift - from.lift) * t,
    }
}

export function samePose(a, b, epsilon = 0.001) {
    return Math.abs(a.rot - b.rot) < epsilon
        && Math.abs(a.x - b.x) < epsilon
        && Math.abs(a.y - b.y) < epsilon
        && Math.abs(a.scale - b.scale) < epsilon
        && Math.abs(a.lift - b.lift) < epsilon
}

// Motion transition configs, in Motion's own vocabulary so they pass straight through.
export const TRANSITION = Object.freeze({
    // Arrival is an ease, not a spring: a card being placed has already been slowed by the
    // hand placing it, so it should not bounce.
    flutter: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
    // A drop is the one moment there is real momentum to express, so this is the one spring.
    // Stiff and fairly well damped — one visible overshoot, not a wobble.
    settle: { type: 'spring', stiffness: 520, damping: 26, mass: 0.9 },

    // Picking a card up is fast and certain: the hand has already decided. An ease, and a short
    // one — anything slower feels like the card is deciding whether to come.
    lift: { duration: 0.14, ease: [0.32, 0.72, 0, 1] },

    // Letting go is the opposite, and it is the whole point of the word "weight": the card has
    // to fall, meet the table, and be brought up short by it. Softer and heavier than `settle`,
    // which was tuned for a card that never left the surface.
    //
    // Damped to a ratio of ~0.62, deliberately close to settle's ~0.60: one visible overshoot
    // and done. The first attempt at this used damping 22 against mass 1.4, which is a ratio of
    // 0.50 — that wobbles, and a card that wobbles reads as light and rubbery, which is the
    // opposite of the thing being asked for. Weight is a card that falls fast and STOPS.
    drop: { type: 'spring', stiffness: 420, damping: 28, mass: 1.2 },
})
