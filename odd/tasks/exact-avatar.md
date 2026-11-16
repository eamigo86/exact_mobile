# Feature: exact-avatar

Locator: `odd/tasks/exact-avatar.md` · Engram mirror: `odd/exact-avatar/tasks`

## Objective

Let the user change their avatar in Settings with a photo from the photo library and show it on
Home as "(avatar) Hello, <name>", on iOS and Android. The same feature goes into the NSH Todo
app (`../nsh_mobile`, branch `feat/nsh-avatar`) to compare both frameworks (2026-11-16 request).

## Scope

- Settings: tapping the avatar circle, or a "Choose photo" button, opens the system photo picker
  (`input type="file" accept="image/*"`, no permission needed). The picked photo is centre-cropped
  to a square, resized to 256 px, saved as a JPEG under `app:/data/`, and its path persisted.
  "Remove photo" goes back to the initial or the person symbol. Cancelling changes nothing.
- Home: the hero card's greeting row shows the avatar (44 pt circle, same fallback) before the text.
  The greeting becomes "Hello, <name>" ("Hello" with no name), as requested; the time-of-day
  salutation goes away.
- Out of scope: camera capture, editing or zooming the crop, macOS and web checks.

## Constraints

- Branch `feat/exact-avatar` from `feat/exact-onboarding` (3cada56). Exact SDK `~/.exact/exact2` (33faab4a).
- Keep `make check` and `make test` green. No `share`, `feedback send` or `feedback always`.
- Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (Contract tests,
  web host; `pick "<id>" "<fixture>"` simulates a picked file).
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Avatar pick, crop/resize, persist and remove in Settings; avatar and "Hello, <name>" on Home; tests first. Route: delegated writer (2+ non-trivial files: app.contract, app.ts, tests).
- [ ] T3 Verify on the iOS Simulator and the Android emulator: pick, cancel, relaunch, remove, light and dark. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with the new tests.
- On both platforms a picked photo shows as a round avatar in Settings and on Home, survives a
  relaunch, and Remove photo restores the fallback.

## Delivery

- Forecast: about 120-200 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created from 3cada56.
- T2 (commit b45efe6): RED first: with only the tests written, `make test`: "21 passed, 5 failed" (pick tests
  failed with "@avatar-file: no held device request", greeting test with "Good morning, Ada").
  GREEN: `make test`: 26 passed, 0 failed (transforms ran for real on the web test host).
  `make check`: `[]` (no errors). `make test-location`: 4 pass, 0 fail. `make test-config`: 3 pass, 0 fail.
  `bun exact.mjs ios --no-install`: built "Exact Todo.app" (iOS simulator, not installed).
  `bun exact.mjs android --no-install`: BUILD SUCCESSFUL, app-release.apk (not installed).
  Not verified on a device (user does T3).
- Size: 161 insertions, 14 deletions in the commit: app.contract 67 lines changed, app.ts 27,
  app.test.contract 81 (6 new tests + 1 updated), fixture 5.4 KB JPEG.

## Findings for the comparison

- Worked first time: the built-in `input type="file" accept="image/*"` + `showPicker(id)`; no package,
  no permission. `pick "<id>" "fixtures/avatar.jpg"` and `pick ... cancel` in tests. `persist` for the path.
  `storage.fs.compressImage` + `transformImage` ran for real under `make test` (no `--storage` needed).
- Workarounds: (1) `Date.now()` is refused in data sources (`analyze-ambient-api`), so the fresh file
  name seed is passed in from the contract (`time.epochAtZero + performanceNow()`). (2) No image size on
  `Picked` that I could find, so a first `compressImage` (max 1024 px) gives the size, then `transformImage`
  crops the centre square and resizes to 256. (3) The file input must be mounted for `showPicker`; it sits in
  the profile section as a 1x1 transparent input. (4) `app.contract.d.ts` is gitignored, regenerate with
  `contract types`.
- Doc gaps: no doc example of a button that opens the picker for an image and of a hidden input; `Picked`
  fields (width/height) are not listed. Fixed warning: absolute `width=44` raised `lower-text-px-width`, so
  the 44 pt hero avatar is `2.75rem`.
- Errors and fixes: `sed -i` on macOS; first draft of the transform used `Date.now()` (above). Nothing else.
- iOS/Android differences: none seen at build time; the Android picker is the system Photo Picker for `image/*`.
- Lines: contract 67, data module 27, tests 81, total about 175 plus the fixture.
- Staged `.atl/skill-registry.md` once by accident and unstaged it before the commit.
