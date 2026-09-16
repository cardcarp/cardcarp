// Moments the table announces, for whatever renders it to answer.
//
// What a UI draws from is state, and state is stores (store.js, seats.js). A few things are not
// state but moments — the table was just reset, a ?deck= link found nothing, the pointer came to
// rest on a card — and the right response to one is the UI's decision: bring up its deck list,
// raise a preview, or do nothing at all. The table used to make that decision itself, by importing
// the Vue UI's panel state and core's preview overlay. Now it says what happened.
//
//   const off = onTableEvent('reset', () => openDeckbox())
//
// The events, and what each carries:
//
//   reset         the table was cleared and set out again, by this player or another at the
//                 same table. {}
//   deck-link     a ?deck= link was followed. { query, deck } when a deck was dealt;
//                 { query, deck: null, ambiguous } when nothing, or too much, matched.
//   card-hover    the pointer came to rest on a card worth reading, or a finger held one.
//                 { card, rect, variant } — rect in client pixels, variant '' for the front.
//   card-unhover  that is over. { immediate: true } when there is nothing to linger for (the
//                 finger lifted); otherwise a UI may allow its usual grace.
//
// Synchronous, like store listeners: a listener runs inside the emit, so a UI can cancel a
// pending timer before the table moves on.

const listeners = new Map()

export function onTableEvent(name, fn) {
    if (!listeners.has(name)) listeners.set(name, new Set())
    listeners.get(name).add(fn)
    return () => { listeners.get(name)?.delete(fn) }
}

export function emitTableEvent(name, detail = {}) {
    for (const fn of [...(listeners.get(name) ?? [])]) {
        try {
            fn(detail)
        } catch (err) {
            // One broken listener must not stop the table, or cost the next listener the news.
            console.error(`[table] a '${name}' listener threw`, err)
        }
    }
}
