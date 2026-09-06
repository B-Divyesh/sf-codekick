# Codekick verification 4 handoff

## Result

**PASS — 0 findings and 0 untested public claims.**

Codekick is a free four-minute private 2v2 browser football match for two to
four friends. A host shares a six-character room code. Friends play from their
keyboard or phone without an account or download.

- Implementation reviewed: `480267d62cce50848043d7e0edc7676b834cf996`.
- Documentation baseline: `7eb6ad7f11b9ba60936eb7ce498d1cfe6355cfe0`.
- Live URL: <https://codekick.sociobot.in>.
- Full report: `.factory/verification-4.md`.

The live HTML, JavaScript, and CSS are byte-identical to the clean production
build at the implementation SHA. Later repository commits are report-only or
Graphify output and do not require a new product image.

## Verification completed

- Installed documented prerequisites in a detached clean checkout and ran all
  27 declared claim commands separately. Every command passed and every claim
  has exactly one matching tag.
- `npm test` passed 4 engine, 5 Rust/SQLite, and 53 browser checks, with 3
  expected profile skips. `npm run build` produced `dist/`.
- Opened fresh desktop and Pixel 5 live contexts. Both show the game on the
  first screen and state the job, audience, and sample action before scrolling.
- Played the live 28-second sample through its natural **Sun wins** end screen,
  reset it, left the demo, and proved demo keys were removed while normal data
  remained unchanged.
- Used four independent live room clients, observed shared authoritative
  movement, reconnected the host, rejected a fifth player, and confirmed that
  a token for one room receives no state from another room.
- Live health returned SQLite status. A clean live allowance window accepted
  12 room requests and returned 429 with `Retry-After: 60` on request 13.
- Fresh live Axe found zero violations on all five public routes. Keyboard
  focus, reduced motion, 200% text, privacy contact, invalid states, designed
  HTTP 404, and all repaired 44 px phone link targets pass.
- Live Pixel 5 rendering measured 60.01 fps. Mobile Lighthouse scored 100 in
  performance, accessibility, best practices, and SEO; LCP was 1.0 s and CLS
  was 0.

## Run again

```bash
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
npm run verify:url -- http://127.0.0.1:4173
npm run verify:url -- https://codekick.sociobot.in
```

The claim commands are listed in `.factory/claims.json`. Verification evidence
is under `/work/.evidence/codekick-verify-4/`.

## Known gaps and next steps

No product gap or untested public claim was found. No product code, service,
deployment, infrastructure, or data was changed. The pre-existing modified
`graphify-out/` files remain untouched and must not be included in the report
commit.
