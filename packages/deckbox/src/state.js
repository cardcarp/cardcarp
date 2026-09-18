import { ref, reactive, computed, watch } from 'vue'

import { clamp, groupBy } from 'lodash'
import { breakpointsTailwind, useBreakpoints } from '@vueuse/core'

import { useGameStore } from '@cardcarp/core/composable/game.js'
import { useProfileStore } from '@cardcarp/core/store/profile.js'
import { preview_item_isActive } from '@cardcarp/core/store/preview.js'
import { isModified, use_search } from '@cardcarp/core/composable/search.js'
import { use_page } from '@cardcarp/core/composable/page.js'

const { manifest, config, active_game: game_id } = useGameStore()
const { profile, gameDecks } = useProfileStore()

const column_by_breakpoint = { sm: 3, md: 4, lg: 5, xl: 6, '2xl': 6 }

const COLUMN_MAX = 12

const breakpoints = useBreakpoints(breakpointsTailwind)
const breakpoint_active = breakpoints.active()
const column_default = computed(() => column_by_breakpoint[breakpoint_active.value] ?? 2)

function createSearch(overrides = {}) {
    return {
        filter: {},

        layout: 'grid',
        column: column_default.value,
        sort: 'random',
        direction: 'asc',
        group: 'none',

        page: 1,
        max: 200,

        ...overrides,
    }
}

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

const is_desktop = breakpoints.greaterOrEqual('lg')

const panel_left_active = ref(false)
const panel_right_active = ref(false)

const panel_left_content = ref(null)
const panel_center_content = ref('card')
const panel_right_content = ref(null)

const deck_selected = ref(null)

const filter_config = computed(() => {
    const cfg = config.value
    if (panel_center_content.value === 'deck') return cfg?.deck?.filter ?? {}

    const card = cfg?.card?.filter ?? {}
    if (panel_center_content.value !== 'list') return card

    const { distinct, ...rest } = card
    return rest
})

const any_active = computed(() =>
    Object.entries(filter_config.value).some(([key, def]) =>
        isModified(search_active.value.filter[key], def)
    )
)

const dialog_filter_set = reactive({
    active: false,
    key: null,
})

function open_filter_set(key) {
    dialog_filter_set.key = key
    dialog_filter_set.active = true
}

const dialog_filter_multi = reactive({
    active: false,
    key: null,
})

function open_filter_multi(key) {
    dialog_filter_multi.key = key
    dialog_filter_multi.active = true
}

const search_active = computed(() => search[panel_center_content.value] ?? search.card)

const center_width = ref(0)

const CENTER_PANEL_W = 320

const center_width_full = computed(() => {
    if (!is_desktop.value) return center_width.value

    const taken =
        (panel_left_content.value ? CENTER_PANEL_W : 0) +
        (panel_right_content.value ? CENTER_PANEL_W : 0)

    return center_width.value + taken
})

const center_ratio = computed(() => {
    if (!center_width.value || !center_width_full.value) return 1

    return center_width.value / center_width_full.value
})

const column_max = computed(() => Math.max(1, Math.round(COLUMN_MAX * center_ratio.value)))

const column_active = computed(() =>
    clamp(Math.round(search_active.value.column * center_ratio.value), 1, column_max.value)
)

const column_pinned = reactive({ card: false, deck: false, list: false })

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

const { results } = use_search(active_dataset, filter_config, search_active)
const { paginated, totalPages, has_more, load_more, reset_page, indexStart, indexEnd } =
    use_page(results, search_active)

watch(results, () => reset_page())

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

const result_total = computed(() => results.value.length)

const action_card_list = computed(() =>
    panel_center_content.value === 'deck' ? [] : results.value
)

