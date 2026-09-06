# Codekick repair 3 handoff

## Product and release

Codekick is a free four-minute, private 2v2 browser football match for two to
four friends. A host shares a six-character room code; friends play on their
own keyboard or phone browser without an account or download.

- Implementation SHA: `480267d` (`Fix phone link touch targets`).
- Static release: `sf-codekick` was deployed from that commit to
  <https://codekick.sociobot.in> on 2026-09-06 UTC.
- Realtime service: unchanged. It remains the single-replica,
  product-owned SQLite service on its durable `/data` mount.
- The researched brief specifies a free product. There is no paid offer or
  billing dependency.

## Repair completed

Review 1 finding F1 is resolved at the shared link-style boundary.

- The wordmark, every primary and footer navigation link, and the privacy
  request link now use a 44 by 44 CSS-pixel minimum interactive area.
- The standalone styled 404 page uses the same rule for its wordmark and
  navigation links.
- The privacy address keeps its direct `mailto:` action and remains visible as
  text; no privacy behavior changed.
- The browser regression checks rendered bounding boxes on a 393 by 727 phone
  viewport. It covers header navigation, footer navigation, the privacy email,
  and the static 404 page. This is an outcome check, not a source-text check.

## Verification

### Clean setup and claims

In detached clean worktree `/tmp/codekick-repair-3-clean` at `480267d`:

- `npm ci` completed with zero audit vulnerabilities.
- All 27 commands declared in `.factory/claims.json` passed independently.
  The browser claims ran in both desktop and phone projects where applicable;
  the three intentionally inapplicable profile copies skipped as designed.
- `npm test` also passed in the main checkout: 4 deterministic engine tests,
  5 Rust/SQLite service tests, and 56 browser checks with 3 expected profile
  skips.
- `npm run build` produced `dist/`: JavaScript is 40.32 KB raw / 12.46 KB gzip
  and CSS is 12.26 KB raw / 3.52 KB gzip.

### Live HTTPS checks

- The durable static deployment completed successfully and HTTPS returned 200.
  `npm run verify:url -- https://codekick.sociobot.in` and the worker URL
  verifier passed title, language, one H1, main landmark, image-alt, and
  console checks. The live response includes CSP with `frame-ancestors 'none'`,
  Permissions Policy, nosniff, Referrer Policy, and HSTS.
- Fresh 1440 by 900 desktop and 393 by 727 Pixel 5 contexts both showed the
  field before scrolling. They state the job (**Play a private 2v2 football
  match**), audience (two to four friends without accounts or downloads), and
  first action (**Try it with sample data**). The pitch starts at 461.5 px on
  desktop and 539.05 px on phone, inside each initial viewport.
- The fresh desktop sample started at Sun 2–Tide 1, 0:28, with four populated
  players and the persistent **Demo — sample data, nothing is saved** label.
  Keyboard movement and Pass worked; its real timer reached **Sun wins**. Reset
  restored the 2–1, 0:28 sample. Start for real removed both demo keys,
  restored a 0–0, 4:00 real match, and left a normal-storage sentinel intact.
- Fresh live phone target measurements are 114.39 by 44 for the wordmark,
  44 by 44 for Demo and Terms, 87.42 by 44 for How to play, 53.30 by 44 for
  primary Privacy, 52.11 by 44 for footer Privacy, and 161.77 by 44 for the
  privacy request link. The Pixel 5 profile measured 60.00 fps across 120
  animation frames.
- Playwright Axe found zero violations on Home, Demo, How to play, Privacy,
  and Terms. The standalone Axe CLI could not find a compatible system Chrome
  in this worker, so its failed launch is not classified as a product failure;
  the project and live Playwright Axe runs use the installed browser instead.
- The styled unknown route returns the expected HTTP 404. `/404.html` has the
  correct title and the new link-target sizing. On a fresh live phone at 200%
  text, document width remained 393 px; Reset demo and Start for real measure
  59.19 px high.

### Rooms and persistence

- Live health returned `200` with `{"status":"ok","storage":"sqlite"}`.
- Fresh independent live contexts created and joined a private room. A focused
  Sun captain sent authoritative right-input frames; the Tide observer saw the
  Sun position move from x=330 to x=424. A separate fresh four-client run
  assigned the four distinct roles, rejected a fifth join at capacity, and
  reconnected the host after reload.
- The clean `room-persistence` claim reopened SQLite, expired a room, proved
  its removal from memory and SQLite, rejected a join, and proved absence after
  another restart. The realtime implementation is unchanged from the latest
  live restart verification recorded in `.factory/review-1.md`.
- A live keep-alive request sequence returned HTTP 429 with `Retry-After: 60`.
  This session had already created rooms for the live multiplayer checks, so
  the clean twelve-request allowance is evidenced by the independent prior
  review and the exact clean Rust claim rather than misreported as a fresh
  allowance measurement here.

Evidence created during this repair is in `/work/.evidence/codekick-repair-3/`.
The catalog description is copied to `/work/.evidence/catalog-description.txt`.

## Earlier findings

| Finding group | Current disposition |
| --- | --- |
| Missing room-code multiplayer, player-two touch path, text reflow, and small demo controls | Still resolved; clean claims and fresh live room/phone checks pass. |
| Missing headers, soft 404, privacy contact, kickoff Pause | Still resolved; live headers, HTTP 404, mail link, and pause claim pass. |
| Missing public-claim coverage, demo cleanup, expiry outcome, Demo landmark, and server tags | Still resolved; all 27 tagged clean commands pass and live demo cleanup passes. |
| Review 1 F1, undersized phone links | Resolved by the shared 44-pixel link-target rule and live rendered measurements above. |

## Known gaps and next steps

No product gap is known. Codekick deliberately makes no offline or update
promise and registers no service worker. The standalone Lighthouse CLI could
not launch the worker's headless-shell binary; the last independent live review
recorded 100 in all four Lighthouse categories, and this repair has a passing
production build, live URL smoke check, live Axe check, and 60 fps phone
measurement.
