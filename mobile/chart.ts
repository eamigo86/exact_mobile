// Pure maths for the Market chart: rows, ticks, the visible window, axes, paths and gestures.
// The data module (app.ts) keeps the candles; the Contract draws what buildView returns.
// Gesture formulas (pinchCount, zoomEnd, panEnd, clampEnd) are mirrored as `fn`s in app.contract,
// which cannot call TypeScript: this file is their tested reference.
export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };
export type Tick = { price: number; size: number; t: number };
export type Mark = { pos: number; text: string };
export type ViewOptions = {
  w: number; h: number; count: number; endT: number;
  crossOn: boolean; crossX: number; crossY: number; baseOpen: number; utcOffset: number;
};

export const MIN_COUNT = 20;
export const MAX_COUNT = 200;
export const DEFAULT_COUNT = 60;
export const KEEP = 1500; // 25 hours of minutes
const STEP = 60;
export const AXIS_W = 76; // price labels, right
export const AXIS_H = 20; // time labels, bottom
const VOL_FRAC = 0.2;

const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const r1 = (x: number) => Math.round(x * 10) / 10;

// Coinbase rows are [time, low, high, open, close, volume], newest first.
export function parseRows(rows: unknown[][]): Candle[] {
  const out: Candle[] = [];
  for (const r of rows) {
    if (!Array.isArray(r) || r.length < 6 || !r.slice(0, 6).every(num)) continue;
    out.push({ t: r[0] as number, o: r[3] as number, h: r[2] as number, l: r[1] as number, c: r[4] as number, v: r[5] as number });
  }
  out.sort((a, b) => a.t - b.t);
  return out.filter((c, i) => i === 0 || c.t !== out[i - 1].t);
}

export function parseTick(raw: string): Tick | null {
  let m: any;
  try { m = JSON.parse(raw); } catch { return null; }
  if (!m || m.type !== 'ticker') return null;
  const price = Number(m.price), size = Number(m.last_size ?? 0), ms = Date.parse(m.time);
  if (!Number.isFinite(price) || !Number.isFinite(ms)) return null;
  return { price, size: Number.isFinite(size) ? size : 0, t: Math.floor(ms / 1000) };
}

export function applyTick(candles: Candle[], tick: Tick): Candle[] {
  const minute = Math.floor(tick.t / STEP) * STEP;
  const last = candles[candles.length - 1];
  if (last && minute < last.t) return candles;
  if (last && minute === last.t) {
    const next = { ...last, h: Math.max(last.h, tick.price), l: Math.min(last.l, tick.price), c: tick.price, v: last.v + tick.size };
    return [...candles.slice(0, -1), next];
  }
  const open = last ? last.c : tick.price;
  const fresh = { t: minute, o: open, h: Math.max(open, tick.price), l: Math.min(open, tick.price), c: tick.price, v: tick.size };
  return [...candles, fresh].slice(-KEEP);
}

// A fetch answers from a moment ago: keep the candles that ticks made since.
export function mergeHistory(old: Candle[], fresh: Candle[]): Candle[] {
  if (!fresh.length) return old;
  const lastT = fresh[fresh.length - 1].t;
  return [...fresh, ...old.filter((c) => c.t > lastT)].slice(-KEEP);
}

export const clampCount = (n: number) => Math.min(MAX_COUNT, Math.max(MIN_COUNT, n));

// endT is the time of the candle on the right edge; 0 follows the latest.
export function visibleRange(candles: Candle[], count: number, endT: number): { start: number; end: number } {
  const n = candles.length;
  let end = n;
  if (endT > 0 && n > 0 && endT < candles[n - 1].t) {
    let lo = 0, hi = n - 1; // last index with t <= endT
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (candles[mid].t <= endT) lo = mid; else hi = mid - 1; }
    end = Math.max(lo + 1, Math.min(n, count));
  }
  return { start: Math.max(0, end - count), end };
}

export const priceToY = (p: number, lo: number, hi: number, top: number, height: number) =>
  top + (hi - p) / (hi - lo) * height;

export function niceTicks(lo: number, hi: number, n = 5): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / n, pow = 10 ** Math.floor(Math.log10(raw)), f = raw / pow;
  const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * pow;
  const out: number[] = [];
  for (let k = Math.ceil(lo / step - 1e-9); k * step <= hi + 1e-9; k++) out.push(+(k * step).toFixed(10));
  return out;
}

export const pinchCount = (count0: number, dist0: number, dist: number) =>
  clampCount(Math.round(count0 * dist0 / Math.max(dist, 1)));

// Keep the candle under the pinch centre (f of the plot width from the left) where it was.
export const zoomEnd = (endT: number, lastT: number, count0: number, count1: number, f: number) =>
  (endT > 0 ? endT : lastT) + (1 - f) * (count1 - count0) * STEP;

export const panEnd = (endT: number, dx: number, slot: number) => endT - dx / slot * STEP;

// Past the latest follows again; never before the first full window.
export function clampEnd(e: number, firstT: number, lastT: number, count: number): number {
  if (e >= lastT) return 0;
  return Math.max(e, Math.min(firstT + (count - 1) * STEP, lastT));
}

