// ptcg's game: what a card of it is, the deck vocabulary, and how its table is set up.
//
// The first thing the simulator UI imports (index.js), and handed to core by main.js with
// provideGameConfigs. Core merges the three parts into the one `config` both packages read, so the
// deckbox reads this file as much as the table does.
//
// One module rather than a JSON file per part. This app is one game and its config ships inside it, so
// nothing fetches or swaps it — and a module can carry the reasons beside the values, and let the deal
// point at the accessories it lays out instead of retyping their names.
//
// It is still data, and has to stay data: strings, numbers, arrays and plain objects, no functions and
// no class instances. Parts of it leave the page — a card's name and size ride inside every card's
// node, a die's variants inside its own, all sent to the room as JSON. config.test.mjs round-trips it
// to hold that.


// === Game ===
// Who this is, and what a card of it is. Required: without it core has no game to load.
//
//   size    the card as printed, in millimetres — print lays real sheets out with it, and every card
//           surface in the UI takes its shape from it
//   table   the columns of a card list
//   sort    what a card list can be sorted by
//   group   what a card list can be grouped by
//   filter  the filters on offer, and the control each one is

const game = {
    name: 'Pokémon Trading Card Game',
    card: {
        size: { width: 63, height: 88 },
        table: [
            { key: 'name', label: 'Name', type: 'text', format: 'bold' },
            { key: 'set_name', label: 'Set', type: 'text', format: 'standard' },
            { key: 'card_index', label: 'Number', type: 'number', format: 'number' },
            { key: 'category', label: 'Category', type: 'text', format: 'tag' },
        ],
        sort: {
            name: { label: 'Name' },
            card_index: { label: 'Set Number' },
            rarity: { label: 'Rarity' },
        },
        group: {
            category: { label: 'Category' },
            rarity: { label: 'Rarity' },
        },
        filter: {
            name: {
                label: 'Name',
                display: true,
                description: 'Filter cards by their name.',
                type: 'input',
            },
            set_id: {
                label: 'Sets',
                display: true,
                description: 'Filter cards by their set.',
                type: 'set',
            },
            category: {
                label: 'Category',
                display: true,
                description: 'Filter cards by their category.',
                type: 'combo',
                option: ['Pokémon', 'Trainer', 'Energy'],
            },
            distinct: {
                label: 'Reprints',
                display: true,
                description: 'Filter cards by their oracle.',
                type: 'toggle',
                default: 'false',
                label_true: 'Hidden',
                label_false: 'Shown',
            },
        },
    },
}


// === Deck ===
// The deck vocabulary. Without it the game has no decks, and hasDeckbox says so: the Cards link goes.
//
//   group   the groups a deck's cards can sit in, and the default
//   table   the columns of a deck list
//   sort    what a deck list can be sorted by
//   filter  the deck list's filters — the table's deck tool takes its format and theme facets from here

const deck = {
    group: {
        list: ['main', 'side', 'draft'],
        default: ['main'],
    },
    table: [
        { key: 'name', label: 'Name', type: 'text', format: 'bold' },
        { key: 'total', label: 'Cards', type: 'number', format: 'number' },
        { key: 'highlight', label: 'About', type: 'array', format: 'card', sort: false },
    ],
    sort: {
        name: { label: 'Name' },
    },
    filter: {},
}


// === Simulator ===
// The table. Without it this instance has no table, and hasSimulator says so: the Table link goes.
//
//   card        a card's size on the table, and `scry` — the categories the scry list filters a pile by
//   deal        what a table is dealt: `player` once per seat, placed within that seat's box
//   accessory   the pieces this game has, offered in the accessory panel and named by the deal

// --- Accessories ---
// Each named once here, and pointed at by the deal below.
//
//   category   what kind of piece it is, which decides how the table builds it
//   size       its size on the table; a die also gives the grid of its spritesheet
//   img        bucket paths without an extension: `game` is the art itself, `thumbnail` its panel row
//   variant    alternative art, each with the colour its chip shows; a deal entry picks one by name

const tutorialBoard = {
    name: 'Tutorial board',
    category: ['board'],
    size: { width: 768, height: 432 },
    img: {
        game: 'game/ptcg/asset/board',
        thumbnail: 'table/board-thumbnail',
    },
}

const diceD6 = {
    name: 'Dice (D6)',
    category: ['dice'],
    size: { width: 58, height: 58, row: 10, col: 6, total: 60 },
    min: 1,
    max: 6,
    step: 0,
    img: {
        game: 'table/dice/d6',
        thumbnail: 'table/dice/d6-thumbnail',
    },
    variant: [
        { name: 'green', color: 'hsl(143.8 61.2% 35%)' },
        { name: 'red', color: 'hsl(0 62.8% 45%)' },
        { name: 'gray', color: 'hsl(0 0% 45%)' },
    ],
}

const simulator = {
    card: {
        width: 77,
        height: 108,
        scry: ['Pokémon', 'Trainer', 'Energy', 'Basic', 'ex', 'EX'],
    },
    deal: {
        player: {
            // The size of one seat's box, which the placements below are measured within.
            seat: { width: 768, height: 432 },
            // x and y put the accessory's own top-left corner that far from the seat box's top-left —
            // corner to corner, as in an image editor. An entry can also say what a counter or die
            // starts on (`start`) and which of its variants it arrives in (`variant`).
            accessory: [
                { accessory: tutorialBoard.name, x: 0, y: 0 },
                { accessory: diceD6.name, x: 800, y: 10 },
            ],
            deck: {
                main: { x: 617.5, y: 39 },
            },
        },
    },
    accessory: [tutorialBoard, diceD6],
}

export default { game, deck, simulator }
