// deckbox/state.js
import { ref, reactive, computed, watch } from 'vue'

import { clamp, groupBy } from 'lodash'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useProfileStore } from '@cardcarp/core/store/profile.js'
import { preview_item_isActive } from '@cardcarp/core/store/preview.js'
import { isModified, use_search } from '@cardcarp/core/composable/search.js'
import { use_page } from '@cardcarp/core/composable/page.js'

// `active_game` rather than `game`: everything below that touches game_id is
// asking "which game is the user working in" — their saved decks, their storage
// list, what the game-switch reset applies to — and none of it needs the
// manifest. Keyed to `game` instead, all of it would sit blank or stale for the
// seconds a large manifest takes to arrive, and the reset below would leave the
// previous game's build in the right panel for that whole window.
const { manifest, config, active_game: game_id } = useGameStore()
const { profile, gameDecks } = useProfileStore()

// ---------------------------------------------------------------------------
// Per-search state
// ---------------------------------------------------------------------------
// The center can show one of three datasets:
//   - 'card'  -> manifest.card_list
//   - 'deck'  -> manifest.deck_list
//   - 'list'  -> the cards of a selected deck
//
// Each dataset keeps its own search state (filters, display controls,
// pagination) so the user can toggle between datasets without
// losing what they had selected. State is in-memory only; nothing persists.

// The grid's column count is the one display control whose sensible starting
// value depends on the viewport: six card-width columns reads well on a desktop
// and is unusable on a phone. Derived from the same Tailwind breakpoints the
// styles use, so the seed tracks the layout instead of a second set of numbers.
// `active()` is '' below `sm` — phone portrait, where two columns is as many as
// fits a card you can still read.
const column_by_breakpoint = { sm: 3, md: 4, lg: 5, xl: 6, '2xl': 6 }

// What that count is counted against: the center at its full width, with
// nothing open beside it. The stored number is a card size in a count's
// clothing, and a size only means something against a fixed width.
//
// Held this way because the alternative is what the grid used to do — hold the
// count fixed and let the cards take the difference. Opening a panel took 20rem
// off the center and redrew every card 29% smaller (57% with both open), which
// reads as the cards changing when the only thing that changed was the
// furniture beside them. Scaled instead, a card stays the size the user picked
// and the grid drops a column it can no longer fit.
//
// The scaling lives further down, with `search_active` it needs; here is only
// the ceiling both the stored count and the slider are held to.
const COLUMN_MAX = 12

const breakpoints = useBreakpoints(breakpointsTailwind)
const breakpoint_active = breakpoints.active()
const column_default = computed(() => column_by_breakpoint[breakpoint_active.value] ?? 2)

function createSearch(overrides = {}) {
    return {
        // structured filters
        filter: {},        // { [property]: value | value[] } — selections from filter.vue

        // display controls
        layout: 'grid',    // 'grid' | 'table'
        column: column_default.value,
        sort: 'random',
        direction: 'asc',  // 'asc' | 'desc'
        group: 'none',

        // pagination
        page: 1,
        max: 200,

        ...overrides,
    }
}

// Per-dataset overrides on the baseline above. Held as data rather than inlined
// below so the game switch can restore a dataset's defaults without restating
// them — each dataset sorts differently, so there is no single default to reset to.
const search_default = {
    card: { sort: 'random', layout: 'grid', max: 200 },
    deck: { sort: 'name', layout: 'table', max: 500 },
    list: { sort: 'quantity', direction: 'desc', layout: 'grid', max: 500 },
}

const search = reactive({
    card: createSearch(search_default.card),
    deck: createSearch(search_default.deck),
    list: createSearch(search_default.list),
})

// ---------------------------------------------------------------------------
// Panels / center
// ---------------------------------------------------------------------------
// The layout's one real break. At `lg` and up there is room to set the panels
// beside the center as columns; below it there is not — 20rem of panel next to
// a card grid leaves the grid unreadable — so the right panel becomes a bottom
// sheet and the left one overlays the center instead of sharing the row.
//
// It lives here rather than in each component because the split is one
// decision made in several places: the grid tracks in index.vue, and the
// direction each panel slides from. Read from one source they cannot disagree
// about which layout is on screen mid-resize.
const is_desktop = breakpoints.greaterOrEqual('lg')

