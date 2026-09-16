// What a host gets when it installs @cardcarp/deckbox.
//
// One component, for now, and that is not an oversight: unlike the table — whose menu genuinely
// needs to start a tutorial and open a shortcut sheet — nothing in a host's chrome needs to
// reach into a deckbox. If that changes, this is where the named export goes, and the arrow
// keeps running app -> package rather than the other way.
//
//   <Deckbox>
//     <template #menu><MyMenu /></template>
//   </Deckbox>
//
// The slot is optional. A project that wants a bare deckbox fills nothing and renders one.
export { default as Deckbox } from './index.vue'

// Whether a game's config describes a deckbox at all.
//
// `deck` is optional by design — it is how a project says "this instance has no decks" (see
// @cardcarp/core's applyConfig) — so a host offering both halves has to be able to ask before
// it offers a link. The counterpart to @cardcarp/simulator's hasSimulator, asked the same way:
// of a config, because the host holds the registry and this package does not.
export function hasDeckbox(config) {
    return !!config?.deck
}
