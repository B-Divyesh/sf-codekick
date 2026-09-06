# Review private 2v2 football matches — Codekick review 2

## Verdict

**PASS — 0 findings and 0 untested public claims.**

- Implementation reviewed: `480267d62cce50848043d7e0edc7676b834cf996`.
- Documentation baseline reviewed: `7222801804e038fcd5146222436afc47646f0a8f`.
- Repository head at review start: `8b6037c0a27bbbc711dc0764e22604f19280ca6f`.
  The commits after the implementation contain reports or Graphify output and
  do not change the product image.
- Live URL: <https://codekick.sociobot.in>.
- Reviewed on 2026-09-06 UTC.

The live HTML, JavaScript, and CSS are byte-identical to the detached clean
production build. Their SHA-256 values are `574e7d0f…`, `62c7842f…`, and
`87d0c389…`.

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

Both contexts had the route title **Codekick — Play private 2v2 football**,
one H1, one main landmark, and `lang="en"`.

Evidence: `/work/.evidence/codekick-review-2/live-desktop-first.png`,
`live-phone-first.png`, and `live-browser-qa.json`.

## Complete game and demo run

The first-screen sample action entered the live demo in one click. It showed
four players, Sun 2–Tide 1, 0:28, Crosswind, possession, and a 1.9-second combo.
The persistent label read **Demo — sample data, nothing is saved**.

Keyboard and phone touch movement changed the active player. Fresh live checks
also passed the ball, shot, and scored with both local players. Without the finish
shortcut, the actual sample clock reached 0:00 and showed **Sun wins**, final
score Sun 2–Tide 1. The end screen offered **Play another match**.

**Reset demo** restored Sun 2–Tide 1 at 0:28 with Crosswind. **Start for real**
removed both `demo:codekick:*` keys, preserved a fixed normal-storage sentinel,
and opened a separate Sun 0–Tide 0 match at 4:00. Demo requests stayed on the
Codekick origin.

Fresh live action checks also proved pause at kickoff, persistent reduced
motion and remapped keys, player-two movement/pass/shot, invite-link copying,
and the Crosswind → Spring turf → Pinched goals → Crosswind rotation. A
synthetic browser visibility change kept the sample clock at 0:28 while hidden.

Evidence: `/work/.evidence/codekick-review-2/live-desktop-demo-active.png`,
`live-desktop-natural-end.png`, `live-actions.json`,
`live-navigation-recovery.json`, and `live-browser-qa.json`.

## Declared claims

All 27 commands in `.factory/claims.json` ran separately after `npm ci` in a
detached clean checkout at the documentation baseline. Every command passed.
The product files at that SHA are unchanged from the implementation candidate.
Each claim ID occurs in exactly one `@claim:<id>` tag.

| Claim | Result | Observable outcome |
| --- | --- | --- |
| `demo-end-screen` | PASS | The sample reached a result screen. |
| `restart-reset` | PASS | Score reset to 0–0 and the next rule loaded. |
| `settings-persist` | PASS | Settings survived reload. |
| `demo-isolation` | PASS | Demo keys were removed and normal data did not change. |
| `local-demo-data` | PASS | Complete sample requests stayed same-origin. |
| `free-local-match` | PASS | Local two-player play needed no account, payment, or download. |
| `four-minute-round` | PASS | A fresh local clock began at 4:00 and counted down. |
| `match-recovery` | PASS | An unfinished local match returned after reload. |
| `keyboard-controls` | PASS | Keyboard input changed the active player position. |
| `touch-controls` | PASS | Pixel 5 touch input changed the active player position. |
| `phone-frame-rate` | PASS | The 120-frame phone sample met the 55 fps threshold. |
| `sample-duration` | PASS | The sample began at 0:28 and counted down. |
| `practice-2v2` | PASS | Four players rendered and bots moved. |
| `ball-actions-combo` | PASS | Combo, pass, shot, and score outcomes worked. |
| `second-player-controls` | PASS | Player two moved, passed, and shot on keyboard and touch. |
| `stadium-rules` | PASS | All three stadium rules rotated and returned to Crosswind. |
| `pause-recovery` | PASS | Kickoff and active play paused and resumed. |
| `input-settings` | PASS | Reduced motion and remapped pass/shot keys persisted. |
| `assist-mode` | PASS | Assist mode measurably reduced movement speed. |
| `fixed-timestep` | PASS | Repeated fixed input frames serialized identically. |
| `privacy-all-routes` | PASS | Public routes loaded no third-party resources or tracking. |
| `private-room` | PASS | Four independent clients shared play and enforced capacity. |
| `online-end-screen` | PASS | Independent clients reached a shared end and rematch. |
| `online-four-minute` | PASS | Authoritative state starts at 240 seconds and 0–0. |
| `room-persistence` | PASS | SQLite restart and six-hour expiry outcomes passed. |
| `room-rate-limit` | PASS | Excess creation returned 429 with `Retry-After: 60`. |
| `room-health` | PASS | Health checked SQLite and returned 200. |