const panel_left_active = ref(false)
const panel_right_active = ref(false)

const panel_left_content = ref(null)
const panel_center_content = ref('card')   // 'card' | 'deck' | 'list'
const panel_right_content = ref(null)

// The deck whose cards populate the 'list' dataset.
const deck_selected = ref(null)

// Filter definitions for the active center dataset — 'deck' filters its own
// list; 'card' and 'list' both filter cards.
//
// 'list' drops `distinct`: a deck's contents are not an archive. Every row is
// there because the builder put it there, so collapsing reprints would delete
// cards the user owns — two printings of one card, or (in PTCG) two unrelated
// cards that happen to share a name. Dropping the key exempts the dataset from
// the dedupe stage and takes the now-meaningless toggle out of the panel.
const filter_config = computed(() => {
    const cfg = config.value
    if (panel_center_content.value === 'deck') return cfg?.deck?.filter ?? {}

    const card = cfg?.card?.filter ?? {}
    if (panel_center_content.value !== 'list') return card

    const { distinct, ...rest } = card
    return rest
})

// Whether any filter in the active dataset has been moved off its manifest
// default (drives the reset button — resetting clears back to the defaults).
const any_active = computed(() =>
    Object.entries(filter_config.value).some(([key, def]) =>
        isModified(search_active.value.filter[key], def)
    )
)

// The 'set' filter picker. `key` is the manifest filter key being edited — the
// trigger lives in filter.vue, the dialog is mounted in index.vue with the
// other dialogs. Selections write straight through to the filter state, so
// there is nothing to commit on close.
const dialog_filter_set = reactive({
    active: false,
    key: null,
})

function open_filter_set(key) {
    dialog_filter_set.key = key
    dialog_filter_set.active = true
}

// The long multi-select picker. Same deal as the set dialog above, for the
// combo/check filters whose option list is too long to sit in the panel (mtg
// ships 684 themes and 871 keywords). The threshold lives in left-filter.vue,
// where the trigger is decided; this only tracks which filter is open.
const dialog_filter_multi = reactive({
    active: false,
    key: null,
})

function open_filter_multi(key) {
    dialog_filter_multi.key = key
    dialog_filter_multi.active = true
}

// The live search state for whatever dataset is currently in the center.
const search_active = computed(() => search[panel_center_content.value] ?? search.card)

// --- Card size -------------------------------------------------------------
// The center's own width, reported by center.vue as it changes.
const center_width = ref(0)

// The same center with nothing open beside it. At lg each open panel is a w-80
// column taken off it; below lg they take nothing — the left one overlays and
// the right one is a bottom sheet — so there the full width is the width.
const CENTER_PANEL_W = 320

const center_width_full = computed(() => {
    if (!is_desktop.value) return center_width.value

    const taken =
        (panel_left_content.value ? CENTER_PANEL_W : 0) +
        (panel_right_content.value ? CENTER_PANEL_W : 0)

    return center_width.value + taken
})

// How much of the full center is on screen: 1 with both panels closed, ~0.75
// with one open on a laptop. Everything below is this ratio applied. Guarded
// against the first frame, where nothing has been measured yet and the honest
// answer is "all of it".
const center_ratio = computed(() => {
    if (!center_width.value || !center_width_full.value) return 1

    return center_width.value / center_width_full.value
})

// The most columns that fit at the current width, and the count the grid
// actually renders. Both are the stored count scaled by what is on screen.
//
// The slider reads and writes these rather than the stored value, so the thumb,
// the number beside it and the grid always agree — a slider that sat at 6 while
// four columns rendered would be its own kind of wrong. What that costs is the
// top of the range: 12 columns is 12 columns of the full center, so with a
// panel open the ceiling comes down with everything else.
const column_max = computed(() => Math.max(1, Math.round(COLUMN_MAX * center_ratio.value)))

const column_active = computed(() =>
    clamp(Math.round(search_active.value.column * center_ratio.value), 1, column_max.value)
)

// The column default keeps following the viewport until the user moves the
// slider, and stops for good once they have: past that point the count is their
// choice, and a rotation or a window resize must not overwrite it. Pinning is
// per dataset — 'card' and 'list' are separate grids, and setting one says
// nothing about the other.
const column_pinned = reactive({ card: false, deck: false, list: false })

