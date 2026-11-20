# Feature: exact-sdk-main

Locator: `odd/tasks/exact-sdk-main.md` · Engram mirror: `odd/exact-sdk-main/tasks`

## Objective

Move the app from the pinned Exact SDK checkout (33faab4a, 2026-11-13) to Exact `main` (3e84781a, 2026-11-20) and keep
every feature working. Exact has no releases; `main` was 1539 commits ahead (2026-11-20 request).

## Scope and constraints

- Branch `chore/exact-sdk-main` from `main` (1c92cde).
- SDK: `~/.exact/exact2` (shallow clone) checked out at 3e84781a. The old pin stays reachable as the local branch
  `pin-33faab4a` in that clone, so going back needs no network.
- App: `bun exact.mjs update` rewrites `exact.mjs`, the crates.io patches, the toolchain and the exact2 dependency paths.
- The app's own code changes only if the new SDK breaks something.
- Bun stays 1.4.2 (Exact `main` still pins it).
- TDD: strict (project setting). Runner: `make check`, `make test`, plus `make test-config`, `test-storage`, `test-chart`.
- Delivery: `ask-on-risk`; no push.

## Tasks

- [x] T1 Check out Exact main in the SDK clone and run its setup (route: inline, outside the repo)
- [x] T2 Run `bun exact.mjs update` in the app and commit what it rewrites (route: inline, generated files)
- [x] T3 `make check` and the test targets; fix only what the new SDK breaks (route: inline, one rename)
- [x] T4 Verify on the iOS simulator and the Android emulator: Home, Up next swipe, Tasks, New Task sheet, Market,
  Settings, Location (route: inline per-action)
- [x] T5 Re-check the 6 known Exact issues on the new SDK (route: inline)

## What the new SDK changes for this app

- `exact.mjs` now finds the SDK through a `.exact/checkout` symlink in the app folder (already ignored by `.exact/`).
  `app.json`'s `$schema`, `package.json`'s `@exact/geolocation` path and `AGENTS.md` point there; `bun install` refreshed
  `bun.lock`.
- The design file format was renamed from tamber to forma: the build refuses `app.tamber` with
  `rename app.tamber to app.forma`. Done as the docs say (`contract-for-agents.md`): the file is now `app.forma` with the
  header `forma exacttodo`. `app.json` has no `tamber` key. `app.config.test.mjs` reads `app.forma` (RED first: it
  failed on the missing file, then passed after the rename).
- New test notes: tests that arm `fail fetch` for the Coinbase API before the first load get a note that every first
  load fails. They still pass; that is what those tests check (no network at launch).

## Verification

- SDK setup on 3e84781a: every check `ok`, 1 min 45 s.
- `make check`: no errors (the Contract compiler rebuilt itself).
- `make test`: 35 passed, 0 failed (the same 35 as on 33faab4a). `test-config` 3/3, `test-storage` 7/7,
  `test-chart` 20/20, `test-location` 4/4.

- iOS 26.5 simulator (iPhone 17 Pro), `make ios` (2 min 44 s cold on the new SDK): the existing data (3 tasks, "Ada",
  the photo) loads; Home with the Warm Paper palette (so `app.forma` is read); the Up next swipe opens Edit and Delete,
  rounded and fully shown once it settles; Tasks; the New Task sheet opened with the on-screen keyboard shows the whole
  form (unlike NSH); the due date opens the native calendar and offers "Remove Due Date"; Market loads history and goes
  Live; Settings; Location shows the simulated position (40.41680, -3.70380, 5 m).
- Android API 35 emulator, `make android` (3 min 10 s): Home, Tasks, the New Task sheet with the keyboard, Market
  (Live), Location (system prompt, then the simulated position). The emulator's copy had no tasks or name before this
  change too (the old build shows the same). Up next swipe checked with a test task added for it: left shows Edit and
  Delete, right shows Complete, Delete removes the row. The test tasks were deleted; the app is back to no tasks.
- Baseline A/B with the old build (SDK `pin-33faab4a` + app `main` 1c92cde), then back to the new SDK on both devices:
  - iOS Settings avatar: the 64 pt circle is cut flat at the top and sides inside its grouped row. The old build shows
    the same, so it predates this change.
  - iOS data survived the old/new round trip (data container backed up first).
  - Switching the SDK clone back to the old pin needs the generated `host/apple/Sources/ExactCore/GeneratedBatch.swift`
    (untracked, written by the new SDK's build) moved aside, or the old Swift build fails with "invalid redeclaration".
- Visible change: on iOS the tab bar's unselected Market and Settings icons are now filled (outlined before).
- Not checked: dark mode, the photo picker, the date pickers on Android, a physical device, `make verify-ios` /
  `verify-android`.

## Known Exact issues on 3e84781a

1. Android `scrollLeft` dropped while the route is hidden: the code in `host/painted/src/presenter/collection.rs`
   (`sync_authored_scroll`) is unchanged, so the app's workaround stays. A row added from Tasks then shown on Home
   rested closed on both the old and the new build, so that path does not reproduce it; not proven either way on
   device.
2. iOS: pressing an open swipe row's content does not close it. Still happens (tapped the open Up next row).
3. iOS: an image inside a native `button` is empty. No fix commit found; the app's pressable box still works.
4. iOS: an image in a grouped row keeps its first picture. No fix commit found; the keyed row still works. Not
   re-tested without the workaround.
5. Contract has no `abs`, `sqrt` or `pow`: unchanged by design; the compiler names `x * x` and `max(x, -x)` and sends
   other maths to the data source.
6. `Date.now()` in data sources: unchanged by design (`docs/reference.md`, LLP 1027.000); time is a source argument.

## Next step

None for the upgrade. Push and merge stay with the user.
