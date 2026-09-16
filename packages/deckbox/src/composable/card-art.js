// composable/card-art.js
//
// A card's art URL, plus whether that art has actually arrived.
//
// The three center cells each need both, and each had grown its own answer: the
// grid cell revealed on a fixed 1s CSS delay, the card row on a 0.5s one, and
// the deck row hand-rolled @load/@error with an onMounted `complete` check. The
// timers were the real problem — they fire on schedule regardless of the image,
// so slow art pops in over a skeleton that has already faded, and cached art is
// held back for a second for nothing. Neither case is what the animation was
// written to do.
//
// Load state is read from the <img> the cell already renders. VueUse's useImage
// is the other option and is the right tool when there is no <img> to listen to
// — it preloads through a detached Image and tracks the promise — but here it
// would mean a second image object per cell, 200 of them a page in the grid, to
// learn what the native event already reports.
import { computed, ref, toValue, watch } from 'vue'

import { useImage } from '@cardcarp/core/composable/image.js'

export function useCardArt(card, variant = '') {
    const { card_src } = useImage()

    // '' when the card or the game is unknown: card_src refuses to build a
    // half-formed URL, so binding this to :src issues no request at all.
    const src = computed(() => card_src(toValue(card), toValue(variant)))

    const settled = ref(false)

    // Bound to @load and @error alike. A failed image still counts as settled —
    // the cell has a fallback to show, and holding a skeleton over art that is
    // never coming is the one outcome worse than showing nothing.
    function on_settle() {
        settled.value = true
    }

    // Cells are reused across result sets, so one instance can be handed a
    // different card. Re-arm rather than leaving the previous card's art
    // standing in as loaded.
    watch(src, () => { settled.value = false })

    // A cached image can already be `complete` before Vue attaches @load, in
    // which case the event never fires and the cell waits on it forever.
    function img_ref(el) {
        if (el?.complete) on_settle()
    }

    // Nothing left to wait for: no art to load, or the load finished one way or
    // the other.
    const revealed = computed(() => !src.value || settled.value)

    return { src, revealed, on_settle, img_ref }
}
