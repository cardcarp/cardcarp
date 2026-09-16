// The opening-hand maths holds at the edges, not just for a 60-card deck.
// Run: node packages/deckbox/src/probability.test.mjs

import { combinations, drawChance, shuffle } from './probability.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

const near = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance

console.log('\ncombinations')
ok('choosing none is one way', combinations(5, 0) === 1)
ok('choosing all is one way', combinations(5, 5) === 1)
ok('C(5,2) is 10', near(combinations(5, 2), 10))
ok('C(60,7) is 386206920', near(combinations(60, 7), 386206920, 1e-3), String(combinations(60, 7)))
ok('choosing more than there is, is impossible', combinations(5, 6) === 0)
ok('a negative count is impossible', combinations(-5, 2) === 0 && combinations(5, -2) === 0)
ok('a non-number is impossible rather than NaN', combinations(NaN, 2) === 0 && combinations(5, Infinity) === 0)

console.log('\ndrawChance')
// Four copies in a 60-card deck, seven on the draw — the number a player checks most often.
ok('4 of 60 in an opening 7 is ~39.9%', near(drawChance(60, 4, 7), 0.39949, 1e-4), (drawChance(60, 4, 7) * 100).toFixed(2) + '%')
ok('1 of 60 in an opening 7 is ~11.7%', near(drawChance(60, 1, 7), 7 / 60, 1e-9))
ok('more copies is never worse', drawChance(60, 4, 7) > drawChance(60, 3, 7))
ok('a bigger hand is never worse', drawChance(60, 4, 8) > drawChance(60, 4, 7))

console.log('\ndrawChance at the edges')
// The regression this module was extracted for: the version inside the dialog computed 1 - 0/0 here
// and rendered the string "NaN" in the probability column.
const tiny = drawChance(5, 2, 7)
ok('drawing more than the deck holds is a certainty, not NaN', tiny === 1, `got ${tiny}`)
ok('drawing the whole deck is a certainty', drawChance(5, 1, 5) === 1)
ok('a deck of nothing but copies is a certainty', drawChance(4, 4, 1) === 1)
ok('no copies is no chance', drawChance(60, 0, 7) === 0)
ok('no draw is no chance', drawChance(60, 4, 0) === 0)
ok('an empty deck is no chance', drawChance(0, 4, 7) === 0)
ok('every result is a probability', [
    drawChance(60, 4, 7), drawChance(5, 2, 7), drawChance(1, 1, 1), drawChance(0, 0, 0),
].every(p => Number.isFinite(p) && p >= 0 && p <= 1))

console.log('\nshuffle')
const source = ['a', 'b', 'c', 'd', 'e']
const shuffled = shuffle(source, () => 0.5)
ok('the caller\'s list is left alone', source.join('') === 'abcde')
ok('every card is still there', [...shuffled].sort().join('') === 'abcde')
ok('the count is unchanged', shuffled.length === source.length)
ok('a given random sequence deals a given order', shuffle(source, () => 0).join('') === shuffle(source, () => 0).join(''))
ok('an empty list shuffles to an empty list', shuffle([]).length === 0)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
