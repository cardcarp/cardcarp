import { ref, computed, watch, toValue } from 'vue'
import { refDebounced } from '@vueuse/core'
import { foldName } from '@cardcarp/simulator'

// Shared with the table's ?deck= link, which is why it lives outside this composable.

// Folded names, one array parallel to the source, cached against the source's
// own identity. The list only changes when a filter upstream rebuilds it, so a
// run of keystrokes folds nothing at all — where the previous code lowercased
// every name on every keystroke.
//
// Keyed weakly: when a game's manifest is dropped for another's, its keys go
// with it.
const fold_cache = new WeakMap()

function foldedNames(list, nameKey) {
  let keys = fold_cache.get(list)
  if (!keys) {
    keys = list.map(item => (item[nameKey] ? foldName(item[nameKey]) : ''))
    fold_cache.set(list, keys)
  }
  return keys
}

// Subsequence match: every character of the pattern appears in the target, in
// order, not necessarily adjacent.
function isSubsequence(pattern, target) {
  let patternIdx = 0
  let targetIdx = 0

  while (patternIdx < pattern.length && targetIdx < target.length) {
    if (pattern[patternIdx] === target[targetIdx]) patternIdx++
    targetIdx++
  }

  return patternIdx === pattern.length
}

// `nameKey` is the property the query matches and the sort orders by — cards
export function useCardSearch(sourceData, itemsPerPage = 10, nameKey = 'name') {
  const searchQuery = ref('')
  const debouncedQuery = refDebounced(searchQuery, 300)
  
  const currentPage = ref(1)
  const sortDirection = ref('asc')

  watch(debouncedQuery, () => {
    currentPage.value = 1
  })

  const filteredAndSortedData = computed(() => {
    // toValue safely handles refs, getters, or plain arrays
    const source = toValue(sourceData) || []
    if (!source.length) return []

    const keys = foldedNames(source, nameKey)
    const direction = sortDirection.value === 'asc' ? 1 : -1

    // Matching and sorting both run on indices into the cached key array, so
    // the comparator never touches the records or allocates a lowercased copy
    // of a name. That is also what folds the sort: "Dandân" lands with the D's
    // instead of after every unaccented name.
    const index = []

    if (debouncedQuery.value) {
      const pattern = foldName(debouncedQuery.value)

      for (let i = 0; i < source.length; i++) {
        if (keys[i] && isSubsequence(pattern, keys[i])) index.push(i)
      }
    } else {
      for (let i = 0; i < source.length; i++) index.push(i)
    }

    index.sort((a, b) => {
      if (keys[a] < keys[b]) return -direction
      if (keys[a] > keys[b]) return direction
      return 0
    })

    return index.map(i => source[i])
  })

  const totalPages = computed(() => Math.ceil(filteredAndSortedData.value.length / itemsPerPage) || 1)

  const paginatedData = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredAndSortedData.value.slice(start, end)
  })

  function nextPage() {
    if (currentPage.value < totalPages.value) {
      currentPage.value++
    }
  }

  function prevPage() {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  function goToPage(pageNumber) {
    if (pageNumber >= 1 && pageNumber <= totalPages.value) {
      currentPage.value = pageNumber
    }
  }

  function toggleSort() {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  }

  return {
    searchQuery,
    currentPage,
    sortDirection,
    // The whole match set, unpaged — for callers that window it themselves
    // (e.g. the deckbox card tab's infinite scroll, via use_page).
    filteredData: filteredAndSortedData,
    paginatedData,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    toggleSort
  }
}
