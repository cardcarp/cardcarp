A game publishes its config as three files, merged by core into the single `config` object everything downstream reads. Two of the three are optional, and that is how a project says what it is: a deployment with no `simulator.json` genuinely has no table, and one with no `deck.json` has no decks.

```text [config]
src/data/game/wow/config/
├── game.json         name, dataset, card — required
├── deck.json         the deck vocabulary — absent = no decks
└── simulator.json    the table — absent = no table
```

They are named for what they DESCRIBE rather than for the app that reads them, because the readers do not divide the way the apps do — the table's own deckbox panel reads `deck.filter` for its format and theme facets, and `card.size` is what the simulator derives a card's world size from.

## Bundled, not fetched

Config is bundled with the app; the archives are fetched. That line is drawn by what each thing is rather than by how big it is. A config is the other half of a contract the code defines, so it belongs in the repo beside the code that reads it — splitting the two across a network boundary lets a schema change and its instances drift silently, with no commit containing both halves.

```js [src/main.js]
provideGameConfigs(gameConfigsFromGlob(
    import.meta.glob('./data/game/*/config/*.json', { eager: true, import: 'default' }),
))

// Or hand core the object directly:
provideGameConfigs({
    wow: { game: gameJson, deck: deckJson },
})
```

Core is handed the registry rather than discovering it, which is the whole difference between a package and an app: core cannot know which games exist, because a third party's project ships a game this repo has never heard of. What core knows is the shape.

## Asking what a config has

Both packages export a predicate so a host offering two halves can ask before it offers a link to one. Each is asked of a config rather than of a game name — the host holds the registry, and the package does not.

```js [app.vue]
import { hasDeckbox } from '@cardcarp/deckbox'
import { hasSimulator } from '@cardcarp/simulator'

const links = computed(() => [
    hasSimulator(config.value) && { to: '/', label: 'Table' },
    hasDeckbox(config.value) && { to: '/deckbox', label: 'Cards' },
].filter(Boolean))
```

## The archives

Two remote files per game, fetched rather than bundled: `sets.json` (3–22 KB, the set tree) and `manifest.json` (1–25 MB, the card and deck dictionaries). The manifest does not block routing — the deckbox renders its skeletons off core's `loading` flag while the archive is in flight, which for a large game is several seconds.