// The slider hands back a count for the width on screen. What gets stored is
// its full-width equivalent, so the card size just picked is the one that comes
// back when a panel opens or closes.
function set_column(value) {
    const key = panel_center_content.value
    if (!search[key]) return

    column_pinned[key] = true
    search[key].column = clamp(Math.round(value / center_ratio.value), 1, COLUMN_MAX)
}

watch(column_default, (value) => {
    for (const key of Object.keys(search)) {
        if (!column_pinned[key]) search[key].column = value
    }
})

// ---------------------------------------------------------------------------
// Center pipeline
// ---------------------------------------------------------------------------
// The active dataset and its search results live here so the table, the
// detail bar and the left panel all read from the same pipeline.

// Cards of the selected deck (the 'list' content).
const list_cards = computed(() => {
    const deck = deck_selected.value
    const dict = manifest.value?.card_dict
    if (!deck?.list || !dict) return []

    return Object.entries(deck.list).flatMap(([group, cards]) =>
        Object.entries(cards).map(([id, quantity]) => ({
            ...dict[id],
            id,
            quantity,
            list: group,
        }))
    )
})

const active_dataset = computed(() => {
    switch (panel_center_content.value) {
        case 'deck': return manifest.value?.deck_list ?? []
        case 'list': return list_cards.value
        default:     return manifest.value?.card_list ?? []
    }
})

const active_col = computed(() =>
    panel_center_content.value === 'deck'
        ? config.value?.deck?.table ?? []
        : config.value?.card?.table ?? []
)

const active_type = computed(() =>
    panel_center_content.value === 'deck' ? 'collection' : 'card'
)

// Search + paginate the active dataset using its own state slice.
const { results } = use_search(active_dataset, filter_config, search_active)
const { paginated, totalPages, has_more, load_more, reset_page, indexStart, indexEnd } =
    use_page(results, search_active)

// Any change to the result set — a filter, the sort, or switching datasets —
// collapses the window back to the first page, so infinite scroll never carries
// one search's depth into the next. Runs pre-flush, before the table re-renders.
watch(results, () => reset_page())

// The page's rows in one canonical shape: [{ name, item_list }]. The 'list'
// view groups a deck's cards by their deck group (hero/main/side…) in
// manifest order; other views emit a single 'all' group. Consumers (table,
// actions) can rely on this shape without normalizing again.
const grouped = computed(() => {
    if (panel_center_content.value !== 'list') {
        return paginated.value.length
            ? [{ name: 'all', item_list: paginated.value }]
            : []
    }

    const order = groups_available.value
    const byGroup = groupBy(paginated.value, item => item.list ?? 'main')

    return [
        ...order.filter(name => byGroup[name]?.length),
        ...Object.keys(byGroup).filter(name => !order.includes(name)),
    ].map(name => ({ name, item_list: byGroup[name] }))
})

// Total results after filtering, before pagination.
const result_total = computed(() => results.value.length)

// The flat card list the center's actions (probability/print/export) operate
// on: the filtered results. Deck rows aren't cards, so 'deck' yields none.
const action_card_list = computed(() =>
    panel_center_content.value === 'deck' ? [] : results.value
)

// ---------------------------------------------------------------------------
// Deck building (right panel)
// ---------------------------------------------------------------------------
// The active build. `list` is a flat array of card entries carrying quantity
// and their deck group; deck_save() folds it back into the profile's
// { group: { id: qty } } shape. Schema mirrors the profile deck records so
// loading and re-saving a deck keeps its metadata.
const deck_building = reactive({
    id: null,
    game: null,
    name: '',
    format: '',
    theme: [],
    highlight: '',
    tagline: '',
    // Long-form notes, in the published shape: [{ title, body }]. The detail
    // dialog edits section 0's body; any further sections a copied deck brought
    // with it ride along untouched.
    description: [],
    context: [],
    total: 0,
    list: [],
})

// Detached deep copy for metadata (theme, context, …) that crosses the
// build⇄profile boundary. Without it a saved record shares array/object
// references with the live build, so editing one silently mutates the other.
// The data is JSON-safe — it's the same shape useStorage already persists.
const snapshot = (value) => JSON.parse(JSON.stringify(value ?? null))

