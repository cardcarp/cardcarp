export function pageHref(pkg, page) {
    return page.slug ? `/${pkg}/${page.slug}` : `/${pkg}`
}

export function segments(path) {
    return path.replace(/\.html$/, '').replace(/\/index$/, '').split('/').filter(Boolean)
}
