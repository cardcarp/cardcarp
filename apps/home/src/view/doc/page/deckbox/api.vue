<script>
// The right-rail contents for this page — hand-written, and paired with the
// `h2#id` anchors below. Read off the module by the doc shell, which renders
// it only where there is room (see view/doc/index.vue and view/doc/toc.vue).
export const toc = [
    { id: 'deckbox', name: 'Deckbox' },
    { id: 'has-deckbox', name: 'hasDeckbox(config)' },
    { id: 'subpaths', name: 'Subpaths' },
    { id: 'peer-dependencies', name: 'Peer dependencies' }
]
</script>

<script setup>
// /deckbox/api
import CodeBlock from '@/part/code-block.vue'

const root = `
import { Deckbox, hasDeckbox } from '@cardcarp/deckbox'
`

const subpath = `
// Every file under src/ is reachable by subpath, for the odd case that needs one.
import { downloadName } from '@cardcarp/deckbox/composable/download.js'
`
</script>

<template lang="pug">
.page
    p The package root exports two names. That is not an oversight: unlike the table — whose menu genuinely needs to start a tutorial and open a shortcut sheet — nothing in a host's chrome needs to reach into a deckbox.

    CodeBlock(:code="root" label="import")

    h2#deckbox Deckbox
    p A route component. It takes no props: the game comes from #[span(class="font-mono text-neutral-300") @cardcarp/core]'s store, which is also where its config and manifest come from. It fills the viewport and manages its own scrolling.

    p One optional slot, #[span(class="font-mono text-neutral-300") #menu], placed in the header bar. The deckbox owns where the slot sits; what goes in it is a fact about the host.

    p It installs a navigation guard that prompts before leaving with an unsaved build. A guard that returns false aborts the navigation without leaving the current route, which is worth knowing if your host does anything in #[span(class="font-mono text-neutral-300") afterEach] — that hook fires for aborted navigations too.

    h2#has-deckbox hasDeckbox(config)
    p Whether a game's config describes a deckbox at all — true when #[span(class="font-mono text-neutral-300") config.deck] is present. The counterpart to #[span(class="font-mono text-neutral-300") @cardcarp/simulator]'s #[span(class="font-mono text-neutral-300") hasSimulator], and asked the same way: of a config object, not of a game name.

    h2#subpaths Subpaths
    p The package exports #[span(class="font-mono text-neutral-300") "./*": "./src/*"], so anything inside is importable. Nothing below the root is a supported surface — treat it as reaching into the implementation, and expect it to move.

    CodeBlock(:code="subpath" label="import")

    h2#peer-dependencies Peer dependencies
    p #[span(class="font-mono text-neutral-300") @cardcarp/core], #[span(class="font-mono text-neutral-300") vue] ^3.5.41 and #[span(class="font-mono text-neutral-300") vue-router] ^5.2.0. Core is a peer rather than a dependency deliberately: two copies of core would be two registries and two manifests, which is the failure the arrangement exists to make impossible.
</template>
