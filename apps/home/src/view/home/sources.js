import game_list from '@/data/game-list.json'

export function items() {
    return Object.entries(game_list).map(([id, value]) => ({ id, ...value }))
}

export function pick(ids) {
    const all = items()

    return ids
        .map((id) => all.find((item) => item.id === id))
        .filter(Boolean)
}

export function linkProps(item, kind) {
    if (item.site) return { href: kind === 'deckbox' ? `${item.site}/deckbox` : item.site }

    if (item.href) return { href: item.href }

    return {}
}
