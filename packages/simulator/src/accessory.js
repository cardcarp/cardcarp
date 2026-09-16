// A game's configured accessories, turned into things the table can actually use.
//
// Two consumers need the same two answers — what an item's art resolves to, and which canvas
// verb builds it — so they live here rather than in either one: the accessory panel
// (toolbar/accessory/list.vue) and the seat's opening layout (seat-setup.js).

// Canvas
import { addDice, addCounter, addBoard, addMarker } from './multiplayer.js'
import { nameKeepsUpright } from './canvas-pixi/index.js'

// Accessory art lives at the bucket root rather than under /game/<id>/, and is read the way card
// art is: through the host's resolvers (assets.js), from a server whose CORS policy names the page.
//
// That last part used to look optional, on the reasoning that "images aren't subject to the CORS
// allowlist that forces fonts and the manifest through it". It was true of the renderer we had:
// Konva loaded art with `new Image()`, and an <img> without a crossOrigin attribute is not a CORS
// request at all.
//
// It is not true of Pixi. Assets fetches in a Web Worker (loadImageBitmap) — a real CORS request —
// and a texture also has to be uploadable to WebGL, which flatly refuses a cross-origin image the
// server has not approved. From an origin the bucket did not name, every accessory silently failed
// to load, and an accessory with no texture draws nothing, so the dice and the playmats simply were
// not there.
//
// The rule itself is the host's to state — core's config.js states it for cardcarp's own bucket —
// and it reaches the table through assets.js, because where art lives is a fact about a
// deployment, and the world backdrop and the card art need the same answer.
import { assetBase, assetUrl } from './assets.js'

// Two different things come out of `img`, and the difference matters:
//   game      — an extensionless BASE handed to the canvas, so a dice variant can append its
//               own name (`…/d6` + `-green` + `.avif`). See canvas/tools/art.js.
//   thumbnail — a finished URL for this row's artwork, so it points at one concrete file.
//
// Resolved here rather than in the canvas because this URL is what goes on the wire inside
// the node payload — a peer rebuilds the accessory from the payload alone, without consulting
// its own manifest.
//
// Which means the payload now carries a DEV-shaped URL between dev peers and a prod-shaped one
// between prod peers. That is fine because a room's clients are always on the same build, and
// it is the same bargain composable/image.js already makes; it is worth knowing before anyone
// tries to replay a captured dev payload against production.
export function accessoryList(config) {
    return (config?.simulator?.accessory ?? []).map(item => ({
        ...item,
        img: assetBase(item?.img?.game),
        thumbnail: assetUrl(item?.img?.thumbnail ?? item?.img?.game),
    }))
}

