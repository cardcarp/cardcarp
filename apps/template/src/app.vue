<script setup>
import { RouterView } from 'vue-router'
import Menu from './core/menu.vue'
import DialogProfile from './core/dialog-profile.vue'
import DialogAbout from './core/dialog-about.vue'
import Pointer from './pointer/pointer.vue'
import LoadingStrip from './core/loading-strip.vue'
</script>

<template lang="pug">
.app(class="relative h-full")
    RouterView(v-slot="{ Component }")
        component(:is="Component")
            template(#menu)
                Menu

    DialogProfile
    DialogAbout

    LoadingStrip
    Pointer
</template>
