```sh [shell]
pip install "cardcarp-compile @ git+https://github.com/cardcarp/compile.git"
```

Compile is the build every cardcarp dataset runs. A game's cards, sets, oracles and decks are written as YAML, one record to a file. Compile checks every file against the game's schema, checks that every reference between records resolves, and writes the JSON that [the deckbox](/deckbox) and [the simulator](/simulator) load.

```sh [shell]
pip install .          # once, in a game's dataset repo
cardcarp-compile       # check the YAML and build dist/
cardcarp-sets          # the set tree
cardcarp-manifest      # the archive the apps load
```

It is Python rather than an npm package, because the people it serves are editing card data rather than building an app. Each game is its own repository holding nothing but its data and its schema, and Compile is the one copy of the pipeline they all install. A fix made here reaches every game at once.

## What it is not

It holds no game. What makes a dataset Pokémon or Warcraft is its schema, which says what a valid record is, and a short `dataset.yml`, which names the fields worth filtering on and the order its collection types appear in. See [Configuration](/compile/configuration).

It doesn't publish. It writes `dist/` inside the game's repository, and getting the archive and the card art to where an app fetches them is the game's own step. See [The manifest contract](/compile/manifest).

And it doesn't ingest. A game whose data starts upstream, as a bulk file from someone else, keeps its own import scripts and runs Compile on what they write. Those scripts can use the same helpers the pipeline does; see [Commands](/compile/commands).

## Where it sits

Compile is the producer and the apps are the consumers. A dataset repo runs Compile, its output is published, and `@cardcarp/core` fetches it for the deckbox and the simulator. Nothing in an app imports Compile, and nothing Compile does knows an app exists. The published archive is the whole of the contract between them.

The reference dataset is [cardcarp/ptcg](https://github.com/cardcarp/ptcg). [cardcarp/wow](https://github.com/cardcarp/wow) builds from the same package, with its own schema and its own vocabulary.
