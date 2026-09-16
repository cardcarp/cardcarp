<script setup>
// The room: going online, the code, and the one destructive act on the table.
//
// Split from the seat list it used to share a flyout with (the old view/table/multiplayer.vue)
// because the two answer different questions — "is this table online" and "who is sitting at
// it" — and only the first of them is ever irrelevant. A player goldfishing alone collapses
// this section and keeps the roster.
//
// Reset Table left for the same reason and now has a section of its own at the bottom of the
// panel (see panel/reset.vue): what is left in here is entirely about the room, and none of it
// destroys anything.
//
// Offline, the section opens on the two things "online" can mean and nothing more. They are
// different intents wearing one word, so naming both up front IS the navigation — there is no
// question to ask first.
//
// What stays folded away is the join FIELD, not the choice. A permanently visible one is wrong
// for the host, who is the majority case, and it invites typing a code to CREATE a room, which
// is not a thing this relay can do (see handleStart).
//
//   offline → Host | Join
//   join    → adds the code field, laid out like the room-code row it is about to become
import { computed, onUnmounted, ref } from 'vue'

import { AnimatePresence, Motion, motion } from 'motion-v'

import Section from './section.vue'

import { useStore } from '../composable/use-store.js'
import { useTable } from '../use-table.js'

// The table, through its object (see use-table.js).
const { connect, disconnect, status: connectionStatus, code: roomCode, start: startRoom, normalizeCode: normalizeRoomCode, isValidCode: isValidRoomCode, error: connectionError, CODE_MIN: ROOM_CODE_MIN } = useTable().room

// The connection, as refs this panel renders from (see state/store.js).
const connection_status = useStore(connectionStatus)
const room_code = useStore(roomCode)
const connection_error = useStore(connectionError)

// Join-only. Starting a table never reads user input — see handleStart.
const joinInput = ref('')
const joinError = ref('')

// Whether the code field is showing. The Host | Join pair is always up while offline, so this
// is the only thing left for the offline section to be in two minds about.
const joinOpen = ref(false)

function showJoin() {
    joinError.value = ''
    joinOpen.value = true
}

// Status derivations
const isConnected  = computed(() => connection_status.value === 'connected')
const isConnecting = computed(() => connection_status.value === 'connecting')
const statusDotClass = computed(() => ({
    'fill-green-500':   isConnected.value,
    'fill-yellow-500':  isConnecting.value,
    'fill-neutral-600': !isConnected.value && !isConnecting.value,
}))

// Tolerate a pasted URL even though we no longer produce any: someone may still have an
// old link, and silently failing on it would read as "the code doesn't work". Anything
// else is treated as a bare code.
function extractCode(input) {
    const s = (input ?? '').trim()
    if (!s) return ''
    try {
        const room = new URL(s).searchParams.get('room')
        if (room) return room
    } catch { /* not a URL — fall through and treat as a raw code */ }
    return s
}

// The relay mints the code, so a table can only ever exist at a code it chose. Ignores
// the join field entirely — letting a typed value create a room is exactly what this
// removes.
function handleStart() {
    joinError.value = ''
    void startRoom()
}

// Join only ever joins — a code too short to be one of ours is rejected here with a
// message rather than silently opening an empty room at that code.
function handleJoin() {
    const code = normalizeRoomCode(extractCode(joinInput.value))
    if (!code) {
        joinError.value = 'Enter a room code'
        return
    }
    if (!isValidRoomCode(code)) {
        joinError.value = `Room codes are ${ROOM_CODE_MIN} characters, like ABCDEFG`
        return
    }
    joinError.value = ''
    connect(code)
}

function handleLeave() {
    joinError.value = ''
    joinInput.value = ''
    // Just the field. The pair underneath is where offline rests, so there is nothing to put
    // back — but a code left in an open field would outlive the room it was for.
    joinOpen.value = false
    disconnect()
}

// One button at the end of the field, and its meaning is whatever the field needs next:
// empty, the code is still in the clipboard and this fetches it; filled, the code is already
// here and this goes. Swapping the glyph rather than adding a second control keeps the row
// the room-code row's twin — and a typed code had no visible submit at all before, only Enter.
function handleJoinButton() {
    // if (joinInput.value.trim()) handleJoin()
    // else void pasteCode()
    handleJoin()
}

// Paste IS the join gesture: the code arrives in a chat window, and one click should put you
// in the room rather than merely in the field. Typing still works — the field takes Enter.
//
// A clipboard we cannot read (permission refused, or a browser that won't offer it) leaves
// the field untouched, which is the state the keyboard needs anyway.
async function pasteCode() {
    let text = ''
    try {
        text = await navigator.clipboard?.readText() ?? ''
    } catch { return }
    if (!text.trim()) return
    joinInput.value = normalizeRoomCode(extractCode(text))
    handleJoin()
}

// The code itself is the shareable thing now — read it out, or paste it to a friend.
//
// Copying is silent and instant, so the button says so itself: the glyph becomes a tick and a
// label pops off it. Same feedback as the deckbox's export dialog (@cardcarp/deckbox's dialog-export.vue),
// and the same two seconds — long enough to read, short enough that a second copy still feels
// like it did something.
const copy_active = ref(false)
let copy_timer = 0

function copyCode() {
    if (!room_code.value) return
    // Ignore a re-click while the tick is up rather than restarting the label mid-flight, which
    // reads as a flicker instead of a second confirmation.
    if (copy_active.value) return
    navigator.clipboard?.writeText(room_code.value).catch(() => { /* clipboard not available */ })
    copy_active.value = true
    copy_timer = setTimeout(() => { copy_active.value = false }, 2000)
}

