// How the table turns a path into something it can load, handed in by whatever hosts it.
//
// Where art lives is a fact about a deployment, not about a table: cardcarp's projects read their
// bucket, and somebody else's project reads somewhere else again. The table used to import that rule
// from @cardcarp/core — config.js for accessory and table art, and image.js for card art, which also
// meant core's game store. Now the host passes the rules in once, before the canvas is built
// (createTable's `assets`, in the app's main.js):
//
//   setAssetResolvers({
//       assetUrl:  (path) => …,   a finished URL for an extensionless bucket path
//       assetBase: (path) => …,   the same without its extension, for a caller that appends one
//       cardArt:   (card) => …,   a card's front, or '' when it cannot be addressed
//       cardBack:  (card) => …,   real art for its back, or '' to fall back to the sleeve
//   })
//
// Each answers '' until it is given, and says so once — art that never loads is otherwise
// indistinguishable from art that is missing.

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
    assetBase: unset('assetBase'),
    cardArt: unset('cardArt'),
    cardBack: unset('cardBack'),
}

export function setAssetResolvers(next = {}) {
    for (const [name, fn] of Object.entries(next)) {
        if (name in resolvers && typeof fn === 'function') resolvers = { ...resolvers, [name]: fn }
    }
}

export const assetUrl = (path) => resolvers.assetUrl(path)
export const assetBase = (path) => resolvers.assetBase(path)
export const cardArt = (card) => resolvers.cardArt(card)
export const cardBack = (card) => resolvers.cardBack(card)
