# Codekick

Codekick is a free 2v2 arcade football match for two to four friends. One
player creates a private room and shares its six-character code. Each match
lasts four minutes and works with keyboard or touch controls.

## What works

- Two to four independent browsers share a server-authoritative room match.
- Fixed-step football includes pass, shot, goals, a two-second possession
  combo, pause, an end screen, and synchronized rematches.
- Unclaimed players act as bots, so two friends still play a complete 2v2.
- Crosswind, Spring turf, and Pinched goals rotate across rematches.
- A shared-screen mode gives both players keyboard and phone touch controls.
- Settings and unfinished local matches recover after a browser reload.
- Room state persists in SQLite across service restarts and expires six hours
  after the last player action.

The intended session is one four-minute match plus an optional rematch. There
is no public queue, account, payment, league, or licensed team.

## Try the sample

Open `http://localhost:5173/demo` or select **Try it with sample data**. The
28-second sample starts with Sun leading 2–1 and possession near goal. It uses
only `demo:codekick:*` browser keys, never joins the room service, and can be
reset without changing real match data.

## Run locally

Requires Node.js 20 or later, npm, and Rust 1.90 or later.

```bash
npm install
DATA_DIR=/tmp/codekick-data PORT=8787 cargo run --manifest-path realtime/Cargo.toml
npm run dev
```

Open `http://localhost:5173/`. The Vite app uses the local room service at
`http://127.0.0.1:8787` during development.

## Controls

| Player | Move | Pass | Shoot |
| --- | --- | --- | --- |
| Your room player or Sun captain | W A S D | F | G |
| Shared-screen player two | Arrow keys | . | / |

Each player gets move, pass, and shoot buttons on a phone. Settings can remap
pass and shoot, slow play with assist mode, and reduce field motion.

## Verify

```bash
npm ci
npm test
npm run build
npm run verify:url -- http://127.0.0.1:4173
```

`npm test` runs deterministic engine tests, Rust service checks, independent
browser room clients, desktop checks, phone checks, and axe. Every public claim
and its clean-sandbox command is listed in `.factory/claims.json`.

The room service exposes `GET /health`, which checks SQLite. It limits room
mutations per address and returns HTTP 429 with `Retry-After` when the limit is
reached.

## Deploy

Build the static site with `npm run build`, then deploy `dist/` to
`sf-codekick`. The built output includes `staticwebapp.config.json` with route,
404, security, and cache rules.

Build `realtime/Dockerfile` from the repository root and deploy it as the
single-replica `sf-codekick-realtime` container. Mount its durable product
share at `/data`, set `DATA_DIR=/data`, route port 8080, and probe `/health`.
The browser connects only to `https://codekick-realtime.sociobot.in`.

## Privacy

Codekick has no analytics, ads, remote fonts, third-party game assets, or
account. Creating or joining a room sends its code, controls, and match state
to the Codekick room service. Local settings, local match state, and room
access stay in browser storage. See `/privacy` and `/terms`.

## License

MIT. See [LICENSE](LICENSE).
