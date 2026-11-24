/* Creates and destroys only its own local audit database; never touches app data. */
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const source = process.env.DATABASE_URL;
if (!source) throw new Error('DATABASE_URL is required.');
const url = new URL(source);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !['postgres:', 'postgresql:'].includes(url.protocol)) {
  throw new Error('Refusing non-local PostgreSQL.');
}
const sourceName = decodeURIComponent(url.pathname.slice(1));
if (!sourceName || sourceName === 'postgres' || sourceName.startsWith('closetai_audit_')) {
  throw new Error('Refusing an ambiguous source database.');
}
const name = `closetai_audit_${randomBytes(8).toString('hex')}`;
const isolated = new URL(url); isolated.pathname = `/${name}`;
const serverDir = path.join(__dirname, '..');
const pgEnv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const dbArgs = ['--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username), name];
const appEnv = { ...pgEnv, DATABASE_URL: isolated.toString(), NODE_ENV: 'development', PORT: '4100',
  JWT_SECRET: 'audit-only-random-looking-secret-32-characters-minimum', FRONTEND_URL: 'http://localhost:3100',
  ALLOWED_ORIGINS: 'http://localhost:3100', AI_PROVIDER: 'openai', WEATHER_PROVIDER: 'none' };
delete appEnv.RESEND_API_KEY;
delete appEnv.EMAIL_FROM;
let created = false;
let server;
let serverOutput = '';
function run(command, args, env = pgEnv) {
  const result = spawnSync(command, args, { cwd: serverDir, env, encoding: 'utf8', timeout: 180_000 });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} failed: ${(result.stderr || result.error?.message || 'unknown error').slice(0, 800)}`);
  }
  return result.stdout.trim();
}
async function waitForReady() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (server.exitCode !== null) {
      const safeLines = serverOutput.split(/\r?\n/).filter((line) => /error|invalid|failed|EADDRINUSE/i.test(line))
        .map((line) => line.replace(/postgres(?:ql)?:\/\/\S+/g, '[REDACTED_DATABASE_URL]'));
      throw new Error(`Isolated API exited before becoming ready. ${safeLines.slice(-3).join(' | ').slice(0, 500)}`);
    }
    try {
      const response = await fetch('http://localhost:4100/api/v1/health', { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* bounded startup retry */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Isolated API did not become healthy.');
}
async function call(method, route, body, cookies) {
  const response = await fetch(`http://localhost:4100/api/v1${route}`, {
    method, headers: { Origin: 'http://localhost:3100', ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookies ? { Cookie: cookies } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15_000),
  });
  return { status: response.status, body: response.status === 204 ? null : await response.json(),
    setCookies: response.headers.getSetCookie() };
}
function cookiesFrom(response) {
  return response.setCookies.map((value) => value.split(';')[0]).join('; ');
}
async function waitForCode(email, seen = 0) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const matches = [...serverOutput.matchAll(new RegExp(`Verification code for ${email}: (\\d{6})`, 'g'))];
    if (matches.length > seen) return matches[matches.length - 1][1];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Development verification email was not logged by the isolated API.');
}
async function coreFlow() {
  const db = new PrismaClient({ datasources: { db: { url: isolated.toString() } } });
  try {
    const email = `audit-${randomBytes(6).toString('hex')}@closetai.test`;
    const password = `Audit-${randomBytes(12).toString('hex')}`;
    const invalid = await call('POST', '/auth/signup', { name: 'A', email: 'bad', password: 'short' });
    assert.equal(invalid.status, 422, 'invalid signup rejected');
    const signup = await call('POST', '/auth/signup', { name: 'Audit One', email, password });
    assert.equal(signup.status, 201, 'signup');
    assert.equal((await call('POST', '/auth/signup', { name: 'Audit One', email, password })).status, 409, 'duplicate rejected');
    const user = await db.user.findUnique({ where: { email }, include: { emailVerificationChallenges: true } });
    assert.ok(user && user.passwordHash && user.passwordHash !== password && !user.emailVerifiedAt, 'hashed unverified user persisted');
    const code = await waitForCode(email);
    assert.notEqual(user.emailVerificationChallenges[0].tokenHash, code, 'OTP is hashed at rest');
    assert.equal((await call('POST', '/auth/login', { email, password })).status, 403, 'unverified login rejected');
    assert.equal((await call('POST', '/auth/verify-email', { email, code: '000000' })).status, 400, 'invalid OTP rejected');
    const verified = await call('POST', '/auth/verify-email', { email, code });
    assert.equal(verified.status, 200, 'email verification');
    assert.equal((await call('POST', '/auth/verify-email', { email, code })).status, 400, 'OTP cannot be reused');
    assert.ok(verified.setCookies.some((value) => value.startsWith('closetai_refresh=') && value.includes('HttpOnly') && value.includes('SameSite=Lax')));
    assert.ok((await db.user.findUnique({ where: { email } })).emailVerifiedAt, 'verification persisted');
    assert.equal((await call('POST', '/auth/login', { email, password: 'incorrect' })).status, 401, 'incorrect password rejected');
    const login = await call('POST', '/auth/login', { email, password });
    assert.equal(login.status, 200, 'login');
    const loginCookies = cookiesFrom(login);
    assert.equal((await call('GET', '/auth/me', null, loginCookies)).body.data.user.email, email, 'current user');
    const profile = await call('PATCH', '/profile/profile', { firstName: 'Audit Updated' }, loginCookies);
    assert.equal(profile.status, 200, 'profile update');
    const first = await call('POST', '/wardrobe', { name: 'Audit top', category: 'tops', colors: ['Ivory'] }, loginCookies);
    const second = await call('POST', '/wardrobe', { name: 'Audit bottom', category: 'bottoms', colors: ['Black'] }, loginCookies);
    assert.equal(first.status, 201, 'first wardrobe item'); assert.equal(second.status, 201, 'second wardrobe item');
    const itemId = first.body.data.id;
    assert.equal((await call('GET', `/wardrobe/${itemId}`, null, loginCookies)).body.data.name, 'Audit top', 'item persisted');
    const batchIds = [itemId, second.body.data.id];
    const bulk = (action, itemIds = batchIds, cookies = loginCookies) => call('PATCH', '/wardrobe/bulk', { itemIds, action }, cookies);
    assert.equal((await bulk('favorite')).body.data.updatedCount, 2, 'bulk favorites applied');
    assert.equal((await call('GET', '/wardrobe?favorite=true', null, loginCookies)).body.meta.total, 2, 'favorites list persisted');
    assert.equal((await bulk('archive')).status, 200, 'bulk archive');
    assert.equal((await call('GET', '/wardrobe', null, loginCookies)).body.meta.total, 0, 'archived hidden from active wardrobe');
    assert.equal((await call('GET', '/wardrobe?archived=true', null, loginCookies)).body.meta.total, 2, 'archived view');
    assert.equal((await bulk('restore')).status, 200, 'bulk restore');
    assert.equal((await bulk('unfavorite')).status, 200, 'bulk unfavorite');
    assert.equal((await bulk('archive', [itemId, 'nonexistent-audit-item'])).status, 404, 'invalid batch rejected');
    assert.equal((await db.clothingItem.findUnique({ where: { id: itemId } })).archived, false, 'invalid batch rolled back owned item update');
    assert.equal((await call('GET', '/wardrobe?sortBy=name&sortDir=asc', null, loginCookies)).body.data[0].name, 'Audit bottom', 'name sort');
    const saved = await call('POST', '/outfits', { title: 'Audit look', clothingItemIds: [itemId, second.body.data.id] }, loginCookies);
    assert.equal(saved.status, 201, 'save manual outfit');
    assert.equal((await call('GET', '/outfits/saved', null, loginCookies)).body.data.length, 1, 'saved outfit persisted');
    const logout = await call('POST', '/auth/logout', null, loginCookies);
    assert.equal(logout.status, 200, 'logout');
    assert.equal((await call('POST', '/auth/refresh', null, loginCookies)).status, 401, 'revoked refresh rejected');
    const relogin = await call('POST', '/auth/login', { email, password });
    assert.equal(relogin.status, 200, 'relogin');
    const newCookies = cookiesFrom(relogin);
    assert.equal((await call('GET', '/profile', null, newCookies)).body.data.profile.firstName, 'Audit Updated', 'profile persists after relogin');
    assert.equal((await call('GET', '/outfits/saved', null, newCookies)).body.data.length, 1, 'outfit persists after relogin');
    assert.equal((await call('DELETE', `/wardrobe/${itemId}`, null, newCookies)).status, 204, 'delete clothing item');
    const afterDelete = await call('GET', '/outfits/saved', null, newCookies);
    assert.equal(afterDelete.body.data[0].outfit.items[0].snapshotName, 'Audit top', 'outfit snapshot survives item deletion');
    assert.equal(afterDelete.body.data[0].outfit.items[0].clothingItem, null, 'deleted item reference cleared');
    const otherEmail = `audit-${randomBytes(6).toString('hex')}@closetai.test`;
    const otherPassword = `Audit-${randomBytes(12).toString('hex')}`;
    assert.equal((await call('POST', '/auth/signup', { name: 'Audit Two', email: otherEmail, password: otherPassword })).status, 201);
    const otherCode = await waitForCode(otherEmail);
    const other = await call('POST', '/auth/verify-email', { email: otherEmail, code: otherCode });
    const otherCookies = cookiesFrom(other);
    const otherItem = await call('POST', '/wardrobe', { name: 'Audit private item', category: 'tops' }, otherCookies);
    assert.equal(otherItem.status, 201, 'second-user wardrobe item');
    assert.equal((await bulk('archive', [second.body.data.id, otherItem.body.data.id], newCookies)).status, 404, 'mixed ownership batch rejected');
    assert.equal((await db.clothingItem.findUnique({ where: { id: second.body.data.id } })).archived, false, 'owned record rollback after foreign ID');
    assert.equal((await db.clothingItem.findUnique({ where: { id: otherItem.body.data.id } })).archived, false, 'foreign record unchanged');
    assert.equal((await call('GET', `/wardrobe/${second.body.data.id}`, null, otherCookies)).status, 404, 'foreign wardrobe read rejected');
    assert.equal((await call('PATCH', `/wardrobe/${second.body.data.id}`, { name: 'Tampered' }, otherCookies)).status, 404, 'foreign wardrobe edit rejected');
    assert.equal((await call('GET', '/outfits/saved', null, otherCookies)).body.data.length, 0, 'saved outfits isolated');
    console.info('Isolated signup, OTP, login, profile, wardrobe bulk actions, archive/restore, outfit, logout, persistence and ownership flow: PASS.');
  } finally { await db.$disconnect(); }
}
async function main() {
  try {
    run('createdb', dbArgs); created = true;
    run('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], appEnv);
    server = spawn(process.execPath, [path.join(serverDir, 'dist', 'index.js')], {
      cwd: serverDir, env: appEnv, stdio: ['ignore', 'pipe', 'pipe'],
    });
    server.stdout.on('data', (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-20_000); });
    server.stderr.on('data', (chunk) => { serverOutput = (serverOutput + chunk.toString()).slice(-20_000); });
    await waitForReady();
    await coreFlow();
    const result = run(process.execPath, [path.join(__dirname, 'smoke-style-flow.cjs')],
      { ...appEnv, SMOKE_API_URL: 'http://localhost:4100/api/v1' });
    console.info(result);
    console.info('Isolated live API smoke PASS.');
  } finally {
    if (server && server.exitCode === null) {
      server.kill('SIGTERM');
      await new Promise((resolve) => server.once('exit', resolve));
    }
    if (created) {
      try { run('dropdb', dbArgs); console.info('Disposable audit database removed.'); }
      catch (error) { console.error(`Cleanup failed for disposable database ${name}: ${error.message}`); process.exitCode = 1; }
    }
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
