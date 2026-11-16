# Feature: exact-onboarding

Locator: `odd/tasks/exact-onboarding.md` · Engram mirror: `odd/exact-onboarding/tasks`

## Objective

Add an animated splash screen, a skippable first-launch onboarding with vector illustrations,
a Settings entry to see the onboarding again and a Settings appearance option (dark mode) to
the Exact Todo app, on iOS and Android. The same features go into the NSH Todo app
(`../nsh_mobile`, branch `feat/nsh-onboarding`) to compare how well each framework does it:
quality, lines of code, difficulty and limitations (2026-11-16 request).

## Scope

- Brand: one logo designed for this comparison (`mobile/assets/brand/`): a warm orange tile
  with a paper sheet and a check mark. The same SVG masters are used in both apps.
- Native launch screen: page colour in light and dark, the logo on iOS (`host.ios.launchImage`),
  and the logo as the app icon. Android has no splash-image key in Exact (colour only).
- In-app animated splash right after the native one: the logo pops in, the check mark draws,
  the app name fades in, then the splash gives way to onboarding or the tabs (about 1.5 s,
  shorter with reduced motion).
- Onboarding: 4 steps, each a flat inline-SVG illustration with a short title and one line of
  text. Skip on every step, Next, page dots, "Get started" on the last step. Shown on first
  launch only (persisted flag).
- Settings: "Show onboarding" opens it again. Appearance: System, Light or Dark, persisted and
  applied at launch.
- Out of scope: macOS and web checks (they may work, not verified), localisation.

## Constraints

