// The stage's arithmetic has to close.
// Run: node src/view/table/stage.test.mjs
//
// Behavioural, not static, because unlike selection.js there is nothing to eyeball here: a seat
// region that is four units too deep looks exactly like one that is not, and the first symptom
// would be a chip sitting a hair off the stage edge on somebody else's monitor. The numbers were
// chosen so the leftovers are zero, and that is only worth choosing if something checks it.

import {
    CHIP_BOX,
    anchorY, cardHeight, chipGap, configureStage,
    seatBox, sharedBox, sharedPoint, seatDepth, stageSize, worldRect,
    laneStep, lanesPerSide, laneX, tableFocus,
    cameraInterval, rubberBand, RUBBER_C, edgeStyle, surfaceStyle,
    shakeOffset, SHAKE_CYCLES,
    edgeBands,
} from './stage.js'
import { setTheme, theme } from './theme.js'

import { readFileSync } from 'node:fs'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps

// === The default: a trading card game — a seat each side, nothing shared ===

configureStage(null)

ok('the stage is 1920 wide', stageSize().width === 1920)
ok('a card is 108', cardHeight() === 108)

// The height is DERIVED, and this is the sum it is derived from. Stated as the formula rather
// than as the answer, because the answer moving is fine and the formula moving is a bug.
const chrome = seatDepth() - seatBox().height
ok('the stage is the shared region plus two seats and their gutters',
    stageSize().height === sharedBox().height + 2 * (seatBox().height + chrome),
    `${stageSize().height}`)
ok('which for a TCG comes to 1080, exactly as it was declared before', stageSize().height === 1080)

ok('a seat box is the declared playmat', seatBox().width === 768 && seatBox().height === 432)
ok('and its gutter is a seam gap, a chip gap and a chip', chrome === 24 + 24 + CHIP_BOX.height)

// The budget closing on the stage edge is no longer arithmetic to re-check — the height is
// derived FROM it, so it cannot fail to close. Asserted anyway, because it is the property every
// other number leans on.
ok('the chip lands flush against the stage edge',
    near(anchorY() + CHIP_BOX.height / 2, stageSize().height / 2),
    `${anchorY() + CHIP_BOX.height / 2} vs ${stageSize().height / 2}`)

ok('every seat looks at the table, not at its own half',
    tableFocus().x === 0 && tableFocus().y === 0)

// === The seat box ===
//
// A seat's play area IS its playmat — no bigger. The chrome between the mat and the stage edge
// belongs to the table, not to anybody's area, and a player spilling outside the box is the
// freeform table working rather than a layout failing.
//
// It is also the frame every per-seat coordinate in a config is measured in: `simulator.deal`
// zones are read off the mat art, so the box has to be exactly the mat or every one of them
// would be off by a seam gap.
const box = seatBox()
const boxTop = anchorY() + box.y
const boxBottom = anchorY() + box.y + box.height
ok('its near edge sits one seam gap off the middle of the table',
    near(boxTop, sharedBox().height / 2 + chipGap()), `${boxTop}`)
ok('and its far edge leaves room for the chip', boxBottom < stageSize().height / 2, `${boxBottom}`)
ok('so the anchor is outside the box — you sit at your area, not in it',
    anchorY() > boxBottom, `anchor ${anchorY()} vs box ${boxBottom}`)

// === A game may declare a mat this stage would not have fitted ===
//
// An area is declared where it is dealt — deal.player.seat, deal.game.shared — rather than under
// a `table` heading, so the coordinates measured inside it sit next to it.
//
// The whole reason the height is derived. Nothing is clamped and nothing warns: the game's art
// is used at the size it was drawn, and the stage grows to hold it. The ratio stops being 16:9,
// which the camera handles by letterboxing onto the world edge.

configureStage({ simulator: { deal: { player: { seat: { width: 768, height: 560 } } } } })
ok('a deeper mat is honoured, not squashed', seatBox().height === 560)
ok('and the stage grows to hold it', stageSize().height === 2 * (560 + chrome), `${stageSize().height}`)
ok('the width does not move — lanes are horizontal', stageSize().width === 1920)
ok('so the stage is no longer 16:9, and that is fine',
    Math.abs(stageSize().width / stageSize().height - 16 / 9) > 0.1)

// === A game with no seat at all ===
//
// One board everybody plays on. There is nothing personal to lay out, so the seat is nothing and
// the players' pieces go on the shared board. This is the case that ruled out deriving anything
// from the seat, and the case a stage-authoritative model could not express at all.

configureStage({ simulator: { deal: { player: { seat: {} }, game: { shared: { width: 1400, height: 760 } } } } })
ok('a declared-empty seat really is empty', seatBox().width === 0 && seatBox().height === 0)
ok('the shared board is the whole play area',
    sharedBox().width === 1400 && sharedBox().height === 760)
