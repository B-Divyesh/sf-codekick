# Codekick repair 2 handoff

## Product and release

Codekick is a free four-minute 2v2 browser football match for two to four
friends. One player creates a private room and shares its six-character code.
Friends play from independent laptop or phone browsers without accounts or
downloads. The first action is **Try it with sample data**, which starts an
isolated 28-second match.

- Implementation SHA: `3d94125d9157cd4b96cdb37fd1d012079c25027e`.
- The production static bundle was built from that clean commit and deployed
  to `sf-codekick` on 2026-09-06 UTC.
- The documentation SHA is the commit containing this handoff. No product-code
  commit follows the implementation SHA above.
- The realtime image did not change. Its expiry implementation already worked;
  this repair adds the missing outcome coverage and claim tags.

## Repair 2 findings

| Finding | Disposition |
| --- | --- |
| Demo state remains after Start for real | Fixed at the route lifecycle boundary. Leaving `/demo` now destroys the demo game without saving it, then removes both `demo:codekick:*` keys. The claim test asserts both keys are absent and a real-data sentinel is unchanged. |
| Six-hour expiry is not outcome-tested | Fixed. The restart test now moves a restored room beyond the six-hour boundary, runs the production cleanup loop, proves removal from memory and SQLite, proves join returns 404, and proves another restart cannot restore it. |
| `/demo` has a moderate axe landmark violation | Fixed. The banner is a named section instead of a complementary landmark nested in `main`. Axe now reports zero violations on every public app route. |
| Four server claims lack claim tags | Fixed. `online-four-minute`, `room-persistence`, `room-rate-limit`, and `room-health` have explicit `@claim:<id>` annotations on their Rust tests. |

All nine findings from verification 1 remain fixed. The full browser suite still
covers room multiplayer, two-player touch input, 200% text reflow, 44 px demo
controls, route security and 404 behavior, kickoff pause, and the privacy
contact path.

## Clean verification

The clean detached worktree was `/tmp/codekick-repair2-Hzrlno` at the
implementation SHA.

- All 27 commands in `.factory/claims.json` passed separately. Full output:
  `/work/.evidence/codekick-repair-2/claims-clean.log`.
- `npm test` passed 4 engine tests, 5 realtime tests, and 51 browser checks.
  Three intentional profile skips keep phone-only checks in the phone project
  and the four-client room check in the desktop project.
- `npm run build` produced `dist/`. JavaScript is 40.30 KB raw / 12.37 KB gzip;
  CSS is 12.12 KB raw / 3.50 KB gzip. The deployed artifact is 150,391 bytes.
- `npm run verify:url -- http://127.0.0.1:4173` passed title, language, main
  landmark, alt text, and console checks.
- The catalog description is verb-first, 81 characters excluding its newline,
  and was copied to `/work/.evidence/catalog-description.txt`.

## Live verification

- `npm run verify:url -- https://codekick.sociobot.in` passed. The live HTML
  and JavaScript SHA-256 hashes match the clean build.
- Fresh 1440×900 desktop and 393×727 phone profiles showed the field before
  scrolling. The first screen names the job, audience, and **Try it with sample
  data** action.
- The live sample began with four players, Sun 2–Tide 1, 0:28, Crosswind, and
  the persistent demo label. Keyboard and touch moved players, Pass released
  the ball, and the timed desktop run ended at **Sun wins**.
- Reset restored Sun 2–Tide 1 at 0:28. **Start for real** removed both demo
  keys, returned to a 0–0 real match, and did not change real storage during
  demo use.
- Axe reported zero violations on Home, Demo, How to play, Privacy, and Terms.
  Every route had one H1 and one main landmark. The styled unknown route
  returned the expected HTTP 404.
- Two independent live browser contexts joined one room, saw synchronized
  movement from x=330 to x=424, and the host reconnected after reload.
- A live room token opened its own WebSocket but was rejected when used with a
  different room code, confirming room isolation.
- The realtime health endpoint returned 200 with SQLite status. A live room
  survived a restart of `sf-codekick-realtime--0000005` and accepted the Tide
  captain afterward. A persistent request sequence allowed 12 room creates,
  then returned 429 with `Retry-After: 60`.
- Realtime deployment settings remained one healthy active revision at 100%
  traffic, min/max one replica, `/data` mounted, and startup/readiness/liveness
  probes on `/health`.
- Live mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO. FCP was 909 ms, LCP 942 ms, TBT 16 ms, CLS 0, and
  transfer was 18,169 bytes. A fresh phone profile measured 60.00 fps.
- No unexpected console errors occurred. The sole captured 404 console entry
  came from the deliberate unknown-route status check and is expected.

Screenshots and machine-readable results are under
`/work/.evidence/codekick-repair-2/`, including the first screens, active demo,
timed end screen, independent room clients, browser report, Lighthouse JSON,
rate-limit result, restart result, clean build log, clean full-test log, and
all claim-command output.

## Deployment and remaining work

- Static app: `sf-codekick` at <https://codekick.sociobot.in>.
- Realtime app: `sf-codekick-realtime` at
  <https://codekick-realtime.sociobot.in>.
- Realtime state: product-owned SQLite on the existing durable `/data` mount.
- No billing offer exists; the researched brief specifies a free release.
- No offline claim is made and no service worker is registered.
- No known product or verification gaps remain for this repair.
