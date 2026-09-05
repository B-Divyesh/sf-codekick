# Codekick demo

Open `/demo` or select **Try it with sample data** from the first screen.

The demo starts a 28-second practice match with Sun ahead 2–1 and holding the
ball near goal. It has the same canvas, keyboard controls, touch controls,
stadium rules, settings, end screen, and rematch action as a full match.
**Finish the sample match** lets a visitor inspect the end screen immediately.

The persistent banner says **Demo — sample data, nothing is saved**. Demo match
state and demo settings use only `demo:codekick:match` and
`demo:codekick:settings` in browser localStorage. **Reset demo** removes those
keys and restores the supplied sample. **Start for real** removes those keys
and opens the room controls with a separate 0–0 local practice match. The demo
never reads or writes normal `codekick:*` keys and never contacts the room
service.
