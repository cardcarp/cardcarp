// Document title + meta description. Set centrally from route meta (see the
// router's afterEach) and by views that resolve their head asynchronously
// (e.g. resource articles). This is a client-only SPA, so these are set in JS
// — good for tab labels, bookmarks, and shared-link history, but real
// crawler-facing SEO would need SSR or prerendering.

export const SITE = 'CardCarp'

export const DEFAULT_TITLE = 'Browse Card-Game Databases, Build Decks, and Simulate Games'

export const DEFAULT_DESCRIPTION = "Like a virtual whiteboard, but for cards. It doesn't enforce rules or automate game logic, so you have complete freedom to move cards, tap, and test plays manually."

// `<page> · CardCarp`, or the site default when no page title is given.
export function setTitle(pageTitle) {
    document.title = pageTitle ? pageTitle : DEFAULT_TITLE
}

// Update (or create) the <meta name="description">, falling back to the site
// default so a page-specific description never lingers after navigation.
export function setDescription(text) {
    let el = document.head.querySelector('meta[name="description"]')
    if (!el) {
        el = document.createElement('meta')
        el.setAttribute('name', 'description')
        document.head.appendChild(el)
    }
    el.setAttribute('content', text || DEFAULT_DESCRIPTION)
}