ok('and is centred on the seam', sharedBox().y === -380)

// The same corner-origin reading as a seat box, so one vocabulary covers both.
const mid = sharedPoint({ x: 700, y: 380 })
ok('its centre point maps to the origin', mid.x === 0 && mid.y === 0, JSON.stringify(mid))
const corner = sharedPoint({ x: 0, y: 0 })
ok('and its 0,0 is the top-left', corner.x === -700 && corner.y === -380, JSON.stringify(corner))
ok('the stage is the board plus a chip strip each side',
    stageSize().height === 760 + 2 * (24 + CHIP_BOX.height), `${stageSize().height}`)
ok('the seam gap is gone with the mat it held off',
    seatDepth() === 24 + CHIP_BOX.height, `${seatDepth()}`)
ok('and people still sit side by side — the chip becomes the lane',
    lanesPerSide() > 1, `${lanesPerSide()}`)

// === Both: player boards around a central one ===

configureStage({ simulator: { deal: {
    player: { seat: { width: 600, height: 260 } },
    game: { shared: { width: 1200, height: 420 } },
} } })
ok('the stage stacks all three', stageSize().height === 420 + 2 * (260 + chrome), `${stageSize().height}`)
ok('the seat box is what was asked for', seatBox().width === 600 && seatBox().height === 260)
ok('and it starts past the shared region rather than inside it',
    near(anchorY() + seatBox().y, 420 / 2 + 24), `${anchorY() + seatBox().y}`)

configureStage(null)

// === Pairs, and the world they make ===

// Two mats a side, exactly: 128 + 768 + 128 + 768 + 128 = 1920. Four players is the ordinary
// size of a Commander table, and four players is what one stage holds without growing.
ok('a lane is a mat plus its gap', laneStep() === 768 + 128)
ok('and a side holds exactly two of them', lanesPerSide() === 2)
ok('two lanes plus their gaps fill the stage',
    near(2 * seatBox().width + 3 * 128, stageSize().width), `${2 * 768 + 3 * 128}`)

// Lane centres are symmetric, so a side re-centres as it fills rather than filling from one end.
ok('one seat on a side sits in the middle of it', laneX(0, 1) === 0)
ok('two straddle the middle', laneX(0, 2) === -448 && laneX(1, 2) === 448)
ok('three centre the middle one', laneX(1, 3) === 0 && laneX(0, 3) === -896)

// The table grows only when the lanes run out — which is what "more than four players" means,
// without anything here having to know the number four.
ok('an empty table is still one stage wide', worldRect(0).width === 1920)
ok('two seats fit one stage', worldRect(2).width === 1920)
ok('so do three', worldRect(3).width === 1920)
ok('and four — the table does not grow for a Commander pod', worldRect(4).width === 1920)
ok('five needs a third lane', worldRect(5).width === 768 * 3 + 128 * 4, `${worldRect(5).width}`)
ok('eight needs four', worldRect(8).width === 768 * 4 + 128 * 5, `${worldRect(8).width}`)
ok('the world is always one stage tall', worldRect(8).height === 1080)
ok('and stays centred on the origin', worldRect(8).x === -worldRect(8).width / 2)

// === The tactility vocabulary agrees about how big a card is ===
// core.js is pure — no imports, deliberately — so it carries its own copy of the DEFAULT card
// height to scale its lengths by. That copy is the one thing here that can drift silently, so it
// is the one thing worth a test: every _PX constant in the motion vocabulary is wrong by whatever
// margin these two disagree.

configureStage(null)
const core = readFileSync(new URL('./tactility/core.js', import.meta.url), 'utf8')
const declared = Number(core.match(/^const CARD = (\d+(?:\.\d+)?)/m)?.[1])
ok('tactility/core.js states a card height', Number.isFinite(declared), String(declared))
ok('and it is the one the stage derives', declared === cardHeight(), `${declared} vs ${cardHeight()}`)

// === What lies beyond the edge ===
//
// The colour has to survive a missing image, because the image is the half that can fail: it is
// a network fetch, and an edge that renders as nothing when it 404s would read as a broken
// camera rather than as a missing asset.

configureStage(null)
ok('a game that says nothing still gets a surround — the theme\'s', edgeStyle().color === theme().table.edge)
ok('and it is not the table\'s own colour, or there would be no edge to see',
    edgeStyle().color !== surfaceStyle().color)
ok('with no image', edgeStyle().img === '')

configureStage({ simulator: { table: { edge: { color: '#241a12', img: 'game/wow/asset/floor' } } } })
ok('a declared colour is taken as given — Pixi reads CSS strings', edgeStyle().color === '#241a12')
ok('and the image path is left extensionless, like an accessory\'s',
    edgeStyle().img === 'game/wow/asset/floor')

