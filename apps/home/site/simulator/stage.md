The table is laid out from `simulator.json`. It sets how big the table is, what each seat gets dealt when it sits down, and where a deck lands. Every part is optional, and a game that leaves one out gets the default.

## The stage

The stage is the rectangle a game is designed into, in world units. Its width is fixed and its height is worked out from what the game puts on it.

```text [stage]
┌─────────────────────────────┐
│         seat region         │  seat.height + chip
├─────────────────────────────┤
│        shared region        │  shared.height (0 for a TCG)
├─────────────────────────────┤
│         seat region         │  seat.height + chip
└─────────────────────────────┘
            1920 wide
```

- **Seat region:** each player's own area, one per end of the table. Its size is the playmat's.
- **Shared region:** the middle, belonging to nobody. A trading card game leaves it at 0. A board game gives it the board's size.

Because the height comes from the game, the stage's shape differs per game. On a screen that doesn't match, the table is letterboxed, and the edge color fills the rest.

```json [simulator.json]
{
    "table": {
        "stage": { "width": 1920 },
        "surface": { "color": "#1a1a1a", "img": "bg-table", "scale": 0.5 },
        "edge": { "color": "#000000" }
    },
    "card": { "width": 77, "height": 108 },
    "deal": {
        "player": { "seat": { "width": 768, "height": 432 } },
        "game": { "shared": { "width": 0, "height": 0 } }
    }
}
```

| Key | Default | What it is |
| --- | --- | --- |
| `table.stage.width` | 1920 | The stage's width |
| `card` | 77 × 108 | A card's size on the table. Not its print size, which is `card.size` in `game.json` |
| `deal.player.seat` | 768 × 432 | A seat's play area, usually the playmat |
| `deal.game.shared` | 0 × 0 | The shared region |
| `table.surface` | The theme's | The table's color and texture. See [Table textures](/simulator/configuration#table-textures) |
| `table.edge` | The theme's | The color beyond the table's edge |

## Coordinates

Every position in the config is the **top-left corner** of the thing being placed, measured from the **top-left corner** of its region. They're the numbers you'd read off the playmat art in an image editor.

A seat position is written once and used for both ends of the table. The far seat is turned a half turn, so its layout mirrors the near one without a second set of numbers.

## Dealing a seat

`deal.player.accessory` is what each seat gets when it's added: a playmat, dice, counters. `deal.game.accessory` is dealt once to the shared region.

```json [simulator.json — deal]
"deal": {
    "player": {
        "accessory": [
            { "accessory": "Playmat", "x": 0, "y": 0 },
            { "accessory": "Dice (D6)", "x": 608, "y": 46, "start": 15, "variant": "gray" }
        ],
        "deck": {
            "hero": { "x": 505.5, "y": -25 },
            "main": { "x": 617.5, "y": -25 }
        }
    },
    "game": { "accessory": [] }
}
```

- **`accessory`** names an item from the `accessory` list below.
- **`start`** is a die's or counter's starting value. It's clamped to the item's `min` and `max`.
- **`variant`** picks one of the item's variants by name.

A name that doesn't match is skipped with a console warning, so a typo doesn't stop the deal.

## Where a deck lands

`deal.player.deck` places each part of a deck, keyed by deck group. A group it doesn't name falls back to a centered row. Add `"explode": true` to lay a group out spread and ungrouped instead of stacked, for cards used one at a time.

This only applies to a seat's first deck. On that deal `main` is shuffled, and every other group keeps its order. Later decks land where the player drops them, unshuffled.

## Accessories

`accessory` lists everything that can be put on the table besides cards. A UI reads it with `table.accessories.list(config)`.

```json [simulator.json — accessory]
"accessory": [
    {
        "name": "Playmat",
        "category": ["board"],
        "size": { "width": 768, "height": 432 },
        "img": { "game": "game/wow/asset/board.avif", "thumbnail": "table/board-thumbnail.avif" }
    },
    {
        "name": "Dice (D6)",
        "category": ["dice"],
        "size": { "width": 58, "height": 58, "row": 10, "col": 6, "total": 60 },
        "min": 1, "max": 6,
        "img": { "thumbnail": "table/dice/d6-thumbnail.avif" },
        "variant": [{ "name": "gray", "color": "hsl(0 0% 45%)", "img": "table/dice/d6-gray.avif" }]
    }
]
```

`category` decides what kind of object it becomes:

- **`board`:** a flat image laid out facing its seat, like a playmat.
- **`dice`:** a die, drawn from a sprite sheet (`row`, `col`, `total`), rolled between `min` and `max`.
- **`counter`:** a number that goes up and down.
- **`marker`:** any other image. An unknown category becomes a marker too.

`img.game`, `img.thumbnail` and each variant's `img` are locations, extension included, resolved against the storage root (see [the deckbox's Storage](/deckbox/install#storage)). The thumbnail falls back to `img.game`. A die whose art is all in its variants needs no `img.game`: it shows its first variant unless a deal entry names another.

## Face up or face down

Cards dealt as part of a deck land face down. A single card placed on its own lands face up. `card.flip` reveals more:

```json [simulator.json — card]
"card": {
    "flip": {
        "deck": ["hero"],
        "category": ["Leader"]
    }
}
```

- **`deck`** reveals a whole deck group, whatever its cards are.
- **`category`** reveals a card type wherever it turns up.

`flip` only ever reveals. Leaving something off can't turn a deck face up.

## Card backs

A card's back is a flat sleeve color unless the game says otherwise. `back` sets a back image by card category, and the first match wins.

```json [simulator.json]
"back": [
    { "category": "Energy", "img": "game/ptcg/asset/back-energy.avif" }
]
```

A printing whose `variation` includes `Flip` uses its own back art instead, at `{dir}-flip.avif` in the `cards` location.
