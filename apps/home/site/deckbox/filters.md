The left panel is built from the game's config. Cards read `card.filter` and `card.sort` from `game.json`. Decks read `deck.filter` from `deck.json`. Nothing about a game's filters is written into the package.

## Filters

Each key in `filter` is the card property it filters on. Dotted paths like `legal.standard` work too. The order of the keys is the order of the panel.

```json [game.json — card.filter]
"filter": {
    "name":     { "label": "Name", "type": "input" },
    "set_id":   { "label": "Sets", "type": "set" },
    "category": { "label": "Category", "type": "combo", "option": ["Hero", "Ally", "Equipment"] },
    "hp":       { "label": "HP", "type": "slide", "min": 0, "max": 340, "step": 10 },
    "distinct": { "label": "Reprints", "type": "toggle", "default": "true", "label_true": "Hidden", "label_false": "Shown" }
}
```

## Filter types

| Type | Control | Matches when |
| --- | --- | --- |
| `input` | Text box | The property contains the text, ignoring case |
| `combo` | Dropdown, multi-select | The property is any of the picked options |
| `check` | Checkbox list | The property is any of the checked options |
| `set` | Set picker dialog | The card's set is any of the picked sets |
| `slide` | Range slider (`min`, `max`, `step`) | The property is within the range |
| `toggle` | Switch (`label_true`, `label_false`) | The property is truthy when on, falsy when off |

- **Array properties** match if any value matches, so a card with `"type": ["Fire", "Water"]` matches a Water filter.
- **Different filters combine with AND.** Options within one filter combine with OR.
- **Long option lists** move into a searchable dialog. A `combo` or `check` with more than 6 options gets one.
- **A toggle always filters,** in either position. Off doesn't mean "any"; it means the property is falsy.

## Options

`option` can be a plain list, a map of value to label, or grouped. Groups become headings in the picker.

```json [option shapes]
"option": ["Common", "Uncommon", "Rare"]
"option": { "U": "Upper Deck", "C": "Cryptozoic" }
"option": { "Pokémon": ["Basic", "Stage 1"], "Trainer": ["Item", "Supporter"] }
```

## Defaults

`default` sets a filter's starting value. Use a list for `combo`, `check` and `set`, and `true`/`false` (or the strings) for `toggle`. Reset returns filters to their defaults, not to empty.

A filter only shows as changed once it differs from its default.

## Reprints

`distinct` is a reserved key. It doesn't match a property. As a `toggle`, it hides reprints, keeping the newest printing of each card by `oracle_id` and `date`.

It runs after the other filters, so the printing you keep is one that matched. It's left out of **Deck List**, because a deck can hold two printings on purpose.

## Sorting and display

The display section sits above the filters:

- **Layout:** grid or table.
- **Columns:** grid only.
- **Sort:** the keys of `card.sort`, plus random.
- **Direction:** ascending or descending.

```json [game.json — card.sort]
"sort": {
    "name":     { "label": "Name" },
    "card_lex": { "label": "Set Number" },
    "rarity":   { "label": "Rarity" }
}
```

`card.group` is a map in the same shape. It's offered as a grouping option when exporting a list. See [Export and print](/deckbox/export).
