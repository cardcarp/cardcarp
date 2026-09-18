const warned = new Set()

function unset(name) {
    return () => {
        if (!warned.has(name)) {
            warned.add(name)
            console.warn(`[table] no ${name} resolver has been set — see setAssetResolvers in assets.js`)
        }
        return ''
    }
}

let resolvers = {
    assetUrl: unset('assetUrl'),
    cardArt: unset('cardArt'),
    cardBack: unset('cardBack'),
}

export function setAssetResolvers(next = {}) {
    for (const [name, fn] of Object.entries(next)) {
        if (name in resolvers && typeof fn === 'function') resolvers = { ...resolvers, [name]: fn }
    }
}

export const assetUrl = (path) => resolvers.assetUrl(path)
export const cardArt = (card) => resolvers.cardArt(card)
export const cardBack = (card) => resolvers.cardBack(card)
