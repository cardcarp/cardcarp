// Canvas
import { addDice, addCounter, addBoard, addMarker } from './multiplayer.js'
import { nameKeepsUpright } from './canvas-pixi/index.js'

import { assetUrl } from './assets.js'

export function accessoryList(config) {
    return (config?.simulator?.accessory ?? []).map(item => ({
        ...item,
        img: assetUrl(item?.img?.game),
        thumbnail: assetUrl(item?.img?.thumbnail ?? item?.img?.game),
        ...(Array.isArray(item?.variant) && {
            variant: item.variant.map(v => (v?.img ? { ...v, img: assetUrl(v.img) } : v)),
        }),
    }))
}

function spawnOptions(item, entry, where) {
    const options = {}

    if (entry?.start != null) {
        const start = Number(entry.start)
        const min = Number(item?.min)
        const max = Number(item?.max)
        const bounded = Number.isFinite(min) && Number.isFinite(max)

        if (!Number.isFinite(start)) {
            console.warn(`${where}: "${item.name}" start is not a number`)
        } else if (bounded && (start < min || start > max)) {
            console.warn(`${where}: "${item.name}" start ${start} is outside ${min}–${max}`)
            options.value = Math.max(min, Math.min(max, start))
        } else {
            options.value = start
        }
    }

    if (entry?.variant != null) {
        const variants = Array.isArray(item?.variant) ? item.variant : []
        const match = variants.find(v => v?.name === entry.variant)
        if (match) options.variant = match
        else console.warn(`${where}: "${item.name}" has no variant named "${entry.variant}"`)
    }

    return options
}

function spawnsFrom(config, list, where) {
    const items = accessoryList(config)
    const spawns = []

    for (const entry of (list ?? [])) {
        const item = items.find(i => i.name === entry?.accessory)
        if (!item) {
            console.warn(`${where}: no accessory named "${entry?.accessory}"`)
            continue
        }
        spawns.push({ item, place: entry, options: spawnOptions(item, entry, where) })
    }

    return spawns
}

export function seatSpawns(config) {
    return spawnsFrom(config, config?.simulator?.deal?.player?.accessory, 'deal.player.accessory')
}

export function gameSpawns(config) {
    return spawnsFrom(config, config?.simulator?.deal?.game?.accessory, 'deal.game.accessory')
}

const ADDERS = [
    { category: 'dice', add: addDice, name: 'dice' },
    { category: 'counter', add: addCounter, name: 'counter' },
    { category: 'board', add: addBoard, name: 'board' },
    { category: 'marker', add: addMarker, name: 'marker' },
]

const FALLBACK = ADDERS.find(entry => entry.category === 'marker')

function entryFor(item) {
    const categories = Array.isArray(item?.category) ? item.category : [item?.category]
    return ADDERS.find(entry => categories.includes(entry.category)) ?? FALLBACK
}

export function adderFor(item) {
    return entryFor(item).add
}

export function facesSeat(item) {
    return !nameKeepsUpright(entryFor(item).name)
}
