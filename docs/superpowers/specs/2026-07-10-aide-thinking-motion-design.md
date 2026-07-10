# Aide Thinking Motion Design

**Status:** Approved for autonomous implementation on 2026-07-10

## Problem

After a visitor submits a support question, the interface renders the localized
“Aide is thinking…” message without motion. Because Aide can take several
seconds to respond, the static line does not make the in-flight work feel
active.

## Approaches considered

1. **Text shimmer (recommended).** Sweep a narrow brand-red highlight through
   the existing localized status copy. This directly animates the element the
   visitor is already reading, requires no new copy, and feels consistent with
   familiar AI waiting states.
2. **Per-letter wave.** Split the localized string into characters and animate
   each letter vertically. This is more playful, but it complicates Unicode and
   right-to-left text handling and creates more visual motion than this support
   surface needs.
3. **Trailing bouncing dots.** Append three animated dots. This is robust but
   generic, and the current translations already contain punctuation, making
   the result awkward or locale-specific.

## Design

Render the pending state as a normal assistant turn: the existing circular
“Ai” avatar sits beside the localized thinking text. A restrained horizontal
gradient moves across the text, shifting between the normal muted foreground,
the WCPOS red accent, and the regular foreground. The animation loops smoothly
at a calm pace without moving layout or individual characters.

The indicator remains present only while the request status is `asking` and is
replaced by the answer when the request completes. Existing request, error, and
Turnstile behavior is unchanged.

## Accessibility

- The pending row is a polite live status so assistive technology announces it
  without interrupting the visitor.
- The avatar is decorative and hidden from assistive technology.
- Under `prefers-reduced-motion: reduce`, the gradient animation is disabled
  and the text uses the existing solid muted foreground color.
- The treatment adds no timer-driven JavaScript and does not alter focus.

## Testing

Extend the support Playwright test so the mocked answer remains pending long
enough to verify that:

1. the localized thinking status is visible while the request is unresolved;
2. its computed style has an active CSS animation when reduced motion is not
   requested; and
3. the status disappears when the answer arrives.

No new unit test is needed because the behavior crosses request state, rendered
markup, and computed CSS; the existing browser-level support test is the
smallest test that exercises the complete behavior.
