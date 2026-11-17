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
- [x] T3 Verify on the iOS Simulator and the Android emulator (light and dark), then measure. Route: inline per-action.

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

## T2 correction (device findings)

Commit 8431fc0 `fix(home): make the up next swipe rows engage on ios and android`. Route: delegated writer.

### Root cause
- The iOS Simulator log said `exact: swipeContent on #75 is refused: "edit-2,delete-2" names no one descendant of it`.
  `swipeLeading`/`swipeTrailing` names are whitespace-separated; the feature used a comma. iOS refused the row and
  swiped it as a plain scroll: no one-row-open, no full swipe. The plain `list` was NOT the cause. Neither the web test
  host nor `contract build` warns about it.
- Fix: `swipeTrailing=\`edit-${x.id} delete-${x.id}\``.

### Per-item outcomes
1. Android rests open: fixed. Proven A/B on the emulator: any `scrollLeft` on these rows built while the splash covers
   Home is dropped, and on cold start Home's body renders blank until a tab switch (reproduced on 0f8c286, and with
   `scrollLeft=(covered ? 0 : 88)` and with a `scroll=` handler; pre-feature db7da0b cold-starts fine; no `scrollLeft`
   renders but rests open). Building the list under `if not covered` fixes both: cold start renders, rows rest closed.
   Kept as an app-level workaround (3 lines incl. comment); the quirk lives in `host/painted/src/presenter/collection.rs`
   (scroll binding applied once, skipped while the route is covered).
2. iOS two rows open: fixed (names fix). Row 2 opening closes row 1 (screenshot pair). Android: framework limitation,
   both rows stay open (the one-row behaviour is iOS only, `PaintedSwipesIOS.swift`).
3. iOS tap on open content does not close: framework limitation, not fixed. `PaintedSwipes` closes rows only on another
   row's drag; there is no tap handling. A tap on content is not wired to the scroll. Workaround would need a state-bound
   `scrollLeft` and a pressable content (changes semantics); not done.
4. Full swipe: fixed on iOS (full right swipe pressed Complete; Home showed "Nothing to do", data restored). Android:
   framework limitation, a full swipe only snaps open (Android scroll clamps at 0; the full swipe is iOS only).
5. iOS separators: fixed with `list appearance="none"` (own rows, no UIKit separators). Screenshots show none.

### New requirements
- A. Left swipe overlay: done with `position="sticky" left=0` on the row content and `position="relative" z-index=1` on
  Edit/Delete. iOS and Android screenshots: content stays, actions slide over it. No custom gesture code.
- B. Right swipe gap: the Complete button sits in an 88-wide wrapper (76 button + 12 transparent), `scrollLeft=88`.
  Open on Complete: a 12 pt gap of card background between green and dot, iOS and Android. Closed row unchanged.
- Test host cannot read geometry or scroll offsets; tests unchanged except `wheel -88` for the wider leading side.

### Verification
make check clean; make test 35 passed; test-storage 7 pass; test-location 4 pass; test-config 3 pass. No RED was
possible for the root cause (web host ignores swipe names). Device screenshots taken at rest, half-open and open on
both sides (iOS), left open, two open, and open-on-Complete (Android).

### Findings added
- `contract vocab swipe` does not say the names are space-separated; a comma silently refuses the row on iOS only.
- Android: scrollLeft on rows built while covered is dropped and can blank the screen; one-row-open and full swipe are
  iOS only. iOS: a partial reverse drag from fully open can rest part-way (Edit peeking) until touched again.
- Authored lines of the correction (`git diff --numstat 0f8c286..8431fc0 -- mobile`): contract +30/-25, test +1/-1.

## Spec change (2026-11-17, user, after the first device check)

- Swipe left: the row content stays in place. Edit and Delete slide in from the right edge OVER the text until fully shown.
  Done with `position="sticky" left=0` on the content and `position="relative" z-index=1` on the actions, with no
  workaround.
- Swipe right: the row still moves right. A gap of about 12 pt, in the card colour, separates the open Complete action from the dot.

## T3 device verification (2026-11-17)

iPhone 17 Pro Simulator (iOS 26.5, `make ios`) and Pixel 9 Pro XL emulator (API 35, `./exact.mjs android`).

