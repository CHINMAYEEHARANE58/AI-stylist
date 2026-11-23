/* Replays migrations in a uniquely named, disposable LOCAL database only. */
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { spawnSync } = require('node:child_process');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const source = process.env.DATABASE_URL;
if (!source) throw new Error('DATABASE_URL is required.');
const url = new URL(source);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || !['postgresql:', 'postgres:'].includes(url.protocol)) {
  throw new Error('Refusing a non-local PostgreSQL endpoint.');
}
const sourceName = decodeURIComponent(url.pathname.slice(1));
if (!sourceName || sourceName === 'postgres' || sourceName.startsWith('closetai_audit_')) {
  throw new Error('Refusing an ambiguous or previously disposable source database.');
}
const name = `closetai_audit_${randomBytes(8).toString('hex')}`;
const testUrl = new URL(url);
testUrl.pathname = `/${name}`;
const pgEnv = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const connection = ['--host', url.hostname, '--port', url.port || '5432', '--username', decodeURIComponent(url.username)];
let created = false;
function run(command, args, env = pgEnv) {
  const result = spawnSync(command, args, { cwd: path.join(__dirname, '..'), env, encoding: 'utf8' });
  if (result.error || result.status !== 0) {
    // Never print the command, environment or a connection string.
    throw new Error(`${command} failed: ${(result.stderr || result.error?.message || 'unknown error').slice(0, 800)}`);
  }
  return result.stdout.trim();
}

try {
  run('createdb', [...connection, name]);
  created = true;
  const isolatedEnv = { ...pgEnv, DATABASE_URL: testUrl.toString() };
  run('npx', ['--no-install', 'prisma', 'migrate', 'deploy'], isolatedEnv);
  const status = run('npx', ['--no-install', 'prisma', 'migrate', 'status'], isolatedEnv);
  if (!status.includes('Database schema is up to date')) throw new Error('Migration replay was not up to date.');
  const counts = run('psql', [...connection, '--dbname', name, '--no-psqlrc', '--tuples-only', '--no-align',
    '--command', `SELECT (SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'),
      (SELECT count(*) FROM pg_constraint WHERE contype='f' AND connamespace='public'::regnamespace),
      (SELECT count(*) FROM pg_index i JOIN pg_class c ON c.oid=i.indrelid
       JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND i.indisunique AND NOT i.indisprimary);`], isolatedEnv);
  const [tables, foreignKeys, uniqueConstraints] = counts.split('|').map(Number);
  if (tables < 29 || foreignKeys < 20 || uniqueConstraints < 10) throw new Error('Unexpected schema or constraint counts.');
  console.info(`Clean migration replay PASS: ${tables} tables, ${foreignKeys} foreign keys, ${uniqueConstraints} non-primary unique indexes.`);
} finally {
  if (created) {
    try { run('dropdb', [...connection, name]); console.info('Disposable audit database removed.'); }
    catch (error) { console.error(`Cleanup failed for disposable database ${name}: ${error.message}`); process.exitCode = 1; }
  }
}
