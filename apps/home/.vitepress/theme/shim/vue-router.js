// MIGRATION SHIM — aliased in place of `vue-router` (see ../../config.mjs).
//
// The views not ported yet import RouterLink, useRoute and useRouter, and their templates use
// <router-link>. This is the smallest surface that keeps them working on VitePress's router, so
// the spike can be judged on every URL rather than only the converted ones. It is not a router:
// no guards, no named views, no history stack of its own.
//
// Once landing, examples, not-found and the unconverted doc pages are ported, delete this file
// and the alias.

import { computed, defineComponent, h, reactive } from 'vue'
import { inBrowser, useRoute as useVitePressRoute, useRouter as useVitePressRouter, withBase } from 'vitepress'

import { href } from '../link.js'

export const RouterLink = defineComponent({
    name: 'RouterLink',
    props: {
        to: { type: [String, Object], required: true }
    },
    setup(props, { slots }) {
        // A plain anchor. VitePress intercepts same-origin clicks on <a> itself, so this still
        // navigates without a reload.
        return () => h('a', { href: withBase(href(props.to)) }, slots.default?.())
    }
})

// VitePress's route carries no query string, and the one view that reads it (examples, for ?q=)
// writes it back with replace(). Kept here, seeded from the address bar on the client and empty
// during the pre-render.
const query = reactive(
    inBrowser ? Object.fromEntries(new URLSearchParams(window.location.search)) : {}
)

export function useRoute() {
    const route = useVitePressRoute()
    return reactive({
        path: computed(() => route.path),
        query
    })
}

export function useRouter() {
    const router = useVitePressRouter()
    return {
        push(to) {
            return router.go(withBase(href(to)))
        },

        // Only the { query } form is used. Rewrites the address bar in place — no navigation,
        // no history entry — which is what the examples search box relies on.
        replace({ query: next = {} } = {}) {
            for (const key of Object.keys(query)) if (!(key in next)) delete query[key]
            Object.assign(query, next)

            if (!inBrowser) return
            const search = new URLSearchParams(next).toString()
            window.history.replaceState(window.history.state, '', window.location.pathname + (search ? `?${search}` : '') + window.location.hash)
        }
    }
}
