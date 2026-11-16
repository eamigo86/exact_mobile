// The Location card against the device: a granted or denied permission and a preferred
// position are an agent drive's, which the Contract tests cannot set. Run: make test-location
import { expect, test } from 'bun:test';
const { open } = await import(`${process.env.EXACT}/scripts/agent.mjs`);

const POSITION = (v) => `geolocation.watchPosition=${JSON.stringify(v)}`;
const text = (s, id) => s.carrier.evaluate(`document.querySelector('[data-testid="${id}"]')?.textContent ?? null`);

async function card(facts) {
  const s = await open({ host: 'web', app: import.meta.dir, storage: 'location-test', env: { EXACT_AGENT_EPHEMERAL_PORT: '1' } });
  await s.prefer(facts);
  await s.clock('+1600'); // the splash
  await s.tap('onb-skip'); // a fresh store opens on onboarding
  await s.clock('settle');
  await s.tap('tab-settings');
  await s.tap('location-button');
  await s.clock('settle');
  return s;
}

test('a granted permission shows the position, five decimals', async () => {
  const s = await card({ 'permission.geolocation': 'granted', extension: POSITION({ coords: { latitude: 40.4168, longitude: -3.7038, accuracy: 5 } }) });
  try {
    expect(await text(s, 'location-latitude')).toBe('Latitude 40.41680');
    expect(await text(s, 'location-longitude')).toBe('Longitude -3.70380');
    expect(await text(s, 'location-accuracy')).toBe('Accuracy 5 m');
    expect(await text(s, 'location-message')).toBeNull();
  } finally { await s.close(); }
}, 60000);

test('a denied permission says so', async () => {
  const s = await card({ 'permission.geolocation': 'denied' });
  try {
    expect(await text(s, 'location-message')).toBe('Location permission denied. Allow it in the system settings.');
    expect(await text(s, 'location-latitude')).toBeNull();
  } finally { await s.close(); }
}, 60000);

test('no position available says location services are off', async () => {
  const s = await card({ 'permission.geolocation': 'granted', extension: POSITION({ error: 'POSITION_UNAVAILABLE' }) });
  try {
    expect(await text(s, 'location-message')).toBe('Location services are off. Turn them on and try again.');
    expect(await text(s, 'location-latitude')).toBeNull();
  } finally { await s.close(); }
}, 60000);

test('another failure is shown with its code', async () => {
  const s = await card({ 'permission.geolocation': 'granted', extension: POSITION({ error: 'TIMEOUT' }) });
  try {
    expect(await text(s, 'location-message')).toBe('Could not get the location: TIMEOUT');
  } finally { await s.close(); }
}, 60000);
