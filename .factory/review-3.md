# Review private 2v2 football matches — Codekick review 3

## Verdict

**PASS — 0 findings and 0 untested public claims.**

- Implementation reviewed: `480267d62cce50848043d7e0edc7676b834cf996`.
- Documentation baseline reviewed: `cb8992b754d56f670a6e340a5c031759e78e5f84`.
- Repository head at review start: `45b4d304319c6113993bdfa9b7c7e3306101b871`.
  Later commits change only factory reports or Graphify output and do not change
  the product image.
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
one H1, one main landmark, `lang="en"`, and no unexpected console or page
error.

Evidence: `/work/.evidence/codekick-review-3/live-desktop-first.png`,
`live-phone-first.png`, and `live-browser-qa.json`.

## Complete game and demo run

The first-screen action opened the live sample in one click. It showed four
players, Sun 2–Tide 1, 0:28, Crosswind, possession, and a visible combo. The
persistent label read **Demo — sample data, nothing is saved**.

Keyboard and phone touch moved their players. Fresh live checks also passed the
ball, shot, and scored with both local players. The real sample timer reached 0:00
without the finish shortcut on both desktop and phone. Both runs showed
**Sun wins** and **Final score: Sun 2, Tide 1**. The end screen offered a
one-tap rematch. The desktop and phone runs were recorded.

**Play another match** reset the score to 0–0 and selected Spring turf. Three
quick end/rematch cycles showed Crosswind → Spring turf → Pinched goals →
Crosswind. **Reset demo** restored Sun 2–Tide 1, 0:28, and Crosswind.
**Start for real** removed both `demo:codekick:*` keys, preserved a fixed
normal-storage sentinel, and opened a separate 0–0, 4:00 match.

Exact isolated live cases also passed pause during kickoff and active play,
unfinished-match reload recovery, persistent reduced motion and remapped keys,
player-two move/pass/shot on desktop and phone, and pass/shot/goal outcomes.

Evidence:

- `/work/.evidence/codekick-review-3/live-desktop-demo-active.png`
- `/work/.evidence/codekick-review-3/live-desktop-natural-end.png`
- `/work/.evidence/codekick-review-3/live-phone-demo-active.png`
- `/work/.evidence/codekick-review-3/live-phone-natural-end.png`
- `/work/.evidence/codekick-review-3/video-desktop/2a181832e2d0b47741dec07b3aa26e13.webm`
- `/work/.evidence/codekick-review-3/video-phone/1c27436dc65a01c9367bbe035dc5563e.webm`
- `/work/.evidence/codekick-review-3/live-actions.json`
- `/work/.evidence/codekick-review-3/live-exact-claims.log`

An exploratory combined-state script reused settings and match state between
scenarios, so three of its assertions were invalid. The repository's exact
tests were then run against live in fresh contexts; all 10 relevant desktop and
phone cases passed. Those isolated results are the evidence used here.

## Declared claims

All 27 commands in `.factory/claims.json` ran separately after `npm ci` in a
detached clean checkout at repository head. Every command passed. Product files
at that head are unchanged from the implementation candidate. Every claim ID
appears in exactly one `@claim:<id>` tag.

| Claim | Result | Observable outcome |
| --- | --- | --- |
| `demo-end-screen` | PASS | The sample reached a result screen. |
| `restart-reset` | PASS | Score reset to 0–0 and the next rule loaded. |
| `settings-persist` | PASS | Settings survived reload. |
| `demo-isolation` | PASS | Demo keys were removed and normal data did not change. |
| `local-demo-data` | PASS | Complete sample requests stayed same-origin. |
| `free-local-match` | PASS | Local play needed no account, payment, or download. |
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
cross-checked against the list. No public claim is missing, false, partial, or
tested only by the presence of a control. The untested public claim count is
**0**.

Evidence: `/work/.evidence/codekick-review-3/claims-summary.tsv`,
`claim-tag-counts.tsv`, and the 27 `claim-*.log` files in the same directory.

## Multiplayer and backend

- Four independent live browser contexts joined one private room and received
  Sun captain, Tide captain, Sun teammate, and Tide teammate roles.
- Both observed clients showed 4 of 4 connected. The host's authoritative Sun
  position changed from x=330 to x=444 in the observer.
- Reload reconnected the host to the same room and role. A fifth independent
  client was rejected because the room already had four players.
- A valid token received 37 state messages from its own room. The same token
  did not open another valid room and received no state, proving room isolation.
  No room code or token is retained in evidence.
- A room created before restarting only the active
  `sf-codekick-realtime--0000005` revision accepted the original host token
  and a new player after the replacement settled to one running replica.
- The clean restart check also stopped and restarted a separate service process
  over the same temporary SQLite file. The pre-restart room remained joinable.
- The persistence claim additionally expired a room after six hours, removed
  it from memory and SQLite, rejected a later join, and proved it stayed absent
  after another reopen.
- Live `/health` returned 200 with `{"status":"ok","storage":"sqlite"}`.
- On one reused live HTTP/1.1 connection after a clean window, requests 1–12
  returned 201. Request 13 returned 429 with `Retry-After: 60`.

Evidence: `/work/.evidence/codekick-review-3/live-room-host.png`,
`live-room-observer.png`, `live-backend-isolation.json`,
`live-restart-persistence.json`, `local-process-restart.txt`,
`live-health.json`, and `live-rate-limit.json`.

## Accessibility, routes, privacy, and recovery

