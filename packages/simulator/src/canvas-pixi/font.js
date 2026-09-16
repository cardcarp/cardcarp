// Webfont readiness, ported from canvas/font.js.
//
// The detection is unchanged — measure a string in the font against Arial and Times and watch
// for the width to move — because that has nothing to do with the renderer and everything to do
// with browsers resolving document.fonts.load too early.
//
// What changed is the last line. Konva needed a batchDraw because text drawn before the font
// arrived was already rasterised into a layer's canvas. Pixi renders on a ticker, so there is
// nothing to schedule; what it needs instead is for each Text to RE-MEASURE, since a Pixi Text
// lays itself out once and caches the result. Touching `text` is what invalidates that.

import { getLayers } from './scene.js'

// Track which fonts have been confirmed loaded so we only wait once.
const loaded = new Set()

function measure(fontName, fallback, style = 'normal', weight = '400') {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = `${style} ${weight} 16px '${fontName}', ${fallback}`
    return ctx.measureText('The quick brown fox 0123456789').width
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function loadFont(fontName, style = 'normal', weight = '400') {
    if (loaded.has(fontName)) return

    const arialWidth = measure('Arial', 'Arial', style, weight)

    if (document.fonts?.load) {
        try {
            await document.fonts.load(`${style} ${weight} 16px '${fontName}'`)
            const newWidth = measure(fontName, 'Arial', style, weight)
            if (arialWidth !== newWidth) {
                await wait(60)
                loaded.add(fontName)
                remeasureText()
                return
            }
        } catch {
            // fall through to polling
        }
    }

    // Polling fallback — some browsers resolve document.fonts.load too early
    const timesWidth = measure('Times', 'Times', style, weight)
    let lastWidth = measure(fontName, 'Arial', style, weight)
    const INTERVAL = 60
    const MAX_WAIT = 6000

    for (let elapsed = 0; elapsed < MAX_WAIT; elapsed += INTERVAL) {
        await wait(INTERVAL)
        const wArial = measure(fontName, 'Arial', style, weight)
        const wTimes = measure(fontName, 'Times', style, weight)
        if (wArial !== lastWidth || wArial !== arialWidth || wTimes !== timesWidth) {
            await wait(60)
            loaded.add(fontName)
            remeasureText()
            return
        }
        lastWidth = wArial
    }

    console.warn(`loadFont: timed out waiting for "${fontName}"`)
}

// A Pixi Text measures itself once and caches the layout. Re-assigning the same string is the
// documented way to make it measure again, which is what a newly-arrived font requires.
function remeasureText() {
    const { shape } = getLayers()
    for (const node of shape?.children ?? []) {
        if (node.kind !== 'text') continue
        node.repaint()
    }
}
