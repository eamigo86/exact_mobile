# Feature: exact-sqlite

Locator: `odd/tasks/exact-sqlite.md` · Engram mirror: `odd/sqlite/tasks`

## Objective

Keep the app's tasks and categories in a local SQLite database (`storage.sqlite`) instead of
`app:/data/todo.json`, with a one-time import of the existing JSON, on iOS and Android. The same
change goes into the NSH Todo app (`../nsh_mobile`, branch `feat/nsh-sqlite`, through a Rust
crate) to compare offline/local-database support (2026-11-16 request).

## Scope

- `app:/data/todo.db`: tables `categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE,
  color TEXT NOT NULL)` and `tasks(id INTEGER PRIMARY KEY, title, notes, category_id TEXT, due, time,
  done INTEGER NOT NULL DEFAULT 0)`; `PRAGMA user_version` for the schema version.
- Every existing source (`loadTasks`, `loadCategories`, `saveTask`, `toggleTask`, `removeTask`,
  `addCategory`) runs SQL statements (no rewrite of the whole data set per change). The view and
  its behaviour stay the same.
- First run: if `user_version` is 0, import `todo.json` (or the seed categories when it does not
  exist) in one transaction that also sets `user_version = 1`; then rename the JSON to `todo.json.bak`.
- Settings (name, appearance, onboarding flag, avatar path) stay where they are (`persist`).
- Out of scope: sync with a server, web and macOS checks.

## Constraints

- Branch `feat/exact-sqlite` from `feat/exact-avatar` (cbfbe00). Exact SDK `~/.exact/exact2` (33faab4a).
- Keep `make check`, `make test`, `make test-location` and `make test-config` green. No `share` or `feedback` verbs.
- Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (Contract tests on
  the web host; SQLite runs as WASM there; each test starts from an empty store; `reload` keeps it).
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 SQLite storage behind the existing sources, one-time JSON import, tests first. Route: delegated writer (data module, tests, manifest).
- [ ] T3 Verify on the iOS Simulator and the Android emulator: upgrade from the JSON build keeps the data, add/edit/toggle/delete, relaunch; inspect the database file. Route: inline per-action.

## Acceptance criteria

- `make check` and the test targets pass, with tests for the import and for data surviving a reload.
- On both platforms, an install that had JSON data keeps its tasks after the upgrade, `todo.db` holds
  them, and changes survive a relaunch.

## Delivery

- Forecast: about 150-250 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created from cbfbe00.
- T2 (commit 53646f0, route: delegated writer). TDD strict, runner `make test`.
  - RED: `make test-storage` (new, `bun test app.storage.test.mjs`, fake storage with bun:sqlite) before the change:
    6 pass, 1 fail (`the JSON file is imported once ... todo.json.bak`: `todo.json` still present).
    The behaviour tests (add/edit/toggle/delete, duplicate refusal, reload) passed on the JSON store too.
  - GREEN: `make test-storage`: 7 pass, 0 fail. `make check`: `[]`. `make test`: 27 passed, 0 failed (incl. new
    "a category and a done task survive a reload"). `make test-config`: 3 pass. `make test-location`: 4 pass.
  - `cd mobile && bun exact.mjs ios --no-install`: built and signed, installed on nothing.
    `bun exact.mjs android --no-install`: BUILD SUCCESSFUL, `target/android/app/outputs/apk/release/app-release.apk`.
  - Import test: a Contract test cannot seed `app:/data/todo.json`, so the import is tested at TS level
    (`mobile/app.storage.test.mjs`, `make test-storage`): `answer()` with a fake `storage` (files in a Map; SQLite from
    `bun:sqlite` with `safeIntegers`, one open handle per file, so overlapping calls fail as busy). Not run on a device.
  - Manifest: no `app.json` change; `typescriptRuntime` is not a manifest key here (derived from the module's grants).
    The `sqlite.open` grant changes the binary identity: a device needs the new build installed.
  - DB location: `app:/data/todo.db` (the app's `app:/data` directory; exact on-disk path not verified, to be found in T3).
    Old file kept as `app:/data/todo.json.bak`.

## Findings for the comparison (Exact)

- Worked first time: schema, `user_version` import transaction, `PRAGMA user_version` read and set through `query` and
  `transaction`, bigint ids with `String(...)`, build for both platforms; the docs' promise-queue recipe
  (`contract-for-humans.md`, reading list) was enough.
- Workarounds: none in the app. The import test needed a hand-made fake `storage` (bun:sqlite adapter) because the
  Contract tests start from an empty store and cannot pre-seed an `app:/` file; no documented seed fixture found.
- Doc gaps: no documented way to seed `app:/data` files for a Contract test; `typescriptRuntime` 10 is described in
  the reference but the app needs no setting (derived), which the grants paragraph does not say outright.
- Errors and fixes: none after RED. One design point: the web host (Contract tests) runs SQLite as WASM, so `make test`
  exercises the real queue/open/close path, while the import path only runs in the fake-storage test.
- iOS/Android: both build with `--no-install`; behaviour on devices is for T3.
- Size: `app.ts` +94/-35 lines (net data layer about the same size); tests +30 lines Contract, ~100 lines
  `app.storage.test.mjs`; Makefile +4 lines; no manifest or contract change.