// Fold a flat build list ([{ id, quantity, list }]) into the stored
// { group: { id: quantity } } shape used by profile records.
function fold_list(cards) {
    return cards.reduce((acc, { id, quantity, list }) => {
        const key = list ?? 'main'
        if (!acc[key]) acc[key] = {}
        acc[key][id] = quantity ?? 1
        return acc
    }, {})
}

// The user's saved decks for the current game — storage pinned first.
const user_decks = computed(() => gameDecks(game_id.value))

// ---------------------------------------------------------------------------
// Build groups
// ---------------------------------------------------------------------------
// Which groups the build panel shows. Not every group a game declares is useful
// on every deck, so the View menu (right.vue) turns them on and off.
//
// Deliberately session state with no persisted field: a deck's groups are
// recoverable from the deck itself, so storing them would be a second source of
// truth that could disagree with the cards.

// The group cards fall into when none is named — deck_card_add and fold_list
// both default to it, so hiding it would drop cards into a group with no
// visible target. It is standard across every game and never collapsible.
const MAIN_GROUP = 'main'

// Every group this game offers, in render order. Order comes from here rather
// than from selection order, so toggling a group on never reshuffles the panel.
const groups_available = computed(() => config.value?.deck?.group?.list ?? [])

// What the build shows when the user has not said otherwise: an untouched build
// takes the manifest's defaults, and a build with cards shows the groups those
// cards actually occupy — so loading a deck reveals exactly what it uses and
// nothing else.
const groups_derived = computed(() => {
    const used = new Set(deck_building.list.map(item => item.list ?? MAIN_GROUP))
    if (used.size) return used

    return new Set(config.value?.deck?.group?.default ?? [MAIN_GROUP])
})

// null while the build is following `groups_derived`; a Set once the user has
// picked. Reset by clear_build/load_build so a new deck starts from its own
// contents rather than inheriting the last deck's choices.
const groups_manual = ref(null)

// A computed rather than a ref seeded on load: the route no longer waits for
// the manifest, so clear_build() runs before `data.deck.group.default` exists.
// Deriving means the defaults simply appear when the manifest lands, where an
// imperatively seeded ref would need its own watcher to catch up.
const groups_shown = computed(() => {
    const chosen = groups_manual.value ?? groups_derived.value
    const order = groups_available.value

    return [
        ...order.filter(name => name === MAIN_GROUP || chosen.has(name)),
        // A group the manifest no longer lists but the deck still uses: show it
        // so its cards remain reachable instead of silently disappearing.
        ...[...chosen].filter(name => !order.includes(name)),
    ]
})

function group_is_shown(name) {
    return groups_shown.value.includes(name)
}

// Cards currently sitting in a group — what a removal would take with it, and
// what the View menu counts next to each row.
function group_card_list(name) {
    return deck_building.list.filter(item => (item.list ?? MAIN_GROUP) === name)
}

// Show or hide a group. Adding is immediate; hiding an empty one is too. Hiding
// a group that holds cards destroys those cards, so that path goes behind a
// confirm — the same resolver pattern as deck_delete below.
//
// `main` is inert here rather than absent from the menu: it reads as a locked
// row, which explains itself better than a group that silently cannot be
// switched off.
const group_remove_active = ref(false)
const group_remove_pending = ref(null)
let group_remove_resolver = null

async function group_toggle(name) {
    if (name === MAIN_GROUP) return

    const shown = new Set(groups_shown.value)

    if (!shown.has(name)) {
        shown.add(name)
        groups_manual.value = shown
        return
    }

    const cards = group_card_list(name)

    if (cards.length) {
        if (group_remove_resolver) return

        group_remove_pending.value = { name, count: cards.length }
        group_remove_active.value = true
        const decision = await new Promise(resolve => { group_remove_resolver = resolve })
        group_remove_active.value = false
        group_remove_pending.value = null
        group_remove_resolver = null

        if (!decision) return

        // The cards go with the group — that is what the confirm asked about.
        deck_building.list = deck_building.list.filter(
            item => (item.list ?? MAIN_GROUP) !== name
        )
    }

    shown.delete(name)
    groups_manual.value = shown
}

function group_remove_resolve(decision) {
    group_remove_resolver?.(decision)
}

