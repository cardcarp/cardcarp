const SLUG_MAX = 60

export function slugify(value) {
    return String(value ?? '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, SLUG_MAX)
        .replace(/-+$/g, '')
}

export function stamp(date = new Date()) {
    const pad = (n) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function downloadName(parts, ext) {
    const subject = parts
        .map(slugify)
        .filter(Boolean)
        .join('-')
        .slice(0, SLUG_MAX)
        .replace(/-+$/g, '')

    return `${[subject || 'cardcarp', stamp()].join('-')}.${ext}`
}
