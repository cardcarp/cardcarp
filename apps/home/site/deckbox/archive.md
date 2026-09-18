The reference deckbox (`apps/template/src/deckbox`) is one screen: a header bar, and three panels under it. What each panel shows comes from the game's config and manifest; how it looks is the template's. Its header carries a `#menu` slot, which ptcg's `app.vue` fills with the menu it shares with the table.

```text [layout]
┌────────────────┬──────────────────────────┬────────────────┐
│ #menu  Filter  │  Cards  Decks  Deck List │   Saved  Build │
├────────────────┼──────────────────────────┼────────────────┤
│ left           │ center                   │ right          │
│ filters and    │ results, as a grid       │ saved decks,   │
│ display        │ or a table               │ or the build   │
└────────────────┴──────────────────────────┴────────────────┘
```

## The header

- **Left:** the host's `#menu` slot, then the Filter button, which opens the left panel.
- **Center:** switches what the center shows: **Cards**, **Decks** or **Deck List**.
- **Right:** opens the right panel on **Saved** or **Build**.

## The center

The center shows one of three datasets. Each keeps its own filters, sort and layout, so switching between them loses nothing.

| View | Shows | Defaults |
| --- | --- | --- |
| Cards | Every card in the manifest | Grid, random order, 200 per page |
| Decks | Every published deck | Table, by name, 500 per page |
| Deck List | The cards of the deck picked under Decks, grouped by deck group | Grid, by quantity, 500 per page |

Results load more as you scroll. Any change to the results, like a filter or a sort, starts again from the first page.

- **Grid** shows card art. The column count starts from the viewport width and can be changed in the left panel, up to 12.
- **Table** shows one row per card or deck.

Clicking a card opens its detail dialog: art, rules text, and every printing that shares its oracle. Clicking a deck opens its list.

While the manifest is downloading, the center shows skeletons in the same layout the results will use. If it fails, it says so rather than loading forever.

## The side panels

- **Left:** filters and display options. See [Filters and sorting](/deckbox/filters).
- **Right:** your saved decks, or the deck you're building. See [Deck editing](/deckbox/decks).

At `lg` and wider the panels sit beside the center as columns. Below that, the left panel overlays the center and the right panel rises from the bottom as a sheet, so the card grid keeps the full width.

## Actions

Each list has an actions menu, and what it acts on is what's in front of you: the filtered cards in the center, or the cards in the build.

- **Probability:** the chance of drawing each card in an opening hand, plus a sample hand you can redraw.
- **Print** and **Export:** see [Export and print](/deckbox/export).
- **Save as deck:** in the center, saves the filtered cards as a new deck.
- **Details**, **Import**, **Duplicate**, **Save** and **Delete:** in the build. See [Deck editing](/deckbox/decks).

## Confirmations

The deckbox asks before losing work. It prompts before deleting a deck, removing a deck group that still has cards, or leaving with unsaved changes. Leaving covers closing the tab, reloading, and navigating to another route.
