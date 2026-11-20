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
- [ ] T4 Verify on the iOS simulator and the Android emulator: Home, Up next swipe, Tasks, New Task sheet, Market,
  Settings, Location
- [ ] T5 Re-check the 6 known Exact issues on the new SDK

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

## Next step

T4.