// Build list grouped for display: every *shown* group renders, empty ones
// included — they stay visible as drop targets — in manifest order.
const deck_building_grouped = computed(() => {
    const byGroup = groupBy(deck_building.list, item => item.list ?? MAIN_GROUP)
    return groups_shown.value.map(name => ({ name, item_list: byGroup[name] ?? [] }))
})

// ---------------------------------------------------------------------------
// Unsaved-build guard
// ---------------------------------------------------------------------------
// Whether the build has card-list changes not yet written to its profile
// record. Metadata edits persist immediately via the detail dialog, so only the
// card list can diverge — fold the build and compare it to the stored list. A
// fresh draft (id null) counts as dirty once it has any cards.
const deck_dirty = computed(() => {
    const game = game_id.value
    if (!game) return false

    const id = deck_building.id
    if (id === null) return deck_building.list.length > 0

    const record = id === 'storage'
        ? profile.value.storage[game]
        : profile.value.game[game]?.find(d => d.id === id)
    if (!record) return deck_building.list.length > 0

    return JSON.stringify(fold_list(deck_building.list)) !== JSON.stringify(record.list ?? {})
})

// Save / discard prompt shown before an action would overwrite a dirty build
// (loading another deck, starting a new one, or leaving the game). Mirrors the
// other confirms: the dialog in index.vue resolves 'save' | 'discard' | 'cancel'.
const build_unsaved_active = ref(false)
let build_unsaved_resolver = null

async function build_unsaved_confirm() {
    if (build_unsaved_resolver) return 'cancel'
    build_unsaved_active.value = true
    const decision = await new Promise(resolve => { build_unsaved_resolver = resolve })
    build_unsaved_active.value = false
    build_unsaved_resolver = null
    return decision
}

function build_unsaved_resolve(decision) {
    build_unsaved_resolver?.(decision)
}

// Gate a build-replacing action on the unsaved prompt. Resolves true when the
// caller may proceed (nothing to save, or the user chose save/discard) and
// false when the user cancelled.
async function guard_build() {
    if (!deck_dirty.value) return true
    const decision = await build_unsaved_confirm()
    if (decision === 'cancel') return false
    decision === 'save' ? deck_save() : revert_build()
    return true
}

// Drop the build's unsaved card edits: reload its stored record, or empty the
// build when it was never saved. Callers that go on to replace the build don't
// need this, but the route guards leave the build standing — without it a
// discarded edit would still be there when the user came back.
function revert_build() {
    const record = find_deck(deck_building.id)
    record ? load_build(record) : clear_build()
}

// Empty the build back to a pristine draft for the current game, leaving the
// right panel wherever it is (unguarded core).
function clear_build() {
    // Back to deriving: a fresh draft takes the manifest defaults, not whatever
    // the previous deck happened to show.
    groups_manual.value = null

    Object.assign(deck_building, {
        id: null,
        game: game_id.value,
        name: '',
        format: '',
        theme: [],
        highlight: '',
        tagline: '',
        description: [],
        context: [],
        total: 0,
        list: [],
    })
}

// Reset the build to an empty draft and show it (unguarded core).
function new_build() {
    clear_build()
    deck_building.name = 'Draft Deck'
    deck_building.tagline = 'Edit'
    panel_right_content.value = 'build'
}

// Load a saved deck into the build (unguarded core). Leaves the right panel
// alone — revert_build() reuses this to restore a discarded build in place.
function load_build(deck) {
    const dict = manifest.value?.card_dict ?? {}
    const card_list = Object.entries(deck.list ?? {}).flatMap(([group, cards]) =>
        Object.entries(cards).map(([id, quantity]) => ({
            ...dict[id],
            id,
            quantity,
            list: group,
        }))
    )

    // The loaded deck's own contents decide its groups (groups_derived), unless
    // and until the user says otherwise.
    groups_manual.value = null

    Object.assign(deck_building, {
        id: deck.id ?? null,
        game: game_id.value,
        name: deck.name ?? '',
        format: deck.format ?? '',
        theme: snapshot(deck.theme ?? []),
        highlight: deck.highlight ?? '',
        tagline: deck.tagline ?? '',
        description: snapshot(deck.description ?? []),
        context: snapshot(deck.context ?? []),
        total: deck.total ?? 0,
        list: card_list,
    })
}

// Public entry points: guard the current build before replacing it.
async function deck_new() {
    if (await guard_build()) new_build()
}

