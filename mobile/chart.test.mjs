// Pure chart maths: rows, ticks, window, axes, gestures. Run: make test-chart
import { expect, test } from 'bun:test';
import {
  applyTick, buildView, clampCount, clampEnd, mergeHistory, niceTicks, panEnd, parseRows, parseTick,
  backoffSecs, pinchCount, pinchDist, priceToY, visibleRange, zoomEnd,
} from './chart.ts';

const c = (t, o, h, l, cl, v = 1) => ({ t, o, h, l, c: cl, v });

test('rows [time, low, high, open, close, volume] come out oldest first, deduped, bad rows dropped', () => {
  const rows = [[180, 1, 4, 2, 3, 5], [60, 1, 3, 2, 2, 1], [120, 1, 3, 2, 2.5, 2], [120, 9, 9, 9, 9, 9], [0, 'x', 1, 1, 1, 1]];
  expect(parseRows(rows)).toEqual([c(60, 2, 3, 1, 2, 1), c(120, 2, 3, 1, 2.5, 2), c(180, 2, 4, 1, 3, 5)]);
});

test('a ticker message becomes a tick, anything else is null', () => {
  const msg = JSON.stringify({ type: 'ticker', price: '65266.90', last_size: '0.25', time: '2026-11-16T22:00:01.123Z' });
  expect(parseTick(msg)).toEqual({ price: 65266.9, size: 0.25, t: Date.parse('2026-11-16T22:00:01Z') / 1000 });
  expect(parseTick('{"type":"subscriptions","channels":[]}')).toBeNull();
  expect(parseTick('not json')).toBeNull();
  expect(parseTick('{"type":"ticker","price":"x","time":"2026-11-16T22:00:01Z"}')).toBeNull();
});

test('a tick in the same minute updates high, low, close and volume', () => {
  const base = [c(60, 10, 12, 9, 11, 1)];
  const out = applyTick(base, { price: 13, size: 0.5, t: 100 });
  expect(out).toEqual([c(60, 10, 13, 9, 13, 1.5)]);
  expect(applyTick(out, { price: 8, size: 1, t: 119 })).toEqual([c(60, 10, 13, 8, 8, 2.5)]);
  expect(base[0].c).toBe(11); // the input is not changed
});

test('a tick in a new minute opens a candle at the previous close', () => {
  const out = applyTick([c(60, 10, 12, 9, 11, 1)], { price: 14, size: 2, t: 125 });
  expect(out).toEqual([c(60, 10, 12, 9, 11, 1), c(120, 11, 14, 11, 14, 2)]);
  expect(applyTick([], { price: 5, size: 1, t: 61 })).toEqual([c(60, 5, 5, 5, 5, 1)]);
  expect(applyTick(out, { price: 1, size: 1, t: 10 })).toEqual(out); // a late tick is ignored
});

test('history refresh keeps candles newer than it', () => {
  const fresh = [c(60, 1, 1, 1, 1), c(120, 2, 2, 2, 2)];
  const old = [c(60, 9, 9, 9, 9), c(120, 9, 9, 9, 9), c(180, 3, 3, 3, 3)];
  expect(mergeHistory(old, fresh)).toEqual([...fresh, c(180, 3, 3, 3, 3)]);
  expect(mergeHistory(old, [])).toEqual(old);
});

test('the visible window follows the latest, or stays at a given time', () => {
  const cs = Array.from({ length: 100 }, (_, i) => c(60 * (i + 1), 1, 1, 1, 1));
  expect(visibleRange(cs, 60, 0)).toEqual({ start: 40, end: 100 });
  expect(visibleRange(cs, 60, 6000)).toEqual({ start: 40, end: 100 }); // at or past the latest
  expect(visibleRange(cs, 60, 4800)).toEqual({ start: 20, end: 80 }); // 80th candle on the right edge
  expect(visibleRange(cs, 60, 60)).toEqual({ start: 0, end: 60 }); // never before a full window
  expect(visibleRange(cs.slice(0, 10), 60, 0)).toEqual({ start: 0, end: 10 });
});

test('price to y maps the range onto the plot, high at the top', () => {
  expect(priceToY(100, 0, 100, 0, 200)).toBe(0);
  expect(priceToY(0, 0, 100, 0, 200)).toBe(200);
  expect(priceToY(25, 0, 100, 10, 200)).toBe(160);
});

