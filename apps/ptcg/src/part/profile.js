// Whether the profile dialog is showing.
//
// A module-level ref rather than a prop or a provide, because the two ends sit in different branches
// of the tree: the button that opens it is in the menu drawer (part/sidebar.vue) and the dialog is
// mounted once at the top of app.vue so it survives both routes. Same shape as the table's own UI
// state in simulator/ui.js, and for the same reason.
import { ref } from 'vue'

export const dialog_profile_open = ref(false)