export function formatPrice(p: number, decimals = 2): string {
  const [i, d] = Math.abs(p).toFixed(decimals).split('.');
  return `${p < 0 ? '-' : ''}${i.replace(/\B(?=(\d{3})+$)/g, ',')}${d ? `.${d}` : ''}`;
}
export function formatClock(t: number, utcOffset: number): string {
  const m = ((Math.floor(t / 60) + utcOffset) % 1440 + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}
const signed = (x: number, s: string) => `${x >= 0 ? '+' : '-'}${s}`;

export type View = ReturnType<typeof buildView>;

const EMPTY = {
  ready: false, upBody: '', upWick: '', downBody: '', downWick: '', upVol: '', downVol: '', grid: '',
  priceMarks: [] as Mark[], timeMarks: [] as Mark[], plotW: 0, plotH: 0, slot: 1, firstT: 0, lastT: 0,
  lastY: 0, lastText: '', lastUp: true, priceText: '', changeText: '', changeUp: true,
  crossOn: false, crossX: 0, crossY: 0, crossPrice: '', readTime: '', readOhlc: '', readVol: '',
};

export function buildView(candles: Candle[], o: ViewOptions) {
  const pw = o.w - AXIS_W, ph = o.h - AXIS_H;
  if (!candles.length || pw < 40 || ph < 40) return EMPTY;
  const volH = ph * VOL_FRAC, priceH = ph - volH - 8;
  const { start, end } = visibleRange(candles, o.count, o.endT);
  const vis = candles.slice(start, end);
  let lo = Infinity, hi = -Infinity, maxV = 0;
  for (const c of vis) { lo = Math.min(lo, c.l); hi = Math.max(hi, c.h); maxV = Math.max(maxV, c.v); }
  const pad = (hi - lo) * 0.06 || Math.max(Math.abs(hi) * 0.001, 0.01);
  lo -= pad; hi += pad;
  const y = (p: number) => priceToY(p, lo, hi, 0, priceH);
  const slot = pw / o.count, bw = Math.max(1, Math.floor(slot * 0.7 * 10) / 10);
  const cx = (i: number) => pw - (end - i - 0.5) * slot;
  const p = { upBody: '', upWick: '', downBody: '', downWick: '', upVol: '', downVol: '' };
  vis.forEach((c, k) => {
    const x = r1(cx(start + k)), x0 = r1(x - bw / 2), up = c.c >= c.o;
    const top = r1(y(Math.max(c.o, c.c))), bh = Math.max(1, r1(y(Math.min(c.o, c.c)) - top));
    const vh = maxV > 0 ? Math.max(1, r1(c.v / maxV * volH)) : 0;
    const body = `M${x0} ${top}h${bw}v${bh}h${-bw}z`, wick = `M${x} ${r1(y(c.h))}V${r1(y(c.l))}`;
    const vol = `M${x0} ${r1(ph)}h${bw}v${-vh}h${-bw}z`;
    if (up) { p.upBody += body; p.upWick += wick; p.upVol += vol; } else { p.downBody += body; p.downWick += wick; p.downVol += vol; }
  });
  const ticks = niceTicks(lo, hi, 5);
  const dec = ticks.length > 1 && ticks[1] - ticks[0] < 1 ? 2 : 0;
  const priceMarks = ticks.map((v) => ({ pos: r1(y(v)), text: formatPrice(v, dec) }));
  const grid = priceMarks.map((m) => `M0 ${m.pos}H${r1(pw)}`).join('');
  const timeMarks = [0, 1, 2, 3].map((j) => {
    const i = start + Math.min(vis.length - 1, Math.round((j + 0.5) / 4 * (vis.length - 1)));
    return { pos: r1(cx(i)), text: formatClock(candles[i].t, o.utcOffset) };
  });
  const last = candles[candles.length - 1], base = o.baseOpen || candles[0].o, diff = last.c - base;
  const pct = base ? Math.abs(diff) / base * 100 : 0;
  const view = {
    ...EMPTY, ready: true, ...p, grid, priceMarks, timeMarks, plotW: r1(pw), plotH: r1(ph), slot,
    firstT: candles[0].t, lastT: last.t,
    lastY: r1(Math.min(priceH, Math.max(0, y(last.c)))), lastText: formatPrice(last.c), lastUp: last.c >= last.o,
    priceText: formatPrice(last.c), changeText: `${signed(diff, formatPrice(Math.abs(diff)))} (${signed(diff, pct.toFixed(2))}%)`, changeUp: diff >= 0,
  };
  if (o.crossOn && vis.length) {
    const i = Math.min(end - 1, Math.max(start, end - 1 - Math.round((pw - o.crossX) / slot - 0.5)));
    const c = candles[i], cy = Math.min(priceH, Math.max(0, o.crossY));
    Object.assign(view, {
      crossOn: true, crossX: r1(cx(i)), crossY: r1(cy), crossPrice: formatPrice(lo + (hi - lo) * (1 - cy / priceH)),
      readTime: formatClock(c.t, o.utcOffset),
      readOhlc: `O ${formatPrice(c.o)}  H ${formatPrice(c.h)}  L ${formatPrice(c.l)}  C ${formatPrice(c.c)}`,
      readVol: `Vol ${c.v.toFixed(4)}`,
    });
  }
  return view;
}

export const pinchDist = (ax: number, ay: number, bx: number, by: number) => Math.max(Math.abs(ax - bx), Math.abs(ay - by));

// Seconds to wait before reconnect attempt number `retries` (0-based): 1, 2, 4, 8, 16, then 30.
export const backoffSecs = (retries: number) => Math.min(30, 2 ** Math.min(retries, 5));
