# Verify private 2v2 football matches — Codekick verification 4

## Verdict

**PASS — 0 findings and 0 untested public claims.**

- Implementation reviewed: `480267d62cce50848043d7e0edc7676b834cf996`.
- Documentation baseline reviewed: `7eb6ad7f11b9ba60936eb7ce498d1cfe6355cfe0`.
- Repository head at verification start: `ec3bf07ec803ca37a56bb112b3c2102fdade18ed`.
  The later commits contain reports or Graphify output and do not change the
  deployed product image.
- Live URL: <https://codekick.sociobot.in>.
- Verified on 2026-09-06 UTC.

The live HTML, JavaScript, and CSS are byte-identical to the detached clean
production build at the implementation SHA. Their SHA-256 values are
`574e7d0f…`, `62c7842f…`, and `87d0c389…` respectively.

## First screen

Fresh 1440 × 900 desktop and 393 × 727 Pixel 5 contexts showed the game before
scrolling.

| Check | Live result |
| --- | --- |
| Job | **Play a private 2v2 football match** |
| Audience | Two to four friends who want a quick match without accounts or downloads. |
| First action | **Try it with sample data**; the adjacent note says it starts a 28-second sample match. |
| Desktop field | Starts at y=461.5 CSS px in the 900 px viewport. |
| Phone field | Starts at y=539.05 CSS px in the 727 px viewport. |

Both contexts had the route title **Codekick — Play private 2v2 football**, one
H1, one main landmark, and `lang="en"`.

Evidence: `/work/.evidence/codekick-verify-4/live-desktop-first.png`,
`live-phone-first.png`, and `live-browser-qa.json`.

## Deterministic game and demo run

The first-screen action opened the live sample in one click. It immediately
showed four populated players, Sun 2–Tide 1, 0:28, Crosswind, possession, and a
visible 1.9-second combo. The persistent label read **Demo — sample data,
nothing is saved**.

Keyboard movement changed the captain position and Pass changed play. Without
using the finish shortcut, the actual timer reached 0:00 and showed **Sun
wins**, final score Sun 2–Tide 1. The end screen offered a one-tap rematch.
`Reset demo` restored 2–1 and 0:28. `Start for real` removed both demo storage
keys, preserved a fixed normal-storage sentinel, and opened a separate 0–0,
4:00 match. Every request made during the demo stayed on the Codekick origin.

The clean deterministic tests also exercised a full-length end state, pass, shot,
goal, all three stadium rules, restart reset, pause at kickoff and during play,
assist mode, remapped keys, shared-screen player two, and persistent settings.

Evidence: `/work/.evidence/codekick-verify-4/live-desktop-demo-active.png`,
`live-desktop-timed-end.png`, `live-browser-qa.json`, and the individual claim
logs.

## Declared claims

All 27 commands in `.factory/claims.json` ran separately after `npm ci` in a
detached clean checkout at the implementation SHA. Every command passed. Each
claim ID appears in exactly one `@claim:<id>` test tag.

