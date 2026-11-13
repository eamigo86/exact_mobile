# Feature: liquid-glass-ui

Locator: `odd/tasks/liquid-glass-ui.md` · Engram mirror: `odd/liquid-glass-ui/tasks`

## Objective

Make the Exact Todo app visually attractive with a current Liquid Glass design
(iOS 26 style), keeping it native on every host.

## Problem / why

The first version (feature `exact-todo`) is functional but plain: default grouped
lists, a thin progress bar and no brand colour. The user asked for a modern
"liquid" UI that appeals to users, like HyperTodo's colourful dashboard.

## Scope

- Brand palette in `mobile/app.tamber` (light and dark tokens), blue/violet accent.
- Home: gradient hero, large greeting and "X of Y done today", ring progress,
  stat tiles as glass cards (`backgroundMaterial="glass"`, `glassGroup`) with symbols.
- Tasks: status filter as glass chips, category colour on each row, floating
  `prominent-glass` add button.
- Categories: each category has a colour (seeded defaults, chosen from a palette
  in the add sheet), shown as tinted cards with counts.
- Settings: grouped form kept, brand accents.

## Constraints

- Platform bars, tab bar and sheets stay the platform's (they are already glass on iOS 26).
- No painting on platform controls; colours by tamber tokens or roles.
- Exact documents glass on iOS/macOS (native) and web/Linux (blur); Android is unverified.
- All existing behaviour and its 8 tests keep passing.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (`bun exact.mjs test web`).
- New behaviour (category colour) gets failing tests first; pure styling is checked by `verify` and screenshots.
- RDD: off (global).

## Tasks

- [x] T1 Redesign with tamber palette, glass Home, chips, category colours (tests first for colours). Route: delegated writer (app.contract, app.ts, app.tamber, tests).
- [x] T2 Verify web, iOS and Android; review screenshots light and dark. Route: inline per-action. Evidence: after parent polish (hero as inset rounded card, bolder greeting, US "Color"): `make verify` clean; `make verify-ios` 11/11, 0 findings incl. largest text; `make verify-android` 11/11, screenshots reviewed (glass renders as translucent tint, no blur, on Android).

## Acceptance criteria

- `make test` and `make verify` pass with 0 findings.
- `make verify-ios` passes with 0 findings; glass visible on iOS 26 screenshots.
- `make verify-android` passes its tests; Android screenshots reviewed by hand.

## Progress / evidence

- 2026-11-13: confirmed `backgroundMaterial`, `buttonStyle="glass"`, `glassGroup` and `app.tamber` in Exact 33faab4a.

- 2026-11-13 T1 done (writer). RED: `make test` 6 passed, 5 failed (no `color` field, no chip/swatch testIds, greeting). GREEN: 11 passed. `make check` `[]`; `make verify` clean (0 findings); `bun exact.mjs verify ios` clean (0 findings, 11 tests). Makefile bug found by the writer (`$(RUN)` repeated `cd mobile &&` in test-ios/verify-ios) fixed by the parent.
- Test steps changed on purpose: status select -> `tap chip-*`; greeting "Hello, Ada" -> "Good afternoon, Ada" (time-of-day greeting requested).

## Next step

Done. Possible follow-ups: restyle the add/edit task sheet; motion on chip selection.
