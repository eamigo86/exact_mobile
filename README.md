# Exact Todo

A todo app for iOS and Android built with [Exact](https://github.com/expo/exact), a young cross-platform framework with its own UI language (Contract). Exact has no releases, so this app follows the `main` branch of the SDK.

This repository is half of an Exact vs NSH comparison: the same app was built twice, once in each framework. The NSH version lives in [nsh_mobile](https://github.com/eamigo86/nsh_mobile).

## Features

- Home with a progress ring and an "Up next" list; rows swipe to Complete, Edit or Delete
- Tasks with status filters (All, Active, Done, Today, Overdue) and a category filter
- New/Edit task sheet with a due date and time
- Categories with colors
- Market tab with a live BTC-USD candlestick chart (Coinbase REST history plus WebSocket ticks)
- Settings: avatar photo, display name, appearance (system, light, dark), onboarding replay, current location
- SQLite storage and a first-run onboarding

## Tech stack

- Exact SDK, git checkout of `main` (currently commit `3e84781a`); there is no release to pin
- Contract (`app.contract`) for the UI, TypeScript (`app.ts`) for data sources, Forma (`app.forma`) for design tokens
- Bun 1.4.2, the version the SDK pins
- SQLite through Exact's storage API; `@exact/geolocation` for the location card
- Network: `api.exchange.coinbase.com` (REST) and `ws-feed.exchange.coinbase.com` (WebSocket), declared as grants in `app.ts`

## Requirements

- macOS with Xcode for iOS builds
- Android SDK and an AVD for Android builds (`ANDROID_HOME`, default `~/Library/Android/sdk`)
- Bun 1.4.2 and a checkout of the Exact SDK; `make setup` installs both, plus the Rust toolchains and Hermes the SDK needs
- `git` and `curl`

The SDK checkout defaults to `~/.exact/exact2` (`EXACT_SDK`). `mobile/exact.mjs` links it as `mobile/.exact/checkout`.

## Getting started

```sh
make help            # list every target
make setup           # Bun, SDK checkout, toolchains
make setup-android   # Android platform Exact builds against
make doctor          # show what the machine is missing
```

Run on iOS (the first build is slow; `make ios-prebuild` starts it in the background):

```sh
make ios
```

Run on Android:

```sh
make emulator        # AVD=<name> to choose one
make android
```

Other targets: `make web` (browser dev loop), `make mac` (macOS app), `make share` (AppDrop link for an iPhone), `make sdk-update` (pull the SDK).

## Testing

| Target | Covers |
|---|---|
| `make check` | Compiles the Contract and type-checks `app.ts` |
| `make test` | Contract tests (`app.test.contract`) on the web host |
| `make test-config` | Manifest launch colors and icons against the brand |
| `make test-storage` | Data module on a fake storage: SQLite and the one-time JSON import |
| `make test-chart` | Chart maths and the Market sources, with a stubbed fetch and socket |
| `make test-location` | The Location card with a preferred permission and position |
| `make test-ios` / `make test-android` | Contract tests on a simulator or emulator |
| `make verify`, `verify-ios`, `verify-android` | Full check: tests, light/dark, widths, large text |

## Project structure

```text
Makefile                 setup, run, test targets
mobile/
  app.contract           UI, navigation, state (Contract)
  app.ts                 data sources: SQLite, Coinbase feed, avatar
  app.forma              design tokens ("Warm Paper" light/dark)
  app.json               manifest: id, hosts, icons
  app.test.contract      Contract tests
  *.test.mjs             Bun tests (config, storage, chart, market, location)
  chart.ts               candlestick maths
  exact.mjs              generated launcher that finds the SDK
  assets/, strings/      brand images, string table
odd/tasks/               development logs
```

## Development notes

[`odd/tasks/`](odd/tasks) holds the feature work logs written during development: objective, tasks, verification and findings for each feature. They are the record of what was checked and on which platform.

Verified so far: the iOS simulator (iOS 26.5, iPhone 17 Pro) and the Android emulator (API 35). No physical device has been tested.

Known Exact issues on `3e84781a`, from [`odd/tasks/exact-sdk-main.md`](odd/tasks/exact-sdk-main.md):

1. Android: `scrollLeft` can be dropped while a route is hidden; the app keeps a workaround.
2. iOS: pressing an open swipe row's content does not close it.
3. iOS: an image inside a native `button` is empty; the app uses a pressable box.
4. iOS: an image in a grouped row keeps its first picture; the app uses a keyed row.
5. Contract has no `abs`, `sqrt` or `pow`; other maths goes to the data source.
6. `Date.now()` is not available in data sources; time is passed as a source argument.

## Status

Experimental comparison project, not production software. Pull requests are not expected.
