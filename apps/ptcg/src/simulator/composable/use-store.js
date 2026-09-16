// A store, as a Vue ref — the whole of this UI's binding to the table's state.
//
// The table's modules speak stores (see @cardcarp/simulator's state/store.js) so that any template library can sit on
// top of them. This is Vue's side of that: a shallowRef the store keeps current, released with the
// component or scope that asked for it. Shallow because store values are replaced rather than
// edited, so a new reference IS the change and there is nothing inside worth tracking.
//
// Read-only on purpose. Assigning to the ref would change what this component sees and nothing
// else — the store, the canvas and the room would never hear of it. Writes go through the verbs
// that own the state (updateSeat, addToHand, …).
import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

export function useStore(store) {
    const current = shallowRef(store.get())
    const stop = store.listen((value) => { current.value = value })
    if (getCurrentScope()) onScopeDispose(stop)
    return computed(() => current.value)
}
