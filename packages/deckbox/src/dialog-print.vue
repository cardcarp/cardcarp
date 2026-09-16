<script setup>
// Core
import { computed, ref } from 'vue'

// Libraries
import JSZip from 'jszip'
import jsPDF from 'jspdf'
import { saveAs } from 'file-saver'
import { AnimatePresence, Motion } from 'motion-v'

// UI
import {
    SelectContent,
    SelectItem,
    SelectItemText,
    SelectPortal,
    SelectRoot,
    SelectTrigger,
    SelectValue,
    SelectViewport,

    SliderRange,
    SliderRoot,
    SliderThumb,
    SliderTrack
} from 'reka-ui'

// Components
import DialogShell from './dialog-shell.vue'
import DialogScroll from '@cardcarp/core/part/dialog-scroll.vue'

// Composables
import { useGameStore } from '@cardcarp/core/composable/game.js'
import { downloadName } from './composable/download.js'
const { card_size, active_game: game_id } = useGameStore()

// State
import { useState } from './state.js'
const { print } = useState()

// Logic
//
// The sheet's arithmetic — what fits on a page, and where each card sits on it — is print-sheet.js,
// which runs and is checked outside a browser (print-sheet.test.mjs). The transcoding beside it is
// print-image.js, which cannot be: it needs fetch, a canvas and an image decoder.
import { cardPosition, PAPER_FORMAT, PAPER_SIZE, paginate, sheetLayout } from './print-sheet.js'
import { createJpegTranscoder, jpegDataUrl } from './print-image.js'


// State
const option_format = ref("letter")
const option_padding = ref([6])
const option_gap = ref([0])

const process_active = ref(false)
const process_done = ref(0)
const process_total = ref(0)

// Compute
const paper_size = computed(() => PAPER_SIZE[option_format.value])

const layout = computed(() => sheetLayout({
    paper: paper_size.value,
    card: card_size.value,
    padding: option_padding.value[0],
    gap: option_gap.value[0],
}))

// What the sheet is of: the deck by name, or the game whose archive was
// filtered down. Both exports carry it, so a deck's PDF and its zip land side
// by side under one name.
const file_subject = computed(() => [
    print.deck_name || game_id.value,
    print.deck_name ? '' : 'cards'
])

// Paged off the list itself rather than print.card_total_all. The two agree in practice, and where
// they would not it is the list that can actually be drawn.
const paginated_cards = computed(() => paginate(print.card_list, layout.value.perPage))

// Methods

// One transcoder per export, holding its own cache — a deck asking for four copies of a card fetches
// and transcodes it once. Made on demand so it takes the card size in force when the run starts, and
// dropped when the dialog closes so a long session doesn't sit on tens of megabytes of JPEG.
let transcoder = null

function images() {
    transcoder ??= createJpegTranscoder({ cardSize: card_size.value })
    return transcoder
}

// Progress is handed out rather than read in: print-image.js reports two numbers and knows nothing
// about refs.
function onProgress(done, total) {
    process_done.value = done
    process_total.value = total
}

// Actions
async function click_print() {
    process_active.value = true
    try {
        const pdf = new jsPDF({ unit: 'mm', format: option_format.value, orientation: 'portrait' })

        const padding = option_padding.value[0]
        const gap = option_gap.value[0]
        const { width: cardW, height: cardH } = card_size.value
        const { cols } = layout.value
        const pages = paginated_cards.value

        // Everything is transcoded up front so the placement loop below is pure
        // arithmetic against the cache.
        const jpegs = images()
        await jpegs.fetchAll(print.card_list, onProgress)

        for (const [page_index, card_list] of pages.entries()) {

            for (const [index, card] of card_list.entries()) {

                const { x, y } = cardPosition(index, { cols, card: card_size.value, padding, gap })

                const jpeg = jpegs.get(card)

                // A card whose art failed to load leaves its slot empty rather
                // than shifting every card after it into the wrong cell.
                if (!jpeg) continue

                pdf.addImage(await jpegDataUrl(jpeg), 'JPEG',
                    x,
                    y,
                    cardW,
                    cardH
                )
            }

            if (page_index < pages.length - 1) {
                pdf.addPage()
            }

        }

        pdf.save(downloadName(file_subject.value, 'pdf'))
    } finally {
        process_active.value = false
    }
}

