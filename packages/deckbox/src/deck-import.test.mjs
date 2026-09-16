// A pasted deck list turns into the cards the game actually has, and says what it could not read.
// Run: node packages/deckbox/src/deck-import.test.mjs

import { cardId, findCard, legacyCardId, mergeIntoBuild, parseDeckList } from './deck-import.js'

let pass = 0
let fail = 0

function ok(name, condition, detail = '') {
    condition ? pass++ : fail++
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`)
}

// A stand-in manifest, keyed the way the published one is: set_id + '-' + card_index, lowercased.
const cardDict = {
    'starter-2013-alliance-rogue-002': { name: 'Annihilate', category: 'Ability' },
    'starter-2013-alliance-rogue-003': { name: 'Ambush', category: 'Ability' },
    'core-001': { name: 'Bloodfang', category: 'Hero' },
    // The shape the old importer could not reach: an index carrying a letter.
    'xy-black-star-067a': { name: 'Pikachu', category: 'Promo' },
    'aquapolis-001h': { name: 'Alakazam', category: 'Holo' },
}
const groups = ['main', 'side', 'hero']

console.log('\nbuilding a card id')
ok('set and index are simply joined', cardId('starter-2013-alliance-rogue', '002') === 'starter-2013-alliance-rogue-002')
ok('a short set code works', cardId('core', '001') === 'core-001')
ok('case is folded', cardId('CORE', '001') === 'core-001')
ok('a lettered index is left intact', cardId('xy-black-star', '067a') === 'xy-black-star-067a', cardId('xy-black-star', '067a'))
ok('the old form split that letter off', legacyCardId('xy-black-star', '067a') === 'xy-black-star-067-a', legacyCardId('xy-black-star', '067a'))
ok('the two agree on a plain numeric index', cardId('core', '001') === legacyCardId('core', '001'))

console.log('\nfinding a card')
ok('the exact key is found', findCard(cardDict, 'core', '001')?.id === 'core-001')
// The regression this module was extracted for: exported, then not importable.
ok('a lettered index now resolves', findCard(cardDict, 'xy-black-star', '067a')?.id === 'xy-black-star-067a')
ok('and so does a holo suffix', findCard(cardDict, 'aquapolis', '001h')?.id === 'aquapolis-001h')
ok('an unknown card is null, not invented', findCard(cardDict, 'made-up', '999') === null)
ok('the old form still resolves where a manifest uses it', (() => {
    const legacyDict = { 'sv-3-pt-5-045': { name: 'Legacy keyed' } }
    return findCard(legacyDict, 'sv3pt5', '045')?.id === 'sv-3-pt-5-045'
})())

console.log('\nreading a card line')
const one = parseDeckList('3 Annihilate starter-2013-alliance-rogue 002', { cardDict, groups })
ok('the card is found', one.cards.length === 1, JSON.stringify(one.errors))
ok('the quantity is a number, not a string', one.cards[0]?.quantity === 3)
ok('the record from the manifest comes with it', one.cards[0]?.name === 'Annihilate')
ok('the id is the manifest key', one.cards[0]?.id === 'starter-2013-alliance-rogue-002')
ok('with no header it lands in main', one.cards[0]?.list === 'main')

const promo = parseDeckList('1 Pikachu xy-black-star 067a', { cardDict, groups })
ok('a promo with a lettered index imports', promo.cards.length === 1, JSON.stringify(promo.errors))

console.log('\ngroup headers')
const grouped = parseDeckList([
    '1 Bloodfang core 001',
    'Hero: 1',
    '1 Bloodfang core 001',
    'Side: 2',
    '2 Ambush starter-2013-alliance-rogue 003',
].join('\n'), { cardDict, groups })
ok('cards before the first header land in main', grouped.cards[0]?.list === 'main')
ok('a header switches the group that follows', grouped.cards[1]?.list === 'hero')
ok('and again for the next header', grouped.cards[2]?.list === 'side')

const unknownHeader = parseDeckList('Sideboard: 2\n1 Ambush starter-2013-alliance-rogue 003', { cardDict, groups })
ok('a header this game has no group for falls back to main', unknownHeader.cards[0]?.list === 'main')

const punctuated = parseDeckList('side : 2\n1 Ambush starter-2013-alliance-rogue 003', { cardDict, groups: ['Side'] })
ok('labels match past case and punctuation', punctuated.cards[0]?.list === 'Side', String(punctuated.cards[0]?.list))

console.log('\nforcing one group')
const forced = parseDeckList('Hero: 1\n1 Bloodfang core 001', { cardDict, groups, group: 'main' })
ok('storage ignores headers and takes everything', forced.cards[0]?.list === 'main')

console.log('\nwhat it cannot read')
const bad = parseDeckList([
    'this is not a card line',
    '4 Nonexistent made-up 999',
    '1 Ambush starter-2013-alliance-rogue 003',
].join('\n'), { cardDict, groups })
ok('an unparseable line is reported', bad.errors.some(e => e.startsWith('Skip line:')), JSON.stringify(bad.errors))
ok('a card this game does not have is reported by name', bad.errors.some(e => e.includes('Nonexistent')))
ok('and the good line still imports', bad.cards.length === 1)

console.log('\nempty and odd input')
ok('empty text imports nothing', parseDeckList('', { cardDict }).cards.length === 0)
ok('whitespace imports nothing', parseDeckList('\n\n   \n', { cardDict }).cards.length === 0)
ok('null text imports nothing', parseDeckList(null, { cardDict }).cards.length === 0)
ok('no options at all still returns a shape', (() => {
    const r = parseDeckList('1 Ambush starter-2013-alliance-rogue 003')
    return Array.isArray(r.cards) && Array.isArray(r.errors)
})())

console.log('\nmerging into a build')
const build = [{ id: 'core-001', list: 'main', quantity: 2 }]
mergeIntoBuild(build, [{ id: 'core-001', list: 'main', quantity: 3 }])
ok('the same card in the same group adds up', build[0].quantity === 5)

mergeIntoBuild(build, [{ id: 'core-001', list: 'side', quantity: 1 }])
ok('the same card in another group is its own entry', build.length === 2, JSON.stringify(build))
ok('and the first entry is untouched', build[0].quantity === 5)

mergeIntoBuild(build, [{ id: 'core-002', list: 'main', quantity: 1 }])
ok('a new card is appended', build.length === 3)

console.log(`\n${pass}/${pass + fail} passed`)
process.exit(fail ? 1 : 0)
