// The print sheet's arithmetic: how many cards fit, where each one sits, and how large the art needs
// to be. Run: node packages/deckbox/src/print-sheet.test.mjs

import {
    cardPosition,
    PAPER_FORMAT,
    PAPER_SIZE,
    paginate,
    PRINT_DPI,
    sheetLayout,
    targetSize,
} from './print-sheet.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

// A standard trading card, in millimetres.
const CARD = { width: 63, height: 88 }

console.log('\npaper')
ok('every offered format has a size', PAPER_FORMAT.every(name => PAPER_SIZE[name]?.width > 0), PAPER_FORMAT.join(', '))
ok('sizes are portrait', Object.values(PAPER_SIZE).every(p => p.height >= p.width))

console.log('\nsheetLayout')
const letter = sheetLayout({ paper: PAPER_SIZE.letter, card: CARD, padding: 6, gap: 0 })
ok('a letter page holds 3 columns', letter.cols === 3, String(letter.cols))
ok('and 3 rows', letter.rows === 3, String(letter.rows))
ok('so nine cards a page', letter.perPage === 9)
ok('it reports the page size for CSS', letter.pageSize === '216mm 279mm')
ok('and the card aspect for the preview', letter.cardStyle.aspectRatio === '63 / 88')

const a4 = sheetLayout({ paper: PAPER_SIZE.a4, card: CARD, padding: 6, gap: 0 })
ok('a4 is narrower, so 3 columns still', a4.cols === 3, String(a4.cols))
ok('and holds 9', a4.perPage === 9, String(a4.perPage))

const padded = sheetLayout({ paper: PAPER_SIZE.letter, card: CARD, padding: 30, gap: 0 })
ok('more padding fits fewer cards', padded.perPage < letter.perPage, `${padded.perPage} < ${letter.perPage}`)

const gapped = sheetLayout({ paper: PAPER_SIZE.letter, card: CARD, padding: 6, gap: 5 })
ok('a gap never fits more than no gap', gapped.perPage <= letter.perPage, `${gapped.perPage} <= ${letter.perPage}`)

console.log('\nsheetLayout when something is missing')
const nothing = sheetLayout({ paper: PAPER_SIZE.letter, card: { width: 0, height: 0 } })
ok('a card of no size fits nothing, rather than Infinity', nothing.perPage === 0, String(nothing.perPage))
ok('no paper fits nothing', sheetLayout({ paper: null, card: CARD }).perPage === 0)
ok('nothing at all still returns a shape', typeof sheetLayout({}).gridStyle === 'object')

console.log('\npaginate')
const twenty = Array.from({ length: 20 }, (_, i) => `card-${i}`)
const pages = paginate(twenty, 9)
ok('20 cards over 9 a page is 3 pages', pages.length === 3)
ok('the first page is full', pages[0].length === 9)
ok('the last page holds the remainder', pages[2].length === 2)
ok('every card appears once', pages.flat().length === 20 && new Set(pages.flat()).size === 20)
ok('an empty list is no pages', paginate([], 9).length === 0)
ok('a perPage of zero yields nothing rather than looping', paginate(twenty, 0).length === 0)
ok('a missing list is no pages', paginate(null, 9).length === 0)

console.log('\ncardPosition')
const first = cardPosition(0, { cols: 3, card: CARD, padding: 6, gap: 0 })
ok('the first card sits at the padding', first.x === 6 && first.y === 6, JSON.stringify(first))
const second = cardPosition(1, { cols: 3, card: CARD, padding: 6, gap: 0 })
ok('the second is one card to the right', second.x === 6 + 63 && second.y === 6)
const fourth = cardPosition(3, { cols: 3, card: CARD, padding: 6, gap: 0 })
ok('the fourth wraps to the next row', fourth.x === 6 && fourth.y === 6 + 88)
const spaced = cardPosition(1, { cols: 3, card: CARD, padding: 6, gap: 4 })
ok('a gap pushes the neighbour along', spaced.x === 6 + 63 + 4)

console.log('\ntargetSize')
// A 63mm card at 300dpi is ~744px across; art is published far larger than that.
const capped = targetSize({ width: 4000, height: 5600 }, CARD)
ok('oversized art is capped to the print resolution', capped.width <= Math.ceil((63 / 25.4) * PRINT_DPI) + 1, JSON.stringify(capped))
ok('and stays in proportion', Math.abs((capped.width / capped.height) - (4000 / 5600)) < 0.01, JSON.stringify(capped))

const small = targetSize({ width: 100, height: 140 }, CARD)
ok('small art is never upscaled', small.width === 100 && small.height === 140, JSON.stringify(small))

ok('a card of no size leaves the art alone', (() => {
    const r = targetSize({ width: 500, height: 700 }, { width: 0, height: 0 })
    return r.width === 500 && r.height === 700
})())
ok('the result is always at least one pixel', targetSize({ width: 1, height: 1 }, CARD).width >= 1)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