The landing page, How to play, Privacy, Terms, demo guide, and README were
cross-checked against the claim list. No public claim is missing, false,
partial, or tested only by the presence of a control. The untested public claim
count is **0**.

Evidence: `/work/.evidence/codekick-review-2/claims-summary.json`,
`claim-tag-counts.tsv`, and the 27 individual logs under
`/work/.evidence/codekick-review-2/claims/`.

## Multiplayer and backend

- Four independent live browser contexts joined one private room and received
  Sun captain, Tide captain, Sun teammate, and Tide teammate roles.
- Both observed clients showed 4 of 4 connected. The host’s authoritative Sun
  position changed from x=330 to x=436 in the observer.
- Reload reconnected the host to the same room and role. A fifth independent
  client was rejected because the room already had four players.
- A valid token opened its own room and received state. The same token did not
  open another valid room and received zero state messages. No token is stored
  in the evidence.
- The fresh persistence claim wrote a room to temporary SQLite, reopened it,
  proved the tick and role survived, expired it after six hours, removed it
  from memory and SQLite, rejected a later join, and proved it stayed absent
  after another reopen.
- Live `/health` returned 200 with `{"status":"ok","storage":"sqlite"}`.
- After a clean one-minute window, one reused live connection received twelve
  HTTP 201 responses. Request 13 returned HTTP 429 with `Retry-After: 60`.

Evidence: `/work/.evidence/codekick-review-2/live-room-host.png`,
`live-room-observer.png`, `live-browser-qa.json`, `live-backend.json`, and
`claims/claim-25-room-persistence.log`.

## Accessibility, routes, privacy, and recovery

- Playwright Axe found zero violations on Home, Demo, How to play, Privacy,
  Terms, and the live designed 404. The single dark pitch treatment is painted
  explicitly; Axe’s contrast checks pass.
- Tab exposed the skip link with a 3 px yellow focus outline. Enter focused
  `main`. Settings focused Close and returned focus to Settings. Route changes,
  Back, and Forward focused the new H1.
- The system reduced-motion preference matched. The in-game setting persisted.
  There is no flashing, audio, or screen shake.
- Seventy-three visible phone links, buttons, inputs, and selects across public
  pages, the game, Settings, and the standalone 404 were measured. None was
  smaller than 44 × 44 CSS px.
- At 320 px and 200% text, document and viewport widths both remained 320 px.
  Demo controls measured 59.19 px high. Zoom is not disabled.
- Home, Demo, How to play, Privacy, and Terms returned 200 with distinct titles,
  one H1, header, main, and footer. Internal links, `robots.txt`, `sitemap.xml`,
  and the social card returned 200. The privacy address is an actionable
  `mailto:` link.
- An unknown route deliberately returned HTTP 404 with the designed Codekick
  page, its own title and H1, and a return link. The two observed 404 console
  messages came from this deliberate route and the deliberate missing-room
  request; they are expected, not defects. No unexpected console or page error
  occurred.
- A short room code set `aria-invalid` and explained the six-character rule. A
  missing room said to check the code. Damaged match and settings JSON recovered
  to a 4:00 match and the default F pass key.