async function click_zip() {
    process_active.value = true

    const name = downloadName(file_subject.value, 'zip')

    // The folder inside carries the same name as the zip. Unpacking two of
    // these into one directory used to merge them into a single 'cards' folder,
    // silently overwriting card_001.jpg with a different deck's first card.
    const zip = new JSZip()
    const folder = zip.folder(name.replace(/\.zip$/, ''))

    try {
        // JPEG rather than the source AVIF: the zip exists so people can print
        // these somewhere else, and photo printers and print shops still won't
        // open an AVIF.
        const jpegs = images()
        await jpegs.fetchAll(print.card_list, onProgress)

        print.card_list.forEach(function add(url, i) {
            const jpeg = jpegs.get(url)
            if (!jpeg) return

            folder.file(`card_${String(i + 1).padStart(3, '0')}.jpg`, jpeg)
        })

        const content = await zip.generateAsync({ type: 'blob' })
        saveAs(content, name)
    } catch (error) {
        console.error('ZIP generation failed:', error)
    } finally {
        process_active.value = false
    }
}

function close() {
    print.active = false
    transcoder?.clear()
    transcoder = null
}

// Animations
const motion_dot = {
    jump: {
        transform: "translateY(-30px)",
        transition: {
            duration: 0.8,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
        },
    },
}

</script>

