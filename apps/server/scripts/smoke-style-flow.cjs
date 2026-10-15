/* Development-only live API smoke test. Creates and removes only its own users. */
require('dotenv').config();
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const endpoint = process.env.SMOKE_API_URL || 'http://localhost:4000/api/v1';
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'development') throw new Error('Development only.');
if (!process.env.DATABASE_URL || !['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname)) {
  throw new Error('Only a local development PostgreSQL database is allowed.');
}
if (!['localhost', '127.0.0.1'].includes(new URL(endpoint).hostname)) throw new Error('Only a local API is allowed.');

const db = new PrismaClient();
const createdUsers = [];
async function call(method, path, token, body) {
  const response = await fetch(`${endpoint}${path}`, { method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(45_000) });
  return { status: response.status, body: response.status === 204 ? null : await response.json(),
    cookies: response.headers.getSetCookie() };
}
async function user(label) {
  const password = `smoke-${Date.now()}-${label}-only`;
  const row = await db.user.create({ data: {
    email: `style-smoke-${Date.now()}-${label}@closetai.test`, passwordHash: await bcrypt.hash(password, 12),
    emailVerifiedAt: new Date(), profile: { create: { firstName: `Smoke ${label}` } },
    preferences: { create: {} }, wardrobe: { create: {} },
  }, include: { wardrobe: true } });
  createdUsers.push(row.id);
  const login = await call('POST', '/auth/login', null, { email: row.email, password });
  assert.equal(login.status, 200, 'development login');
  const cookie = login.cookies.find((value) => value.startsWith('closetai_access='));
  assert.ok(cookie, 'access cookie');
  return { id: row.id, wardrobeId: row.wardrobe.id, token: cookie.split(';')[0].split('=')[1] };
}
async function main() {
  const a = await user('a'); const b = await user('b');
  await db.clothingItem.createMany({ data: [
    { userId: a.id, wardrobeId: a.wardrobeId, name: 'Smoke ivory shirt', imageUrl: '/wardrobe-placeholder.svg',
      category: 'tops', colors: ['Ivory'], seasons: ['All season'], occasions: ['Office'], aesthetics: ['Minimal'] },
    { userId: a.id, wardrobeId: a.wardrobeId, name: 'Smoke black trousers', imageUrl: '/wardrobe-placeholder.svg',
      category: 'bottoms', colors: ['Black'], seasons: ['All season'], occasions: ['Office'], aesthetics: ['Minimal'] },
  ] });
  const prefs = await call('PATCH', '/profile/preferences', a.token, {
    preferredAesthetics: ['Minimal'], favoriteColors: ['Ivory'], preferredCategories: ['tops'],
    preferredOccasions: ['Office'], fitPreferences: ['Relaxed'], preferredSeasons: ['Summer'],
    styleDislikes: ['Neon'], budgetCurrency: 'USD', budgetMax: 100, weatherCity: 'Pune',
    notificationPreferences: { daily: true },
  });
  assert.equal(prefs.status, 200, 'save preferences');
  const profile = await call('GET', '/profile', a.token);
  assert.equal(profile.body.data.preferences.weatherCity, 'Pune', 'preference persisted');
  assert.equal((await call('GET', '/profile', b.token)).body.data.preferences.weatherCity, null,
    'other user has no city');
  const start = new Date(Date.now() + 2 * 86_400_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  const event = await call('POST', '/calendar', a.token, { title: 'Smoke office event', eventType: 'Office',
    startsAt: start.toISOString(), endsAt: end.toISOString(), timeZone: 'UTC' });
  assert.equal(event.status, 201, 'create event');
  const eventId = event.body.data.id;
  assert.equal((await call('GET', '/calendar', a.token)).body.data.length, 1, 'event persisted');
  assert.equal((await call('GET', '/calendar', b.token)).body.data.length, 0, 'events isolated');
  assert.equal((await call('PATCH', `/calendar/${eventId}`, b.token, { title: 'Tampered' })).status, 404,
    'cross-user event edit rejected');
  assert.equal((await call('PATCH', `/calendar/${eventId}`, a.token, { description: 'Smart casual' })).status, 200,
    'update event');
  const notices = await call('GET', '/insights/notifications', a.token);
  assert.equal(notices.body.data.length, 1, 'real event notification persisted');
  assert.equal((await call('PATCH', `/insights/notifications/${notices.body.data[0].id}/read`, b.token)).status,
    404, 'cross-user notification read rejected');
  assert.equal((await call('PATCH', `/insights/notifications/${notices.body.data[0].id}/read`, a.token)).status,
    200, 'notification read');
  const dashboard = await call('GET', '/insights/dashboard', a.token);
  assert.equal(dashboard.body.data.stats.wardrobeItems, 2, 'real dashboard count');
  assert.equal(dashboard.body.data.stats.unreadNotifications, 0, 'real unread count');
  const insights = await call('GET', '/insights/wardrobe', a.token);
  assert.equal(insights.body.data.summary.totalItems, 2, 'real wardrobe insight count');
  const weather = await call('GET', '/weather', a.token);
  assert.equal(weather.status, 200, 'weather endpoint');
  console.info(`Weather: ${weather.body.data.available ? 'provider data retrieved' : weather.body.data.reason}`);
  const suggestion = await call('POST', `/calendar/${eventId}/suggest`, a.token);
  if (suggestion.status === 200) {
    const ids = new Set((await db.clothingItem.findMany({ where: { userId: a.id }, select: { id: true } })).map((row) => row.id));
    for (const outfit of suggestion.body.data.outfits) for (const id of outfit.clothingItemIds) {
      assert.ok(ids.has(id), 'AI outfit references only owned clothing');
    }
    console.info(`Event outfit suggestion: ${suggestion.body.data.outfits.length} validated looks`);
  } else if (suggestion.status === 503) {
    console.info('Event outfit suggestion: provider unavailable (expected without valid AI credentials)');
  } else throw new Error(`Unexpected event suggestion status: ${suggestion.status}`);
  assert.equal((await call('DELETE', '/profile/preferences', a.token)).status, 200, 'reset style preferences');
  const reset = await call('GET', '/profile', a.token);
  assert.deepEqual(reset.body.data.preferences.preferredAesthetics, [], 'style reset persisted');
  assert.deepEqual(reset.body.data.preferences.notificationPreferences, { daily: true }, 'account setting preserved');
  assert.equal((await call('DELETE', `/calendar/${eventId}`, a.token)).status, 204, 'delete event');
  console.info('Live style/calendar/dashboard/notification flow: PASS');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => {
    for (const id of createdUsers.reverse()) {
      try { await db.user.delete({ where: { id } }); } catch (error) { console.error(`Could not clean smoke user ${id}: ${error.message}`); process.exitCode = 1; }
    }
    await db.$disconnect();
  });