| Claim | Result | Observed outcome |
| --- | --- | --- |
| `demo-end-screen` | PASS | Sample reached a result screen. |
| `restart-reset` | PASS | Score reset to 0–0 and the next rule loaded. |
| `settings-persist` | PASS | Settings survived reload. |
| `demo-isolation` | PASS | Demo keys were removed; normal data did not change. |
| `local-demo-data` | PASS | Complete sample requests stayed same-origin. |
| `free-local-match` | PASS | Local two-player play needed no account, payment, or download. |
| `four-minute-round` | PASS | Fresh local clock began at 4:00 and counted down. |
| `match-recovery` | PASS | Unfinished local play returned after reload. |
| `keyboard-controls` | PASS | Keyboard input changed the active player position. |
| `touch-controls` | PASS | Pixel 5 touch input changed the player position. |
| `phone-frame-rate` | PASS | Live 120-frame sample measured 60.01 fps. |
| `sample-duration` | PASS | Sample began at 0:28 and counted down. |
| `practice-2v2` | PASS | Four players rendered and bots moved. |
| `ball-actions-combo` | PASS | Combo, pass, shot, and score outcomes worked. |
| `second-player-controls` | PASS | Player two moved, passed, and shot on keyboard and touch. |
| `stadium-rules` | PASS | Crosswind, Spring turf, and Pinched goals rotated. |
| `pause-recovery` | PASS | Kickoff and active play paused and resumed. |
| `input-settings` | PASS | Reduced motion and remapped pass/shot keys persisted. |
| `assist-mode` | PASS | Assist mode measurably reduced movement speed. |
| `fixed-timestep` | PASS | Repeated fixed input frames serialized identically. |
| `privacy-all-routes` | PASS | Public routes loaded no third-party resources or tracking. |
| `private-room` | PASS | Four independent clients shared play and enforced capacity. |
| `online-end-screen` | PASS | Independent test clients reached a shared end and rematch. |
| `online-four-minute` | PASS | Production authoritative state starts at 240 seconds and 0–0. |
| `room-persistence` | PASS | SQLite restart and six-hour expiry outcomes passed. |
| `room-rate-limit` | PASS | Request 13 returned 429 with `Retry-After: 60`. |
| `room-health` | PASS | Health verified SQLite and returned 200. |

The landing page, How to play, Privacy, Terms, demo guide, and README were
cross-checked against the claim list. No claim-like public sentence is
unlisted or only partially tested.

Evidence: `/work/.evidence/codekick-verify-4/claims-summary.tsv` and the 27
`claim-*.log` files in the same directory.

## Multiplayer and backend

- Four independent live browser contexts joined one private room and received
  the four separate roles. Both observed clients reported 4 of 4 connected.
- The host's authoritative Sun position changed from x=330 to x=444 in the
  observer. Reload reconnected the host to the same role and room. A fifth
  independent client was rejected because the room was full.
- A separate live WebSocket isolation check accepted a valid token and
  delivered 50 state messages for its own room. The same token against a
  different valid room did not open and received zero state messages. No token
  is recorded in the evidence.
- The fresh persistence claim created a temporary SQLite room, reopened the
  service state, moved the last action past six hours, ran cleanup, and proved
  removal from memory and SQLite, rejected join, and absence after another
  restart. The realtime implementation is unchanged from the earlier live
  service-restart proof.
- Live `/health` returned 200 with `{"status":"ok","storage":"sqlite"}`.
- After a clean one-minute window, one reused live connection received twelve
  HTTP 201 responses. Request 13 returned HTTP 429 with `Retry-After: 60`.

Evidence: `/work/.evidence/codekick-verify-4/live-browser-qa.json`,
`live-room-host.png`, `live-room-observer.png`, `live-tenant-isolation.json`,
`live-health.json`, `live-rate-limit.json`, and
`claim-room-persistence.log`.

## Accessibility, routes, privacy, and recovery

- Playwright Axe found zero violations on Home, Demo, How to play, Privacy,
  and Terms. Live Lighthouse accessibility scored 100.
- Tab exposed a 46.38 px-high skip link with a 3 px yellow outline. Enter moved
  focus to `main`. The Settings dialog focused Close and returned focus to
  Settings. SPA navigation focused the new route H1 and announced its title.
- The system reduced-motion preference matched. The setting and CSS remove
  extended field motion. There is no flashing, audio, or screen shake.
- Every reviewed live phone header, footer, privacy-email, and standalone 404
  link target measured at least 44 × 44 CSS px. The minimum observed dimension
  was 44 px.
- At 320 px and 200% text, document and viewport widths both remained 320 px.
  Demo controls measured 59.19 px high. Zoom is not disabled.
- Home, Demo, How to play, Privacy, and Terms return 200 with distinct titles,
  one H1, `header`, `main`, and `footer`. All internal links work. The privacy
  request address is an actionable `mailto:` link.
- An unknown route deliberately returns HTTP 404 with the designed Codekick
  page, its own title and H1, and a return link. The browser's expected 404
  console message is not a defect. There were no unexpected console errors,
  page errors, or failed requests.