- Live responses include CSP with `frame-ancestors 'none'`, HSTS, Permissions
  Policy, nosniff, and Referrer Policy. Demo and public-page requests used no
  analytics, ads, remote fonts, third-party game assets, or runtime AI.
- Codekick promises neither offline play nor update caching and registers no
  service worker. Offline/update behavior is therefore not an untested claim.

Evidence: `/work/.evidence/codekick-review-2/live-browser-qa.json`,
`live-touch-targets.json`, `live-navigation-recovery.json`,
`live-headers.txt`, `live-route-status.txt`, and `verify-live.log`.

## Clean build and performance

- Documented prerequisites were present: Node 22.23.2, npm 10.9.8, Rust 1.98.0,
  and Cargo 1.98.0. The README requires Node 20 or later and Rust 1.90 or later.
- `npm ci` passed with zero audit vulnerabilities.
- `npm test` passed 4 engine tests, 5 Rust/SQLite tests, and 53 browser checks.
  Three profile copies skipped as designed: desktop copies of phone-only touch
  and frame-rate checks, and the phone copy of the desktop four-client test.
- `npm run build` passed and produced `dist/`.
- JavaScript is 40.32 KB raw / 12.46 KB gzip. CSS is 12.26 KB raw / 3.53 KB
  gzip. There are no downloaded font or hero-image files.
- Live mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 930 ms, LCP 967 ms, total blocking time 12 ms,
  and CLS 0.
- The fresh live Pixel 5 run measured 60.003 fps across 120 frames.
- `npm run verify:url` passed locally and live for title, language, main, alt
  text, and unexpected console errors.

Evidence: `/work/.evidence/codekick-review-2/npm-ci-clean.log`,
`full-test.log`, `build.log`, `dist-files.txt`, `artifact-sha256.txt`,
`lighthouse-live.json`, `lighthouse-summary.json`, `verify-local.log`, and
`verify-live.log`.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1 F1 — room-code multiplayer absent | Resolved. Fresh clean and live four-client checks cover roles, shared authoritative movement, reconnect, capacity, isolation, end, rematch, health, persistence, and rate limiting. |
| Verification 1 F2 — no player-two phone controls | Resolved. Fresh desktop and phone outcomes cover player-two move, pass, and shot. |
| Verification 1 F3 — 200% text overflow | Resolved. Fresh live 320 px / 200% measurement has no horizontal overflow. |
| Verification 1 F4 — demo controls below 44 px | Resolved. Both fresh live controls are 59.19 px high. |
| Verification 1 F5 — live security policies missing | Resolved. Fresh headers show CSP, Permissions Policy, HSTS, nosniff, and Referrer Policy. |
| Verification 1 F6 — eight untested claim groups | Resolved. All groups are declared, tagged once, and pass separately. |
| Verification 1 F7 — Pause did nothing at kickoff | Resolved. Dedicated clean and fresh live kickoff-pause outcomes pass. |
| Verification 1 F8 — unknown routes returned 200 | Resolved. A fresh unknown live route returns the designed page with HTTP 404. |
| Verification 1 F9 — privacy request path not actionable | Resolved. Fresh live Privacy links directly to the request email address. |
| Verification 2 F1 — demo storage recreated after exit | Resolved. Fresh live exit leaves both demo keys absent and normal data unchanged. |
| Verification 2 F2 — six-hour expiry outcome untested | Resolved. The fresh claim proves cleanup, rejected join, SQLite deletion, and absence after restart. |
| Verification 2 F3 — Demo axe landmark violation | Resolved. Fresh live Demo Axe result has zero violations. |
| Verification 2 F4 — four server claim tags missing | Resolved. Every one of the 27 IDs occurs in exactly one claim tag. |
| Review 1 F1 — phone links below 44 × 44 px | Resolved. Seventy-three fresh live interactive targets were measured with zero failures, including every cited link and the standalone 404. |

Verification 3 and Verification 4 reported no findings. This fresh review found
no regression or new finding. No product code, service, deployment,
infrastructure, or product data was changed. The pre-existing modified
`graphify-out/` files were preserved, not staged, and are not included in the
review commit.