const deck_building = reactive({
    id: null,
    game: null,
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

const snapshot = (value) => JSON.parse(JSON.stringify(value ?? null))

function fold_list(cards) {
    return cards.reduce((acc, { id, quantity, list }) => {
        const key = list ?? 'main'
        if (!acc[key]) acc[key] = {}
        acc[key][id] = quantity ?? 1
        return acc
    }, {})
}

const user_decks = computed(() => gameDecks(game_id.value))

const MAIN_GROUP = 'main'

const groups_available = computed(() => config.value?.deck?.group?.list ?? [])

const groups_derived = computed(() => {
    const used = new Set(deck_building.list.map(item => item.list ?? MAIN_GROUP))
    if (used.size) return used

    return new Set(config.value?.deck?.group?.default ?? [MAIN_GROUP])
})

const groups_manual = ref(null)

const groups_shown = computed(() => {
    const chosen = groups_manual.value ?? groups_derived.value
    const order = groups_available.value

    return [
        ...order.filter(name => name === MAIN_GROUP || chosen.has(name)),
        ...[...chosen].filter(name => !order.includes(name)),
    ]
})

function group_is_shown(name) {
    return groups_shown.value.includes(name)
}

function group_card_list(name) {
    return deck_building.list.filter(item => (item.list ?? MAIN_GROUP) === name)
}

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

const deck_building_grouped = computed(() => {
    const byGroup = groupBy(deck_building.list, item => item.list ?? MAIN_GROUP)
    return groups_shown.value.map(name => ({ name, item_list: byGroup[name] ?? [] }))
})

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

async function guard_build() {
    if (!deck_dirty.value) return true
    const decision = await build_unsaved_confirm()
    if (decision === 'cancel') return false
    decision === 'save' ? deck_save() : revert_build()
    return true
}

function revert_build() {
    const record = find_deck(deck_building.id)
    record ? load_build(record) : clear_build()
}

function clear_build() {
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

function new_build() {
    clear_build()
    deck_building.name = 'Draft Deck'
    deck_building.tagline = 'Edit'
    panel_right_content.value = 'build'
}

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

async function deck_new() {
    if (await guard_build()) new_build()
}

async function deck_load(deck) {
    if (!await guard_build()) return

    load_build(find_deck(deck.id) ?? deck)
    panel_right_content.value = 'build'
}

function find_deck(id) {
    const game = game_id.value
    if (!game || id == null) return null

    return id === 'storage'
        ? profile.value.storage[game]
        : profile.value.game[game]?.find(d => d.id === id)
}

async function panel_right_open(content) {
    const next = panel_right_content.value === content ? null : content

    if (next === 'saved') {
        if (!await guard_build()) return
        clear_build()
    }

    panel_right_content.value = next
}

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

function deck_card_remove(item) {
    deck_building.list = deck_building.list.filter(
        c => !(c.id === item.id && c.list === item.list)
    )
    preview_item_isActive.value = false
}

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

function deck_duplicate() {
    const { list, game: _game, ...meta } = deck_building
    create_deck(meta, deck_building.list)
}

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

const dialog_detail_read = reactive({
    active: false,
})

const dialog_detail_edit = reactive({
    active: false,
})

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

const dialog_warning = reactive({
    active: false,
    title: '',
    message: '',
})

function select_deck(deck) {
    deck_selected.value = deck
    panel_center_content.value = 'list'
}

function reset_filter(key = panel_center_content.value) {
    if (search[key]) search[key].filter = {}
}

function reset_filter_all() {
    for (const key of Object.keys(search)) reset_filter(key)
}

function reset_sort_all() {
    for (const key of Object.keys(search)) {
        const { sort, direction } = createSearch(search_default[key])
        Object.assign(search[key], { sort, direction })
    }
}

watch(game_id, (id) => {
    if (!id) return

    if (!deck_building.game) {
        deck_building.game = id
        return
    }

    if (deck_building.game === id) return

    reset_filter_all()
    reset_sort_all()

    dialog_filter_set.active = false
    dialog_filter_multi.active = false

    panel_left_content.value = null
    panel_right_content.value = null

    panel_center_content.value = 'card'
    deck_selected.value = null

    clear_build()
}, { immediate: true })

export function useState() {
    return {
        is_desktop,
        panel_left_active,
        panel_right_active,
        panel_left_content,
        panel_center_content,
        panel_right_content,
        panel_right_open,

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

        dialog_filter_set,
        open_filter_set,

        dialog_filter_multi,
        open_filter_multi,

        game_id,
        deck_building,
        deck_building_grouped,

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

        select_deck,
        reset_filter,
        reset_filter_all,
        reset_sort_all,
    }
}
