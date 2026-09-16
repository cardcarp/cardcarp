// deckbox/layout.js
//
// What the center's two layouts do differently, as data.
//
// These used to be four separate `layout === 'grid'` ternaries spread through
// table.vue's template — one each for the list wrapper, the item, the hover
// tint and the group title — so neither layout could be read in one piece; you
// had to walk the whole template and reassemble each one mentally. Held here,
// the two sit side by side and a change to one is visibly a change to the other.
//
// table-skeleton.vue renders from the same spec, which is the point: the
// skeleton stands in for these exact boxes, and padding that drifted between
// the two would shift the grid at the moment the data lands.

export const LAYOUT = {
    grid: {
        list: 'px-5 pt-4 pb-10 grid gap-5',
        item: 'transition-all hover:-translate-y-0.5 hover:brightness-110',
        // The grid's hover cue is the lift and brightness above; a tint on top
        // of the art would only muddy it.
        hover: '',
        title: 'mt-2',
    },
    table: {
        list: '',
        item: 'pl-3 pr-4 py-3 text-3.5',
        hover: 'bg-yellow-500/5',
        title: 'bg-black',
    },
}

// The row separator, as inline style because it is two overlaid lines rather
// than one border: a hard black inset under a near-transparent white hairline,
// so rows stay legible against both the black group title and the panel's
// gradient. Shared so the skeleton's rows sit on the same rhythm as real ones.
export const ROW_EDGE = {
    boxShadow: 'inset 0 -1px 0 0 hsl(0 0 0)',
    borderBottom: '1px solid hsl(0 0 100 / 0.04)',
}

// Grid template for a given column count — the one piece of the grid layout
// that depends on user state rather than being constant.
export function gridColumns(count) {
    return { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }
}
