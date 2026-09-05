# Codekick handoff

## Product

Codekick is a free local 2v2 arcade football game for friends sharing a browser
on keyboard or touch. The first action is **Try it with sample data**, which
opens an isolated 28-second sample match. A normal local match has a four-minute
clock. The implementation candidate is `9eae4dc973a544781494f98be1211f542ae1a715`.

## Delivered

- Vite + TypeScript static game in `dist/`, with a deterministic 60 Hz fixed
  timestep, Canvas 2D pitch, pause on hidden tabs, clamped frame deltas, goals,
  a two-second possession combo, end screen, and rematch.
- Practice-against-bots and local-two-player modes. The rematch cycle exposes
  Crosswind, Spring turf, and Pinched goals.
- Keyboard, phone touch controls, pass/shot rebinding, assist mode, persisted
  settings, and local unfinished-match recovery.
- `/demo` is a separate `demo:codekick:*` localStorage sandbox with a permanent
  label, Reset demo, Start for real, and a supplied way to inspect the end
  screen. It never writes normal `codekick:*` keys.
- Product-specific printed-pitch artwork and SVG sharing assets, documented in
  `.factory/design.md`; no third-party art, fonts, scripts, analytics, ads, or
  account flow.
- Home, Demo, How to play, Privacy, Terms, and styled 404 routes; per-route
  titles; metadata; sitemap; robots; security headers; focus handling; and a
  legal footer.

## Verification

From a clean clone at `/tmp/codekick-clean-K9JbOj`:

- `npm ci` passed with zero audit vulnerabilities.
- `npm run build` passed and produced `dist/`.
- `npm test` passed: 3 deterministic engine tests and 30 Playwright cases on
  desktop and Pixel 5 profiles (28 passed; two profile-specific tests are
  expected skips on desktop). Axe found zero serious or critical violations on `/`, `/demo`,
  and `/privacy`.
- Every command in `.factory/claims.json` was run separately from that clean
  clone and passed. This covers end screen, restart, settings, demo isolation,
  same-origin demo requests, free local start, four-minute clock, match reload,
  keyboard, touch, and frame-rate paths.
- `npm run verify:url -- http://127.0.0.1:4173` passed title, language, main,
  alt-text, and console checks from the clean clone. The same verification
  passed against the implementation workspace on port 4174.
- Fresh Playwright desktop and phone screenshots were inspected. The opening
  viewport names the job, audience, and first action while showing the live
  pitch. The demo flow was exercised through populated play, persistent label,
  reset, start-for-real separation, and final score screen.
- A fresh Pixel 5 browser-profile measurement sampled 120 animation frames at
  16.666 ms mean interval: 60.00 fps. The claim test permits 55 fps for normal
  measurement variance.
- Production bundle: JavaScript 29.63 KB raw / 9.49 KB gzip; CSS 10.12 KB raw
  / 3.11 KB gzip.

## Known gaps and next steps

The researched product requires remote room-code play with server-authoritative
state. This work order supplies a static deployment only, and the repository
has no product-owned realtime deployment configuration. Rather than ship a
non-working room-code screen, this release is an honest complete local match.
Remote rooms remain a required next release dependency: deploy
`sf-codekick-realtime` as a one-replica product-owned service, with durable
`/data` SQLite state, WebSocket ingress, server-authoritative ticks,
interpolation, room expiry, health endpoint, and 429/`Retry-After` limits; then
test two independent clients and restart persistence.

No paid offer, billing metadata, or checkout is present because the researched
first release is free.

At handoff, `curl https://codekick.sociobot.in/` could not resolve the product
host in this worker. The static deployment must be triggered by the factory
deployment path after the final push, then checked cold on HTTPS before public
release. That DNS/deployment condition is separate from the locally verified
implementation.

## Independent verification 1 — 2026-09-05

Verdict: **FAIL** with 9 findings and 8 untested public claims. See
`.factory/verification-1.md` for evidence and severity.

The live host now resolves and serves the reviewed implementation. Its
`index.html` matches the clean candidate build. Fresh desktop and phone runs
completed the demo, reset, storage-isolation, real-match entry, keyboard,
touch, route, legal, focus, reduced-motion, recovery, and timed end-screen
paths. All 11 declared claim commands, the full test suite, build, URL verifier,
and live Lighthouse run passed. Lighthouse scored 100 in all four measured
categories, and the live phone profile measured 60.00 fps.

Acceptance remains blocked by the missing room-code multiplayer job. Other
findings cover the unusable second-player phone controls, incomplete claim
inventory, 200% text reflow, 34 px demo controls, missing live CSP and
Permissions-Policy headers, kickoff Pause no-op, soft-404 status, and the
missing actionable privacy contact.
