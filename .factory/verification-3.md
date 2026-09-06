# Verify private 2v2 football matches — Codekick verification 3

## Verdict

**PASS** — 0 findings and 0 untested public claims.

- Implementation reviewed: `3d94125d9157cd4b96cdb37fd1d012079c25027e`.
- Documentation reviewed: `7b9de66c73d03c6c77d41529ec87c971db9e89de`.
- Repository head at review: `8e0039ba0cd367d53b061b8675e03ff7e66f04ab`. This contains only factory/Graphify wrapper output after the implementation and documentation commits; it changes no product code.
- Live URL: <https://codekick.sociobot.in>.
- Verified on 2026-09-06 UTC.

The clean production build and live `index.html`, JavaScript, and CSS are byte-identical. The respective SHA-256 values are `18c92ca7…`, `2f75bb85…`, and `cac701c3…`.

## First screen

Fresh desktop (1440 × 900) and phone (393 × 727) browser profiles showed the game before scrolling.

| Check | Result |
| --- | --- |
| Job | **Play a private 2v2 football match** |
| Audience | Two to four friends who want a quick match without accounts or downloads. |
| First action | **Try it with sample data**; it says it starts a 28-second sample match. |
| Desktop field position | Pitch begins at y=461.5 CSS px. |
| Phone field position | Pitch begins at y=526.73 CSS px, inside the 727 px first viewport. |

Both profiles had the correct title and no console errors.

## Game and demo

The live `/demo` entry started with Sun 2–Tide 1, four populated players, a 0:28 clock, Crosswind, and the persistent label **Demo — sample data, nothing is saved**. Keyboard movement and Pass were used during active play. The actual 28-second timer then reached the result screen without the finish shortcut: **Sun wins**, final score Sun 2–Tide 1.

`Reset demo` restored 2–1 and 0:28. `Start for real` returned to the 0–0 local match, removed both `demo:codekick:match` and `demo:codekick:settings`, and preserved a fixed normal-storage sentinel. Demo data therefore did not change real data.

The live Pixel 5 profile measured 120 animation frames at **60.01 fps**. Reduced-motion preference detection worked, no service worker was registered, and Codekick makes no offline or update promise.

## Claims

All 27 commands declared in `.factory/claims.json` were run separately in the clean checkout. Every command passed. The full suite also passed: 4 engine tests, 5 Rust service tests, and 51 browser tests; 3 browser project skips were expected (desktop copies of phone-only touch and frame-rate tests, and the phone copy of the desktop four-client room test).

| Claim IDs verified | Result |
| --- | --- |
| `demo-end-screen`, `restart-reset`, `settings-persist`, `demo-isolation`, `local-demo-data`, `free-local-match`, `four-minute-round` | PASS |
| `match-recovery`, `keyboard-controls`, `touch-controls`, `phone-frame-rate`, `sample-duration`, `practice-2v2`, `ball-actions-combo` | PASS |
| `second-player-controls`, `stadium-rules`, `pause-recovery`, `input-settings`, `assist-mode`, `fixed-timestep`, `privacy-all-routes` | PASS |
| `private-room`, `online-end-screen`, `online-four-minute`, `room-persistence`, `room-rate-limit`, `room-health` | PASS |

Each declared ID has an `@claim:<id>` tag in the browser, engine, or Rust test source. Landing-page and README promises were cross-checked against the claim list; no public claim was unlisted.

## Multiplayer and room service

Two independent live browser clients created and joined a six-character room, received the Sun and Tide captain roles, and the host reconnected after reload. A direct live authoritative-stream check used two independent browser WebSocket clients: both observed Sun move from x=330 to x=518 and return to x=330. A valid player token attempted against a different valid room was rejected at the socket boundary, confirming room isolation.

The clean Rust `room-persistence` claim command reopened SQLite state, then proved six-hour expiry removes the room from memory and SQLite, rejects a join, and remains absent after another restart. Live `/health` returned HTTP 200 with `{"status":"ok","storage":"sqlite"}`.

After a clean one-minute window, 13 room-create requests on one keep-alive live connection returned twelve HTTP 201 responses followed by HTTP 429 with `Retry-After: 60`.

## Accessibility, routes, privacy, and recovery

- `npm run verify:url` passed locally and against the live URL: title, language, main landmark, alt text, and console checks.
- Axe reported zero violations on Home, Demo, How to play, Privacy, and Terms.
- The narrow 320 px / 200% text test passed, including both 44 px demo controls.
- Invalid short and missing room codes gave clear next actions. Damaged local match/settings storage recovered to a fresh 4:00 match and default pass key.
- The styled unknown route correctly returned deliberate HTTP 404. All public routes have one H1, one main landmark, route titles, usable legal pages, internal route links, and an actionable `mailto:privacy@sociobot.in` request link.
- Live responses include CSP with `frame-ancestors 'none'`, Permissions Policy, `X-Content-Type-Options: nosniff`, and Referrer Policy. No third-party assets, analytics, ads, remote fonts, or service-worker requests were observed.

## Build and performance

- `npm ci` completed with 0 vulnerabilities.
- `npm run build` passed and produced `dist/`.
- Production assets: JavaScript 40.30 KB raw / 12.45 KB gzip; CSS 12.12 KB raw / 3.48 KB gzip.
- Live mobile Lighthouse: performance 100, accessibility 100, best practices 100, SEO 100; FCP 0.9 s, LCP 1.0 s, TBT 40 ms, CLS 0.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Missing room-code multiplayer | Resolved: independent live room clients, authoritative shared movement, reconnect, isolation, and capacity/end/rematch claim coverage pass. |
| Missing player-two phone controls | Resolved: the phone claim exercises player-two move, pass, and shoot. |
| 200% text overflow and small demo controls | Resolved: 320 px / 200% test has no overflow; both demo controls meet 44 px. |
| Missing live security headers and soft 404 | Resolved: required headers are live and unknown route is HTTP 404. |
| Missing privacy contact and kickoff Pause no-op | Resolved: actionable privacy mail link and kickoff pause claim pass. |
| Demo cleanup, expiry outcome, Demo axe, and missing server tags | Resolved: demo keys are removed on exit, expiry is outcome-tested, all public routes have zero axe violations, and all 27 IDs are tagged. |

The pre-existing `graphify-out/` worktree changes were not inspected as product input, modified, staged, or included in this verification.
