// Turning published card art into something a printer will accept — the browser half of
// dialog-print.vue.
//
// Card art ships as AVIF only. Neither jsPDF nor most desktop print software reads AVIF, so both
// exports go through the browser's own decoder: fetch the bytes, decode, draw to a canvas, re-encode
// as JPEG. The canvas is never tainted — the bitmap comes from a blob we fetched ourselves — so
// toBlob and toDataURL are always allowed.
//
// Kept apart from print-sheet.js because none of this runs outside a browser: it needs fetch, a
// canvas and an image decoder. The arithmetic that decides where these land is next door, and is
// tested.
import { CONVERT_CONCURRENCY, JPEG_QUALITY, targetSize } from './print-sheet.js'

// The bucket serves card art as application/octet-stream, and the decoders pick their codec from the
// blob's type — so restate it from the file extension before handing the bytes over.
export function typedBlob(blob, url) {
    if (blob.type?.startsWith('image/')) return blob

    const ext = String(url).split('?')[0].split('.').pop().toLowerCase()
    return blob.slice(0, blob.size, `image/${ext === 'jpg' ? 'jpeg' : ext}`)
}

// The decoded source image. createImageBitmap handles AVIF wherever the format itself is supported;
// the <img> path covers the browsers whose bitmap decoder lags their renderer (Safari 16–16.3).
export async function decodeImage(blob) {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(blob)
        } catch {
            // Fall through to the <img> decoder.
        }
    }

    const url = URL.createObjectURL(blob)
    try {
        const img = new Image()
        img.src = url
        await img.decode()
        return img
    } finally {
        URL.revokeObjectURL(url)
    }
}

// jsPDF wants a data URL. Blobs are what the cache holds — base64 runs a third larger and the browser
// can page a blob out to disk, so the string is built per placement and dropped rather than kept.
export function jpegDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('FileReader failed'))
        reader.readAsDataURL(blob)
    })
}

// One transcoder per print run, holding its own cache.
//
// `cardSize` is taken once, as plain millimetres, rather than read from a store on every call: a run
// should finish at the size it started at, and this way nothing here knows what a Vue ref is.
export function createJpegTranscoder({ cardSize, quality = JPEG_QUALITY, concurrency = CONVERT_CONCURRENCY } = {}) {
    // One entry per unique card URL — a deck asking for four copies fetches and transcodes it once.
    const cache = new Map()

    // Fetch one card's AVIF and hand back the JPEG the exports can actually use.
    async function fetchJpeg(url) {
        const cached = cache.get(url)
        if (cached) return cached

        const res = await fetch(url, { mode: 'cors', credentials: 'omit' })

        // Catch 403s, 404s and the like before they corrupt the PDF.
        if (!res.ok) {
            throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
        }

        const source = await decodeImage(typedBlob(await res.blob(), url))
        const size = targetSize({ width: source.width, height: source.height }, cardSize)

        const canvas = document.createElement('canvas')
        canvas.width = size.width
        canvas.height = size.height
        canvas.getContext('2d').drawImage(source, 0, 0, size.width, size.height)
        source.close?.()

        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob(
                result => result ? resolve(result) : reject(new Error('JPEG encode failed')),
                'image/jpeg',
                quality,
            )
        })

        cache.set(url, blob)
        return blob
    }

    // Transcode a list of URLs a few at a time, reporting progress as each finishes. Failures are
    // logged and skipped — one dead image shouldn't cost the user the other 499.
    async function fetchAll(urls, onProgress) {
        const queue = [...new Set(urls ?? [])]

        let done = 0
        onProgress?.(0, queue.length)

        let cursor = 0
        async function worker() {
            while (cursor < queue.length) {
                const url = queue[cursor++]
                try {
                    await fetchJpeg(url)
                } catch (error) {
                    console.error(`Error processing image ${url}:`, error)
                }
                onProgress?.(++done, queue.length)
            }
        }

        await Promise.all(
            Array.from({ length: Math.min(concurrency, queue.length) }, worker),
        )
    }

    return {
        fetchJpeg,
        fetchAll,
        get: (url) => cache.get(url),
        clear: () => cache.clear(),
    }
}
