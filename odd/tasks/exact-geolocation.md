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

- [x] T1 Branch `feat/exact-geolocation` from `feat/exact-todo` (f9db9bc); this document. Route: inline (mechanical).
- [x] T2 Baseline sizes: release iOS simulator .app (and stripped main binary) and Android release APK (per ABI) of the current app, built the way the measured comparison used. Route: delegated writer (same as T3). Evidence below; b91aa90 (Android needs `deploy.store.linux: "0"`).
- [x] T3 Location card with tests first, `@exact/geolocation` added, iOS and Android builds; sizes after, measured the same way. Route: delegated writer. Evidence below; 526ac5e.
- [x] T4 Verify on the iOS Simulator and the Android emulator with a simulated position (granted, denied, location off); compare with the NSH spike. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with the new tests.
- On the iOS Simulator and the Android emulator the card shows the simulated position when
  allowed, and a clear message when denied or when location is off.
- Size, lines and build times recorded before and after, with the same build settings.

## Delivery

- Forecast: under 200 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- 2026-11-14: branch created from `feat/exact-todo` at f9db9bc.

- 2026-11-14 T2 baseline (release builds, `bun exact.mjs` in `mobile/`, Bun 1.4.2, EXACT=~/.exact/exact2; `/usr/bin/time -p`):
  - iOS Simulator: `bun exact.mjs ios --release --no-install --json`: 14.3 s (warm cache). `.app` 15532 KB (du), 15 893 966 B summed; main binary 15 853 920 B as built, identical after `xcrun strip -x -S` on a copy (already stripped; the 14 MB dSYM is separate and not in the .app).
  - iOS device (ad-hoc): `bun exact.mjs ios --device --release --unsigned --json`: 164.8 s (cold cargo+swift, 98.5 s + 62.7 s). `.app` 15612 KB du, 15 976 716 B summed; binary 15 936 800 B, unchanged by strip.
  - Android: `EXACT_UPDATE_TRUST=production bun exact.mjs android --release --no-install --json`: first run refused (the Linux bake's update store is on); fix `deploy.store.linux: "0"` in app.json (b91aa90). Then 229.9 s. APK 33 730 299 B (32.2 MiB); only arm64-v8a: libexactcanvas.so 30 447 280 B, libexact_sound.so 21 680 B, libandroidx.graphics.path.so 10 096 B; classes.dex 2 604 400 B; resources.arsc 484 152 B. (An older 35.7 MB figure is not reproduced: this APK has one ABI and 33.7 MB.)
- 2026-11-14 T3 (strict TDD): `bun exact.mjs add geolocation` writes the dependency to package.json (`file:` link to the SDK package) and bun.lock; grant `device.geolocation purpose.locationPurpose` in app.ts and `strings/en.json` key `purpose.locationPurpose` (the recipe's bare `locationPurpose` key is refused by the build: `grant-purpose`). No native code, no Xcode/Gradle project files, no downloads.
  - RED: `make test`: `app.test.contract:219:20 [syntax-expected-step]` for `prefer permission.geolocation ...` (Contract tests have no permission or position step), then with the idle/pending test: `11 passed, 1 failed` ("no view matches location-button"). Bun drive tests against the old Contract: 3 failed (stale/missing card).
  - GREEN: `make check` `[]` (clean); `make test` `12 passed, 0 failed` in 17.8 s wall (7.8 s user); `make test-location` (new, builds then `bun test app.test.mjs`, 4 tests: position with 5 decimals, denied, POSITION_UNAVAILABLE, other code) `4 pass, 0 fail`.
  - Contract runner: nothing answers a device request, the position request waits on a `permission` ticket, so the Contract test asserts idle then pending (button disabled). Granted/denied/position are covered by `app.test.mjs`, which uses the SDK's `scripts/agent.mjs` `open` + `prefer` (same as weatherlight's tests).
  - Same commands after: iOS sim 21.8 s (warm), device 21.5 s (warm; not comparable with the 164.8 s cold baseline), Android 220.6 s.
  - iOS sim `.app`: 16108 KB du (+576 KB), 16 467 321 B summed (+573 355 B). Main binary 15 853 920 B, unchanged (as built and stripped). New `Frameworks/ExactModules.framework/ExactModules` 517 008 B (as built = stripped) plus receipt.json 14 939 -> 66 052 B, en.lproj, Info.plist +244 B (`NSLocationWhenInUseUsageDescription`).
  - iOS device `.app`: 16204 KB du (+592 KB), 16 566 799 B summed (+590 083 B); main binary 15 936 800 B unchanged; ExactModules 533 664 B.
  - Android APK: 33 738 555 B (+8 256 B, +0.02 %): classes.dex +7 804 B (2 612 204), libexactcanvas.so +8 192 B (30 455 472); other libs unchanged; manifest gains ACCESS_FINE_LOCATION and ACCESS_COARSE_LOCATION.
  - Authored lines (git diff --numstat, plus new files): app.contract +23, app.test.contract +12, app.ts +1/-1, package.json +3/-1, Makefile +4/-1, new app.test.mjs 49, strings/en.json 3, bun.lock 15 (generated); about 95 authored, 110 with the lockfile.
  - Not verified: behaviour on the iOS Simulator and Android emulator (T4); the real iOS prompt text; macOS and web in a browser.

- 2026-11-14 T4 (parent, inline per-action):
  - iOS 26.5 Simulator (iPhone 17 Pro), `EXACT_SIM=<udid> make ios` (development standalone build, 22.4 s),
    position `40.41680,-3.70380`: the system prompt shows "Exact Todo shows your current position in Settings.";
    "Don't Allow" -> "Location permission denied. Allow it in the system settings."; after `simctl privacy grant`
    -> "Latitude 40.41680 / Longitude -3.70380 / Accuracy 5 m". The development build carries the usage string,
    so the API works in the dev loop (the NSH development host did not).
  - Android API 35 emulator, release APK (`adb install -r .../app-release.apk`): the prompt offers Precise and
    Approximate; "Don't allow" -> denied message; after `pm grant` -> same position, accuracy 5 m; location off
    -> "Location services are off. Turn them on and try again."
  - Compared with the NSH spike (`../nsh_mobile`, `feat/nsh-geolocation`): Exact needed no native code and no
    project files (about 95 authored lines, most of them tests) and grew the iOS app by 0.57 MB (+3.7%) and the
    Android APK by 8 KB; NSH needed Swift and Kotlin bridges (or a Rust crate on iOS) plus Xcode and Gradle
    projects, with +0.74 MB on iOS through the crate.
- [x] T4 ticked after this verification.

## Next step

Done.