async function deck_load(deck) {
    if (!await guard_build()) return

    // Saving from inside the guard rewrites the profile record — for a game deck
    // deck_save() swaps in a whole new object — so the reference captured when
    // the row was clicked can be the pre-save copy. Re-resolve by id, or the
    // build would reopen the iteration the user just saved over.
    load_build(find_deck(deck.id) ?? deck)
    panel_right_content.value = 'build'
}

// The current profile record for a deck id ('storage' or a game deck id).
function find_deck(id) {
    const game = game_id.value
    if (!game || id == null) return null

    return id === 'storage'
        ? profile.value.storage[game]
        : profile.value.game[game]?.find(d => d.id === id)
}

// Switch the right panel, guarding the build on the way into the saved list.
// Passing the content that is already showing closes the panel. The saved list
// is a hand-off point: whatever the user does there replaces the build, so the
// build is settled (saved or discarded) and emptied before they get to it —
// which also means a deck clicked in that list always loads from a clean slate.
async function panel_right_open(content) {
    const next = panel_right_content.value === content ? null : content

    if (next === 'saved') {
        if (!await guard_build()) return
        clear_build()
    }

    panel_right_content.value = next
}

// Add a card to the build (drag-drop from the center table). Instances are
// per-group: the same card can sit in several groups with separate counts.
function deck_card_add(item, group = 'main') {
    const existing = deck_building.list.find(c => c.id === item.id && c.list === group)
    if (existing) {
        existing.quantity += 1
    } else {
        deck_building.list.push({ ...item, quantity: 1, list: group })
        if (!deck_building.name) {
            deck_building.name = 'Draft Deck'
            deck_building.tagline = 'Edit'
        }
    }
}

// Move a build entry to another group. If the card already exists in the
// target group the quantities merge; otherwise the entry moves whole.
function deck_card_move(item, group) {
    if (!group || item.list === group) return

    const target = deck_building.list.find(c => c.id === item.id && c.list === group)
    if (target) {
        target.quantity += item.quantity
        deck_building.list = deck_building.list.filter(
            c => !(c.id === item.id && c.list === item.list)
        )
    } else {
        const entry = deck_building.list.find(c => c.id === item.id && c.list === item.list)
        if (entry) entry.list = group
    }
}

function deck_card_increase(item) {
    const existing = deck_building.list.find(c => c.id === item.id && c.list === item.list)
    if (existing) existing.quantity += 1
}

function deck_card_decrease(item) {
    const existing = deck_building.list.find(c => c.id === item.id && c.list === item.list)
    if (!existing) return

    if (existing.quantity > 1) {
        existing.quantity -= 1
    } else {
        deck_building.list = deck_building.list.filter(
            c => !(c.id === item.id && c.list === item.list)
        )
        preview_item_isActive.value = false
    }
}

// Drop a build entry entirely, whatever its quantity — used when a row is
// dragged out of the build panel. Clears the hover preview since the row's gone.
function deck_card_remove(item) {
    deck_building.list = deck_building.list.filter(
        c => !(c.id === item.id && c.list === item.list)
    )
    preview_item_isActive.value = false
}

// Persist the build into the profile (storage or the game's saved decks).
function deck_save() {
    const game = game_id.value
    if (!game) return

    const card_obj = fold_list(deck_building.list)

    const total = deck_building.list.reduce((sum, { quantity }) => sum + (quantity ?? 1), 0)
    deck_building.total = total

    const { list, game: _game, ...meta } = deck_building
    const deck = { ...snapshot(meta), total, list: card_obj }

    if (deck.id === 'storage') {
        profile.value.storage[game].total = total
        profile.value.storage[game].list = card_obj
    } else if (deck.id !== null) {
        const decks = profile.value.game[game]
        const index = decks.findIndex(x => x.id === deck.id)
        index !== -1 ? decks[index] = deck : decks.push(deck)
    } else {
        const decks = profile.value.game[game]
        deck.id = Math.max(0, ...decks.map(x => x.id)) + 1
        deck_building.id = deck.id
        decks.push(deck)
    }
}

