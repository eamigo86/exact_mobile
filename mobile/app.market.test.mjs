// The Market sources against a stubbed fetch: history, the socket mapper (subscribe, ticks, close)
// and the chart view. Run: make test-chart
import { beforeEach, expect, test } from 'bun:test';
import { answer, grants, market } from './app.ts';

const rows = [[180, 90, 110, 100, 105, 3], [120, 95, 108, 98, 100, 2], [60, 90, 99, 92, 98, 1]]; // newest first
let calls;
const stub = (impl) => { calls = []; globalThis.fetch = (url, opts) => { calls.push({ url, opts }); return impl(url, opts); }; };
const json = (v) => Promise.resolve({ ok: true, status: 200, json: async () => v });
beforeEach(() => { Object.assign(market, { candles: [], baseOpen: 0, version: 0, status: 'closed', price: 0 }); });

test('grants name Coinbase for fetch and for the socket', () => {
  expect(grants).toContain('net.fetch https://api.exchange.coinbase.com');
  expect(grants).toContain('net.websocket wss://ws-feed.exchange.coinbase.com');
});

test('history loads 60 s candles oldest first and bumps the version', async () => {
  stub(() => json(rows));
  const r = await answer('marketHistory', [1, true], {}, {});
  expect(calls[0].url).toBe('https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=60');
  expect(r.ok).toBe(true);
  expect(r.seq).toBe(1);
  expect(market.candles.map((c) => c.t)).toEqual([60, 120, 180]);
  expect(market.baseOpen).toBe(92);
});

test('history asks nothing while the Market tab is not shown, and a failure keeps the candles', async () => {
  stub(() => json(rows));
  expect((await answer('marketHistory', [1, false], {}, {})).ok).toBe(false);
  expect(calls.length).toBe(0);
  await answer('marketHistory', [2, true], {}, {});
  stub(() => Promise.reject(new Error('offline')));
  const r = await answer('marketHistory', [3, true], {}, {});
  expect(r).toEqual({ ok: false, error: 'offline', seq: market.version });
  expect(market.candles.length).toBe(3);
});

test('the socket subscribes on open, folds ticks and reports its status', async () => {
  stub(() => new Promise(() => {})); // a stream never settles
  answer('marketFeed', [1], {}, {});
  expect(calls[0].url).toBe('wss://ws-feed.exchange.coinbase.com');
  const map = calls[0].opts.exactStream;
  expect(calls[0].opts.exactIdleTimeout).toBeGreaterThan(0);
  const sent = [];
  const socket = { send: (s) => sent.push(s) };
  expect(map({ type: 'open' }, socket).status).toBe('connecting');
  expect(JSON.parse(sent[0])).toEqual({ type: 'subscribe', product_ids: ['BTC-USD'], channels: ['ticker'] });
  const tick = (price, time) => JSON.stringify({ type: 'ticker', price, last_size: '0.5', time });
  expect(map({ type: 'message', data: '{"type":"subscriptions"}' }, socket).status).toBe('connecting');
  const a = map({ type: 'message', data: tick('100.5', '2026-11-16T22:00:01.5Z') }, socket);
  expect(a).toEqual({ status: 'live', seq: 1, price: 100.5 });
  const b = map({ type: 'message', data: tick('101', '2026-11-16T22:00:30Z') }, socket);
  expect(b.seq).toBe(2);
  expect(market.candles.length).toBe(1);
  expect(market.candles[0]).toMatchObject({ o: 100.5, h: 101, c: 101, v: 1 });
  map({ type: 'message', data: tick('102', '2026-11-16T22:01:00Z') }, socket);
  expect(market.candles.length).toBe(2);
  expect(map({ type: 'close', code: 1006 }, socket).status).toBe('closed');
  expect(map({ type: 'error', kind: 'Timeout', message: 'nothing arrived' }, socket).status).toBe('closed');
});

test('the chart view draws what the module holds', async () => {
  stub(() => json(rows));
  await answer('marketHistory', [1, true], {}, {});
  const v = answer('chartView', [376, 220, 60, 0, false, 0, 0, 1, 0], {}, {});
  expect(v.ready).toBe(true);
  expect(v.lastText).toBe('105.00');
  expect(v.changeText).toBe('+13.00 (+14.13%)');
});
