// The manifest against the brand: the native launch colour must be the page the app paints, in
// both schemes, and the icons must exist. Run: make test-config
import { expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

const app = JSON.parse(readFileSync(`${import.meta.dir}/app.json`, 'utf8'));
const forma = readFileSync(`${import.meta.dir}/app.forma`, 'utf8');
const page = forma.match(/surface\.page = light-dark\((#[0-9a-f]{6}), (#[0-9a-f]{6})\)/i);

test('the launch colour is the page colour in light and dark', () => {
  expect(page).not.toBeNull();
  expect(app.background_color).toBe(page[1]);
  expect(app.color_scheme_dark?.background_color).toBe(page[2]);
});

test('the native launch shows the colour only', () => {
  expect(app.host.ios.launchImage).toBeUndefined();
});

test('the app icons are brand files that exist', () => {
  const srcs = (app.icons ?? []).map((i) => i.src);
  expect(srcs).toContain('assets/brand/icon-1024.png');
  for (const s of srcs) expect(existsSync(`${import.meta.dir}/${s}`)).toBe(true);
  const png = app.icons.find((i) => i.src.endsWith('.png'));
  expect(png.purpose).toContain('maskable');
});
