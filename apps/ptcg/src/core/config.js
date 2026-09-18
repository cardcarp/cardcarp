
const game = {
    name: 'Pokémon Trading Card Game',
    dataset: {
        source: 'cardcarp',
    },
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


const tutorialBoard = {
    name: 'Tutorial board',
    category: ['board'],
    size: { width: 768, height: 432 },
    img: {
        game: 'game/ptcg/asset/board.avif',
        thumbnail: 'table/board-thumbnail.avif',
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
        thumbnail: 'table/dice/d6-thumbnail.avif',
    },
    variant: [
        { name: 'green', color: 'hsl(143.8 61.2% 35%)', img: 'table/dice/d6-green.avif' },
        { name: 'red', color: 'hsl(0 62.8% 45%)', img: 'table/dice/d6-red.avif' },
        { name: 'gray', color: 'hsl(0 0% 45%)', img: 'table/dice/d6-gray.avif' },
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
            seat: { width: 768, height: 432 },
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

export default { id: 'ptcg', game, deck, simulator }
