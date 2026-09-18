const DIACRITIC = /\p{Diacritic}/gu

function isAscii(text) {
    for (let i = 0; i < text.length; i++) {
        if (text.charCodeAt(i) > 127) return false
    }
    return true
}

export function foldName(text) {
    const lower = String(text).toLowerCase()
    return isAscii(lower) ? lower : lower.normalize('NFD').replace(DIACRITIC, '')
}
