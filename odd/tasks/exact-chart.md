# Feature: exact-chart

Locator: `odd/tasks/exact-chart.md` · Engram mirror: `odd/chart/tasks`

## Objective

Add a "Market" tab with a trading-style, real-time candlestick chart of BTC-USD (Coinbase public REST + WebSocket),
with pinch zoom, pan, double-tap reset and a crosshair, on iOS and Android. The same chart goes into the NSH Todo app
(`../nsh_mobile, branch feat/nsh-chart`) to compare how both frameworks handle charts, live data and gestures (2026-11-16 request; not related to the
todo domain).

## Scope

## Chart spec (shared by both apps)

- A fifth tab "Market" (chart icon), after Categories, before Settings is fine too; keep the other tabs working.
- Header: "BTC-USD", the last price (large, tabular digits), change vs the first loaded candle's open (absolute and %, up/down colour), and a connection status pill: Connecting / Live / Reconnecting (with the next retry in seconds) / Offline.
- Data source (public, no key):
  - History: `GET https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60` -> up to 300 rows `[time, low, high, open, close, volume]`, newest first (time in Unix seconds). Sort ascending.
  - Live: `wss://ws-feed.exchange.coinbase.com`, on open send `{"type":"subscribe","product_ids":["BTC-USD"],"channels":["ticker"]}`; messages `{"type":"ticker","price":"65266.90","time":"2026-11-16T22:00:01.123Z","last_size":"0.001", ...}`. Fold each tick into the current 1-minute candle (high/low/close, volume += last_size); a tick in a new minute starts a new candle (open = previous close or the tick price). Ignore non-ticker messages.
  - Reconnect with exponential backoff (1 s doubling to 30 s, reset on a good open). Re-fetch the history after a reconnect so gaps are filled.
  - Connect only while the Market tab is shown if the framework allows it cleanly; otherwise say what happens.
- Chart (candlesticks):
  - Up candles green, down red (new theme tokens `up`/`down` that read in light and dark), wick + body; volume bars in the bottom ~20% of the chart, same colours at low opacity.
  - Right price axis with about 5 rounded ticks (price labels), a time axis with about 4 HH:MM labels.
  - A dashed horizontal line at the last price with a filled price label at the right edge, coloured by the last candle's direction.
  - Draw efficiently: batch candles of one colour into one path/shape where the framework allows (not one node per candle if that is slow).
- Interaction:
  - Pinch to zoom: visible candles between 20 and 200 (default 60), zooming around the pinch centre if feasible.
  - Pan horizontally to scroll back through history; when the view is at the latest candle it follows new candles, otherwise it stays put.
  - Double-tap resets to the default zoom at the latest candle.
  - Long-press (or press-and-drag) shows a crosshair: vertical line at the nearest candle, horizontal line at the finger, and a readout with time, O, H, L, C, volume.
  - Also buttons "−", "+" and "Latest" under the chart (accessible fallback; they must work even where a gesture is not available).
- Pure data functions (parse rows, apply a tick, visible window, price-to-y, nice ticks, gesture maths) in their own module with unit tests (tests first).
- Findings for the comparison: what the framework gave (networking, sockets, drawing, gestures), what had to be built by hand, workarounds, doc gaps, platform differences, smoothness concerns, lines per area.

Out of scope: other symbols or intervals, order books, web and desktop checks.

## Constraints

- Branch `feat/exact-chart from feat/exact-sqlite (1911c17)`. Exact SDK ~/.exact/exact2 (33faab4a). No share or feedback verbs.
- Keep the existing checks green. Artifacts in English. Conventional commits, no attribution lines, no push.

## TDD

- Mode: strict, enabled. Source: user global instructions. Runner: `make check`, `make test` (Contract, web host), `make test-storage`, `make test-location`, `make test-config`, plus a bun unit test for the chart maths.
- RDD: off (global).

## Tasks

- [x] T1 Branch and this document. Route: inline (mechanical).
- [x] T2 Market tab, data feed, chart drawing and interaction, tests first for the data and gesture maths. Route: delegated writer (several new files).
- [ ] T3 Verify on the iOS Simulator and the Android emulator: live updates, zoom, pan, reset, crosshair, reconnect, light and dark. Route: inline per-action.

## Delivery

- Forecast: about 400-600 authored lines. Local branch only; no push or pull request planned.

## Progress / evidence