// What gets laid out when a table is dealt, from `simulator.deal` — split by WHO it belongs to:
//
//   "deal": {
//     "player": {
//       "accessory": [
//         { "accessory": "Tutorial board", "x": 384, "y": 216 },
//         { "accessory": "Dice (D6)", "x": 608, "y": 46 }
//       ],
//       "deck": { "hero": { "x": 544, "y": 29 }, "main": { "x": 656, "y": 29 } }
//     },
//     "game": {
//       "accessory": [ { "accessory": "Encounter board", "x": 700, "y": 380 } ]
//     }
//   }
//
// `player` is dealt once per seat, in that seat's own frame; `game` is dealt once for the whole
// table, in the shared board's frame (stage.js sharedBox). The split exists because a game whose
// play surface is one central board has nothing per-seat to lay out at all — the pieces everyone
// moves live on the shared board, and there is no seat to measure them from.
//
// x and y are the accessory's own TOP-LEFT, measured from the top-left of whichever box the
// entry belongs to — corner to corner, the way you would measure it in an image editor. Same
// reading either way; only the box differs.
//
// This replaced a top-level `seat` list, which had become the ambiguous name in the file: `table`
// also has a `seat`, meaning the size of one. A key naming a rectangle and a key naming a list of
// things to put in it should not be the same word.
//
// A list of placements rather than a flag on each accessory, because those are two different
// questions. An accessory is a thing the game HAS; this is where a seat's copies of it GO. Only
// a list can say "two dice, one at either end", which no boolean on the die could — and it puts
// the placement next to the thing it positions instead of stranding it on an accessory that is
// also reachable by hand from the panel, where placement means nothing.
//
// The non-positional half of a seat entry — what the thing arrives already showing:
//
//   "start"   — a counter's opening value. `start: 15` puts a d20 on the table reading 15
//               rather than at its minimum.
//   "variant" — which of the accessory's alternative images to use, BY NAME. The accessory
//               publishes its variants once as a list of objects; an entry names one, so a
//               config author never restates a colour that is already defined above.
//
// Both are left out rather than passed as null when they don't apply or don't resolve. The
// adders have their own defaults — a die's minimum, its first variant — and an explicit null
// would override those with nothing, which is how a mis-typed variant name would turn into an
// invisible die rather than a warning.
function spawnOptions(item, entry, where) {
    const options = {}

    if (entry?.start != null) {
        const start = Number(entry.start)
        const min = Number(item?.min)
        const max = Number(item?.max)
        const bounded = Number.isFinite(min) && Number.isFinite(max)

        if (!Number.isFinite(start)) {
            console.warn(`${where}: "${item.name}" start is not a number`)
        } else if (bounded && (start < min || start > max)) {
            // Clamped rather than dropped: a d20 asked to start at 50 should still start, at
            // the highest face it has. The warning is what says the config is wrong.
            console.warn(`${where}: "${item.name}" start ${start} is outside ${min}–${max}`)
            options.value = Math.max(min, Math.min(max, start))
        } else {
            options.value = start
        }
    }

    if (entry?.variant != null) {
        const variants = Array.isArray(item?.variant) ? item.variant : []
        const match = variants.find(v => v?.name === entry.variant)
        if (match) options.variant = match
        else console.warn(`${where}: "${item.name}" has no variant named "${entry.variant}"`)
    }

    return options
}

// An entry naming an accessory that doesn't exist is skipped with a warning: a typo in a config
// should say so, not quietly deal a shorter table.
function spawnsFrom(config, list, where) {
    const items = accessoryList(config)
    const spawns = []

    for (const entry of (list ?? [])) {
        const item = items.find(i => i.name === entry?.accessory)
        if (!item) {
            console.warn(`${where}: no accessory named "${entry?.accessory}"`)
            continue
        }
        // One entry, read two ways: the placement takes x/y off it, spawnOptions takes
        // start/variant, and each ignores the other's fields.
        spawns.push({ item, place: entry, options: spawnOptions(item, entry, where) })
    }

    return spawns
}

// Dealt once per seat, in that seat's own frame.
export function seatSpawns(config) {
    return spawnsFrom(config, config?.simulator?.deal?.player?.accessory, 'deal.player.accessory')
}

// Dealt once for the table, in the shared board's frame. Empty for a game with no shared region,
// which is every game that ships today.
export function gameSpawns(config) {
    return spawnsFrom(config, config?.simulator?.deal?.game?.accessory, 'deal.game.accessory')
}

// Category → the canvas verb that builds it, and the node name it builds under. Ordered, because
// an item may carry several categories and something has to win — a die that is also tagged
// 'token' is still a die.
const ADDERS = [
    { category: 'dice', add: addDice, name: 'dice' },
    { category: 'counter', add: addCounter, name: 'counter' },
    { category: 'board', add: addBoard, name: 'board' },
    { category: 'marker', add: addMarker, name: 'marker' },
]

// Anything unrecognised falls through to a marker, the plain-image accessory, so a new category
// added to the manifest still drops something on the table instead of nothing.
const FALLBACK = ADDERS.find(entry => entry.category === 'marker')

function entryFor(item) {
    const categories = Array.isArray(item?.category) ? item.category : [item?.category]
    return ADDERS.find(entry => categories.includes(entry.category)) ?? FALLBACK
}

export function adderFor(item) {
    return entryFor(item).add
}

// Whether something dealt to a seat should be TURNED to face that seat.
//
// A playmat belongs to the table: laid out facing its owner and read upside-down from the other
// end, exactly like a real mat. A die belongs to whoever is looking at it — it already counter-
// rotates under the mirror so its pips read upright from every seat (nameKeepsUpright, and
// keepsUpright in stage.js), and turning it to face one seat as well would only fight that,
// leaving it 180° out for everybody except its owner.
export function facesSeat(item) {
    return !nameKeepsUpright(entryFor(item).name)
}
