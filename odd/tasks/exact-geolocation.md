# Feature: exact-geolocation

Locator: `odd/tasks/exact-geolocation.md` · Engram mirror: `odd/exact-geolocation/tasks`

## Objective

Spike: add the same Settings "Location" card the NSH app got (`../nsh_mobile`, branch
`feat/nsh-geolocation`) to the Exact Todo app with Exact's first-party `@exact/geolocation`
package, and measure what it costs: lines, build times and, above all, app size on iOS and
Android before and after.

## Problem / why

The NSH spike needed its own Swift and Kotlin bridges and native projects. Exact ships
geolocation for Apple, Android and web (`~/.exact/exact2/packages/geolocation`). The user asked
(2026-11-14) to compare the app size growth of the same feature in Exact.

## Scope

- Settings gets a "Location" card: a "Show my location" button that asks for the current
  position once and shows latitude and longitude (5 decimals) and accuracy in metres, or a
  clear message: permission denied, location off or unavailable, other error. Same wording as
  the NSH app where Exact allows.
- `@exact/geolocation` added the way Exact documents (`bun exact.mjs add geolocation`, grant
  lines, usage strings), precise accuracy, foreground only.
- Out of scope: watching the position, geofencing, background location, macOS and web checks.

## Constraints

- Exact SDK at `~/.exact/exact2` (33faab4a). App in `mobile/`, commands through the root Makefile.
- Keep the existing tests and `make check` green.
- Do not run `share`, `feedback send` or `feedback always` (they reach external services).
- Artifacts in English.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (Contract tests,
  web host); `make test-ios` / `make test-android` where a native check is needed.
- RDD: off (global).

## Tasks

- [x] T1 Branch `feat/exact-geolocation` from `feat/exact-todo` (3b93d6c); this document. Route: inline (mechanical).
- [ ] T2 Baseline sizes: release iOS simulator .app (and stripped main binary) and Android release APK (per ABI) of the current app, built the way the measured comparison used. Route: delegated writer (same as T3).
- [ ] T3 Location card with tests first, `@exact/geolocation` added, iOS and Android builds; sizes after, measured the same way. Route: delegated writer.
- [ ] T4 Verify on the iOS Simulator and the Android emulator with a simulated position (granted, denied, location off); compare with the NSH spike. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with the new tests.
- On the iOS Simulator and the Android emulator the card shows the simulated position when
  allowed, and a clear message when denied or when location is off.
- Size, lines and build times recorded before and after, with the same build settings.

## Delivery

- Forecast: under 200 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- 2026-11-14: branch created from `feat/exact-todo` at 3b93d6c.

## Next step

T2 and T3 after the NSH T5 writer finishes (sequential, so build times are not skewed by
two Rust builds at once).
