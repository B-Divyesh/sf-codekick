# Codekick repair handoff

## Product and release

Codekick is a free four-minute 2v2 browser football match for two to four
friends. One person creates a private room, shares its six-character code, and
each friend plays from a laptop keyboard or phone touch controls. The first
action is **Try it with sample data**, which starts a separate 28-second match.

- Final implementation SHA: `9516c9ec25c53c6deaf93767ef166e3be7fda953`.
- The static bundle was deployed from `7ba3056336153dc200ae802021711ec7814f249a`;
  its frontend files are byte-identical at the final implementation SHA. The
  later implementation commit changes only realtime persistence scheduling.
- The realtime image was built from the final implementation SHA.
- The documentation SHA is the repository commit containing this handoff. No
  product-code commit follows the implementation SHA above.

## Delivered

- A product-owned Axum WebSocket service creates and joins private rooms for
  up to four independent clients. It owns the fixed 60 Hz match simulation and
  sends snapshots for browser interpolation.
- Rooms survive service restarts in SQLite on the fleet-created durable
  `/data` mount. SQLite uses dot-file locking for the mounted filesystem, one
  long-lived connection, and background transactional match snapshots so
  storage work cannot stop live play.
- The room service has a health endpoint, six-hour room expiry, per-IP room
  request limits, `429` responses with `Retry-After: 60`, automatic browser
  reconnect, and an explicit four-minute server clock.
- The existing practice and same-device modes remain. Keyboard, two-player
  touch controls, pass, shot, pause, key remapping, assist mode, reduced
  motion, recovery, all three stadium rules, end screen, and rematch work.
- `/demo` remains isolated under `demo:codekick:*`. It has populated 2v2 sample
  play, a persistent sample label, reset, start-for-real separation, and a
  supplied end-screen action.
- Home, Demo, How to play, Privacy, Terms, and the styled 404 have route titles,
  one H1, focus transfer, keyboard operation, and the standard site structure.
- Static responses now apply CSP, Permissions Policy, Referrer Policy, and
  `X-Content-Type-Options`. Unknown routes return the styled page with HTTP
  404.

## Earlier finding dispositions

| Finding | Disposition |
| --- | --- |
| F1 missing room multiplayer | Fixed. Four independent real clients, room capacity, synchronized play, timed end, rematch, reconnect, SQLite restart persistence, health, and rate limiting are covered. |
| F2 missing player-two touch controls | Fixed. The phone UI has separate 44 px movement, pass, and shoot controls for each local player. |
| F3 200% text overflow | Fixed. The 320 px / 200% regression check has no horizontal document overflow or clipped navigation. |
| F4 undersized demo controls | Fixed. Reset and start-for-real controls meet the 44 px touch target. |
| F5 missing live policies | Fixed. CSP and Permissions Policy are present on the live response; the deployment config ships inside `dist/`. |
| F6 eight untested claim groups | Fixed. The inventory now has 27 outcome-tested claims, including every previously unlisted group and the online service. |
| F7 kickoff Pause no-op | Fixed. Pause and resume work during kickoff and active play. |
| F8 soft 404 | Fixed. An unknown path returns HTTP 404 with the designed Codekick page and return action. |
| F9 privacy contact not actionable | Fixed. Privacy requests use the direct `mailto:privacy@sociobot.in` link. |

## Verification

The final clean checkout was `/tmp/codekick-final-q0x2zh` at the implementation
SHA above.

- Every one of the 27 commands in `.factory/claims.json` ran separately and
  passed. Full output is `/work/.evidence/codekick-final-claims.log`.
- `npm test` passed 4 engine tests, 5 server tests, and 51 browser checks. Three
  browser cases are intentional profile skips. The run includes four separate
  room clients, a timed online end screen, reflow at 200%, invalid and damaged
  state recovery, and axe checks with no serious or critical violations.
- The storage-busy regression holds the SQLite connection while proving the
  active match continues beyond 75 ticks and moves the player.
- `npm run build` produced `dist/`. JavaScript is 40.43 KB raw / 12.44 KB gzip;
  CSS is 12.12 KB raw / 3.48 KB gzip. The uploaded static artifact is 150,762
  bytes.
- `npm run verify:url -- https://codekick.sociobot.in` passed title, language,
  main landmark, alt text, and console checks.
- Live mobile Lighthouse scored 100 for performance, accessibility, best
  practices, and SEO. LCP was 959 ms, CLS 0, and total blocking time 39 ms.
- A fresh live phone profile measured 120 frames at 60.006 fps.
- Fresh 1440×900 desktop and 393×727 phone sessions showed the game before
  scrolling. The job is **Play a private 2v2 football match**; the audience is
  two to four friends; the first action is **Try it with sample data**.
- The live sample showed Sun 2–Tide 1, its permanent sample label, reset state,
  start-for-real separation, and a real result screen.
- Two independent live clients joined by room code. The Sun player moved from
  x=330 to x=244 on both clients, and the host reconnected after reload.
- A live room survived an actual container revision restart and accepted a
  second player afterward. The final image also returned `429` with
  `Retry-After: 60` under the documented request boundary.
- Live `/`, `/demo`, `/privacy`, `/terms`, and `/404.html` return 200. An
  unknown route returns the designed page with HTTP 404.

Evidence includes `codekick-live-desktop.png`, `codekick-live-phone.png`,
`codekick-live-demo.png`, `codekick-live-end-screen.png`, the two live-room
screenshots, `codekick-live-fps.json`, and `codekick-lighthouse.json` under
`/work/.evidence/`.

## Deployment

- Static app: `sf-codekick` at <https://codekick.sociobot.in>.
- Realtime app: `sf-codekick-realtime` at
  <https://codekick-realtime.sociobot.in>.
- Realtime state: `sf-codekick-realtime-data`, mounted at `/data`.
- The realtime app has one healthy active revision, 100% traffic, min/max one
  replica, and HTTP startup, readiness, and liveness probes on `/health`.

## Independent verification 2 — 2026-09-06

Verdict: **FAIL** with 4 findings and 1 untested public claim. See
`.factory/verification-2.md` for the full evidence.

The implementation candidate remains
`9516c9ec25c53c6deaf93767ef166e3be7fda953`; documentation before this report
is `903bbe990e8d7b6cc76bae94abe651c336c08e14`. The later repository head only
changes pre-existing Graphify output. The live static files match the clean
candidate build byte for byte.

Independent checks confirmed the repaired room-code job with two live clients,
synchronized movement, reconnect, a product-service restart with the same room
still joinable, SQLite health, and live 429 responses with `Retry-After: 60`.
All 27 declared claim commands returned zero. The full suite passed 4 engine,
5 server, and 51 browser checks with 3 expected profile skips. Build, URL
verification, 100/100/100/100 Lighthouse scores, and a 60.00 fps live phone
profile also passed.

Acceptance remains blocked by these findings:

1. **Medium:** Start for real recreates `demo:codekick:match` during route
   teardown instead of discarding demo state.
2. **Medium:** the six-hour expiry part of `room-persistence` is not tested as
   an outcome; only its future timestamp is asserted.
3. **Low:** `/demo` has one moderate axe violation because its complementary
   `aside` is nested inside `main`.
4. **Low:** four server claim tests lack the required `@claim:<id>` tags.

Codekick intentionally has no public queue, accounts, leagues, licensed teams,
payment, analytics, or offline claim. No product code was changed during
verification 2.