// Push a new saved deck (fresh id) built from `meta` and a flat card list.
// Cards fold back into the { group: { id: qty } } shape; quantity and group
// default to 1 and 'main' for raw cards that never carried them.
function create_deck(meta, cards) {
    const game = game_id.value
    if (!game) return

    const grouped = fold_list(cards)

    const decks = profile.value.game[game]
    decks.push({
        ...snapshot(meta),
        id: Math.max(0, ...decks.map(x => x.id)) + 1,
        total: cards.reduce((sum, c) => sum + (c.quantity ?? 1), 0),
        list: grouped,
    })
}

// Copy the current build into the profile as a new saved deck. The build
// itself keeps pointing at the original record.
function deck_duplicate() {
    const { list, game: _game, ...meta } = deck_building
    create_deck(meta, deck_building.list)
}

// Save the center's current search-filtered cards as a new deck. On the card
// archive ('card') that's a fresh deck of the filtered cards; on a deck's card
// list ('list') it copies the viewed deck's metadata. The deck archive ('deck')
// exposes no cards (action_card_list is empty), so there's nothing to save.
function deck_save_as() {
    const cards = action_card_list.value
    if (!cards.length) return

    const source = panel_center_content.value === 'list' ? deck_selected.value : null
    const meta = {
        name: source?.name ?? 'Draft Deck',
        format: source?.format ?? '',
        theme: source?.theme ?? [],
        highlight: source?.highlight ?? '',
        tagline: source?.tagline ?? 'Edit',
        context: source?.context ?? [],
    }

    create_deck(meta, cards)
}

// Delete the build's saved record from the profile, behind a confirm dialog
// (mounted in index.vue). Resolves once the user answers.
const deck_delete_active = ref(false)
let deck_delete_resolver = null

async function deck_delete() {
    const game = game_id.value
    if (!game || deck_building.id === 'storage') return
    if (deck_delete_resolver) return

    deck_delete_active.value = true
    const decision = await new Promise(resolve => { deck_delete_resolver = resolve })
    deck_delete_active.value = false
    deck_delete_resolver = null

    if (!decision) return

    const decks = profile.value.game[game]
    const index = decks.findIndex(x => x.id === deck_building.id)
    if (index !== -1) decks.splice(index, 1)

    clear_build()
    panel_right_content.value = 'saved'
}

