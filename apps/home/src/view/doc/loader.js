// The component behind a tree entry. Kept apart from ./tree.js because
// `import.meta.glob` only exists inside Vite, and the tree is plain data that
// Node also reads — the VitePress config resolves page titles from it.

// Compile-time map of { './page/<pkg>/<file>.vue': () => import(...) }. Indexing
// it with a slug is safe: an unknown key is undefined, not a dynamic path.
const registry = import.meta.glob('./page/*/*.vue')

// The loader for a page's component, or null when it has none — a draft, or a
// tree entry whose file has not landed yet. Both render the shell's placeholder,
// which is why this returns null rather than throwing: a tree that names a page
// it cannot resolve is a page to be written, not a broken build.
export function loader(pkg, page) {
    if (!page) return null
    return registry[`./page/${pkg}/${page.file ?? page.slug}.vue`] ?? null
}
