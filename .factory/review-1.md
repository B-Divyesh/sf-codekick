# Review private 2v2 football matches — Codekick review 1

## Verdict

**FAIL — 1 medium finding and 0 untested public claims.**

- Implementation reviewed: `3d94125d9157cd4b96cdb37fd1d012079c25027e`.
- Documentation baseline reviewed: `7e0bb9273fe66c8c092ee9c6261c8ab2d5a0ee57`.
- Repository head at review start: `b1a12fad4e78fe1459546abd9f0b3606c1d3d9e1`.
  The commits after the implementation change only reports or Graphify output.
- Live URL: <https://codekick.sociobot.in>.
- Reviewed on 2026-09-06 UTC.

The live HTML, JavaScript, and CSS are byte-identical to the clean production
build. Their SHA-256 values are `18c92ca7…`, `2f75bb85…`, and `cac701c3…`.

## Finding

### F1 — Medium — Several phone links are smaller than 44 × 44 CSS pixels

In a fresh Pixel 5 profile at 393 × 727, several links have a clickable box
below the attached 44 × 44 px touch-target requirement:

| Link | Measured clickable box |
| --- | ---: |
| Header wordmark | 120.89 × 31.69 px |
| Footer Privacy | 52.11 × 21.61 px |
| Footer Terms | 42.39 × 21.61 px |
| Privacy request email | 161.77 × 19 px |

The footer links repeat on every public route. Game buttons, touch controls,
and both demo banner controls meet the minimum. Increase the links' clickable
padding or minimum size without reducing their spacing.

Evidence: `/work/.evidence/codekick-review-1/live-touch-targets.json`.

## First screen

Fresh desktop (1440 × 900) and phone (393 × 727) profiles showed the game
before scrolling.

| Check | Live result |
| --- | --- |
| Job | **Play a private 2v2 football match** |
| Audience | Two to four friends who want a quick match without accounts or downloads. |
| First action | **Try it with sample data**; the note says it starts a 28-second sample match. |
| Desktop field | Starts at y=461.5 px in the 900 px viewport. |
| Phone field | Starts at y=526.73 px in the 727 px viewport. |

The title is **Codekick — Play private 2v2 football**. Both profiles had one
H1, the field was visible, and no console or page error occurred.

## Game and demo run

A fresh live desktop session entered the sample from the first-screen action.
It started with four players, Sun 2–Tide 1, 0:28, Crosswind, and the persistent
label **Demo — sample data, nothing is saved**. Keyboard movement changed the
captain position and Pass changed possession. The real timer reached zero
without the finish shortcut and showed **Sun wins**, final score 2–1.

Reset demo restored Sun 2–Tide 1 at 0:28. Start for real returned to the 0–0,
4:00 local match. Both `demo:codekick:*` keys were absent afterward, while a
fixed normal-storage sentinel remained unchanged.

The phone sample responded to touch movement and measured 60.003 fps across
120 frames. The system reduced-motion preference selected reduced field
motion. No service worker is registered, and Codekick makes no offline or
update claim.

Evidence:

- `/work/.evidence/codekick-review-1/live-browser-flow.json`
- `/work/.evidence/codekick-review-1/live-desktop-first.png`
- `/work/.evidence/codekick-review-1/live-desktop-active.png`
- `/work/.evidence/codekick-review-1/live-desktop-timed-end.png`
- `/work/.evidence/codekick-review-1/live-phone-first.png`
- `/work/.evidence/codekick-review-1/live-phone-demo.png`

## Declared claims

Every command in `.factory/claims.json` ran separately from a fresh clone at
repository head. Every command passed, and every ID occurs in exactly one
`@claim:<id>` tag.

| Claim | Result |
| --- | --- |
| `demo-end-screen` | PASS |
| `restart-reset` | PASS |
| `settings-persist` | PASS |
| `demo-isolation` | PASS |
| `local-demo-data` | PASS |
| `free-local-match` | PASS |
| `four-minute-round` | PASS |
| `match-recovery` | PASS |
| `keyboard-controls` | PASS |
| `touch-controls` | PASS |
| `phone-frame-rate` | PASS |
| `sample-duration` | PASS |
| `practice-2v2` | PASS |
| `ball-actions-combo` | PASS |
| `second-player-controls` | PASS |
| `stadium-rules` | PASS |
| `pause-recovery` | PASS |
| `input-settings` | PASS |
| `assist-mode` | PASS |
| `fixed-timestep` | PASS |
| `privacy-all-routes` | PASS |
| `private-room` | PASS |
| `online-end-screen` | PASS |
| `online-four-minute` | PASS |
| `room-persistence` | PASS |
| `room-rate-limit` | PASS |
| `room-health` | PASS |

The landing page, public routes, demo guide, and README were cross-checked
against the claim list. No public claim is missing a declared test. The
untested public claim count is **0**.

Evidence: `/work/.evidence/codekick-review-1/claims-summary.tsv` and the 27
individual `claim-*.log` files beside it.

## Multiplayer and room service

