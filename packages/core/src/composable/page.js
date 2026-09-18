import { computed, toValue } from 'vue'

export function use_page(items, state) {
    const list = computed(() => toValue(items) ?? [])
    const total = computed(() => list.value.length)
    const totalPages = computed(() => Math.max(1, Math.ceil(total.value / toValue(state).max)))

    const paginated = computed(() => {
        if (!total.value) return []
        const { page, max } = toValue(state)
        return list.value.slice(0, page * max)
    })

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