- T1: branch created.
- T2 (commit 14baa59, `feat(market): add a live BTC-USD candlestick chart`): route delegated writer. TDD: `chart.test.mjs` written first; RED observed (`Cannot find module './chart.ts'`), then GREEN; a second RED for `backoffSecs`/`pinchDist` (`Export named 'backoffSecs' not found`) and for `app.market.test.mjs` (`Export named 'market' not found`). The Contract tests were written alongside the Contract change (no separate RED run; the first `make test` run failed on a compile warning and a test syntax error, then passed).
  - `make check`: `[]` (no errors).
  - `make test`: 31 passed, 0 failed (4 new Market tests).
  - `make test-storage`: 7 pass. `make test-location`: 4 pass. `make test-config`: 3 pass.
  - `make test-chart` (new target: `chart.test.mjs` + `app.market.test.mjs`): 20 pass, 0 fail.
  - `bun exact.mjs ios --no-install`: exit 0 (built the simulator .app, not installed). `bun exact.mjs android --no-install`: exit 0 (release APK built, not installed).
  - Web host, real Coinbase (agent drive, not part of the checks): history `ok`, socket reached `live`, screenshots in light and dark show candles, volume, axes, last-price tag and crosshair; `tap drag` pans (endT changes), `dblclick` resets, press-and-hold shows the crosshair (`gMode` cross), buttons clamp at 20 and 200.
- Not done / unverified: pinch with two real fingers, Android WebSocket, the polling fallback and the reconnect path on a device (T3, by the user). The driver's `pinch` is not two pointers: a second pointerdown was not seen (the first pointer's move panned instead).

## Findings for the comparison

- Networking: `fetch` in a data-module source plus two `grants` lines (`net.fetch`, `net.websocket`). REST needed no wrapper. Coinbase has no key.
- Sockets: a resource source returns `fetch('wss://...', { exactStream(event, socket) })`; the mapper subscribes on `open` and folds ticks into module state, returning a small snapshot (status, seq, price). Works on the web host against the real feed. No built-in reconnect: backoff is hand-built with tasks (`every(1000, ...)` while the socket is down and not pending, 1/2/4/8/16/30 s, reset on a live tick) and the history is re-fetched on each attempt. `resource ... when marketOn` opens the socket only while the tab shows. `exactIdleTimeout` (8 s) turns a silent socket into an `error` event.
- Android: docs list TypeScript two-way sockets only for web, macOS, iOS, Linux. Android runs the same TypeScript data module through Hermes (host/executor, `socket.rs`, no platform gate seen), so it may work, but this is undocumented and was not run (no emulator). There is no platform fact in the Contract (`exactViewport` has no OS; docs say never branch by platform). So the fallback is platform-agnostic: two failed socket attempts (or an 8 s silent socket) start a 2 s REST poll and the pill says "Live (polling)"; the socket keeps retrying and polling stops when it goes live. Never left without data, but unproven on Android.
- Drawing: no TypeScript canvas. Inline `svg` with batched `path d` strings (6 paths for all candles, 1 for the grid) computed in the data module by `chart.ts`; labels are absolutely positioned `text` nodes (about 10 plus the readout). No per-candle nodes. `up`/`down` tokens work as `fill`/`stroke` values.
- Gestures: `pointerdown/move/up` with `touch-action="none"`, `offsetX/offsetY` per node, `resize=action(w,h)`, `dblclick` all worked on the web host. Long press has no event: built from a `task ... after(350)` while the pointer is down and still. Pinch has no event; two-pointer tracking is implemented with `pointerId` but could not be confirmed (driver pinch does not send two pointers; device check needed). +/- buttons are the fallback.
- Built by hand: reconnect/backoff, polling fallback, gesture state machine (press, pan, cross, pinch), candle folding, nice ticks, path building, price/time formatting.
- Workarounds and gotchas: Contract has no `abs`/`sqrt`/`**` (pinch distance is the larger axis gap; backoff is a ternary chain). Writes in an action land at the end, so reading what the action just wrote gives the old value (compiler warns, `let` fixes it). Contract cannot call app.ts, so the gesture formulas exist twice (`chart.ts` tested, `app.contract` `fn`s mirror them). `fail fetch` does not match a WebSocket, so Contract tests cannot fail the socket; they use the real feed or ignore it.
- Doc gaps: no statement on Android sockets, no multi-touch pointer story, no OS fact.
- Smoothness: view recomputes the visible window (60 to 200 candles, about 1 ms of work) on every tick or pointer move; commits coalesce ticks. Not measured on device.
- Lines: chart.ts 179, chart.test.mjs 126, app.market.test.mjs 69, app.ts +48, app.contract +252 (shapes, fns, state, tasks, actions, view), app.tamber +3, Contract tests +70.