configureStage({ simulator: { table: { edge: { img: 'game/wow/asset/floor' } } } })
ok('an image without a colour still gets one underneath it',
    edgeStyle().color === theme().table.edge, `${edgeStyle().color}`)

configureStage({ simulator: { table: { edge: { color: '#241a12', img: 42 } } } })
ok('a non-string image is dropped rather than fetched', edgeStyle().img === '')

// === The table's own surface ===
//
// The edge's twin, and held to the same rules: a colour underneath whatever else happens, an
// extensionless path, and a degradation to the flat table rather than to a hole.

configureStage(null)
ok('a game that says nothing gets the table\'s own colour', surfaceStyle().color === theme().table.surface)
ok('and no grain on it', surfaceStyle().img === '')
ok('at a scale of one, so a declared tile means its own size in world units',
    surfaceStyle().scale === 1)

configureStage({ simulator: { table: { surface: { color: '#101214', img: 'game/wow/asset/felt', scale: 2 } } } })
ok('a declared surface colour is taken as given', surfaceStyle().color === '#101214')
ok('the tile path is left extensionless, like the edge\'s', surfaceStyle().img === 'game/wow/asset/felt')
ok('and its scale is carried through', surfaceStyle().scale === 2)

configureStage({ simulator: { table: { surface: { img: 'game/wow/asset/felt' } } } })
ok('a tile without a colour still gets the table\'s underneath it',
    surfaceStyle().color === theme().table.surface)
ok('and an unstated scale is one', surfaceStyle().scale === 1)

// A scale of zero collapses the tile to nothing and takes the surface with it, so it is refused
// rather than clamped — the same reasoning as the discard band's depth guard.
for (const bad of [0, -3, 'big', NaN, Infinity, null]) {
    configureStage({ simulator: { table: { surface: { img: 'x', scale: bad } } } })
    ok(`a scale of ${String(bad)} falls back rather than collapsing the surface`,
        surfaceStyle().scale === 1, `${surfaceStyle().scale}`)
}

configureStage({ simulator: { table: { surface: { img: 42 } } } })
ok('a non-string tile is dropped rather than fetched', surfaceStyle().img === '')

// The two are independent: declaring one must not disturb the other.
configureStage({ simulator: { table: { surface: { img: 'a/felt' } } } })
ok('a surface alone leaves the edge at its default', edgeStyle().img === '')
configureStage({ simulator: { table: { edge: { img: 'a/floor' } } } })
ok('and an edge alone leaves the surface at its default',
    surfaceStyle().img === '' && surfaceStyle().color === theme().table.surface)

// An app's theme is what a silent game gets, and a game that declares its own colours still wins.
setTheme({ ...theme(), table: { ...theme().table, surface: '#123456', edge: '#654321' } })
configureStage(null)
ok('a theme\'s surface and edge are what a silent game gets',
    surfaceStyle().color === '#123456' && edgeStyle().color === '#654321')
configureStage({ simulator: { table: { surface: { color: '#101214' }, edge: { color: '#241a12' } } } })
ok('and a game\'s own colours still win over the theme',
    surfaceStyle().color === '#101214' && edgeStyle().color === '#241a12')

// === Camera arithmetic ===

configureStage(null)
const world = worldRect(2)          // one pair: 1920 x 1080, centred on the origin

// Fit-to-stage on a viewport of exactly the stage's shape: the world and the viewport coincide,
// so the interval collapses to a single point and there is nowhere to pan. This is the
// two-player default, and "you cannot drag your own table off screen" is what matters about it.
const fitX = cameraInterval(1280, world.x, world.width, 1280 / 1920)
const fitY = cameraInterval(720, world.y, world.height, 720 / 1080)
ok('at fit the horizontal axis has nowhere to go', near(fitX.min, fitX.max) && near(fitX.min, 640))
ok('and neither does the vertical', near(fitY.min, fitY.max) && near(fitY.min, 360))

// Zoomed in, the interval opens up and its ends are exactly the two edges of the world.
const inX = cameraInterval(1280, world.x, world.width, 1)
ok('zoomed in, the right edge stops at -x0 · scale', near(inX.max, 960))
ok('and the left edge at span - (x0 + width) · scale', near(inX.min, 1280 - 960))
ok('and the axis is no longer locked', inX.locked === false)

// A viewport wider than the world centres it rather than letting it drift. This is the ordinary
// vertical case — the world is one stage tall however many pairs it holds — so a tall window
// pins the table to the middle instead of allowing it to slide up and down.
const wide = cameraInterval(4000, world.x, world.width, 1)
ok('a viewport wider than the world locks that axis', wide.locked === true)
ok('and centres the world in it', near(wide.min, wide.max) && near(wide.min, (4000 - 1920) / 2 + 960),
    `${wide.min}`)

// === The band ===

