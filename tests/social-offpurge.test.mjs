// Switch-off safety: with SOCIAL off, an existing dm_messages table/array is still expired; a fresh OFF install never creates it (no social DDL).
import { spawn } from 'child_process'; import { fileURLToPath } from 'url'; import path from 'path'; import fs from 'fs'; import { createRequire } from 'module';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url))), PGBASE = process.env.TEST_PG || '';
const start = (port, social, extra) => { const data = '/tmp/lk-off-' + port + '.json'; const env = Object.assign({}, process.env, { PORT: String(port), DATA_FILE: data, PGSSL: 'false' }, extra); delete env.DATABASE_URL; delete env.SOCIAL; Object.assign(env, extra); if (PGBASE) env.DATABASE_URL = PGBASE + '/lk' + port; if (social) env.SOCIAL = '1'; return { p: spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'ignore' }), data, B: 'http://localhost:' + port }; };
const up = async s => { for (let i = 0; i < 100; i++) { await new Promise(r => setTimeout(r, 100)); if (await fetch(s.B + '/api/health').then(r => r.ok).catch(() => false)) return; } console.log('FAIL server did not start'); process.exit(1); };
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms)); const H = { 'content-type': 'application/json' };
const health = async s => (await fetch(s.B + '/api/health')).json();
const R = { RETENTION: { DM_RETENTION_DAYS: '0.00002' } };
for (const f of ['/tmp/lk-off-8972.json', '/tmp/lk-off-8973.json']) fs.rmSync(f, { force: true });
// phase A: social on, no sweep, one message
let s = start(8972, true, { DM_RETENTION_DAYS: '0.00002', DM_PURGE_SWEEP_MS: '99999999' }); await up(s);
const join = n => fetch(s.B + '/api/join', { method: 'POST', headers: H, body: JSON.stringify({ name: n, district: 'none', adult: true }) }).then(r => r.json());
const a = await join('OA'), b = await join('OB');
const sent = await fetch(s.B + '/api/players/' + a.player.id + '/dm', { method: 'POST', headers: { ...H, authorization: 'Bearer ' + a.token }, body: JSON.stringify({ to: b.player.id, body: 'left behind' }) });
ok(sent.status === 200 || sent.status === 201, 'social-on send ' + sent.status);
await sleep(2500); s.p.kill(); await sleep(500);
// phase B: SAME store, SOCIAL off, retention-capable code: existing messages are expired, endpoints stay 404
s = start(8972, false, { DM_RETENTION_DAYS: '0.00002', DM_PURGE_SWEEP_MS: '300' }); await up(s);
let h = {}; for (let i = 0; i < 30; i++) { h = await health(s); if (h.dmPurge && h.dmPurge.deleted >= 1) break; await sleep(200); }
ok(h.social === false && h.dmPurge && h.dmPurge.deleted >= 1, 'OFF with an existing table still purges expired messages: ' + JSON.stringify(h.dmPurge));
const e = await fetch(s.B + '/api/players/' + a.player.id + '/dm?with=' + b.player.id, { headers: { authorization: 'Bearer ' + a.token } }); ok(e.status === 404, 'OFF: dm endpoint still 404: ' + e.status);
s.p.kill();
// phase C: fresh OFF install: no sweep state, and no social table is created
const f = start(8973, false, { DM_RETENTION_DAYS: '0.00002', DM_PURGE_SWEEP_MS: '300' }); await up(f); await sleep(1500); h = await health(f);
ok(h.dmPurge === null && h.dmRetentionDays === null, 'fresh OFF install: no purge state: ' + JSON.stringify(h.dmPurge));
if (PGBASE) { const req = createRequire(ROOT + '/'); const pg = req('pg'); const c = new pg.Client({ connectionString: PGBASE + '/lk8973', ssl: false }); await c.connect(); const t = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('dm_messages','blocks','reports')"); await c.end(); ok(t.rows.length === 0, 'fresh OFF install on Postgres: no social tables created: ' + t.rows.length); }
f.p.kill(); for (const x of ['/tmp/lk-off-8972.json', '/tmp/lk-off-8973.json']) fs.rmSync(x, { force: true });
console.log(`social-offpurge: ${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
