export const LAYOUT = {
    grid: {
        list: 'px-5 pt-4 pb-10 grid gap-5',
        item: 'transition-all hover:-translate-y-0.5 hover:brightness-110',
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

export const ROW_EDGE = {
    boxShadow: 'inset 0 -1px 0 0 hsl(0 0 0)',
    borderBottom: '1px solid hsl(0 0 100 / 0.04)',
}

export function gridColumns(count) {
    return { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }
}
