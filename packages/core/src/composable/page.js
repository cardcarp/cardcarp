// composable/page.js
import { computed, toValue } from 'vue'

// use_page(items, state)
//   items : array | ref/getter -> array (typically use_search results)
//   state : reactive search state holding .page and .max
//
// The window is cumulative: the view renders pages 1..page as one list, so
// `page` is a "how much has been revealed" counter rather than a position.
// That's what the center's infinite scroll grows — load_more() bumps it by a
// page each time the viewport nears the end. `max` is the initial window and
// the size of every step after it.
//
// Callers must reset_page() whenever the underlying result set changes,
// otherwise a new search inherits the last one's scroll depth.
export function use_page(items, state) {
    const list = computed(() => toValue(items) ?? [])
    const total = computed(() => list.value.length)
    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / toValue(state).max)))

    const paginated = computed(() => {
        if (!total.value) return []
        const { page, max } = toValue(state)
        return list.value.slice(0, page * max)
    })

    // Whether any result is still held back — the gate for infinite scroll.
    const has_more = computed(() => paginated.value.length < total.value)

    function load_more() {
        if (has_more.value) toValue(state).page += 1
    }

    function reset_page() {
        toValue(state).page = 1
    }

    const indexStart = computed(() => (total.value ? 1 : 0))
    const indexEnd = computed(() => paginated.value.length)

    return { total, totalPages, paginated, has_more, load_more, reset_page, indexStart, indexEnd }
}
