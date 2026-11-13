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
- [x] T3 "Warm Paper" palette (user rejected blue-violet): warm paper neutrals, light peach/pink mesh hero, white-alpha glass tint, single terracotta accent, accessible category colours; overdue as danger text, not red glass. Route: inline (app.tamber values + small app.contract token edits, already understood). Styling only: existing 11 tests are the regression guard. Evidence: `make verify` clean (390 and 1280 wide, light/dark, largest text); `make verify-ios` 11/11, 0 findings; `make verify-android` 11/11, screenshots reviewed. Extra fixes found while verifying: stat tiles wrapped at 390 pt (content-box flex basis 5rem -> 3.5rem); keyboard stayed over the next tab after editing Settings (`blur()` on tab switch); Android painted controls in Material You primary (root `accent-color="brand.accent"`).
- [x] T2 Verify web, iOS and Android; review screenshots light and dark. Route: inline per-action. Evidence: after parent polish (hero as inset rounded card, bolder greeting, US "Color"): `make verify` clean; `make verify-ios` 11/11, 0 findings incl. largest text; `make verify-android` 11/11, screenshots reviewed (glass renders as translucent tint, no blur, on Android).

## Acceptance criteria

- `make test` and `make verify` pass with 0 findings.
- `make verify-ios` passes with 0 findings; glass visible on iOS 26 screenshots.
- `make verify-android` passes its tests; Android screenshots reviewed by hand.

## Progress / evidence

- 2026-11-13: confirmed `backgroundMaterial`, `buttonStyle="glass"`, `glassGroup` and `app.tamber` in Exact 33faab4a.

- 2026-11-13 T1 done (writer). RED: `make test` 6 passed, 5 failed (no `color` field, no chip/swatch testIds, greeting). GREEN: 11 passed. `make check` `[]`; `make verify` clean (0 findings); `bun exact.mjs verify ios` clean (0 findings, 11 tests). Makefile bug found by the writer (`$(RUN)` repeated `cd mobile &&` in test-ios/verify-ios) fixed by the parent.
- Test steps changed on purpose: status select -> `tap chip-*`; greeting "Hello, Ada" -> "Good afternoon, Ada" (time-of-day greeting requested).

- 2026-11-13 T3 rationale (research, Apple HIG Color/Materials fetched directly, Dec 2025): Liquid Glass has no colour of its own and takes it from the backdrop; tint sparingly, not on many controls; dark tint over a saturated mid-tone gives muddy grey; blue-violet reads as the generic "AI gradient". Task-app/trend sources were search snippets only (weak evidence).

## Next step

Done. Alternatives researched but not applied: "Sage Calm" (green) and "Midnight Aurora" (deep navy hero); switching is a palette-only edit in `mobile/app.tamber`.