function deck_delete_resolve(decision) {
    deck_delete_resolver?.(decision)
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------
// Open-state + payload for the dialogs mounted in index.vue. The dropdown
// actions fill these; the dialog components read them.

const dialog_detail_read = reactive({
    active: false,
})

const dialog_detail_edit = reactive({
    active: false,
})

// Unsaved-changes prompt for the detail-edit dialog. When it is closed with
// pending edits, ask whether to save or discard. Mirrors the deck_delete
// confirm: the dialog (mounted in index.vue) resolves the promise with
// 'save' | 'discard'; anything else (e.g. re-entrancy) is treated as 'cancel'.
const detail_unsaved_active = ref(false)
let detail_unsaved_resolver = null

async function detail_unsaved_confirm() {
    if (detail_unsaved_resolver) return 'cancel'
    detail_unsaved_active.value = true
    const decision = await new Promise(resolve => { detail_unsaved_resolver = resolve })
    detail_unsaved_active.value = false
    detail_unsaved_resolver = null
    return decision
}

function detail_unsaved_resolve(decision) {
    detail_unsaved_resolver?.(decision)
}

const print = reactive({
    active: false,
    card_total_all: 0,
    card_total_unique: 0,
    card_list: [],
    // The deck these cards came from, where they came from one — the dialog
    // names its PDF and zip after it. Empty for a filtered slice of the archive.
    deck_name: '',
})

const probability = reactive({
    active: false,
    card_total_expanded: 0,
    card_total_unique: 0,
    card_list_expanded: [],
    card_list_unique: [],
})

const dialog_export = reactive({
    active: false,
    card_total_all: 0,
    card_total_unique: 0,
    card_list: [],
})

const dialog_import = reactive({
    active: false,
})

const dialog_single = reactive({
    active: false,
    card: 0,
    sibling: []
})

// Generic blocking notice (e.g. print size limit), mounted in index.vue.
const dialog_warning = reactive({
    active: false,
    title: '',
    message: '',
})

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

// Select a deck and switch the center to its card list.
function select_deck(deck) {
    deck_selected.value = deck
    panel_center_content.value = 'list'
}

// Clear the filter selections for a single dataset (defaults to the active one).
function reset_filter(key = panel_center_content.value) {
    if (search[key]) search[key].filter = {}
}

// Clear every dataset's filters at once — the game switch below, where leaving
// even one dataset's selections behind would filter the new game's cards by the
// old game's values.
function reset_filter_all() {
    for (const key of Object.keys(search)) reset_filter(key)
}

// Put every dataset's sort back to its own default. Sort keys come from the
// manifest (data.card.sort), so carrying one across games leaves the new game
// sorting on a property its cards don't have. Direction goes with it — the two
// are one control, and a stale 'desc' would attach itself to the next sort the
// user picks.
function reset_sort_all() {
    for (const key of Object.keys(search)) {
        const { sort, direction } = createSearch(search_default[key])
        Object.assign(search[key], { sort, direction })
    }
}

// ---------------------------------------------------------------------------
// Game switch
// ---------------------------------------------------------------------------
// Everything in this module is a module-level singleton, but the deckbox is
// reused across :game params — so without this, ptcg's filters, panels and build
// all carry straight into wow. Filters go back to {} rather than to the previous
// selections: state is never seeded (see search.js), so an empty object is what
// makes the new manifest's presets apply.
//
// This lives here, next to the state it resets, rather than in the view. It also
// has to be one handler: it and the build reset both touch panel_right_content,
// and split across two watchers the ordering decides whether the panel ends up
// closed or reopened onto the fresh build.
//
// The route guards have already offered to save a dirty build by this point.
watch(game_id, (id) => {
    if (!id) return

    // First load: the build is empty and has no game yet, so adopt it rather
    // than resetting state the user hasn't had a chance to touch.
    if (!deck_building.game) {
        deck_building.game = id
        return
    }

    if (deck_building.game === id) return

    reset_filter_all()
    reset_sort_all()

    // A filter picker left open would be editing the previous game's filter
    // against the new game's config — mtg's 684 themes are not wow's.
    dialog_filter_set.active = false
    dialog_filter_multi.active = false

    panel_left_content.value = null
    panel_right_content.value = null

    // Back to the card archive. 'list' would keep pointing at the previous
    // game's deck, and list_cards resolves that deck's ids against the new
    // game's card_dict — every lookup misses, producing rows spread from
    // undefined. Dropping the selection with it keeps the two in step.
    panel_center_content.value = 'card'
    deck_selected.value = null

    clear_build()
}, { immediate: true })

export function useState() {
    return {
        // panels
        is_desktop,
        panel_left_active,
        panel_right_active,
        panel_left_content,
        panel_center_content,
        panel_right_content,
        panel_right_open,

        // search
        search,
        search_active,
        center_width,
        column_default,
        column_active,
        column_max,
        set_column,
        deck_selected,
        filter_config,
        any_active,

        // center pipeline
        active_dataset,
        active_col,
        active_type,
        results,
        paginated,
        grouped,
        result_total,
        action_card_list,
        totalPages,
        has_more,
        load_more,
        reset_page,
        indexStart,
        indexEnd,

        // set picker
        dialog_filter_set,
        open_filter_set,

        // long multi-select picker
        dialog_filter_multi,
        open_filter_multi,

        // deck building
        game_id,
        deck_building,
        deck_building_grouped,

        // groups
        groups_available,
        groups_shown,
        group_is_shown,
        group_card_list,
        group_toggle,
        group_remove_active,
        group_remove_pending,
        group_remove_resolve,
        user_decks,
        deck_new,
        deck_load,
        new_build,
        clear_build,
        deck_dirty,
        guard_build,
        build_unsaved_active,
        build_unsaved_confirm,
        build_unsaved_resolve,
        deck_card_add,
        deck_card_move,
        deck_card_increase,
        deck_card_decrease,
        deck_card_remove,
        deck_save,
        deck_duplicate,
        deck_save_as,
        deck_delete,
        deck_delete_active,
        deck_delete_resolve,

        // dialogs
        print,
        probability,
        dialog_export,
        dialog_import,
        dialog_detail_read,
        dialog_detail_edit,
        detail_unsaved_active,
        detail_unsaved_confirm,
        detail_unsaved_resolve,
        dialog_warning,
        dialog_single,

        // actions
        select_deck,
        reset_filter,
        reset_filter_all,
        reset_sort_all,
    }
}