- A short room code sets `aria-invalid` and explains the six-character rule.
  A missing room says to check the code. Damaged match and settings JSON recover
  to a fresh 4:00 match and the default F pass key.
- Live responses include CSP with `frame-ancestors 'none'`, HSTS, Permissions
  Policy, nosniff, and Referrer Policy. No analytics, ads, remote fonts,
  third-party game assets, or runtime AI calls were observed.
- Codekick promises neither offline play nor update caching and registers no
  service worker, so offline/update behavior is not an acceptance claim.

Evidence: `/work/.evidence/codekick-verify-4/live-browser-qa.json`,
`live-focus-offline.json`, `live-invalid-recovery.json`, `live-headers.txt`,
`live-routes-http.txt`, and `verify-live.log`.

## Build and performance

- Documented prerequisites were present: Node 22.23.2, npm 10.9.8, and Rust
  1.98.0. The README requires Node 20 or later and Rust 1.90 or later.
- Clean `npm ci` passed with zero audit vulnerabilities.
- `npm test` passed 4 deterministic engine tests, 5 Rust/SQLite service tests,
  and 53 browser checks. Three profile copies skipped as designed: desktop
  copies of phone-only touch/frame-rate checks and the phone copy of the
  desktop four-client room check.
- `npm run build` passed and produced `dist/`.
- JavaScript is 40.32 KB raw / 12.46 KB gzip. CSS is 12.26 KB raw / 3.52 KB
  gzip. Both remain well below the supplied budgets.
- Live mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 1.0 s, LCP 1.0 s, total blocking time 30 ms,
  and CLS 0.
- `npm run verify:url` passed locally and live for title, language, main, alt
  text, and console checks.

Evidence: `/work/.evidence/codekick-verify-4/npm-ci-clean.log`,
`full-test.log`, `build.log`, `dist-files.txt`, `lighthouse-live.json`,
`lighthouse-summary.json`, `verify-local.log`, and `verify-live.log`.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1 F1 — room-code multiplayer absent | Resolved. Fresh clean four-client coverage and fresh live independent clients, shared movement, reconnect, capacity, isolation, health, persistence, and rate-limit checks pass. |
| Verification 1 F2 — no player-two phone controls | Resolved. Clean desktop and phone outcomes cover player-two move, pass, and shot. |
| Verification 1 F3 — 200% text overflow | Resolved. Fresh live 320 px / 200% measurement has no horizontal overflow. |
| Verification 1 F4 — demo controls below 44 px | Resolved. Both fresh live controls measure 59.19 px high. |
| Verification 1 F5 — live security policies missing | Resolved. Fresh headers show CSP, Permissions Policy, HSTS, nosniff, and Referrer Policy. |
| Verification 1 F6 — eight untested claim groups | Resolved. All groups are declared, tagged once, and pass separately. |
| Verification 1 F7 — Pause did nothing at kickoff | Resolved. Dedicated kickoff and active-play pause outcomes pass. |
| Verification 1 F8 — unknown routes returned 200 | Resolved. A fresh unknown live route returns the designed page with HTTP 404. |
| Verification 1 F9 — privacy request path not actionable | Resolved. Fresh live Privacy links directly to the request email address. |
| Verification 2 F1 — demo storage recreated after exit | Resolved. Fresh live exit leaves both demo keys absent and normal data unchanged. |
| Verification 2 F2 — six-hour expiry outcome untested | Resolved. The fresh claim proves cleanup, rejected join, SQLite deletion, and absence after restart. |
| Verification 2 F3 — Demo axe landmark violation | Resolved. Fresh live Demo Axe result has zero violations. |
| Verification 2 F4 — four server claim tags missing | Resolved. Every one of the 27 IDs occurs in exactly one claim tag. |
| Review 1 F1 — phone links below 44 × 44 px | Resolved. Fresh rendered live measurements cover every cited shared link and the standalone 404; all meet 44 × 44 px. |

Verification 3 already reported zero findings. This fresh verification found
no regression or new issue. The pre-existing modified `graphify-out/` files
were preserved, not inspected as product input, and are not included in the
verification commit.
