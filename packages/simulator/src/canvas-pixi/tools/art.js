// Accessory art addressing.
//
// `item.img` is an extensionless BASE, not a finished URL — that is what lets one item carry
// several pre-rendered spritesheets: the base is `…/table/dice/d6` and a variant appends its
// own name, giving `…/table/dice/d6-green.avif`. Every tool that paints an accessory goes
// through here so the base can never be half-interpreted (dice previously used `item.img`
// both as a complete URL for the default image AND as a base for variants, which cannot both
// be right and quietly broke variant swaps).
export function artUrl(base, suffix = '') {
    if (!base) return ''
    // Tolerate a base that already carries the extension. `img` only became a base in this
    // change, and payloads minted before it still sit in open rooms and in whatever snapshot
    // the relay is holding — those would otherwise resolve to `d6-green.avif.avif`.
    return `${String(base).replace(/\.avif$/i, '')}${suffix}.avif`
}

// The image for an accessory at a given variant. `null`/absent variant falls back to the bare
// base, so an item with no `variant` array behaves exactly as it did before.
//
// Not dice-specific despite where it started: a seat entry's `variant` is resolved for whatever
// accessory it names (see spawnOptions in accessory.js), so every tool that paints a variant
// spells the URL the same way.
export function variantArtUrl(base, variant) {
    return artUrl(base, variant?.name ? `-${variant.name}` : '')
}