- Four independent live browser contexts joined one room. Both captured
  clients showed 4 of 4 connected, with separate Sun and Tide captain roles.
- The host's movement changed the observer's authoritative Sun position from
  x=330 to x=444. Reload reconnected the host. A fifth join was rejected.
- A valid token for one room could not open another valid room and received no
  state, proving room isolation at the socket boundary.
- A room created before restarting only the active
  `sf-codekick-realtime--0000005` revision accepted its Tide player after the
  restart. Live health returned HTTP 200 with SQLite status.
- On one confirmed reused HTTP/1.1 connection after a clean one-minute window,
  requests 1–12 returned 201. Request 13 returned 429 with `Retry-After: 60`.
- The clean persistence claim reopened SQLite, moved a restored room beyond
  six hours, ran cleanup, proved memory and database removal, rejected a join,
  and proved the room stayed absent after another restart.

Evidence: `/work/.evidence/codekick-review-1/live-multiplayer.json`,
`live-room-host.png`, `live-room-guest.png`, `live-health.json`,
`live-rate-limit.json`, and `claim-room-persistence.log`.

## Accessibility, routes, privacy, and recovery

- Axe found zero violations on Home, Demo, How to play, Privacy, and Terms.
- Each public route returned 200 and had a distinct title, one H1, one main,
  one header, and one footer.
- Keyboard use moved focus through the skip link into main content, opened and
  closed Settings with focus return, and focused the new H1 after navigation.
  The focused skip link had a visible 3 px yellow outline.
- At 320 px with 200% text, document width stayed 320 px. Reset demo and Start
  for real measured 132.33 × 59.19 and 143.11 × 59.19 px.
- A short room code announced the six-character requirement. A missing room
  explained how to recover. Damaged match and settings storage recovered to a
  4:00 match and the default F pass key.
- The designed unknown route returned deliberate HTTP 404 with its own title,
  H1, and return link. This expected 404 is not a defect.
- Privacy provides `privacy@sociobot.in`. Normal pages and the complete demo
  flow requested only the Codekick origin. No analytics, ads, remote fonts,
  third-party assets, or runtime AI calls were observed.
- Live responses include CSP with `frame-ancestors 'none'`, Permissions Policy,
  nosniff, Referrer Policy, and HSTS.

F1 is the remaining manual accessibility failure outside the zero-violation
axe result.

## Clean build and performance

- `npm ci`: passed with zero audit vulnerabilities.
- `npm test`: passed 4 engine tests, 5 Rust service tests, and 51 browser
  checks. Three browser-profile skips were expected.
- `npm run build`: passed and produced `dist/`.
- Production JavaScript: 40.30 KB raw / 12.45 KB gzip.
- Production CSS: 12.12 KB raw / 3.50 KB gzip.
- `npm run verify:url -- http://127.0.0.1:4173`: passed.
- `npm run verify:url -- https://codekick.sociobot.in`: passed.
- Live mobile Lighthouse: performance 100, accessibility 100, best practices
  100, SEO 100; FCP 903 ms, LCP 947 ms, TBT 37 ms, CLS 0.

Evidence: `/work/.evidence/codekick-review-1/full-test.log`, `build.log`,
`dist-files.txt`, `verify-local.log`, `verify-live.log`, and
`lighthouse-live.json`.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1 F1 — room-code multiplayer absent | Resolved. Clean four-client claim and fresh live independent clients, shared movement, reconnect, isolation, capacity, restart, health, and rate limit checks pass. |
| Verification 1 F2 — no player-two phone controls | Resolved. The dedicated desktop and phone claim passes move, pass, and shoot outcomes. |
| Verification 1 F3 — 200% text overflow | Resolved. Fresh live 320 px / 200% measurement has no horizontal overflow. |
| Verification 1 F4 — demo controls below 44 px | Resolved. Both are 59.19 px high in the strict live measurement. F1 identifies different undersized links. |
| Verification 1 F5 — live security policies missing | Resolved. CSP, Permissions Policy, nosniff, Referrer Policy, and HSTS are live. |
| Verification 1 F6 — eight untested claim groups | Resolved. All groups are declared, tagged once, and pass separately. |
| Verification 1 F7 — Pause does nothing at kickoff | Resolved. The dedicated claim pauses and resumes at kickoff and active play. |
| Verification 1 F8 — unknown routes return 200 | Resolved. The styled unknown route returns HTTP 404. |
| Verification 1 F9 — privacy request path is not actionable | Resolved. The Privacy page links directly to the request email address. |
| Verification 2 F1 — demo storage recreated after exit | Resolved. Both demo keys are absent after Start for real and normal data is unchanged. |
| Verification 2 F2 — expiry outcome untested | Resolved. The clean claim proves expiry cleanup, rejected join, SQLite deletion, and absence after restart. |
| Verification 2 F3 — Demo axe landmark violation | Resolved. Fresh live Demo axe result has zero violations. |
| Verification 2 F4 — four server claim tags missing | Resolved. Every one of the 27 IDs occurs in exactly one claim tag. |

The four pre-existing modified `graphify-out/` files were not changed, staged,
or included in this review.
