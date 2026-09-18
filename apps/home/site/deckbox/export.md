A list leaves the deckbox three ways: as text, as a printable PDF, or as a zip of images. Each one works on the list the action was opened from: the filtered cards in the center, or the cards in the build.

## Text

Export writes one line per card: quantity, name, set id and card index. It can be copied or saved as a `.txt` file.

```text [export]
Main: 4
4 Pikachu base 058

Side: 1
1 Jirachi xy-black-star 067a
```

- **Sort:** any key of `card.sort`, or quantity.
- **Group by:** deck group ("Pool"), any key of `card.group`, or none.
- **Headers:** a `Group: total` line above each group, which can be turned off.

This is the format [Import](/deckbox/decks#import) reads, so an export can always be imported again.

## Print

Print lays cards out on real pages at their real size, from `card.size`, and saves a PDF.

- **Paper:** Letter, A4 or Legal.
- **Padding:** the page margin, in millimetres.
- **Gap:** the space between cards, in millimetres.

The dialog previews the pages before anything downloads.

## Images

The same dialog saves a zip with one JPEG per card, for printing services and desktop software. The folder inside has the same name as the zip, so unzipping two exports into one place doesn't overwrite either.

## How art is converted

Card art is published as AVIF, which jsPDF and most print software can't read. Both exports fetch each image, decode it in the browser, and re-encode it as a 300 DPI JPEG.

- **Each card is converted once,** however many copies the list holds.
- **Four images convert at a time,** so a large list doesn't hold hundreds of decoded images in memory.
- **A card whose art fails** leaves its spot empty instead of shifting the rest of the page.

The art host has to allow cross-origin requests from your site, or every card fails. See [Card art](/simulator/configuration#card-art).

## File names

Every download is named `{subject}-{date}.{ext}`. The subject is the deck's name, or the game's when there isn't one. The date is local, so files from the same day sort together.

```text [downloads]
emerald-dream-2026-08-20.pdf
emerald-dream-2026-08-20.zip
wow-cards-2026-08-20.pdf
```
