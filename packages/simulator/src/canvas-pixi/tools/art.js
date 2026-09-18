const warned = new Set()

function hasExtension(url) {
    const path = String(url).split(/[?#]/)[0]
    return /\.[a-z\d]+$/i.test(path.slice(path.lastIndexOf('/') + 1))
}

export function artUrl(img) {
    if (!img) return ''
    return hasExtension(img) ? img : `${img}.avif`
}

export function variantArtUrl(img, variant) {
    if (variant?.img) return variant.img
    if (!variant?.name) return artUrl(img)
    if (img && !hasExtension(img)) return `${img}-${variant.name}.avif`

    if (!warned.has(variant.name)) {
        warned.add(variant.name)
        console.warn(`[canvas] variant "${variant.name}" declares no img — showing the accessory's own`)
    }
    return artUrl(img)
}
