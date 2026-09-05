# Verify private browser football matches — Codekick verification 1

## Verdict

**FAIL** — 9 findings, including 1 critical finding, and 8 untested public
claims. All 11 declared claim commands pass, but a PASS requires zero findings
and zero untested claims.

Reviewed implementation: `9eae4dc973a544781494f98be1211f542ae1a715`

Reviewed documentation and test commit:
`da76953594376486dc653e48a8adc96cd796f19e`

Later commit `c11d38bc918e115df2556fc33247eb7fd3eec891` adds only Graphify
output. It does not change the product image. The live HTML, JavaScript, CSS,
and social card match the clean build from the reviewed candidate. The
`index.html` SHA-256 is
`8f669291273b0ca46884bc2108a7df59550def42a530b5abc00c09b4526f22ac`.

Live URL: <https://codekick.sociobot.in>

Verified on 2026-09-05 UTC.

## First screen

Before scrolling, both fresh browser profiles showed:

- Job: **Play a private 2v2 football match**.
- Audience: friends who want a quick match without accounts or downloads.
- First action: **Try it with sample data**. The note says it starts a
  28-second sample match.
- The live pitch, scoreboard, players, ball, and kickoff state on the first
  screen. On the 393 × 727 phone viewport, the pitch begins at CSS pixel 494
  and remains visible without scrolling.

Desktop evidence: [live-chromium-first-screen.png](/work/.evidence/codekick-verify-1/live-chromium-first-screen.png)

Phone evidence: [live-phone-first-screen.png](/work/.evidence/codekick-verify-1/live-phone-first-screen.png)

## Findings

### F1 — Critical — The required room-code multiplayer job is absent

The researched job is for two to four friends to join an immediate match by
room code. The live product offers only practice against bots and two players
sharing one device. There is no host or join action, room code, independent
client connection, server-authoritative state, product-owned realtime service,
room persistence, health endpoint, or 429/`Retry-After` behavior. The README
and handoff disclose this as a future dependency, but disclosure does not meet
the required end-to-end job. Two independent real clients therefore cannot be
exercised.

### F2 — High — The advertised two-friend phone path has no second-player touch controls

The README describes a local 2v2 match for two friends sharing a laptop
keyboard or phone screen. On the live phone, the touch UI has one direction
pad plus Pass and Shoot for the Sun captain. The second player is controlled
only by arrow, period, and slash keys. A second friend cannot play the local
two-player mode by touch on the phone.

### F3 — Medium — Text at 200% does not reflow at 320 px

At 320 px, the page width is 320 px at normal text size. With text resized to
200%, the document becomes 352 px wide and the primary navigation is clipped.
This fails the required 200% text-resize and reflow behavior.

Evidence: [live-320-text-200.png](/work/.evidence/codekick-verify-1/live-320-text-200.png)

### F4 — Medium — Demo banner controls are below the touch-target minimum

On both live profiles, **Reset demo** measures 114.73 × 34 CSS px and **Start
for real** measures 125.52 × 34 CSS px. Both are below the required 44 px
minimum height. These are important demo exit and reset actions.

### F5 — Medium — Required security policy headers are missing live

The repository declares CSP and Permissions-Policy headers in
`staticwebapp.config.json`, but live responses do not include either header.
They include HSTS, Referrer-Policy, and X-Content-Type-Options. Because the
configuration file is not emitted into `dist/`, a deployment of `dist/` alone
does not apply its `frame-ancestors 'none'` or other CSP restrictions.

### F6 — Medium — Public claim coverage is incomplete

`.factory/claims.json` has 11 claims and every command passes. The live pages
and README contain eight additional observable claim groups without a matching
`@claim` entry and dedicated test:

1. The sample is a 28-second match.
2. Practice uses bots and the field contains working 2v2 play.
3. Pass, shoot, goals, and the exact two-second possession combo work.
4. Player two can move, pass, and shoot with the documented keys.
5. All three stadium rules rotate across rematches.
6. Pause, hidden-tab pause, and fixed-step recovery work through the UI.
7. Reduced motion and pass/shot remapping work and persist as advertised.
8. Normal play and all public routes have no analytics, ads, remote fonts, or
   third-party game assets. The declared privacy test covers only demo play.

The untested claim count is **8**. Untagged broad tests or manual observations
do not satisfy the contract requiring one declared test per public claim.

### F7 — Low — Pause does nothing during kickoff

The Pause button is enabled and labelled **Pause** during the one-second
kickoff phase. Pressing it then leaves the label and match state unchanged.
After kickoff, pressing the same button correctly changes it to **Resume** and
freezes the clock. The initial no-op has no feedback.

### F8 — Low — Unknown routes return HTTP 200

`/definitely-not-a-codekick-route` displays the styled not-found page with the
correct title and return link, but its document response is HTTP 200. Missing
static assets correctly return 404. The product route is therefore a soft 404,
not the required deliberate HTTP 404.

### F9 — Low — The privacy request path is not actionable

The Privacy page tells people to contact the operator “through the product
listing,” but provides no link, address, or other contact action. A visitor
cannot submit a privacy request from the product or follow a direct route to
the stated contact point.

## Live game run and demo isolation

