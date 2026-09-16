<script setup>
// The click bloom — a flash, a ring and a scatter of sparks wherever the pointer goes down.
// cardcarp.com's shell used to wear it and has since let it go, because that site no longer wants
// to feel like a game; a tabletop is exactly where it belongs, so it lives here now.
import { useTemplateRef } from 'vue'
import { useClickAnimation, usePointerEffects } from './pointer-click.js'

const enabled = usePointerEffects()
const pointerContainer = useTemplateRef('pointerContainer')

// The composable handles mounting and cleanup automatically via VueUse
useClickAnimation(pointerContainer)
</script>

<template>
    <div v-if="enabled" ref="pointerContainer" class="absolute inset-0 pointer-events-none z-9999"></div>
</template>
