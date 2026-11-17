// DM retention + sender delete (SOCIAL=1). Retention default 14 days is the builder's delegated choice; short-retention server proves the sweep deletes by age and keeps newer messages.
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path'; import fs from 'fs';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PGBASE = process.env.TEST_PG || '';
const mk = (port, social, extra) => {
  const data = '/tmp/lk-ret-' + port + '-' + process.pid + '.json';
  const env = Object.assign({}, process.env, { PORT: String(port), DATA_FILE: data, PGSSL: 'false' }, extra || {}); delete env.DATABASE_URL; delete env.SOCIAL; delete env.DM_RETENTION_DAYS; Object.assign(env, extra || {}); if (PGBASE) env.DATABASE_URL = PGBASE + '/lk' + port;
  if (social) env.SOCIAL = '1';
  return { p: spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'ignore' }), data, B: 'http://localhost:' + port };
};
const def = mk(8964, true), short = mk(8965, true, { DM_RETENTION_DAYS: '0.00002', DM_PURGE_SWEEP_MS: '300' }), off = mk(8966, false);
const inf = mk(8967, true, { DM_RETENTION_DAYS: 'Infinity' }), huge = mk(8969, true, { DM_RETENTION_DAYS: '99999' }), junk = mk(8970, true, { DM_RETENTION_DAYS: 'abc' }), nosweep = mk(8968, true, { DM_RETENTION_DAYS: '0.00002', DM_PURGE_SWEEP_MS: '3600000' });
const legacyFile = '/tmp/lk-ret-8971-' + process.pid + '.json';
if (!PGBASE) { const old = new Date(Date.now() - 40 * 86400000).toISOString(); fs.writeFileSync(legacyFile, JSON.stringify({ players: {}, districts: {}, dms: [{ id: 98, sender: 'x', recipient: 'y', body: 'old', at: old, readAt: null }, { id: 99, sender: 'x', recipient: 'y', body: 'old2', at: old, readAt: null }] })); }
const legacy = PGBASE ? null : (() => { const e = Object.assign({}, process.env, { PORT: '8971', DATA_FILE: legacyFile, PGSSL: 'false', SOCIAL: '1' }); delete e.DATABASE_URL; delete e.DM_RETENTION_DAYS; return { p: spawn(process.execPath, ['server.js'], { cwd: ROOT, env: e, stdio: 'ignore' }), data: legacyFile, B: 'http://localhost:8971' }; })();
const all = [def, short, off, inf, huge, junk, nosweep].concat(legacy ? [legacy] : []);
const cleanup = () => { for (const s of all) { try { s.p.kill(); } catch {} try { fs.rmSync(s.data, { force: true }); } catch {} } };
process.on('exit', cleanup);
for (const s of all) { let up = false; for (let i = 0; i < 100 && !up; i++) { await new Promise(r => setTimeout(r, 100)); up = await fetch(s.B + '/api/health').then(r => r.ok).catch(() => false); } if (!up) { console.log('FAIL server did not start'); process.exit(1); } }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const H = { 'content-type': 'application/json' };
const mkj = B => async (p, o) => { const r = await fetch(B + p, o); return { s: r.status, b: await r.json().catch(() => ({})) }; };
const A = (t, b) => ({ method: 'POST', headers: Object.assign({ authorization: 'Bearer ' + t }, H), body: JSON.stringify(b || {}) });
const G = t => ({ headers: { authorization: 'Bearer ' + t } });
const D = t => ({ method: 'DELETE', headers: { authorization: 'Bearer ' + t } });
const join = (j, n) => j('/api/join', { method: 'POST', headers: H, body: JSON.stringify({ name: n, district: 'none', adult: true }) }).then(r => r.b);
const send = async (j, u, t, to, body) => (await j(u + '/dm', A(t, { to, body }))).b.message;
const thread = async (j, u, t, w) => (await j(u + '/dm?with=' + w, G(t))).b;
{ // health reports the retention, default 14, null when social is off
  let r = await mkj(def.B)('/api/health'); ok(r.b.dmRetentionDays === 14, 'default retention is 14 days: ' + r.b.dmRetentionDays);
  r = await mkj(short.B)('/api/health'); ok(r.b.dmRetentionDays === 0.00002, 'env override reported');
  r = await mkj(off.B)('/api/health'); ok(r.b.dmRetentionDays === null, 'social off: no retention value');
}
{ const j = mkj(def.B); const a = await join(j, 'RA'), b = await join(j, 'RB'), c = await join(j, 'RC'); const ua = '/api/players/' + a.player.id, ub = '/api/players/' + b.player.id, uc = '/api/players/' + c.player.id;
  const m1 = await send(j, ua, a.token, b.player.id, 'keep me'), m2 = await send(j, ua, a.token, b.player.id, 'delete me');
  let t = await thread(j, ub, b.token, a.player.id); ok(t.retentionDays === 14 && t.messages.length === 2, 'thread carries retentionDays and both messages');
  let r = await j(ub + '/dm/' + m2.id, D(b.token)); ok(r.s === 404, "recipient cannot delete the sender's message (404)");
  t = await thread(j, ub, b.token, a.player.id); ok(t.messages.length === 2, "message still there after the recipient's failed delete");
  r = await j(uc + '/dm/' + m2.id, D(c.token)); ok(r.s === 404, "third party cannot delete (404)");
  r = await j(ua + '/dm/' + m2.id, { method: 'DELETE' }); ok(r.s === 401, 'unauthenticated delete 401');
  r = await j(ub + '/dm/' + m2.id, D(a.token)); ok(r.s === 401, "A's token cannot delete as B (401)");
  r = await j(ua + '/dm/abc', D(a.token)); ok(r.s !== 200 && r.s !== 204, 'non-numeric id is not a delete: ' + r.s);
  r = await j(ua + '/dm/' + m2.id, D(a.token)); ok(r.s === 200 && r.b.ok === true, 'sender deletes own message');
  t = await thread(j, ub, b.token, a.player.id); ok(t.messages.length === 1 && t.messages[0].id === m1.id, 'deleted for the recipient too, other message kept');
  t = await thread(j, ua, a.token, b.player.id); ok(t.messages.length === 1, 'deleted for the sender too');
  r = await j(ua + '/dm/' + m2.id, D(a.token)); ok(r.s === 404, 'second delete of the same id is 404');
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.every(x => x.n <= 1), 'unread no longer counts the deleted message');
  r = await j(ua + '/dm/' + m1.id, { method: 'DELETE', headers: { authorization: 'Bearer ' + a.token } }); ok(r.s === 200, 'second message deletable too');
  const m3 = await send(j, ua, a.token, b.player.id, 'blocked-case');
  await j(ub + '/block', A(b.token, { target: a.player.id }));
  r = await j(ua + '/dm/' + m3.id, D(a.token)); ok(r.s === 200, 'a sender can still delete their own message after being blocked');
}
{ const j = mkj(off.B); const a = await join(j, 'OA'); const r = await j('/api/players/' + a.player.id + '/dm/1', D(a.token)); ok(r.s === 404, 'social off: DELETE is 404');
}
{ const j = mkj(short.B); const a = await join(j, 'SA'), b = await join(j, 'SB'); const ua = '/api/players/' + a.player.id, ub = '/api/players/' + b.player.id;
  const m1 = await send(j, ua, a.token, b.player.id, 'old'); await sleep(1000); const m2 = await send(j, ua, a.token, b.player.id, 'newer');
  let gone = false; const t0 = Date.now(); while (!gone && Date.now() - t0 < 4000) { await sleep(100); const t = await thread(j, ub, b.token, a.player.id); gone = !t.messages.some(m => m.id === m1.id); if (gone) ok(t.messages.some(m => m.id === m2.id), 'older message purged while the newer one (not yet expired) is kept'); }
  ok(gone, 'old message purged by the sweep after the retention period');
  await sleep(2200); const t = await thread(j, ub, b.token, a.player.id); ok(t.messages.length === 0, 'newer message purged once it also passes retention');
}

