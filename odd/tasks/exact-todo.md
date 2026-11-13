# Feature: exact-todo

Locator: `odd/tasks/exact-todo.md` · Engram mirror: `odd/exact-todo/tasks`

## Objective

A local-first TODO app for iOS and Android built with Expo's Exact runtime
(https://github.com/expo/exact), inspired by HyperTodo
(https://github.com/eamigo86/HyperTodo), plus a Makefile for every command.

## Problem / why

HyperTodo is server-driven (Django + Hyperview). This project explores the same
product on Exact: Contract views + a TypeScript data module, native UIKit on iOS,
native Android, and the web as the fast dev/test loop.

## Scope

- Tabs: Home (dashboard), Tasks, Categories, Settings.
- Home: greeting with display name, "X of Y done today" progress, All / Today /
  Overdue counts, "Up next" open tasks.
- Tasks: filter (All, Active, Done, Today, Overdue) and by category; complete,
  delete (swipe), edit in a sheet; add sheet with title, notes, category, due date/time.
- Categories: list with task counts, add category.
- Settings: display name.
- Persistence: JSON files in the app's sandbox (Exact `fs` grants).

Out of scope (HyperTodo server features): login, Django backend, SSE realtime,
avatars, biometrics, push, side menu, server templates.

## Constraints

- Exact is pre-1.0, no packaged CLI: the app depends on a source checkout
  (`EXACT_SDK`, default `~/.exact/exact2`) and Bun 1.4.2 (`~/.bun-1.4.2`).
- Exact Android support is early (admitted 2026-10-07).
- Artifacts in English.

## TDD

- Mode: strict, enabled. Source: user global instructions (`~/.claude/CLAUDE.md`).
- Runner: `bun exact.mjs test web` (Contract tests in `*.test.contract`).
- RDD: off (global), no native review.

## Tasks

- [ ] T1 Scaffold: SDK + Bun bootstrap, `exact new --with ios,android`, git, Makefile. Route: inline (mechanical, one file).
- [ ] T2 Tasks + categories + dashboard + settings app (tests first). Route: delegated writer (2+ non-trivial files).
- [ ] T3 Platform checks: `verify web`, `verify ios`, `verify android`. Route: inline per-action.

## Acceptance criteria

- `make test` passes on the web host.
- `make verify-ios` builds and runs on an iOS Simulator.
- `make verify-android` builds and runs on the Android emulator, or the gap is reported.

## Progress / evidence

- 2026-11-13: SDK cloned (33faab4a), Bun 1.4.2 installed, `exact setup` running.

## Next step

T1.
