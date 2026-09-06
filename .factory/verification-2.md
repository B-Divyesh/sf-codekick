# Verify private 2v2 football matches — Codekick verification 2

## Verdict

**FAIL** — 4 findings and 1 untested public claim. All 27 declared claim
commands return zero, but the six-hour room-expiry part of one claim is not
tested as an outcome. A PASS requires zero findings and zero untested claims.

- Implementation reviewed: `9516c9ec25c53c6deaf93767ef166e3be7fda953`.
- Documentation reviewed: `903bbe990e8d7b6cc76bae94abe651c336c08e14`.
- Repository head at verification start: `4ac197746c26942132f1f4071232075c3fc150f4`.
  The later head changes only `graphify-out/` and does not require a new image.
- Live URL: <https://codekick.sociobot.in>.
- Verified on 2026-09-06 UTC.

The live `index.html`, JavaScript, CSS, and `404.html` are byte-identical to a
clean production build at the implementation SHA.

## First screen

Before scrolling in fresh 1440 × 900 desktop and 393 × 727 phone contexts:

- Job: **Play a private 2v2 football match**.
- Audience: two to four friends who want a quick match without accounts or
  downloads.
- First action: **Try it with sample data**. Its note says it starts a
  28-second sample match.
- The live field is visible in both first screens. It begins at CSS y=461.5 on
  desktop and y=526.7 on the 727 px-high phone viewport.

Evidence: `/work/.evidence/codekick-verify-2-live-desktop.png`,
`/work/.evidence/codekick-verify-2-live-phone.png`, and
`/work/.evidence/codekick-verify-2-live-screens-routes.json`.

## Findings

### F1 — Medium — Leaving the demo recreates sample storage

In a fresh live context, **Reset demo** removed the demo keys and restored the
supplied Sun 2–Tide 1, 0:28 state. Selecting the banner's **Start for real**
opened the separate 0–0, 4:00 match and did not change fixed `codekick:*` test
data. However, `demo:codekick:match` existed again after navigation.

This violates the demo contract that leaving demo mode discards demo data and
the statement in `.factory/demo.md` that **Start for real** removes the demo
keys. The click handler removes the keys, then route teardown calls
`saveEngine()`, which writes the demo match again. The declared
`demo-isolation` test checks the new real score but does not assert that the
demo namespace is empty.

Evidence: `/work/.evidence/codekick-verify-2-live-demo-isolation.json`.

### F2 — Medium — The six-hour room expiry claim is not outcome-tested

Claim `room-persistence` says room state persists across a service restart
**and expires after six hours**. Its test writes a future `expires_at` value,
reopens SQLite, and checks that the timestamp is about six hours away. It does
not advance time, run cleanup, or prove that an expired room is removed and can
no longer be joined.

Restart persistence itself passed both the clean test and a live service
restart. The expiry outcome remains untested. This is the report's one
untested public claim.

### F3 — Low — The demo has a moderate axe landmark violation

The live `/demo` route reports
`landmark-complementary-is-top-level` with moderate impact. The
`<aside class="demo-banner" aria-label="Demo mode">` complementary landmark is
contained within the `<main>` landmark. Other checked routes have no axe
violations, and there are no serious or critical violations.

Evidence:
`/work/.evidence/codekick-verify-2-live-accessibility-recovery.json`.

### F4 — Low — Four declared server claims lack required claim tags

The claim contract requires one test tagged `@claim:<id>` for every claim.
The tests for `online-four-minute`, `room-persistence`, `room-rate-limit`, and
`room-health` are invoked by exact Rust function names but contain no matching
`@claim:` tag. Their commands pass and their implemented assertions were
inspected, so they are not counted as untested solely because of this tagging
gap.

## Game and demo run

A fresh live desktop run entered `/demo` from the first-screen action. It began
with four populated players, Sun 2–Tide 1, 0:28, Crosswind, and a visible combo
timer. Keyboard movement changed the captain position and Pass released the
ball. Without using the finish shortcut, the timer reached zero and displayed
**Sun wins**, final score Sun 2–Tide 1, with **Play another match** available.

