import { computed, getCurrentScope, onScopeDispose, shallowRef } from 'vue'

export function useStore(store) {
    const current = shallowRef(store.get())
    const stop = store.listen((value) => { current.value = value })
    if (getCurrentScope()) onScopeDispose(stop)
    return computed(() => current.value)
}