// No auto-connect of any kind: room codes never travel in the address bar and aren't kept
// between sessions, so every connection starts from a deliberate Host or Join.

// Leaving the room is the table's to do as it unmounts (table.unmount), not this panel's: the
// connection belongs to the table rather than to whichever component opened it.
onUnmounted(() => {
    clearTimeout(copy_timer)
})
</script>

<template lang="pug">
Section(id="multiplayer" title="Multiplayer" tour="multiplayer")

    //- The dot rides the header so a collapsed section still says whether the table is
    //- online — the one fact from in here that matters while you are not looking at it.
    template(#aside)
        svg(class="size-3.5" viewBox="0 0 24 24" fill="none" :class="statusDotClass" stroke-width="0")
            circle(cx="12" cy="12" r="5")

    .connection(class="flex flex-col gap-2 font-mono text-2.75")

        //- Connected: the room code is the shareable artifact — read it out or copy it. It is
        //- displayed, never edited, so there is no field here in which a code could be invented.
        template(v-if="isConnected || isConnecting")

            .room(class="flex outline outline-zinc-600 rounded focus-within:outline-zinc-500")
                .code(
                    class="w-full min-w-0 h-7 px-2 flex items-center text-3.5 tracking-[0.5em] text-white placeholder:text-neutral-500 leading-none bg-zinc-950 rounded-l select-all"
                ) {{ room_code || '···' }}

                .btn(
                    @click="copyCode"
                    class="relative flex-none px-4 h-7 flex items-center justify-center bg-zinc-600 text-neutral-300 rounded-r hover:bg-zinc-500 hover:text-neutral-100"
                )
                    svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                        AnimatePresence
                            component(:is="motion.g" v-if="copy_active" :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                path(d="M20 6 9 17l-5-5")
                            component(:is="motion.g" v-else :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0 }")
                                rect(width="14" height="14" x="8" y="8" rx="2" ry="2")
                                path(d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2")

                    //- Off to the left, over the code, rather than straight up like the export
                    //- dialog's. This row is the first thing in the section body, and that body is
                    //- the collapse animation's overflow-hidden clip (panel/section.vue), which
                    //- leaves about two pixels of headroom — the tilted label is thirty tall, so a
                    //- climb of any size would have its top shaved off. It drifts up AND left
                    //- instead, into the width the code field is not using.
                    Motion(
                        v-if="copy_active"
                        :initial="{ opacity: 0, x: 0, y: 0 }"
                        :animate="{ opacity: [0, 1], x: [0, -8], y: [0, -4] }"
                        :transition="{ duration: 0.3, times: [0, 1] }"
                        class="absolute right-full bottom-0 mr-1 text-3 text-green-400 -rotate-15 whitespace-nowrap pointer-events-none"
                    ) Copied!

            .btn(
                @click="handleLeave"
                class="flex-none mt-1 h-6 flex items-center justify-center text-2.75 rounded text-neutral-300 outline outline-neutral-700 bg-neutral-800 hover:bg-neutral-700"
            )
                span Go Offline

        //- Offline: the two things "online" can mean, offered directly.
        template(v-else)

            //- One control, two halves, because the choice is between two readings of the
            //- same act. Host commits immediately; Join has a code to collect first, so it
            //- stays lit while its field is open — and the pair stays on screen, which is
            //- also how you change your mind back to hosting.
            .split(class="flex-none h-6 flex items-stretch rounded overflow-hidden text-neutral-300 outline outline-neutral-700 bg-neutral-800")
                .btn-host(
                    @click="handleStart"
                    class="grow flex items-center justify-center hover:bg-neutral-700"
                )
                    span Host
                .divide(class="flex-none w-px bg-neutral-700")
                .btn-join(
                    @click="showJoin"
                    :class="joinOpen ? 'bg-white text-black' : 'hover:bg-neutral-700'"
                    class="grow flex items-center justify-center"
                )
                    span Join

            //- Deliberately the room-code row's twin: same height, same field, same button on
            //- the right — because that is what this row is one keystroke away from becoming,
            //- and the section shouldn't resize or restyle itself on arrival.
            .join(v-if="joinOpen" class="relative mt-1 flex outline outline-zinc-600 rounded focus-within:outline-zinc-500")
                input(
                    v-model="joinInput"
                    @keydown.enter="handleJoin"
                    placeholder="Code..."
                    autocapitalize="characters"
                    autocomplete="off"
                    spellcheck="false"
                    class="w-full min-w-0 h-7 px-2 font-mono tracking-[0.5em] placeholder:tracking-normal placeholder:text-3 text-3.5 text-white placeholder:text-neutral-500 leading-none bg-zinc-950 rounded-l truncate"
                )

                .btn(
                    @click="handleJoinButton"
                    class="flex-none px-4 h-7 flex items-center justify-center bg-zinc-600 text-neutral-300 rounded-r hover:bg-zinc-500 hover:text-neutral-100"
                )
                        svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                            path(d="M20 6 9 17l-5-5")

            //- joinError is local input validation; connectionError is the relay turning us
            //- away (room not found, table full, rate limited).
            .error(v-if="joinError || connection_error" class="relative -left-0.5 pt-1 mb-4 font-sans font-light text-3 text-red-400/50 leading-tight flex gap-1") 
                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    <path d="M12 5v14"/>
                    <path d="m18.065 8.496-12.125 7"/>
                    <path d="m5.94 8.504 12.125 7"/>
                span {{ joinError || connection_error }}

</template>