A fresh desktop session opened `/demo`, moved the Sun captain during active
play, pressed Pass, and let the match clock reach zero without using the finish
shortcut. The game displayed **Tide wins** with final score Sun 2, Tide 10 and
focused **Play another match**. This proves an entry-to-play-to-loss run. The
supplied finish action separately produced the seeded Sun 2, Tide 1 win screen.

**Play another match** reset the score to 0–0 and changed Crosswind to Spring
turf. **Reset demo** restored the supplied 2–1, 0:28 Crosswind sample. The
persistent label read **Demo — sample data, nothing is saved**. Normal
`codekick:*` storage was unchanged throughout demo play and reset. **Start for
real** removed the demo banner and opened a separate 0–0 local match.

Timed end evidence: [live-timed-end-screen.png](/work/.evidence/codekick-verify-1/live-timed-end-screen.png)

Phone demo evidence: [live-phone-demo.png](/work/.evidence/codekick-verify-1/live-phone-demo.png)

Phone shortcut end evidence: [live-phone-end-screen.png](/work/.evidence/codekick-verify-1/live-phone-end-screen.png)

## Declared claims

Every command below ran separately from a clean checkout at
`c11d38bc918e115df2556fc33247eb7fd3eec891`, whose product code is the
`9eae4dc973a544781494f98be1211f542ae1a715` candidate.

| Claim | Result | Evidence |
| --- | --- | --- |
| `demo-end-screen` | PASS | Desktop and phone command cases passed; live seeded win and timed loss were observed. |
| `restart-reset` | PASS | Desktop and phone command cases passed; live rematch reset to 0–0 and Spring turf. |
| `settings-persist` | PASS | Desktop and phone command cases passed. |
| `demo-isolation` | PASS | Desktop and phone command cases passed; live normal storage stayed unchanged during demo use. |
| `local-demo-data` | PASS | Desktop and phone command cases passed; live request capture was same-origin only. |
| `free-local-match` | PASS | Desktop and phone command cases passed. |
| `four-minute-round` | PASS | Desktop and phone command cases passed. |
| `match-recovery` | PASS | Desktop and phone command cases passed. |
| `keyboard-controls` | PASS | Desktop and phone command cases passed; live movement changed the accessible position. |
| `touch-controls` | PASS | Phone command case passed; the desktop skip is intentional. |
| `phone-frame-rate` | PASS | Phone command case passed at 60.00 fps; the desktop skip is intentional. |

There are zero untested **declared** claims. There are eight unlisted public
claims, so the report’s `untested_claim_count` is 8.

## Other checks

- Clean install: `npm ci` passed with 0 vulnerabilities.
- Clean build: `npm run build` passed and produced `dist/`.
- Full tests: `npm test` passed 3 engine tests and 28 browser cases; the two
  desktop skips are the phone-only touch and frame-rate cases.
- URL verifier: `npm run verify:url -- http://127.0.0.1:4173` and the same
  command against the live HTTPS origin both passed.
- Browser health: fresh desktop and Pixel 5 sessions had no console errors,
  page errors, or failed requests. All live internal links returned 200.
- Accessibility: Playwright axe found no serious or critical issue on the
  tested pages. Skip-link, route-heading focus, dialog opening and focus
  return, keyboard movement, touch movement, and reduced-motion media behavior
  worked. Findings F3 and F4 remain outside those automated results.
- Invalid state: malformed normal match and settings JSON fell back to a fresh
  4:00 practice match without a page error.
- Recovery: reload recovery passed. Pause/resume freezes and restarts the clock
  after kickoff; F7 records the kickoff boundary failure.
- Routes: Home, Demo, How to play, Privacy, and Terms have distinct titles,
  one H1, main content, and working back navigation. The styled 404 content and
  return action work; F8 records its wrong HTTP status.
- Privacy: live demo requests were same-origin. There are no runtime AI calls,
  analytics, third-party scripts, or external fonts. F9 records the missing
  privacy-request contact action.
- Offline/update: the product makes no offline or update promise and registers
  no service worker, so these checks are not applicable.
- Backend: no backend exists. Tenant isolation, server restart persistence,
  health, and 429/`Retry-After` checks cannot be run and are part of F1.
- Performance: Lighthouse mobile scored 100 for performance, accessibility,
  best practices, and SEO. FCP was 0.89 s, LCP 0.96 s, total blocking time
  61.5 ms, CLS 0, and initial transfer 14.2 KB. Built JavaScript is 29.63 KB
  raw and CSS is 10.12 KB raw.
- Live rendering: the Pixel 5 profile measured 60.00 fps across 120 animation
  intervals.

Lighthouse evidence: [lighthouse-live.json](/work/.evidence/codekick-verify-1/lighthouse-live.json)

## Earlier findings and known gaps

No earlier review or verification report is present in the repository. The
builder handoff records two known gaps:

- Live DNS/deployment: **resolved**. The host resolves, serves HTTPS 200, and
  matches the reviewed clean build.
- Remote room-code multiplayer: **still open**. It is finding F1 and blocks
  acceptance.

The pre-existing `graphify-out/` changes were not inspected as product input
and were not modified by this verification.