<template lang="pug">
DialogShell(
    :open="print.active"
    width="w-200"
    title="Print Collection"
    @close="close"
)

    .columns(class="flex-1 min-h-0 flex")

        DialogScroll(
            rootClass="md:max-w-90 px-6 py-6 flex flex-col bg-linear-to-br to-neutral-950 from-neutral-900 rounded-l-xl"
            rootStyle="box-shadow: inset -1px 0 0 0 hsl(0 0 10), inset -3px 0 0 0 hsl(0 0 0)"
        )
            .title(class="flex items-end gap-2 text-5 text-white font-light leading-none")
                svg(class="relative -top-px size-5 text-brand-tert" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    path(d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2")
                    path(d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6")
                    rect(x="6" y="14" width="12" height="8" rx="1")
                span Print
                span(class="text-3.5 opacity-50") {{ print.card_total_all }} Cards, {{ print.card_total_unique }} Unique

            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="mt-6")
                .header(class="flex mb-1 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") PAPER SIZE
                SelectRoot(v-model="option_format")
                    SelectTrigger(
                        class="group/btn p-1.5 pb-1.25 w-full bg-black rounded-lg hover:text-white data-[state=open]:text-white data-[state=open]:rounded-b-none"
                        style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                    )
                        .pill(
                            class="relative px-2 py-2 flex items-center gap-2 text-left text-4 font-light bg-linear-to-b to-neutral-900 from-neutral-800 rounded overflow-hidden"
                            style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                        )
                            .icon(class="flex-none size-4")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    rect(width="20" height="16" x="2" y="4" rx="2")
                                    path(d="M12 9v11")
                                    path(d="M2 9h13a2 2 0 0 1 2 2v9")
                            SelectValue(class="grow capitalize") {{ option_format }}
                            .chevron(class="w-3")
                                svg(viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                    path(d="m6 9 6 6 6-6")

                    SelectPortal
                        SelectContent(
                            side="bottom" 
                            position="popper" 
                            :sideOffset="-2"
                            class="min-w-(--reka-select-trigger-width) p-1.5 bg-black rounded-b-lg z-102"
                        )
                            SelectViewport(
                                class="w-full h-full px-2 py-2 text-left text-4 font-light bg-neutral-900 rounded"
                                style="box-shadow: 0 -1px 2px 0 hsl(0 0 30), 0 0 2px 2px hsl(0 0 0)"
                            )
                                SelectItem(v-for="item in PAPER_FORMAT" :value="item" class="px-2 py-1 flex items-center gap-2 rounded-sm hover:bg-white/5 hover:text-white")
                                    SelectItemText(class="grow capitalize") {{ item }}
                                    svg(v-show="item === option_format" class="size-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                                        circle(cx="12.1" cy="12.1" r="1")

            .section(class="mt-6")
                .header(class="flex mb-2.5 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") PAPER PADDING
                    .value(class="text-3") {{ option_padding[0] }} mm.
                SliderRoot(
                    v-model="option_padding" 
                    :max="12" 
                    :step="1" 
                    class="relative px-2 py-1.75 pb-1.5 flex items-center select-none touch-none w-full bg-black rounded-full"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    SliderTrack(
                        class="bg-neutral-800 relative grow rounded-full h-1"
                    )
                        SliderRange(class="absolute bg-yellow-500 rounded-full h-full")
                    SliderThumb(
                        class="block size-5 bg-white rounded-full outline-none"
                    )

            .section(class="mt-8")
                .header(class="flex mb-2.5 px-2 font-mono text-3 tracking-wider opacity-50")
                    .label(class="grow") CARD GUTTER
                    .value(class="text-3") {{ option_gap[0] }} mm.
                SliderRoot(
                    v-model="option_gap" 
                    :max="6" 
                    :step="0.5" 
                    class="relative px-2 py-1.75 pb-1.5 flex items-center select-none touch-none w-full bg-black rounded-full"
                    style="box-shadow: 0 1px 1px 0 hsl(0 0 15)"
                )
                    SliderTrack(
                        class="bg-neutral-800 relative grow rounded-full h-1"
                    )
                        SliderRange(class="absolute bg-yellow-500 rounded-full h-full")
                    SliderThumb(
                        class="block size-5 bg-white rounded-full outline-none"
                    )

            .divider-dark(class="mt-6 w-full h-0.5 bg-black")
            .divider-light(class="mb-6 w-full h-px bg-white/8")

            .section(class="")
                .btns(class="grid gap-3")
                    .btn(
                        @click="click_print"
                        class="px-6 py-2 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                        style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                    )
                        svg(class="relative flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2")
                            path(d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6")
                            rect(x="6" y="14" width="12" height="8" rx="1")
                        span(class="relative top-px") Print

                    .btn(
                        @click="click_zip"
                        class="px-6 py-2 flex justify-center items-center gap-2 text-white rounded-full bg-gray-700 hover:bg-gray-600 hover:outline-white/40"
                        style="box-shadow: inset 0 2px 1px 0 hsl(0 0 100 / 0.1), 0 2px 2px 0 hsl(0 0 0)"
                    )
                        svg(class="relative flex-none size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5")
                            path(d="M14 2v5a1 1 0 0 0 1 1h5")
                            path(d="M8 12v-1")
                            path(d="M8 18v-2")
                            path(d="M8 7V6")
                            circle(cx="8" cy="20" r="2")
                        span(class="relative top-px") Zip Images

        DialogScroll(rootClass="bg-linear-to-br to-neutral-900 from-black")
            .content(class="p-5")
                //- A 500-card list is 56 of these. content-visibility skips layout, paint
                //- and animation for the pages that aren't on screen, so the skeletons only
                //- pulse where someone can see them. No contain-intrinsic-size needed: the
                //- aspect ratio and the full width already give a skipped page a definite
                //- height, so the scroll height is identical either way.
                .page(
                    v-for="card_list in paginated_cards"
                    class="mb-4 w-full grid bg-white last-of-type:mb-0"
                    :style="{ aspectRatio: layout.aspectRatio, contentVisibility: 'auto' }"
                )
                    .grid(class="" :style="layout.gridStyle")
                        .cell(v-for="(card, j) in card_list" :key="`key-${j}-${card}`" class="relative min-h-0 min-w-0")
                            //- Sits under the art for the life of the dialog rather than being
                            //- torn down on @load: the image covers it the moment it paints, and
                            //- nothing here depends on a load event firing — which is what broke
                            //- under blockers that swap or defer the request.
                            .skeleton(class="absolute inset-0 bg-neutral-200 animate-pulse")
                            img(
                                :src="card"
                                class="relative size-full object-cover object-center drag-none"
                                draggable="false"
                                crossorigin="anonymous"
                                referrerpolicy="no-referrer"
                            )


AnimatePresence
    Motion(
        v-if="process_active"
        :initial="{ opacity: 0, scale: 0.8 }"
        :animate="{ opacity: 1, scale: 1 }"
        :exit="{ opacity: 0, scale: 0.8 }"
        class="fixed inset-0 size-full grid place-content-center bg-black/80 backdrop-blur-lg z-9999"
    )
        .flex(class="gap-4")
            Motion(animate="jump" :transition="{ staggerChildren: -0.2, staggerDirection: -1 }" class="flex justify-center items-center gap-2")
                Motion(:variants="motion_dot" class="size-2 bg-brand-tert/50 rounded-full")
                Motion(:variants="motion_dot" class="size-2 bg-brand-tert/50 rounded-full")
                Motion(:variants="motion_dot" class="size-2 bg-brand-tert/50 rounded-full")
            .text(class="text-brand-tert/80 font-light tracking-widest -translate-y-3")
                span Downloading...
                span(v-if="process_total" class="ml-2 opacity-70") {{ process_done }} / {{ process_total }}
</template>
