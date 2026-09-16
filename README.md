# CardCarp Web 🎴

An npm-workspaces monorepo for the CardCarp tabletop card game engine, web applications, and multiplayer relay.

<br>

> [!IMPORTANT]
> The packages in this repo are standalone toolkits designed to be published and used in any card game project.<br>
> Game apps (`apps/ptcg`, `apps/wow`) serve as reference implementations and live deployments.<br>
> All apps and packages share a single root install and hot-reload across local workspaces.

<br>

## 🚀 Quick Start

You need Node.js 20 or newer.

```bash
git clone https://github.com/benjamelon-lol/cardcarp.git
cd cardcarp/web
npm install
npm run dev
```

`npm run dev` starts the documentation site at `http://localhost:5173`.

<br>

## 🕸️ Structure

This repo separates the engine packages, game frontends, documentation, and the multiplayer relay.

| Folder | Package / App | Holds |
| --- | --- | --- |
| `packages/core/` | `@cardcarp/core` | **Shared store & config API.** Game state management, config schema, image and search composables |
| `packages/simulator/` | `@cardcarp/simulator` | **Virtual tabletop engine.** PixiJS canvas, seat management, card tactility, and multiplayer socket client |
| `packages/deckbox/` | `@cardcarp/deckbox` | **Card catalog & deck builder.** Filtering, card grid/table views, deck import/export, and print sheets |
| `apps/home/` | `@cardcarp/home` | **Documentation site.** cardcarp.com; package guides, API reference, and project directory |
| `apps/ptcg/` | `@cardcarp/ptcg` | **Pokémon TCG.** Full tabletop simulator with custom controls, toolbar, and deckbox |
| `apps/wow/` | `@cardcarp/wow` | **World of Warcraft TCG.** Reference project mounting `@cardcarp/deckbox` with WoW card data |
| `relay-server/` | `cardcarp-relay` | **Multiplayer relay.** Cloudflare Worker + Durable Object echo server synchronizing canvas actions |

<br>

## 🛠️ Commands

Run commands from the root of the workspace.

| Command | What it does | Port / Notes |
| --- | --- | --- |
| `npm run dev:home` | Serves the documentation site (`cardcarp.com`) | `http://localhost:5173` |
| `npm run dev:wow` | Serves World of Warcraft TCG | `http://localhost:5174` |
| `npm run dev:ptcg` | Serves Pokémon TCG | `http://localhost:5175` |
| `npm run dev:relay` | Starts local multiplayer relay | `http://localhost:8787` |
| `npm run build` | Builds all packages and apps for production | Writes to `./dist` per app |
| `npm test` | Runs the full test suite | Simulator, deckbox, and UI boundary tests |

<br>

## ☁️ Deployment

Each app and the relay deploy to **Cloudflare Workers**.

Because packages are resolved via workspace symlinks, all Cloudflare Worker builds set the **root directory to the repository root**.

| Worker | Build command | Deploy command |
| --- | --- | --- |
| `cardcarp` | `npm run build --workspace @cardcarp/home` | `npx wrangler deploy --config apps/home/wrangler.jsonc` |
| `cardcarp-wow` | `npm run build --workspace @cardcarp/wow` | `npx wrangler deploy --config apps/wow/wrangler.jsonc` |
| `cardcarp-ptcg` | `npm run build --workspace @cardcarp/ptcg` | `npx wrangler deploy --config apps/ptcg/wrangler.jsonc` |
| `cardcarp-relay` | *(none)* | `npx wrangler deploy --config relay-server/wrangler.jsonc` |

<br>

### Configuration & Variables

- **`VITE_MULTIPLAYER_WS_URL`**: Build-time variable set on `cardcarp-ptcg`. Points to the production relay (`https://cardcarp-relay.ben-r-b39.workers.dev`). Falls back to `ws://localhost:8787` locally.
- **`ROOM_TICKET_SECRET`**: Local secret for `relay-server`. Stored in `relay-server/.dev.vars` (see `relay-server/.dev.vars.example`).
- **`storage.cardcarp.com`**: Hosts `manifest.json` and card image assets. Origins for each app and local ports (5173–5175) must be allowed in the bucket's CORS policy.

<br>

## 🐝 Community

Contributions, feedback, and bug reports are welcome.

- **[Join Discord](https://chat.cardcarp.com):** discuss tabletop architecture, package APIs, and game configs.<br>
- **[CardCarp](https://cardcarp.com):** documentation, package trees, and live examples.<br>
- **[Support the project](https://patronage.cardcarp.com):** help support development and hosting.

<br>

## 📜 License

The files in this repo are released under [MIT No Attribution](LICENSE.md).

<sub>CardCarp is an independent, community-driven project. It is not affiliated with, endorsed by, or sponsored by any publisher or intellectual property owner. Card data and images are for educational study, historical preservation, and personal, non-commercial use. All trademarks, copyrights and artwork remain the property of their respective owners, and no challenge to those rights is intended.</sub>
