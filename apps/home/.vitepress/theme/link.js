// Route-name targets, resolved to paths.
//
// The SPA linked by name — { name: 'compile-page', params: { slug: 'install' } } — and VitePress
// links by path. This is the one place that knows the mapping, so the views that still link by
// name (through the vue-router shim) and the ported components agree on every URL.

import { packages } from '@/view/doc/tree.js'

export function href(to) {
    if (!to) return '/'
    if (typeof to === 'string') return to

    const { name, params = {}, path, hash = '' } = to
    if (path) return path + hash

    if (name === 'home') return '/' + hash
    if (name === 'examples') return '/examples' + hash
    if (packages.includes(name)) return `/${name}` + hash

    const pkg = packages.find((p) => name === `${p}-page`)
    if (pkg) return (params.slug ? `/${pkg}/${params.slug}` : `/${pkg}`) + hash

    return '/'
}

// A doc page's own path, from a tree entry.
export function pageHref(pkg, page) {
    return page.slug ? `/${pkg}/${page.slug}` : `/${pkg}`
}

// The current path without VitePress's optional `.html` and trailing slash, split into segments.
// `/compile/install.html` and `/compile/install/` are both ['compile', 'install'].
export function segments(path) {
    return path.replace(/\.html$/, '').replace(/\/index$/, '').split('/').filter(Boolean)
}
