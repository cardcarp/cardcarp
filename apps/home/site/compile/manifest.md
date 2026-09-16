Compile's output and the apps meet in two published files and a folder of art. This page covers what each side can rely on from the other.

## What is published

For each of cardcarp's own games:

```text [urls]
https://storage.cardcarp.com/game/{game}/data/manifest.json
https://storage.cardcarp.com/game/{game}/data/sets.json
https://storage.cardcarp.com/game/{game}/card/{dir}.avif
```

A game's config isn't among them. Its card size, its filters and its deck groups are bundled into the app that shows the game, because an app needs them before any card has loaded. See [the deckbox's Configuration](/deckbox/configuration).

## manifest.json

The archive: every card and every deck the game has, each keyed by its id. `@cardcarp/core` fetches it when a game loads, without holding up the page, so the route renders straight away and fills in when the file lands. The card and deck lists the apps read are built from it.

```json [manifest.json — one card and one deck, trimmed]
{
  "card_dict": {
    "base-058": {
      "id": "base-058",
      "name": "Pikachu",
      "set_id": "base",
      "card_index": "058",
      "oracle_id": "pikachu-base-058",
      "category": ["Pokémon"],
      "type": ["Lightning"],
      "hp": 40,
      "rarity": "Common",
      "dir": "standard/01-base/01-base/058-pikachu",
      "legal": ["unlimited"]
    }
  },
  "deck_dict": {
    "legendary-collection-lava": {
      "id": "legendary-collection-lava",
      "name": "Lava",
      "group_id": "legendary-collection",
      "format": ["Standard"],
      "list": {
        "main": {
          "legendary-collection-070": 4,
          "legendary-collection-037": 3
        }
      }
    }
  }
}
```

A card carries its whole joined record: the printing, its oracle's mechanics, its set and collection, and its legality in each format. A deck's `list` is its cards by group, as card id and quantity.

## sets.json

The set tree on its own, a few kilobytes against the manifest's megabytes, so a set picker can open before the archive has arrived. It runs from type to collection to set, with a card total at every level.

## Card art

Each card's art is published under its `dir`, with a suffix for variant art. The dir is built from the card's collection type, collection, set and index, so it stays put for as long as those do.

## What an app relies on

- **Ids are stable.** Each comes from its record's own fields, so it changes only when those do, such as a card moving set or a set being renamed.
- **Every reference resolves.** A deck never lists a card the archive doesn't have, because the build that wrote the manifest refuses to finish otherwise.
- **A dir is an address.** Changing how dirs are built would move every image, which is why the pipeline reads every numbering scheme rather than asking a game to renumber.
- **Records carry their own id.** A card taken out of `card_dict` still says what it is.

## Deck lists in and out

The deckbox exports a deck as one line per card, giving the quantity, name, set id and card index, and imports the same format back.

```text [deck list]
4 Pikachu base 058
1 Jirachi xy-black-star 067a
```

The id it looks up is the set id and the index joined with a hyphen, which is exactly how Compile keys a card. So the deckbox can read back any list it writes, including promos and variants whose index carries a letter.
