// Core
import { createRouter, createWebHistory } from 'vue-router'

// Views
import Home from '@/view/home/index.vue'
import HomeLanding from '@/view/home/landing.vue'
import Doc from '@/view/doc/index.vue'
import ExampleList from '@/view/example/index.vue'
import NotFound from '@/view/not-found.vue'

// Data
import { packages } from '@/view/doc/tree.js'

// Composables
import { setTitle, setDescription } from '@/composable/head.js'

// No :game routes any more, and so no game list here: a game is its own project on its own
// domain (see apps/), and this site links out to one rather than mounting it. What is left is
// documentation — one tree per publishable package — plus the list of projects built on them.
// No articles either: this site renders nothing of its own beyond those two things.
//
// Two routes per package rather than one with an optional param, so /deckbox and
// /deckbox/install are separate named targets and the index page has a URL of its own rather
// than a second spelling of a page that also answers to a slug. The pair is generated from
// view/doc/tree.js, which is also what the trees themselves are declared in, so a third package
// is a tree and a page folder and no edit here.
const docs = packages.flatMap((pkg) => [
    {
        path: pkg,
        name: pkg,
        component: Doc,
        props: { pkg },
        // The doc shell resolves its own title from the tree — it knows which page is showing
        // and this does not.
        meta: { ownHead: true }
    },
    {
        path: `${pkg}/:slug`,
        name: `${pkg}-page`,
        component: Doc,
        props: (route) => ({ pkg, slug: route.params.slug }),
        meta: { ownHead: true }
    }
])

export const routes = [
    {
        // Home shell (sidebar + <router-view>) with one child per section.
        // The 'home' name stays on the index child so existing links to it
        // (e.g. { name: 'home' }) keep resolving to '/'.
        path: '/',
        component: Home,
        children: [
            { path: '', name: 'home', component: HomeLanding },

            // /deckbox, /deckbox/:slug, /simulator, /simulator/:slug
            ...docs,

            { path: 'examples', name: 'examples', component: ExampleList, meta: { title: 'Examples' } },

            // Anything else. A child of the shell rather than a top-level route, so a wrong URL
            // keeps the sidebar and every real destination stays one click away — recovering
            // from a typo should not also cost you the navigation.
            //
            // Declared last for readability only: vue-router ranks by specificity, not by
            // order, and a catch-all scores below every literal path above whatever its
            // position. Moving it would not break anything; leaving it here means the file
            // reads the way the matching behaves.
            //
            // This is a 404 in the UI alone — the Worker serves the SPA shell with a 200 for
            // every path (see wrangler.jsonc). Making the status honest would mean rendering
            // this on the server, which is a bigger change than it looks and buys a human
            // nothing.
            { path: ':pathMatch(.*)*', name: 'not-found', component: NotFound, meta: { title: 'Not found' } }
        ]
    },
]

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes
})

// Keep the document title/description in sync with the active route. The doc
// pages resolve their own head — the shell knows which page is showing and this
// does not — so they opt out with meta.ownHead. afterEach also fires for aborted
// navigations (a guard returning false), which never left `from`, so those are
// skipped.
router.afterEach((to, from, failure) => {
    if (failure) return
    if (to.meta.ownHead) return
    const title = typeof to.meta.title === 'function' ? to.meta.title(to) : to.meta.title
    setTitle(title)
    setDescription(to.meta.description)
})

export { router }