ok('no overflow, no offset', rubberBand(0, 800) === 0)
ok('the band is signed', near(rubberBand(-400, 800), -rubberBand(400, 800)))
ok('a pull of a full viewport gives about a third of one',
    near(rubberBand(800, 800), 800 * RUBBER_C / (1 + RUBBER_C)), `${rubberBand(800, 800)}`)
ok('it is asymptotic to the viewport, not to viewport x C',
    rubberBand(1e9, 800) > 799 && rubberBand(1e9, 800) < 800, `${rubberBand(1e9, 800)}`)
ok('and it always resists — you never get out what you put in',
    rubberBand(400, 800) < 400 && rubberBand(50, 800) < 50)

// The trap this function cannot protect its caller from, stated so the caller's defence has a
// reason on record: the band is not composable. Feeding it its own output — which is what
// applying it per frame to an already-banded camera position does — gives a different, smaller
// answer than asking it once for the whole distance, and makes the result depend on how fast the
// drag arrived rather than how far it went. scene.js keeps pan_raw for exactly this.
const once = rubberBand(1000, 800)
const twice = rubberBand(rubberBand(1000, 800), 800)
ok('the band does not compose', once - twice > 50, `${once.toFixed(1)} vs ${twice.toFixed(1)}`)

// === The table's edges ===
//
// The predicate a drag-to-discard rests on. The way it can be wrong that matters: an answer that
// reaches back INSIDE the rectangle turns felt you could put a card down on into a delete zone,
// and the player reads the table rather than the code. Strictly past, by default, on every side.

const disc = { x: -960, y: -540, width: 1920, height: 1080 }
const none = (p, d) => {
    const at = edgeBands(p, disc, d)
    return !at.left && !at.right && !at.top && !at.bottom
}

ok('the middle of the table is past no side', none({ x: 0, y: 0 }))
ok('the boundary itself is still table, on every side',
    none({ x: -960, y: 0 }) && none({ x: 960, y: 0 })
    && none({ x: 0, y: -540 }) && none({ x: 0, y: 540 }))
ok('and so is a point one unit inside it — no reaching back over the felt',
    none({ x: -959, y: 0 }) && none({ x: 0, y: 539 }))
ok('a hair past a side is past it', edgeBands({ x: -960.5, y: 0 }, disc).left === true)
ok('each side answers for itself and no other', (() => {
    const l = edgeBands({ x: -961, y: 0 }, disc)
    const r = edgeBands({ x: 961, y: 0 }, disc)
    const t = edgeBands({ x: 0, y: -541 }, disc)
    const b = edgeBands({ x: 0, y: 541 }, disc)
    return l.left && !l.right && !l.top && !l.bottom
        && r.right && !r.left && !r.top && !r.bottom
        && t.top && !t.bottom && !t.left && !t.right
        && b.bottom && !b.top && !b.left && !b.right
})())
ok('a corner is past exactly the two sides that meet there', (() => {
    const at = edgeBands({ x: -961, y: -541 }, disc)
    return at.left && at.top && !at.right && !at.bottom
})())

// The tolerance survives for callers that want one; the discard passes none.
ok('a tolerance reaches inward by its depth', edgeBands({ x: -930, y: 0 }, disc, 48).left === true)
ok('and stops there', none({ x: -910, y: 0 }, 48))
ok('a tolerance deeper than the rect does not swallow the middle of it', none({ x: 0, y: 0 }, 5000))
ok('and a negative one is simply none', none({ x: 0, y: 0 }, -100))
ok('nothing without a point or a rect is past any side',
    none(null, 48) && (() => {
        const at = edgeBands({ x: 0, y: 0 }, null, 48)
        return !at.left && !at.right && !at.top && !at.bottom
    })())

// === The refusal shake ===

ok('starts at rest', shakeOffset(0, 9) === 0)
ok('and ends at rest, so the table is never left nudged', shakeOffset(1, 9) === 0)
ok('and is clamped outside its own span', shakeOffset(1.4, 9) === 0 && shakeOffset(-0.2, 9) === 0)

// Sampled densely: it has to actually oscillate, and it has to decay.
const shake = Array.from({ length: 200 }, (_, i) => shakeOffset(i / 200, 9))
const flips = shake.reduce((n, v, i) => n + (i && Math.sign(v) !== Math.sign(shake[i - 1]) ? 1 : 0), 0)
ok('it crosses zero twice per cycle', flips === SHAKE_CYCLES * 2, `${flips} crossings`)
ok('it never exceeds its amplitude', Math.max(...shake.map(Math.abs)) <= 9)

const firstHalf = Math.max(...shake.slice(0, 100).map(Math.abs))
const secondHalf = Math.max(...shake.slice(100).map(Math.abs))
ok('and decays — the second half is smaller than the first',
    secondHalf < firstHalf * 0.6, `${firstHalf.toFixed(2)} then ${secondHalf.toFixed(2)}`)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
