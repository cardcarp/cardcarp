// The documentation trees — one per tool — and the lookups the shell needs to
// render them. Two are npm packages; Compile is Python, installed by each game's
// dataset repo, which is why a tree may state its own `install` line.
//
// A tree is DECLARED here rather than discovered from the page folder, because
// order and grouping are the thing a docs tree is for and a glob has neither.
// The glob still resolves each page's component; what it cannot supply is which
// section a page belongs to, what it sits between, and whether it is written
// yet. So: this file owns the shape, ./page/<pkg>/ owns the prose.
//
// Page entry:
//
//   { slug: '',        file: 'overview', name: 'Overview' }   the index page
//   { slug: 'install',                   name: 'Install'  }   file defaults to slug
//   { slug: 'stage',                     name: 'Stage',   draft: true }
//
// `slug: ''` is the package root — /deckbox rather than /deckbox/overview — so
// exactly one page per tree carries it and needs its own `file`.
//
// `draft: true` is a page that is planned but unwritten. It has no component and
// is not an error: the nav marks it and the shell renders a placeholder, which
// is a truthful empty page rather than a link into nothing. Drop a matching file
// into ./page/<pkg>/ and delete the flag — nothing else changes.

// Compile-time map of { './page/<pkg>/<file>.vue': () => import(...) }. Indexing
// it with a slug is safe: an unknown key is undefined, not a dynamic path.
const registry = import.meta.glob('./page/*/*.vue')

export const DOC = {
    deckbox: {
        name: 'Deckbox',
        package: '@cardcarp/deckbox',
        tagline: 'The card archive, filters and facets, deck editing, and export to print or file.',
        repo: 'packages/deckbox',
        section: [
            {
                name: 'Getting started',
                page: [
                    { slug: '', file: 'overview', name: 'Overview' },
                    { slug: 'install', name: 'Install' },
                    { slug: 'configuration', name: 'Configuration' },
                    { slug: 'api', name: 'API' }
                ]
            },
            {
                name: 'Interface',
                page: [
                    { slug: 'layout', name: 'Layout', draft: true },
                    { slug: 'archive', name: 'The archive', draft: true },
                    { slug: 'filters', name: 'Filters and facets', draft: true },
                    { slug: 'decks', name: 'Deck editing', draft: true },
                    { slug: 'dialogs', name: 'Dialogs', draft: true }
                ]
            },
            {
                name: 'Data',
                page: [
                    { slug: 'card-model', name: 'The card model', draft: true },
                    { slug: 'set-list', name: 'Set lists', draft: true },
                    { slug: 'export', name: 'Export and print', draft: true }
                ]
            }
        ]
    },

    simulator: {
        name: 'Simulator',
        package: '@cardcarp/simulator',
        tagline: 'The virtual tabletop: stage geometry, the Pixi canvas, seats, and the multiplayer client.',
        repo: 'packages/simulator',
        section: [
            {
                name: 'Getting started',
                page: [
                    { slug: '', file: 'overview', name: 'Overview' },
                    { slug: 'install', name: 'Install' },
                    { slug: 'configuration', name: 'Configuration' },
                    { slug: 'api', name: 'API' }
                ]
            },
            {
                name: 'The table',
                page: [
                    { slug: 'stage', name: 'Stage geometry', draft: true },
                    { slug: 'canvas', name: 'The Pixi canvas', draft: true },
                    { slug: 'tools', name: 'Tools', draft: true },
                    { slug: 'seats', name: 'Seats and hands', draft: true }
                ]
            },
            {
                name: 'Multiplayer',
                page: [
                    { slug: 'multiplayer', name: 'The relay' },
                    { slug: 'rooms', name: 'Rooms and parties', draft: true }
                ]
            },
            {
                name: 'Onboarding',
                page: [
                    { slug: 'tutorial', name: 'The tutorial', draft: true },
                    { slug: 'shortcuts', name: 'Shortcuts', draft: true }
                ]
            }
        ]
    },

    // Not an npm package, so the shell's default `npm install <package>` line would be wrong:
    // `install` replaces it. Compile is a git dependency of each dataset repo, not a registry
    // package, and nothing in an app installs it at all.
    compile: {
        name: 'Compile',
        package: 'cardcarp-compile',
        install: 'pip install "cardcarp-compile @ git+https://github.com/cardcarp/compile.git"',
        tagline: 'The build every card dataset runs: YAML checked against its schema, references resolved, and the archive the apps load.',
        section: [
            {
                name: 'Getting started',
                page: [
                    { slug: '', file: 'overview', name: 'Overview' },
                    { slug: 'install', name: 'Install' },
                    { slug: 'configuration', name: 'Configuration' },
                    { slug: 'commands', name: 'Commands' }
                ]
            },
            {
                name: 'The dataset',
                page: [
                    { slug: 'principles', name: 'Design principles' },
                    { slug: 'your-game', name: 'Bring your own game' }
                ]
            },
            {
                name: 'The apps',
                page: [
                    { slug: 'manifest', name: 'The manifest contract' }
                ]
            }
        ]
    }
}

// The package keys, in nav order. The router builds a pair of routes per entry,
// so adding a third package here is a tree plus a page folder and no route edit.
export const packages = Object.keys(DOC)

export function doc(pkg) {
    return DOC[pkg] ?? null
}

// Every page of a tree, flattened in reading order — what prev/next walks.
export function pages(pkg) {
    return (doc(pkg)?.section ?? []).flatMap((section) => section.page)
}

export function findPage(pkg, slug = '') {
    return pages(pkg).find((page) => page.slug === slug) ?? null
}

// The page before and after `slug`, or null at either end. Drafts are included:
// they are real destinations in the tree, and skipping them would make the
// footer disagree with the nav beside it about what comes next.
export function neighbours(pkg, slug = '') {
    const all = pages(pkg)
    const i = all.findIndex((page) => page.slug === slug)
    if (i === -1) return { prev: null, next: null }
    return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null }
}

// The loader for a page's component, or null when it has none — a draft, or a
// tree entry whose file has not landed yet. Both render the shell's placeholder,
// which is why this returns null rather than throwing: a tree that names a page
// it cannot resolve is a page to be written, not a broken build.
export function loader(pkg, page) {
    if (!page) return null
    return registry[`./page/${pkg}/${page.file ?? page.slug}.vue`] ?? null
}
