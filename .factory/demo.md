# Codekick demo

Open `/demo` or select **Try it with sample data** from the first screen.

The demo starts a 28-second practice match with the Sun ahead 2–1. It has the
same canvas, keyboard controls, touch controls, stadium rules, settings, end
screen, and rematch action as the local game. **Finish the sample match** is
provided so a visitor or verifier can inspect the full end screen immediately.

The persistent banner says **Demo — sample data, nothing is saved**. Demo match
state and demo settings use only `demo:codekick:match` and
`demo:codekick:settings` in browser localStorage. **Reset demo** removes those
keys and restores the supplied sample. **Start for real** removes those keys
and opens a separate local match at 0–0. The demo never reads or writes the
normal `codekick:*` keys.