test('nice ticks are round and about five', () => {
  expect(niceTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
  expect(niceTicks(65012, 65288, 5)).toEqual([65050, 65100, 65150, 65200, 65250]);
  expect(niceTicks(0.1, 0.9, 4)).toEqual([0.2, 0.4, 0.6, 0.8]);
  expect(niceTicks(5, 5, 5)).toEqual([5]);
});

test('pinch maths: spreading shows fewer candles, pinching in more, always 20 to 200', () => {
  expect(pinchCount(60, 100, 200)).toBe(30);
  expect(pinchCount(60, 100, 50)).toBe(120);
  expect(pinchCount(60, 100, 1000)).toBe(20);
  expect(pinchCount(60, 100, 10)).toBe(200);
  expect(clampCount(5)).toBe(20);
  expect(clampCount(500)).toBe(200);
});

test('zooming keeps the candle under the pinch centre in place', () => {
  // following (0), 60 -> 30 candles, centre at the right edge: the right edge stays the latest
  expect(zoomEnd(0, 6000, 60, 30, 1)).toBe(6000);
  // centre in the middle: the right edge moves left by 15 candles
  expect(zoomEnd(0, 6000, 60, 30, 0.5)).toBe(6000 - 15 * 60);
  // zooming out about the middle moves it right
  expect(zoomEnd(3000, 6000, 30, 60, 0.5)).toBe(3000 + 15 * 60);
});

test('panning moves one slot per candle and clamps to the data', () => {
  expect(panEnd(6000, 10, 5)).toBe(6000 - 2 * 60); // dragging right shows older candles
  expect(panEnd(6000, -10, 5)).toBe(6000 + 2 * 60);
  expect(clampEnd(6100, 60, 6000, 60)).toBe(0); // past the latest: follow again
  expect(clampEnd(-500, 60, 6000, 60)).toBe(60 + 59 * 60);
  expect(clampEnd(4000, 60, 6000, 60)).toBe(4000);
});

test('buildView batches candles into a few paths with axes, last price and crosshair', () => {
  const cs = Array.from({ length: 30 }, (_, i) => c(3600 * 12 + 60 * i, 100 + i, 105 + i, 95 + i, i % 2 ? 98 + i : 102 + i, 2));
  const v = buildView(cs, { w: 376, h: 220, count: 30, endT: 0, crossOn: false, crossX: 0, crossY: 0, baseOpen: 100, utcOffset: 0 });
  expect(v.ready).toBe(true);
  expect(v.upBody.startsWith('M')).toBe(true);
  expect(v.downBody.startsWith('M')).toBe(true);
  expect(v.priceMarks.length).toBeGreaterThanOrEqual(3);
  expect(v.timeMarks.length).toBe(4);
  expect(v.timeMarks[0].text).toMatch(/^12:\d\d$/);
  expect(v.lastText).toBe('127.00');
  expect(v.lastUp).toBe(false); // the last candle opens at 129 and closes at 127
  expect(v.changeText).toBe('+27.00 (+27.00%)');
  expect(v.slot).toBe(10);
  expect(v.crossOn).toBe(false);
  const x = buildView(cs, { w: 376, h: 220, count: 30, endT: 0, crossOn: true, crossX: 295, crossY: 80, baseOpen: 100, utcOffset: 0 });
  expect(x.crossOn).toBe(true);
  expect(x.readTime).toBe('12:29');
  expect(x.readOhlc).toContain('O 129');
  expect(x.crossX).toBe(295);
});

test('buildView before there are candles or a size is not ready', () => {
  expect(buildView([], { w: 300, h: 200, count: 60, endT: 0, crossOn: false, crossX: 0, crossY: 0, baseOpen: 0, utcOffset: 0 }).ready).toBe(false);
  expect(buildView([c(60, 1, 1, 1, 1)], { w: 0, h: 0, count: 60, endT: 0, crossOn: false, crossX: 0, crossY: 0, baseOpen: 0, utcOffset: 0 }).ready).toBe(false);
});

test('pinch distance is the larger axis gap, so no square root is needed', () => {
  expect(pinchDist(0, 0, 30, -40)).toBe(40);
  expect(pinchDist(10, 10, 10, 10)).toBe(0);
});

test('reconnect backoff doubles from 1 s to 30 s', () => {
  expect([0, 1, 2, 3, 4, 5, 9].map(backoffSecs)).toEqual([1, 2, 4, 8, 16, 30, 30]);
});
