# Codekick visual thesis

## Direction

Codekick uses a printed-pitch arcade direction: flat stadium geometry, hard
scoreboard bands, and rounded player discs. It fits a short shared-screen sport
because every moving part stays readable from a couch or a phone. It avoids a
simulation broadcast look and generic app cards.

## Palette and type

| Token | Value | Use |
| --- | --- | --- |
| Paper | `#102421` | page ground and panels |
| Field | `#14765e` | pitch |
| Field light | `#1b8b6d` | alternating turf |
| Sun | `#f05a37` | Sun team and primary action |
| Sun light | `#f7c95e` | score rail and focus companion |
| Tide | `#24395b` | Tide team |
| Tide light | `#79d4df` | Tide score rail |
| Ink | `#f7f0dc` | text and pitch markings |

Georgia is the compact display face for scores and headings. The system UI
stack carries controls and instructions. The scale is 16px body, 19px lead,
24px section heading, and a responsive 36–80px H1. Spacing follows an 8px
rhythm, with a dense field panel and more open explanatory sections.

## Interaction and motion

The field is the first large object on the page. Score and game rule sit above
it; controls sit below it. The selected captain receives a ring, the ball owner
gets a two-second combo callout, and the end card appears over the field.
Canvas play advances with a clamped 60 Hz fixed timestep and requestAnimationFrame
rendering. Crosswind lines move slowly only when motion is allowed. The system
reduced-motion preference and the in-game setting remove that movement. There
are no flashes, loops, audio, or screen shake.

## Original asset plan and provenance

The pitch, players, ball, goal net, favicon, and 1200×630 sharing card are
hand-authored vector/canvas geometry in `src/main.ts` and `public/*.svg` on
2026-09-05. No generated imagery, third-party artwork, logo, font, CDN, or
licensed team material is used. The footer tells visitors that field artwork is
drawn in the game.

## Match difficulty

Practice pairs the Sun captain with a supporting teammate against a chasing Tide
captain. The four-minute clock is the intended normal session. Three symmetric
rules rotate after rematches: Crosswind changes the ball’s vertical drift,
Spring turf changes rebounds, and Pinched goals narrows both goals equally.
Assist mode slows movement and shots for players who prefer more time.
