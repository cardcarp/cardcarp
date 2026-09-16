// Where a surface texture comes from.
//
// One question — "what is on the table?" — with two possible answers, and the config states it
// in one field because from the config's side it is one thing:
//
//   "img": "bg-table"                 a texture the APP has named
//   "img": "game/wow/asset/felt"      a GAME's art, published to the bucket
//
// Told apart by whether there is a path in it, which is not a trick: a bucket path always has
// one (they are `game/<name>/asset/...` or `table/...`, the same shape an accessory's art and
// the world edge already use), and a named texture is a bare name. So the rule reads off the
// value rather than needing a prefix nobody would remember.
//
// === Why the app, not the table ===
//
// The wood is furniture, like the grid dots and the seat chips — no one game's, which is why a bare
// name exists at all. But which furniture a table wears is a presentation choice, so the table ships
// no art of its own: an app bundles the files it wants and names them to the table here, through
// table.setArt({ surfaces }). Bundled by the app, a texture is still there on the first frame, with
// no request to the bucket and nothing to 404.

import { assetUrl } from '../assets.js'

// The textures an app has named, name → URL. Replaced whole on each table.setArt.
let named = {}

export function setSurfaceTextures(map = {}) {
    named = { ...map }
}

// The URL for a config's `img`, or '' for a config that names nothing.
//
// An unknown bare name is a mistake worth saying out loud rather than quietly resolving to a
// bucket path: `"img": "bg-tabel"` would otherwise become a request to storage.cardcarp.com for
// a file that will never exist, and the only symptom would be a table that is the wrong colour. A
// name the app never gave is the same mistake from the other side. A path is passed through
// unchecked, because whether the bucket has it is not knowable here.
export function surfaceTextureUrl(img) {
    if (!img) return ''
    if (img.includes('/')) return assetUrl(img)

    const url = named[img]
    if (url) return url

    console.error(
        `[canvas] no table texture named "${img}" —`
        + ` given: ${Object.keys(named).join(', ') || '(none)'}.`
        + ' An app names its textures with table.setArt({ surfaces }); a game\'s own art needs its full bucket path.',
    )
    return ''
}

// The names an app has given, for anything that wants to offer a choice rather than take a name.
export function surfaceTextureNames() {
    return Object.keys(named)
}
