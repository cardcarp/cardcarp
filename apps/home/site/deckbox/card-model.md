The deckbox reads the files [Compile](/compile/manifest) publishes. Most of a card record is only there to be filtered or sorted, and which fields those are is the config's business. This page covers the few fields the deckbox relies on regardless.

## Card fields

| Field | Used for |
| --- | --- |
| `id` | The card's key in `card_dict`, in deck lists, and in saved decks |
| `name` | The grid, the table, and export |
| `set_id`, `card_index` | Export and import. `set_id` is also what the `set` filter matches |
| `set_name` | The table row |
| `category` | The table row |
| `dir` | Card art: `{cards}/{dir}.avif` |
| `oracle_id` | Reprints. Every printing of one card shares it |
| `date` | Which printing is newest, when reprints are hidden |
| `variation` | A card whose `variation` includes `Flip` has art on its back, at `{dir}-flip.avif` |

A card with no `oracle_id` falls back to `origin`, then `id`, so it's never merged with a card it isn't.

## Card size

`card.size` in `game.json` is the card's real size in millimetres. It sets the shape of every card in the deckbox, and the size cards print at.

```json [game.json]
"card": { "size": { "width": 63, "height": 88 } }
```

It defaults to 63 × 88.

## Deck records

A published deck, from `deck_dict`:

| Field | Used for |
| --- | --- |
| `id`, `name` | The deck table |
| `list` | `{ group: { card_id: quantity } }` |
| `highlight` | A card id, shown as the deck's thumbnail |
| `tagline` | The one-line subtitle in the deck table |
| `description` | Notes, as `[{ title, body }]` |

`total` is worked out from `list` when the manifest loads, so a published deck doesn't need to carry it.

## Card ids

A card's id is its set id and card index joined with a hyphen, in lowercase: `base` and `058` make `base-058`. Import depends on this. A line's last two words are looked up exactly that way, so every list the deckbox exports can be read back, including indexes with letters, like `067a`.

## The set list

The set picker reads `sets.json`, not the manifest, so it opens before the manifest has finished downloading. It's fetched once per game.

```text [sets.json]
category    { type, card_total, list }
collection  { id, name, index, date, card_total, list }
set         { id, name, index, type, date, card_total }
```

- **Ids are unique** across the whole tree.
- **`card_total`** at each level is the sum of the level below.
- **Order is display order.** The picker doesn't sort.

Picking sets writes their ids into the filter, and a card matches on its `set_id`.
