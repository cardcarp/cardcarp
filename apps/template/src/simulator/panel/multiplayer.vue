<script setup>
import { computed, onUnmounted, ref } from 'vue'

import { AnimatePresence, Motion, motion } from 'motion-v'

import Section from './section.vue'

import { useStore } from '../composable/use-store.js'
import { useTable } from '../use-table.js'

const { connect, disconnect, status: connectionStatus, code: roomCode, start: startRoom, normalizeCode: normalizeRoomCode, isValidCode: isValidRoomCode, error: connectionError, CODE_MIN: ROOM_CODE_MIN } = useTable().room

const connection_status = useStore(connectionStatus)
const room_code = useStore(roomCode)
const connection_error = useStore(connectionError)

const joinInput = ref('')
const joinError = ref('')

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

function extractCode(input) {
    const s = (input ?? '').trim()
    if (!s) return ''
    try {
        const room = new URL(s).searchParams.get('room')
        if (room) return room
    } catch { }
    return s
}

function handleStart() {
    joinError.value = ''
    void startRoom()
}

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
    joinOpen.value = false
    disconnect()
}

function handleJoinButton() {
    handleJoin()
}

async function pasteCode() {
    let text = ''
    try {
        text = await navigator.clipboard?.readText() ?? ''
    } catch { return }
    if (!text.trim()) return
    joinInput.value = normalizeRoomCode(extractCode(text))
    handleJoin()
}

const copy_active = ref(false)
let copy_timer = 0

function copyCode() {
    if (!room_code.value) return
    if (copy_active.value) return
    navigator.clipboard?.writeText(room_code.value).catch(() => { })
    copy_active.value = true
    copy_timer = setTimeout(() => { copy_active.value = false }, 2000)
}

onUnmounted(() => {
    clearTimeout(copy_timer)
})
</script>

<template lang="pug">
Section(id="multiplayer" title="Multiplayer" tour="multiplayer")

    template(#aside)
        svg(class="size-3.5" viewBox="0 0 24 24" fill="none" :class="statusDotClass" stroke-width="0")
            circle(cx="12" cy="12" r="5")

    .connection(class="flex flex-col gap-2 font-mono text-2.75")

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

        template(v-else)

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

            .error(v-if="joinError || connection_error" class="relative -left-0.5 pt-1 mb-4 font-sans font-light text-3 text-red-400/50 leading-tight flex gap-1") 
                svg(class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round")
                    <path d="M12 5v14"/>
                    <path d="m18.065 8.496-12.125 7"/>
                    <path d="m5.94 8.504 12.125 7"/>
                span {{ joinError || connection_error }}

</template>
