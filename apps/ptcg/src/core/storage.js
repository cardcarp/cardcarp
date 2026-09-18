export default {
    root: import.meta.env.VITE_STORAGE_ROOT,
    cards: 'game/ptcg/card',
    manifest: 'game/ptcg/data/manifest.json',
    sets: 'game/ptcg/data/sets.json',
    file: {
        logo: 'site/image/logo.png',
        iconDelete: 'site/image/ui-delete.avif',
        iconWarn: 'site/image/ui-warn.avif',
        fontFlex: 'site/font/googlesansflex.woff2',
        fontCode: 'site/font/googlesanscode.woff2',
        pointer: 'site/image/pointer-default.svg',
    },
}