- Playwright Axe found zero violations on Home, Demo, How to play, Privacy,
  Terms, and the designed live 404. Lighthouse accessibility scored 100.
- Tab exposed the skip link with a visible focus outline and moved focus into
  main content. Settings focused Close and returned focus to Settings. SPA
  navigation, Back, and Forward focused the route H1.
- Seventy visible phone links, buttons, fields, and selects across the game and
  public routes measured at least 44 × 44 CSS px. The minimum was 44 px.
- The exact 320 px / 200% text regression test passed on live. There was no
  horizontal overflow, and both demo banner actions exceeded 44 × 44 px.
- System reduced motion selected reduced field motion. The setting persisted.
  There is no flashing, audio, or screen shake.
- Home, Demo, How to play, Privacy, Terms, and `/404.html` returned 200 with
  distinct titles and required structure. An unknown URL deliberately returned
  HTTP 404 with the designed page, its own title and H1, and a return link.
- All crawled links, `robots.txt`, `sitemap.xml`, the social card, and icons
  returned 200. The privacy address is an actionable `mailto:` link.
- A short room code set `aria-invalid` and explained the six-character rule.
  A missing room explained how to recover. Damaged match and settings JSON
  recovered to a 4:00 match and the default F pass key.
- Public pages and the full demo used only the Codekick site origin. Room play
  contacted only the product-owned realtime origin. No analytics, ads, remote
  fonts, third-party game assets, or runtime AI calls were observed.
- Live responses include CSP with `frame-ancestors 'none'`, HSTS, Permissions
  Policy, nosniff, and Referrer Policy.
- Codekick promises neither offline play nor update caching and registers no
  service worker. Offline/update behavior is not an acceptance claim.

The two desktop console 404 messages came from the deliberate unknown page and
the deliberate missing-room request. Both expected 404 outcomes were checked;
they are not defects.

Evidence: `/work/.evidence/codekick-review-3/live-browser-qa.json`,
`live-regressions-exact.log`, `live-route-status.tsv`,
`live-home-headers.txt`, `robots.txt`, `sitemap.xml`, `verify-live.log`, and
`live-exact-claims.log`.

## Clean build and performance

- Documented prerequisites were present: Node 22.23.2, npm 10.9.8, Rust 1.98.0,
  and Cargo 1.98.0. The README requires Node 20 or later and Rust 1.90 or later.
- `npm ci` passed with zero audit vulnerabilities.
- `npm test` passed 4 engine tests, 5 Rust/SQLite tests, and 53 browser checks.
  Three profile copies skipped as designed.
- `npm run build` passed and produced `dist/`.
- JavaScript is 40.32 KB raw / 12.46 KB gzip. CSS is 12.26 KB raw / 3.53 KB
  gzip. There are no downloaded fonts or hero images.
- Live Pixel 5 rendering measured 60.006 fps across 120 frames.
- Live mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 930 ms, LCP 976 ms, total blocking time was
  20.5 ms, and CLS was 0.
- `npm run verify:url` passed locally and live for title, language, main, alt
  text, and unexpected console errors.

Evidence: `/work/.evidence/codekick-review-3/npm-ci-clean.log`,
`full-test.log`, `build.log`, `dist-files.txt`, `artifact-sha256.txt`,
`lighthouse-live.json`, `lighthouse-summary.json`, `verify-local.log`, and
`verify-live.log`.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Verification 1 F1 — room-code multiplayer absent | Resolved. Fresh clean and live four-client checks cover roles, shared authoritative movement, reconnect, capacity, isolation, end, rematch, health, persistence, and rate limiting. |
| Verification 1 F2 — no player-two phone controls | Resolved. Fresh exact live desktop and phone checks cover player-two move, pass, and shot. |
| Verification 1 F3 — 200% text overflow | Resolved. The exact live 320 px / 200% test has no horizontal overflow. |
| Verification 1 F4 — demo controls below 44 px | Resolved. Both live demo actions exceed 44 × 44 px. |
| Verification 1 F5 — live security policies missing | Resolved. Fresh headers show CSP, Permissions Policy, HSTS, nosniff, and Referrer Policy. |
| Verification 1 F6 — eight untested claim groups | Resolved. All groups are declared, tagged once, and pass separately. |
| Verification 1 F7 — Pause did nothing at kickoff | Resolved. Exact clean and live kickoff and active-play checks pass. |
| Verification 1 F8 — unknown routes returned 200 | Resolved. The designed unknown route returns HTTP 404. |
| Verification 1 F9 — privacy request path not actionable | Resolved. Privacy links directly to the request email address. |
| Verification 2 F1 — demo storage recreated after exit | Resolved. Fresh live exit leaves both demo keys absent and normal data unchanged. |
| Verification 2 F2 — six-hour expiry outcome untested | Resolved. The fresh claim proves cleanup, rejected join, SQLite deletion, and absence after restart. |
| Verification 2 F3 — Demo axe landmark violation | Resolved. Fresh live Demo Axe has zero violations. |
| Verification 2 F4 — four server claim tags missing | Resolved. Every one of the 27 IDs occurs in exactly one claim tag. |
| Review 1 F1 — phone links below 44 × 44 px | Resolved. Fresh rendered measurements and exact live regressions cover every cited link; all meet 44 × 44 px. |

Verification 3, Verification 4, and Review 2 reported no findings. This fresh
review found no regression or new issue. No product code, product data, or
deployment configuration was changed. Only the product-owned realtime revision
was restarted for the persistence check. The pre-existing modified
`graphify-out/` files were preserved and are not included in the review commit.