{ for (const [s, n] of [[inf, 'Infinity'], [huge, '99999'], [junk, 'abc']]) { const r = await mkj(s.B)('/api/health'); ok(r.b.dmRetentionDays === 14, 'invalid DM_RETENTION_DAYS=' + n + ' falls back to 14: ' + r.b.dmRetentionDays); }
  const r = await mkj(def.B)('/api/health'); ok(r.b.dmPurge && r.b.dmPurge.failures === 0 && r.b.dmPurge.lastOkAt && r.b.dmPurge.lastError === null, 'health shows purge state: ' + JSON.stringify(r.b.dmPurge));
}
{ // ids are never reused after a delete (a stale delete of the old id must not hit a new message)
  const j = mkj(def.B); const a = await join(j, 'IA'), b = await join(j, 'IB'); const ua = '/api/players/' + a.player.id;
  const m1 = await send(j, ua, a.token, b.player.id, 'first'); await j(ua + '/dm/' + m1.id, D(a.token));
  const m2 = await send(j, ua, a.token, b.player.id, 'second'); ok(m2.id !== m1.id && m2.id > m1.id, 'new message gets a new id after a delete: ' + m1.id + ' then ' + m2.id);
  let r = await j(ua + '/dm/' + m1.id, D(a.token)); ok(r.s === 404, 'stale delete of the old id is 404');
  const t = await thread(j, ua, a.token, b.player.id); ok(t.messages.length === 1 && t.messages[0].body === 'second', 'the new message survived the stale delete');
}
{ // expiry applies at read time, independent of the physical sweep (sweep here runs only at boot)
  const j = mkj(nosweep.B); const a = await join(j, 'NA'), b = await join(j, 'NB'); const ua = '/api/players/' + a.player.id, ub = '/api/players/' + b.player.id;
  await send(j, ua, a.token, b.player.id, 'will expire'); let t = await thread(j, ub, b.token, a.player.id);
  const fresh = t.messages.length === 1; await send(j, ua, a.token, b.player.id, 'second unread'); await sleep(2300);
  t = await thread(j, ub, b.token, a.player.id); ok(fresh && t.messages.length === 0, 'expired messages are not returned even though the sweep has not run');
  const u = await j(ub + '/dm/unread', G(b.token)); ok(u.b.unread.length === 0, 'expired unread messages are not counted: ' + JSON.stringify(u.b.unread));
  const p = await mkj(nosweep.B)('/api/health'); ok(p.b.dmPurge.deleted === 0, 'sweep had not physically deleted them (read-time expiry did the hiding)');
}
if (legacy) { // legacy JSON file: ids up to 99 and no dmSeq, everything expired on first boot -> the next id still continues above 99
  const j = mkj(legacy.B); const a = await join(j, 'LA'), b = await join(j, 'LB'); const m = await send(j, '/api/players/' + a.player.id, a.token, b.player.id, 'after upgrade');
  ok(m.id === 100, 'legacy ids 98 and 99 expired and purged at boot, the next id is still 100: ' + m.id); }
console.log(`social-retention: ${pass} passed, ${fail} failed`); cleanup(); process.exit(fail ? 1 : 0);
