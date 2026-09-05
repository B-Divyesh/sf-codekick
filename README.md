# Codekick

Codekick is a free local 2v2 arcade football match for two friends sharing a
laptop keyboard or phone screen. A normal round lasts four minutes. One player
can practice against bots; two local players can use one keyboard. Keyboard and
touch controls are included.

## What works now

- Fixed-step canvas football with pass, shot, goals, a two-second possession
  combo, pause, rematch, and an actual score end screen.
- Three symmetric stadium rules that rotate on rematch: Crosswind, Spring turf,
  and Pinched goals.
- One-click `/demo` sample in its own localStorage namespace, with reset and
  start-for-real actions.
- Keyboard, touch, visible focus, reduced-motion setting, remappable pass and
  shot keys, local match recovery after refresh, and privacy/legal routes.

Remote room-code matches are not advertised as working. They need the required
product-owned server-authoritative realtime service with durable `/data` state.
The supplied deployment target is static, so that service is a named dependency
for the next release rather than a fake room-code UI in this release.

## Run locally

Requires Node.js 20 or later and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`. Open `http://localhost:5173/demo` for the
isolated sample match.

## Controls

| Player | Move | Pass | Shoot |
| --- | --- | --- | --- |
| Sun captain | W A S D | F | G |
| Local player two | Arrow keys | . | / |

Touch controls are shown at phone widths. In Settings, pass and shoot can be
remapped and assist/reduced-motion preferences are stored locally.

## Verify

```bash
npm test
npm run build
npm run verify:url -- http://127.0.0.1:4173
```

`npm test` runs deterministic engine tests and Playwright checks on desktop and
phone profiles. Every public, testable product claim lives in
[.factory/claims.json](.factory/claims.json); run its listed command from a
clean checkout. `npm run verify:url` expects a running local server and checks
the title, language, landmarks, image alt text, and console errors.

## Deploy

Build the static site with `npm run build`. Deploy `dist/` with the repository
`staticwebapp.config.json`, preserving the single static-site deployment. Do
not imply remote rooms are available until a product-owned `sf-codekick-realtime`
service is deployed with its durable `/data` volume, one-replica bound, health
check, rate limits, and server-authoritative match state.

## Privacy

Codekick has no analytics, account, advertising, remote fonts, or third-party
game assets. Normal unfinished matches and settings stay in this browser.
Demo data is stored under `demo:codekick:*` and is removed by Reset demo or
Start for real. See `/privacy` and `/terms`.

## License

MIT. See [LICENSE](LICENSE).
