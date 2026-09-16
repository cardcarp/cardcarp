<script setup>
// The whole shell: a router view, and the chrome this project puts over both halves of it.
//
// Both packages declare a #menu slot and render perfectly well with it empty — a project that wants
// no chrome fills nothing, and that is still the contract. This project fills it, with the same
// hamburger and drawer on the table and in the archive, because a two-route project needs some way
// of getting from one to the other and neither package will grow one for it.
//
// Which links the drawer offers is asked of the game's config, not decided here: see part/sidebar.vue.
import { RouterView } from 'vue-router'
import Menu from './part/menu.vue'
import DialogProfile from './part/dialog-profile.vue'
import Pointer from './pointer/pointer.vue'
import LoadingStrip from './part/loading-strip.vue'
</script>

<template lang="pug">
.app(class="relative h-full")
    //- Passed through `v-slot` rather than written on RouterView itself: a slot given to RouterView
    //- is a slot given to RouterView, and the route's component never sees it. Each half declares
    //- where #menu lands — @cardcarp/simulator's table view in a fixed top-left corner over the
    //- canvas, @cardcarp/deckbox's in its header bar — so the same component serves both.
    RouterView(v-slot="{ Component }")
        component(:is="Component")
            template(#menu)
                Menu

    //- Mounted here rather than in the table view's #dialog slot, because the menu that opens it is
    //- on both routes and that slot exists only on the table. It portals to body, so where it is
    //- written makes no difference to where it lands.
    DialogProfile

    LoadingStrip
    Pointer
</template>
