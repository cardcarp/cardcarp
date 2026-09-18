import { CONVERT_CONCURRENCY, JPEG_QUALITY, targetSize } from './print-sheet.js'

export function typedBlob(blob, url) {
    if (blob.type?.startsWith('image/')) return blob

    const ext = String(url).split('?')[0].split('.').pop().toLowerCase()
    return blob.slice(0, blob.size, `image/${ext === 'jpg' ? 'jpeg' : ext}`)
}

export async function decodeImage(blob) {
    if (typeof createImageBitmap === 'function') {
        try {
            return await createImageBitmap(blob)
        } catch {
            // Safari 16.0–16.3 can't decode AVIF this way; fall back to <img>.
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

export function jpegDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result)
        reader.onerror = () => reject(new Error('FileReader failed'))
        reader.readAsDataURL(blob)
    })
}

export function createJpegTranscoder({ cardSize, quality = JPEG_QUALITY, concurrency = CONVERT_CONCURRENCY } = {}) {
    const cache = new Map()

    async function fetchJpeg(url) {
        const cached = cache.get(url)
        if (cached) return cached

        const res = await fetch(url, { mode: 'cors', credentials: 'omit' })

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
