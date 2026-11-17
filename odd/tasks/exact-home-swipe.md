# Feature: exact-home-swipe

Locator: `odd/tasks/exact-home-swipe.md` · Engram mirror: `odd/exact-home-swipe/tasks`

## Objective

Give each task row of Home's "Up next" card swipe actions: swipe right to complete, swipe left to edit or delete. The same
feature goes into the NSH Todo app (`../nsh_mobile`, branch `feat/nsh-home-swipe`). It is also a measurement of a common app
pattern for the framework comparison: what each framework gives, what is built by hand, and how smooth the swipe is
(2026-11-17 request).

## Swipe spec (shared by both apps)

- Where: every task row in Home's "Up next" card. Other screens are unchanged.
- Swipe right (the row moves right): a green **Complete** action shows on the left. It marks the task done, as the app's
  existing completion does.
- Swipe left (the row moves left): two actions show on the right, **Edit** (blue) then **Delete** (red), Delete outermost.
  - Edit opens the app's existing editor for that task.
  - Delete removes the task without asking, as iOS does for routine deletions (Mail, Reminders).
- Look, from the user's reference image:
  - Icons only, no text: a checkmark, a square-and-pencil, a trash can, in white.
  - Flush rectangles the row's full height, about 72-76 pt wide each.
  - Colours that read in light and dark.
  - In Exact this is the long form of `contract vocab swipe` (`swipeLeading`, `swipeTrailing`) with
    `appearance="none"` on the actions, so they stay flush and painted rather than UIKit's rounded ones.
- Behaviour:
  - Past a threshold the row snaps open; otherwise it snaps back.
  - One row open at a time. Pressing the row's content while it is open closes it.
  - A full swipe performs the outermost action (Complete; Delete), as on iOS.
- Accessibility: each action has an accessibility label ("Complete", "Edit", "Delete"). Where the framework offers custom
  actions on the row (VoiceOver/TalkBack), expose them.
- Tests first (strict TDD): complete, edit (opens the editor for that task) and delete from Home; the gesture too if the
  test API can drive a horizontal drag.
- Findings for the comparison: what the framework gave, what was hand-built, workarounds, doc gaps, platform differences, and
  lines per area.

Out of scope: swipe actions on the Tasks or Categories screens, undo, web and desktop checks.

## Measurement plan (T3, parent)

- Implementation cost: authored lines (code and tests) per app.
- Smoothness on Android: frame times while a scripted swipe drags a row (`dumpsys SurfaceFlinger --latency` on the app's
  layer). Jank count, p50/p90/p99.
- CPU while a row is swiped repeatedly (sampled with `top`).
- iOS Simulator: behaviour check, no frame numbers (the simulator is not representative).

## Constraints

- Branch `feat/exact-home-swipe` from `feat/exact-chart` (db7da0b). Exact SDK ~/.exact/exact2 (33faab4a).
- Never run the `share` or `feedback` verbs.
- The modified `.atl/` files are not part of this feature: never stage them.
- Keep the existing checks green. Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make check`, `make test` (Contract, web host),
  `make test-storage`, `make test-location`, `make test-config`.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Swipe actions on Home's "Up next" rows, tests first. Route: delegated writer (contract, theme, tests).
- [ ] T3 Verify on the iOS Simulator and the Android emulator (light and dark), then measure. Route: inline per-action.

## Delivery

- Forecast: about 100-200 authored lines (the framework has swipe actions). Strategy: ask-on-risk. Local branch only; no
  push or pull request planned.

## Progress / evidence

- T1: branch created from db7da0b.
- T2 (commit 0f8c286, `feat(home): add swipe actions to the up next rows`):
  - RED (`make test`, before any contract change): 31 passed, 4 failed. Three failed with `no view matches
    upnext-1-complete|upnext-2-edit|upnext-1-delete by testId, label or text`; the gesture test failed with `drag: from
    (210,524.59) to (510,524.59) leaves the viewport (420 x 900)` (a test-authoring error, fixed as below).
  - Iterations to GREEN: (1) `align-items` on a `button` warns `lower-flex-on-block`: added `display="flex"`;
    (2) `swipe.glyph` warned `lower-colour-one-scheme`: marked `scheme=fixed`; (3) with `swipeLeading` the web row
    opened on the Complete action at rest: the content needs `scrollLeft=76` (the leading width), as Messages does;
    (4) the test host's `drag ... mouse` does not scroll a snap `scroll`, and a finger drag moved only ~4 px; `tap ... wheel
    <dx> 0` reveals the actions reliably, so the reveal tests use the wheel.
  - GREEN: `make test` 35 passed, 0 failed (4 new tests: complete, edit opens the editor for that task, delete without
    asking, wheel-reveal of both sides). `make check` clean; `make test-storage` 7 pass; `make test-location` 4 pass;
    `make test-config` 3 pass. One earlier `make test` run showed the Market test "without history ..." failing once
    (`market-price` was "63,853.65", expected "--": it reached the live network); the next runs passed.
  - Web `check both` with a row open: no findings in light and dark.
  - Builds: `./exact.mjs ios` built Exact Todo.app for the iOS Simulator; `./exact.mjs android` built the release APK
    and also installed it on emulator-5554 (the verb installs by default; not launched).
  - Not testable here: the full swipe (past half the row) pressing Delete/Complete, one-row-open-at-a-time, VoiceOver and
    TalkBack custom actions: device checks for T3.

## Findings for the comparison (Exact, T2)

- What Exact gave: the whole behaviour of a swipe row once the long form is wired: horizontal snap, one row open at a
  time, a full swipe pressing the outermost action, actions exposed as custom actions of the row (VoiceOver), flush
  painted actions with `appearance="none"`. No gesture code, no animation code, no state for open rows.
- Hand-written: the row markup (leading button, content, two trailing buttons) and each action's paint (76 pt, token
  colour, white glyph, aria-label, testId). One new action, `openEditTask(id)`, a `push` of the existing route; Complete
  and Delete reuse `toggle` and `remove` unchanged.
- Workarounds / doc gaps:
  - `contract vocab swipe` does not say a leading action needs `scrollLeft=<leading width>` on the scroll, or the row
    rests open on the leading action (web); it is only visible in `apps/messages`.
  - The "Up next" card is not a `list` row context by default: a plain `list` inside the card was enough (no `section`,
    no `appearance`), keeping the card look. No warning either way.
  - On the web a full swipe to the leading side cannot be reproduced (the scroll clamps at 0, there is no rubber band);
    the iOS host handles it with an overscroll. Android: unverified here.
  - Test API: `tap <id> drag ... mouse` does not move a snap scroll, a finger drag moves it a few px; `tap <id> wheel dx 0`
    is the reliable reveal. A drag from the middle must stay inside the viewport (`leaves the viewport`).
  - `lower-flex-on-block` (a button needs `display="flex"` to centre its icon) and `lower-colour-one-scheme` (white
    glyph needs `scheme=fixed`) each cost one iteration; both warnings named the repair.
  - `./exact.mjs android` builds and installs; there is no build-only flag seen.
- Platform notes: web check light and dark clean. Icons use roles `checkmark`, `compose`, `delete` (no `sf/` symbol
  needed, so they draw on Android too).
- Authored lines (`git diff --numstat db7da0b..0f8c286 -- mobile`): contract +27/-7, theme +6, tests +93 (126 added,
  7 removed overall). Four tests, about 17-35 lines each, dominated by the add-task setup steps.
