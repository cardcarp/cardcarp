import { assetUrl } from '../assets.js'

let named = {}

export function setSurfaceTextures(map = {}) {
    named = { ...map }
}

export function surfaceTextureUrl(img) {
    if (!img) return ''

    const url = named[img]
    if (url) return url
    if (/\.[a-z\d]+$/i.test(img)) return assetUrl(img)

    console.error(
        `[canvas] no table texture named "${img}" —`
        + ` given: ${Object.keys(named).join(', ') || '(none)'}.`
        + ' An app names its textures with table.setArt({ surfaces }); a game\'s own art is a location with its extension.',
    )
    return ''
}

export function surfaceTextureNames() {
    return Object.keys(named)
}
