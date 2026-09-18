<script setup>
import { useTemplateRef } from 'vue'
import { useClickAnimation, usePointerEffects } from './pointer-click.js'

const enabled = usePointerEffects()
const pointerContainer = useTemplateRef('pointerContainer')

useClickAnimation(pointerContainer)
</script>

<template>
    <div v-if="enabled" ref="pointerContainer" class="absolute inset-0 pointer-events-none z-9999"></div>
</template>
