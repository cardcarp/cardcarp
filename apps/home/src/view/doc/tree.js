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
                    { slug: '', name: 'Overview' },
                    { slug: 'install', name: 'Install' },
                    { slug: 'configuration', name: 'Configuration' },
                    { slug: 'api', name: 'API' }
                ]
            },
            {
                name: 'Interface',
                page: [
                    { slug: 'archive', name: 'The archive' },
                    { slug: 'filters', name: 'Filters and sorting' },
                    { slug: 'decks', name: 'Deck editing' }
                ]
            },
            {
                name: 'Data',
                page: [
                    { slug: 'card-model', name: 'Card data' },
                    { slug: 'export', name: 'Export and print' }
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
                    { slug: '', name: 'Overview' },
                    { slug: 'install', name: 'Install' },
                    { slug: 'configuration', name: 'Configuration' },
                    { slug: 'api', name: 'API' }
                ]
            },
            {
                name: 'The table',
                page: [
                    { slug: 'stage', name: 'Table layout' },
                    { slug: 'tools', name: 'Tools and objects' },
                    { slug: 'seats', name: 'Seats and hands' }
                ]
            },
            {
                name: 'Multiplayer',
                page: [
                    { slug: 'multiplayer', name: 'The relay' },
                    { slug: 'rooms', name: 'Rooms' }
                ]
            }
        ]
    },

    compile: {
        name: 'Compile',
        package: 'cardcarp-compile',
        tagline: 'The build every card dataset runs: YAML checked against its schema, references resolved, and the archive the apps load.',
        section: [
            {
                name: 'Getting started',
                page: [
                    { slug: '', name: 'Overview' },
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

export const packages = Object.keys(DOC)

export function doc(pkg) {
    return DOC[pkg] ?? null
}

export function pages(pkg) {
    return (doc(pkg)?.section ?? []).flatMap((section) => section.page)
}

export function findPage(pkg, slug = '') {
    return pages(pkg).find((page) => page.slug === slug) ?? null
}

export function neighbours(pkg, slug = '') {
    const all = pages(pkg)
    const i = all.findIndex((page) => page.slug === slug)
    if (i === -1) return { prev: null, next: null }
    return { prev: all[i - 1] ?? null, next: all[i + 1] ?? null }
}
