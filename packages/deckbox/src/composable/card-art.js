import { computed, ref, toValue, watch } from 'vue'

import { useImage } from '@cardcarp/core/composable/image.js'

export function useCardArt(card, variant = '') {
    const { card_src } = useImage()

    const src = computed(() => card_src(toValue(card), toValue(variant)))

    const settled = ref(false)

    function on_settle() {
        settled.value = true
    }

    watch(src, () => { settled.value = false })

    function img_ref(el) {
        if (el?.complete) on_settle()
    }

    const revealed = computed(() => !src.value || settled.value)

    return { src, revealed, on_settle, img_ref }
}