- Exact SDK at `~/.exact/exact2` (33faab4a). App in `mobile/`, commands through the root Makefile.
- Keep the existing tests and `make check` green.
- Do not run `share`, `feedback send` or `feedback always`.
- Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make test` (Contract tests,
  web host).
- RDD: off (global).

## Tasks

- [x] T1 Branch `feat/exact-onboarding` from `feat/exact-geolocation` (b09c0ab); this document. Route: inline (mechanical).
- [x] T2 Brand assets and native launch: logo and icon SVG/PNG, `background_color` light and dark, app icons (no `launchImage`: colour only on both platforms, decided by the requester). Route: delegated writer (T2-T4, one writer, trigger: 2+ non-trivial files).
- [x] T3 Animated in-app splash and the 4-step onboarding, tests first. Route: delegated writer.
- [x] T4 Settings: "Show onboarding" and Appearance (System/Light/Dark, persisted, applied at launch), tests first. Route: delegated writer.
- [ ] T5 Verify on the iOS Simulator and the Android emulator: first launch, skip, reopen, theme switch in light and dark; screenshots; lines of code. Route: inline per-action.

## Acceptance criteria

- `make check` and `make test` pass with the new tests.
- First launch shows the animated splash, then onboarding; Skip or Get started lands on the
  tabs; the next launch goes from the splash straight to the tabs.
- Settings reopens onboarding; the appearance choice changes the app at once and survives a
  relaunch.
- Checked on the iOS Simulator and the Android emulator in light and dark.

## Delivery

- Forecast: about 350-450 authored lines (most of it illustration markup). Strategy:
  `ask-on-risk`. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created from b09c0ab.
- T2 (08849df): RED `bun test app.config.test.mjs`: 1 pass, 2 fail. GREEN after app.json (`background_color`
  #f6f3ee, dark #151210 = `surface.page` tokens; `icons`: icon-1024.png "maskable any" + icon.svg; no `launchImage`):
  3 pass. `make check` `[]`; `make test` 12 passed; `ios --no-install` exit 0 (Info.plist: `UILaunchScreen` colour only,
  `AppIcon` present); `android --no-install` exit 0 (aapt2: adaptive icon res/s3.xml, `roundIcon` set). New `make test-config`.
- T3+T4 (db04f72, one commit: both edit the same few places in app.contract). RED `make test`: 12 passed, 8 failed (new
  tests). After implementing, existing tests failed too ("view is hidden or inert": splash covers the app) until each got
  a 3-line prelude (`clock +1600`, `tap "onb-skip"`, `clock settle`; after `reload` a `clock +1600`). GREEN: `make check`
  `[]`, `make test` 21 passed 0 failed, `make test-config` 3 pass, `make test-location` 4 pass (prelude added to
  app.test.mjs), `ios --no-install` and `android --no-install` exit 0 (15 s and 28 s, plan-only change). Web screenshots
  (agent web, 390x844, light and dark) checked for splash frames, step 2 and step 4.
- Not verified: devices (T5), the Android/iOS look of Back/Skip/dots, the swipe by a real finger (only the web mouse drag
  in a test), `setScheme` effect (tests assert state only), `exactViewport` reduced motion on device.

## Findings for the comparison

Worked first time
- `persist` flag read before the first frame (`first-launch` recipe), no storage code. Radiogroup settings pattern.
- Inline `svg` with gradients, groups, transforms, strokes: the four illustrations and the logo were translated
  mechanically (a 30-line script turned the SVG files into Contract syntax). Rendered right on the web host.
- `keyframes` + `animation="name dur delay both"` for entrances; `stroke-dashoffset` keyframes (check draw) compiled and
  render on web; the iOS/Android native drawing of it is unverified.
- Gated `task ... when` with `after(ms, action)` for the splash timeline; tests drive it with `clock +N`.
- `prefer prefers-reduced-motion reduce` as a launch line in a test; `swipeleft`/`swiperight` testable with
  `tap id drag dx 0 mouse` (web only).

Workarounds and errors
- Keyframes cannot animate `width` or a per-axis `scale` (compiler error `lower-keyframe-property`, `lower-keyframes`),
  although `motion.md` says SVG geometry animates (only x, y, r, cx, cy, rx, ry, stroke-dashoffset). The two paper
  lines became round-capped `line` strokes drawn by dash offset (same geometry as the SVG masters, not the same
  elements). The dash gap starts past the cap radius so no dot shows before the draw. Doc gap: list is in the error only.
- `transition` refuses `width`: the page dots' width change uses `-exact-layout-transition` instead.
- The existing root action was named `step`; renamed it `tickNow` (name clash with the new `step` state).
- Tests start from an empty store and have no shared setup or way to seed a `persist` state, so the 12 existing tests
  each got a 3-line prelude (36 lines) and tests with `epoch`/`time-zone` needed it after those launch lines
  (`syntax-expected-step`). `app.test.mjs` (agent test) needed the same.
- Overlays: the app has no native nav bar (hand-built headers), so splash and onboarding are absolute `column`s over the
  tabs inside `main`, with `inert` on the content and tab bar. Everything under the overlay still mounts at launch.
- Step change animation: `for s in [step] key=s` remounts the content so the entrance replays (idiom, not documented).
- No pager: step state, buttons, dots as a `tablist`.

Platform limits (documented, by reading)
- Android has no launch image: colour only (`background_color`); the in-app splash starts from the same colour.
  Android 12+ also draws the system splash with the app icon. iOS: `launchImage` exists but was not used by request.
- Native launch colour follows the OS scheme, not a forced in-app scheme: a user with a dark OS and "Light" chosen sees a
  dark launch colour, then the light splash. `setScheme` is not kept by the host: re-applied by a `mount` task with
  `after(1, ...)`, so a first frame in the wrong scheme is possible (not measured).
- `assets/` ships whole: the APK carries icon-1024.png (730 KB) and logo-480.png (160 KB) unused at runtime.
- Web: tab-role dots draw a grey tile behind the current dot; `background-color="transparent"` did not remove it.

Lines (authored; `git diff --stat`)
- T2 08849df: app.json +18, Makefile +4/-1, config test +26, SVG/PNG masters 171 lines of SVG files (not Contract).
- T3+T4 db04f72: app.contract +315/-5 = about 130 illustration and logo markup (4 art components 109 lines, splash logo
  about 20) and about 185 logic, layout, keyframes and Settings; app.test.contract +135 (about 60 are the
  existing-test preludes and fixes, about 75 new tests); app.test.mjs +3.
- Total Contract source added: about 450 plus 26 JS config test.
