import { getLayers } from './scene.js'

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
            // Fall through to polling.
        }
    }

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

function remeasureText() {
    const { shape } = getLayers()
    for (const node of shape?.children ?? []) {
        if (node.kind !== 'text') continue
        node.repaint()
    }
}