The supplied finish action produced the same result screen. **Play another
match** reset the score to 0–0 and selected Spring turf. **Reset demo** restored
Sun 2–Tide 1 at 0:28. The persistent banner remained visible and said
**Demo — sample data, nothing is saved**. Fixed normal-storage test values were
unchanged throughout demo play. F1 records the demo key left after exit.

Evidence: `/work/.evidence/codekick-verify-2-live-demo-active.png`,
`/work/.evidence/codekick-verify-2-live-timed-end.png`,
`/work/.evidence/codekick-verify-2-live-timed-run.json`, and
`/work/.evidence/codekick-verify-2-live-demo-isolation.json`.

## Multiplayer and backend

- Two independent live browser contexts joined room `ZZXZWZ`. The Sun captain
  moved from x=330 to x=381, x=440, and x=498 in both clients. The host then
  reloaded and reconnected as Sun captain with both players connected.
- A separate room, `A7B3L6`, was created before restarting only active revision
  `sf-codekick-realtime--0000005`. Health returned 200 after restart, and the
  same room accepted a Tide captain afterward. This proves live SQLite restart
  persistence.
- `GET /health` returned 200 with `{"status":"ok","storage":"sqlite"}`.
- A persistent live request sequence reached the allowance boundary. Requests
  11–20 returned 429 with `Retry-After: 60`.
- An invalid room returned deliberate HTTP 404 with: “That room was not found.
  Check the code and try again.” The clean browser suite also covers a short
  code, a missing room, four-player capacity, damaged local state, reconnect,
  synchronized end, and rematch.

Evidence: `/work/.evidence/codekick-verify-2-live-multiplayer.json`, the two
`codekick-verify-2-live-room-*-moved.png` screenshots,
`/work/.evidence/codekick-verify-2-live-restart.log`,
`/work/.evidence/codekick-verify-2-live-rate-limit-fetch.log`, and
`/work/.evidence/codekick-verify-2-live-http.log`.

## Declared claims

Each command in `.factory/claims.json` ran separately from a clean checkout at
the implementation SHA. The complete log is
`/work/.evidence/codekick-verify-2-claims.log`.

| Claim | Command result | Outcome |
| --- | --- | --- |
| `demo-end-screen` | Pass | End screen observed. |
| `restart-reset` | Pass | Score and rule reset. |
| `settings-persist` | Pass | Setting survived reload. |
| `demo-isolation` | Pass with F1 gap | Real state stayed separate; demo cleanup is not asserted. |
| `local-demo-data` | Pass | Requests stayed same-origin. |
| `free-local-match` | Pass | Local play started without account or payment. |
| `four-minute-round` | Pass | Fresh clock began at 4:00. |
| `match-recovery` | Pass | Unfinished local match returned. |
| `keyboard-controls` | Pass | Keyboard movement changed position. |
| `touch-controls` | Pass | Phone touch movement changed position. |
| `phone-frame-rate` | Pass | Claim threshold passed. Live profile measured 60.00 fps. |
| `sample-duration` | Pass | Sample began at 0:28. |
| `practice-2v2` | Pass | Four players and moving bots observed. |
| `ball-actions-combo` | Pass | Combo, pass, shot, and goal outcomes passed. |
| `second-player-controls` | Pass | Keyboard and phone touch outcomes passed. |
| `stadium-rules` | Pass | All three rules rotated. |
| `pause-recovery` | Pass | Kickoff and active pause worked. |
| `input-settings` | Pass | Reduced motion and remapped keys persisted. |
| `assist-mode` | Pass | Assisted movement was measurably slower. |
| `fixed-timestep` | Pass | Repeated input frames serialized identically. |
| `privacy-all-routes` | Pass | Public pages used only the product origin. |
| `private-room` | Pass | Four independent clients, movement, and capacity passed. |
| `online-end-screen` | Pass | Shared end and rematch passed. |
| `online-four-minute` | Pass with F4 gap | 240-second initial state asserted; required tag is absent. |
| `room-persistence` | **Incomplete** | Restart passed; expiry behavior is not tested. |
| `room-rate-limit` | Pass with F4 gap | 429 and `Retry-After: 60` passed; required tag is absent. |
| `room-health` | Pass with F4 gap | SQLite health returned 200; required tag is absent. |

