const HEADER = /^([a-zA-Z][a-zA-Z\s]*):\s*\d+$/

const CARD = /^(\d+)\s+(.+?)\s+([\w-]+)\s+([\w-]+)$/

const normalize = (label) => String(label ?? '').toLowerCase().replace(/[^a-z0-9]/g, '')

export function cardId(setCode, lex) {
    return `${String(setCode ?? '').toLowerCase()}-${String(lex ?? '').toLowerCase()}`
}

export function legacyCardId(setCode, lex) {
    return `${String(setCode ?? '').toLowerCase()} ${lex ?? ''}`
        .replace(/([a-zA-Z])(\d)/g, '$1 $2')
        .replace(/(\d)([a-zA-Z])/g, '$1 $2')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

export function findCard(cardDict, setCode, lex) {
    const exact = cardId(setCode, lex)
    if (cardDict?.[exact]) return { id: exact, card: cardDict[exact] }

    const legacy = legacyCardId(setCode, lex)
    if (legacy !== exact && cardDict?.[legacy]) return { id: legacy, card: cardDict[legacy] }

    return null
}

export function parseDeckList(text, { groups = [], cardDict = {}, group = null } = {}) {
    const byLabel = new Map((groups ?? []).map(name => [normalize(name), name]))

    const lines = String(text ?? '')
        .split('\n')
        .map(line => line.trim())
        .filter(Boolean)

    const cards = []
    const errors = []
    let current = 'main'

    for (const line of lines) {
        const header = line.match(HEADER)
        if (header) {
            current = byLabel.get(normalize(header[1])) ?? 'main'
            continue
        }

        const match = line.match(CARD)
        if (!match) {
            errors.push(`Skip line: ${line}`)
            continue
        }

        const [, quantity, name, set_code, lex] = match

        const found = findCard(cardDict, set_code, lex)
        if (!found) {
            errors.push(`${name} ${set_code} ${lex}`)
            continue
        }

        cards.push({
            ...found.card,
            id: found.id,
            quantity: parseInt(quantity, 10),
            list: group ?? current,
        })
    }

    return { cards, errors }
}

export function mergeIntoBuild(build, cards) {
    for (const card of cards) {
        const existing = build.find(entry => entry.id === card.id && entry.list === card.list)
        if (existing) existing.quantity += card.quantity
        else build.push(card)
    }
    return build
}