- First build (0f8c286):
  - Android rested open on Complete.
  - iOS let two rows be open at once.
  - Tapping the content did not close the row.
  - A full swipe never fired.
  - iOS drew separators across the rows.
  - Root cause of most of these: the comma-separated `swipeTrailing` names (see the correction section).
- Final build (8431fc0):
  - iOS: no separators; the left overlay keeps the text in place; the right swipe shows Complete with the 12 pt gap.
  - Android: the left overlay and the right gap are correct, and the row rests closed after a cold start.
- Still open on Android: a row ADDED while the app is running rests open on Complete, until the next cold start.
  - Checked by creating a task and returning to Home.
  - It is the same dropped-`scrollLeft` quirk of the Android painted host, and the `if not covered` workaround only covers cold start.
  - A fix needs either an Exact host change or a larger app workaround, so it waits for the user's decision.
- Exact limitations confirmed on Android: no one-row-open and no full swipe (iOS only). On iOS, tapping an open row's
  content does not close it.
- Test data restored: iOS has the sprint demo active, Android has no tasks.

### Measurement (Android emulator, Pixel 9 Pro XL API 35, 60 Hz)

Method: 10 cycles per run of a 300 ms swipe-left that opens Edit/Delete, then a 300 ms reverse swipe that closes it
(`adb shell input swipe`). Frame present times come from `dumpsys SurfaceFlinger --latency` on the app's layer, cleared
before each gesture and read 1 s after it. App CPU comes from `/proc/<pid>/stat` over the whole loop, settle time
included. Two runs per build. Emulator numbers compare the two apps; they are not device numbers.

| Build | Frames / gesture (median) | Interval p50 | p90 | p99 | Janky (>25 ms) | App CPU (one core) |
|---|---|---|---|---|---|---|
| NSH, first build (row pushed left) | 34-35 | 24 ms | 74-80 ms | 123-144 ms | 48-49% | 29-32% |
| Exact, first build (row pushed left) | 8-11 | 30-41 ms | ~101 ms | 164-179 ms | 56-66% | 8.5-8.8% |
| NSH, final (actions overlay the row) | 26.5 | 24 ms | 87-100 ms | 380-422 ms | 48% | 23-26% |
| Exact, final (actions overlay the row) | 8-11 | 32-33 ms | 90-104 ms | 126-144 ms | 56-60% | 8.4-12.1% |

Reading:
- NSH follows the finger with about 3x more frames: its native pan drives an animated value on the UI thread. It costs
  2-3x more app CPU.
- Exact presents few frames per gesture and uses little CPU.
- NSH's final build shows rare long stalls (p99 about 0.4 s) that the first build did not have. The cause is not
  investigated.

Authored lines, final (code + tests, docs excluded):
- Exact (`db7da0b..HEAD`): contract +32/-7, theme +6, tests +93. Code 38 lines.
- NSH (`6922eb1..HEAD`): swipe row 107, snap maths 20, Home +16/-4, theme 8, icons +4/-1, tests 107. Code 155 lines.

## T3 follow-up: Android rows added at runtime (2026-11-17)

- Symptom: a task added from the Tasks tab came back to Home with its row resting open on Complete. Cold start was
  already fine.
- First hypothesis, from `host/painted/src/presenter/collection.rs:470-481`: authored scroll is applied only when the
  plan binds a scroll prop. Turning `scrollLeft=88` into an expression did NOT fix it (device check), so it was reverted.
- Actual cause (`collection.rs:578-589`): when a row's route is hidden (`route_visibility(view).0`), the host records the
  requested `scrollLeft` as consumed but does not apply it. When the route shows again the request is unchanged, so it
  is never applied. A row built while Home is hidden (the splash, or the Tasks tab where the task is added) rests at 0,
  which is open on Complete.
- Fix (commit after d2ff5e3): build the list under `if not covered and nav.tab == "home"`, a one-line condition with the
  same pattern as the splash case. `make check` clean; `make test` 35 passed, 0 failed.
- Device check:
  - Android: a cold start rests closed with no blank screen. A task added from Tasks rests closed back on Home. Left
    overlay and right gap still work.
  - iOS: after Tasks -> Home the row rests closed and swipes open.
- Side effects: open rows close when you leave Home, because the rows are rebuilt on each return. Once, on Android, a
  400 px swipe right after returning to Home did not engage; the next one did. Not reproduced.
- Exact finding: in the Android painted host, a hidden route consumes an authored `scrollLeft` without applying it. It
  is worth an upstream report.