## Earlier verification findings

| Earlier finding | Current disposition |
| --- | --- |
| F1 missing room multiplayer | Resolved. Real clients joined, synchronized movement, reconnected, reached a tested end/rematch, and survived service restart. |
| F2 missing player-two touch controls | Resolved. Six separate player-two controls measure at least 44 × 44 px, and movement worked. |
| F3 200% text overflow | Resolved. At 320 px and 200% text, document width remained 320 px and navigation ended at x=308. |
| F4 undersized demo controls | Resolved. Reset measured 119.5 × 44 px; Start for real measured 130.3 × 44 px. |
| F5 missing live policies | Resolved. Live CSP, Permissions Policy, Referrer Policy, and nosniff headers are present. |
| F6 eight untested claim groups | The original eight groups are listed and their commands pass. F2 above records a different incomplete expiry claim. |
| F7 kickoff Pause no-op | Resolved. The clean desktop and phone checks pause and resume during kickoff and active play. |
| F8 soft 404 | Resolved. An unknown route returns the designed page with HTTP 404 and a return link. `/404.html` itself correctly returns 200. |
| F9 privacy contact not actionable | Resolved. Privacy links directly to `mailto:privacy@sociobot.in`. |

## Accessibility, routes, privacy, and recovery

- Every tested page has a distinct title, one H1, one main landmark, header,
  footer, and working internal links. The skip link focuses `main`; route
  navigation focuses the new H1; the settings dialog receives focus and
  returns it to Settings.
- The live phone has no horizontal overflow at 200% text. Player-two and demo
  controls meet the 44 px target. Reduced-motion media matches and removes the
  field animation.
- Axe found no violations on Home, How to play, Privacy, or Terms. F3 records
  the one moderate Demo violation.
- Live normal routes had no console errors. The expected 404 request during the
  invalid-room test is not classified as a product error.
- Demo requests stayed on the Codekick origin, normal data stayed unchanged,
  and no analytics, remote fonts, ads, AI calls, or third-party game assets
  were observed. Privacy and Terms are present, and the privacy request link
  works.
- Corrupt match and settings JSON recovered to a 4:00 match and default F pass
  key. Short and missing room codes produced a clear next action.
- Codekick makes no offline or update promise and registers no service worker,
  so offline/update behavior is not an acceptance claim.

## Quality and performance

- `npm ci`: passed with zero audit vulnerabilities.
- `npm test`: passed 4 engine tests, 5 realtime tests, and 51 browser checks;
  3 profile-specific skips were expected.
- `npm run build`: passed and produced `dist/`.
- Bundle: JavaScript 40.43 KB raw / 12.44 KB gzip; CSS 12.12 KB raw /
  3.48 KB gzip.
- `npm run verify:url -- https://codekick.sociobot.in`: passed title, language,
  main, alt text, and console checks.
- Live Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  and 100 SEO; FCP 906 ms, LCP 940 ms, TBT 9.5 ms, CLS 0, transfer 18,154
  bytes.
- Fresh live Pixel 5 profile: 120 frames at 60.00 fps.

Evidence: `/work/.evidence/codekick-verify-2-full-test.log`,
`/work/.evidence/codekick-verify-2-build.log`,
`/work/.evidence/codekick-verify-2-lighthouse.json`, and
`/work/.evidence/codekick-verify-2-live-fps.json`.

The pre-existing `graphify-out/` changes were not modified or included in the
verification commit.
