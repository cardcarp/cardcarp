// How a print sheet is laid out — the arithmetic half of dialog-print.vue.
//
// Separated from print-image.js because this part is pure: given a paper size, a card size and the
// two spacing options, everything below is numbers in and numbers out, and can be checked without a
// browser. See print-sheet.test.mjs.

// What the format dropdown offers. PAPER_SIZE knows more than this — the rest are there so a game
// whose cards need A3 is a config change rather than a code one.
export const PAPER_FORMAT = ['a4', 'letter', 'legal']

// Millimetres, portrait.
export const PAPER_SIZE = {
    a0: { width: 841, height: 1189 },
    a1: { width: 594, height: 841 },
    a2: { width: 420, height: 594 },
    a3: { width: 297, height: 420 },
    a4: { width: 210, height: 297 },
    a5: { width: 148, height: 210 },
    a6: { width: 105, height: 148 },
    a7: { width: 74, height: 105 },
    a8: { width: 52, height: 74 },
    a9: { width: 37, height: 52 },
    a10: { width: 26, height: 37 },
    letter: { width: 216, height: 279 },
    legal: { width: 216, height: 356 },
    tabloid: { width: 279, height: 432 },
}

export const PRINT_DPI = 300
export const MM_PER_INCH = 25.4

// 0.85 is where a 300dpi card stops changing to the eye on paper but the file keeps shrinking —
// ~260KB a card against ~350KB at 0.92, which is 45MB off a 500-card sheet's PDF.
export const JPEG_QUALITY = 0.85

// How many cards to fetch and transcode at once. Enough to keep the network busy, few enough that a
// 500-card list doesn't hold 500 decoded bitmaps.
export const CONVERT_CONCURRENCY = 4

// The grid one page holds, plus the CSS the preview draws it with.
//
// Note the asymmetry between cols and rows: the column count adds `gap` back into the numerator (n
// cards carry n-1 gaps, so the last gap has to be returned before dividing) and the row count does
// not. Carried over from the version in the dialog exactly as it was — with a non-zero gap it can
// cost a row that would have fitted. Left alone deliberately: changing it changes how many cards land
// on a printed page, which is not a silent fix.
export function sheetLayout({ paper, card, padding = 0, gap = 0 }) {
    const pageW = paper?.width ?? 0
    const pageH = paper?.height ?? 0
    const cardW = card?.width ?? 0
    const cardH = card?.height ?? 0

    // A card of no size would divide by zero and report Infinity cards per page.
    if (!pageW || !pageH || !cardW || !cardH) {
        return {
            cols: 0,
            rows: 0,
            perPage: 0,
            aspectRatio: `${pageW} / ${pageH}`,
            pageSize: `${pageW}mm ${pageH}mm`,
            cardStyle: { aspectRatio: `${cardW} / ${cardH}` },
            gridStyle: {},
        }
    }

    const cols = Math.max(0, Math.floor((pageW - padding * 2 + gap) / (cardW + gap)))
    const rows = Math.max(0, Math.floor((pageH - padding * 2) / (cardH + gap)))

    const pct = (value, against) => (value / against) * 100

    return {
        cols,
        rows,
        perPage: cols * rows,
        aspectRatio: `${pageW} / ${pageH}`,
        pageSize: `${pageW}mm ${pageH}mm`,
        cardStyle: {
            aspectRatio: `${cardW} / ${cardH}`,
        },
        gridStyle: {
            gridTemplateColumns: `repeat(${cols}, ${pct(cardW, pageW)}%)`,
            gridTemplateRows: `repeat(${rows}, ${pct(cardH, pageH)}%)`,
            gap: `${pct(gap, pageH)}% ${pct(gap, pageW)}%`,
            padding: `${pct(padding, pageH)}% ${pct(padding, pageW)}%`,
        },
    }
}

// Slice a flat card list into pages. A perPage of zero would loop forever, so it yields nothing.
export function paginate(list, perPage) {
    const cards = list ?? []
    if (!(perPage > 0)) return []

    const pages = []
    for (let i = 0; i < cards.length; i += perPage) {
        pages.push(cards.slice(i, i + perPage))
    }
    return pages
}

// Where one card sits on the page, in millimetres from the top-left corner.
//
// Pulled out of the placement loop so the PDF and the on-screen preview cannot drift: both ask this.
export function cardPosition(index, { cols, card, padding = 0, gap = 0 }) {
    const col = index % cols
    const row = Math.floor(index / cols)

    return {
        x: padding + col * (card.width + gap),
        y: padding + row * (card.height + gap),
    }
}

// Card art is published larger than any sheet needs. Cap it at the print resolution of one card so
// the PDF stays a sane size — and never upscale, which only inflates the file without adding detail.
export function targetSize({ width, height }, card) {
    const cardW = card?.width ?? 0
    const cardH = card?.height ?? 0
    if (!cardW || !cardH || !width || !height) return { width, height }

    const maxW = (cardW / MM_PER_INCH) * PRINT_DPI
    const maxH = (cardH / MM_PER_INCH) * PRINT_DPI
    const scale = Math.min(1, maxW / width, maxH / height)

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    }
}
