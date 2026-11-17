// social port P1: blocks / reports / DMs. Default OFF (404, no state) and SOCIAL=1 behaviour, JSON store.
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path'; import fs from 'fs';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PGBASE = process.env.TEST_PG || ''; // e.g. postgres://lk:lk@localhost:5544 : each server gets its own empty database
const mk = (port, social, extra) => {
  const data = '/tmp/lk-soc-' + port + '-' + process.pid + '.json';
  const env = Object.assign({}, process.env, { PORT: String(port), DATA_FILE: data, PGSSL: 'false' }, extra || {}); delete env.DATABASE_URL; delete env.SOCIAL; if (PGBASE) env.DATABASE_URL = PGBASE + '/lk' + port;
  if (social) env.SOCIAL = '1';
  const p = spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'ignore' });
  return { p, data, B: 'http://localhost:' + port };
};
const off = mk(8957, false), on = mk(8958, true), big = mk(8963, true, { DM_RATE_MAX: '500' });
const cleanup = () => { for (const s of [off, on, big]) { try { s.p.kill(); } catch {} try { fs.rmSync(s.data, { force: true }); } catch {} } };
process.on('exit', cleanup);
for (const s of [off, on, big]) { let up = false; for (let i = 0; i < 100 && !up; i++) { await new Promise(r => setTimeout(r, 100)); up = await fetch(s.B + '/api/health').then(r => r.ok).catch(() => false); } if (!up) { console.log('FAIL server did not start'); process.exit(1); } }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const H = { 'content-type': 'application/json' };
const mkj = B => async (p, o) => { const r = await fetch(B + p, o); return { s: r.status, b: await r.json().catch(() => ({})) }; };
const A = (t, b) => ({ method: 'POST', headers: Object.assign({ authorization: 'Bearer ' + t }, H), body: JSON.stringify(b || {}) });
const G = t => ({ headers: { authorization: 'Bearer ' + t } });
const join = (j, n) => j('/api/join', { method: 'POST', headers: H, body: JSON.stringify({ name: n, district: 'none', adult: true }) }).then(r => r.b);

// OFF
{ const j = mkj(off.B); const a = await join(j, 'OffA'), b = await join(j, 'OffB'); const u = '/api/players/' + a.player.id;
  for (const [p, o] of [['/block', A(a.token, { target: b.player.id })], ['/unblock', A(a.token, { target: b.player.id })], ['/blocks', G(a.token)], ['/report', A(a.token, { target: b.player.id })], ['/dm', A(a.token, { to: b.player.id, body: 'hi' })], ['/dm?with=' + b.player.id, G(a.token)], ['/dm/unread', G(a.token)]]) {
    const r = await j(u + p, o); ok(r.s === 404, 'OFF ' + p + ' is 404, got ' + r.s); }
  if (PGBASE) { const { default: pg } = await import('pg'); const c = new pg.Client({ connectionString: PGBASE + '/lk8957' }); await c.connect(); const r = await c.query("select to_regclass('blocks') b, to_regclass('dm_messages') d, to_regclass('reports') r"); await c.end(); ok(r.rows[0].b === null && r.rows[0].d === null && r.rows[0].r === null, 'PG OFF: blocks/dm_messages/reports tables do not exist after boot and use: ' + JSON.stringify(r.rows[0])); }
  else { const d = fs.existsSync(off.data) ? JSON.parse(fs.readFileSync(off.data, 'utf8')) : {}; ok(!d.dms && !d.blocks && !d.socialReports, 'OFF writes no social state'); }
}
// ON
{ const j = mkj(on.B); const a = await join(j, 'OnA'), b = await join(j, 'OnB'), c = await join(j, 'OnC');
  const ua = '/api/players/' + a.player.id, ub = '/api/players/' + b.player.id;
  let r = await j(ua + '/dm', A(a.token, { to: b.player.id, body: '  hello  ' })); ok(r.s === 201 && r.b.message.body === 'hello', 'send dm trimmed: ' + r.s);
  r = await j(ua + '/dm', A(a.token, { to: a.player.id, body: 'me' })); ok(r.s === 404, 'dm to self rejected');
  r = await j(ua + '/dm', A(a.token, { to: 'p_nope', body: 'x' })); ok(r.s === 404, 'dm to unknown rejected');
  r = await j(ua + '/dm', A(a.token, { to: b.player.id, body: '   ' })); ok(r.s === 400, 'empty dm rejected');
  r = await j(ua + '/dm', A('badtoken', { to: b.player.id, body: 'x' })); ok(r.s === 401, 'bad token 401');
  r = await j(ua + '/dm', A(b.token, { to: b.player.id, body: 'x' })); ok(r.s === 401, "cannot send as another player's id");
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.length === 1 && r.b.unread[0].sender === a.player.id && r.b.unread[0].n === 1, 'B unread 1 from A');
  r = await j(ua + '/dm?with=' + c.player.id, G(a.token)); ok(r.s === 200 && r.b.messages.length === 0, 'thread with C empty and C cannot see A-B');
  r = await j(ub + '/dm?with=' + a.player.id, G(b.token)); ok(r.b.messages.length === 1 && r.b.messages[0].body === 'hello', 'B reads thread');
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.length === 0, 'read clears unread');
  r = await j(ua + '/dm', A(a.token, { to: b.player.id, body: 'x'.repeat(900) })); ok(r.b.message.body.length === 500, 'body capped 500');
  // block
  r = await j(ub + '/block', A(b.token, { target: a.player.id })); ok(r.s === 200, 'B blocks A');
  r = await j(ub + '/blocks', G(b.token)); ok(r.b.blocked.length === 1 && r.b.blocked[0] === a.player.id, 'blocks list');
  ok(r.b.people.length === 1 && r.b.people[0].id === a.player.id && r.b.people[0].name === 'OnA', 'blocks list carries display names for the unblock UI');
  r = await j(ua + '/blocks', G(a.token)); ok(r.b.blocked.length === 0, 'A does not see being blocked in own list');
  r = await j(ua + '/dm', A(a.token, { to: b.player.id, body: 'still?' })); ok(r.s === 403, 'blocked A cannot dm B');
  r = await j(ub + '/dm', A(b.token, { to: a.player.id, body: 'hey' })); ok(r.s === 403, 'blocker cannot dm blocked either (unblock first)');
  r = await j(ua + '/dm?with=' + b.player.id, G(a.token)); ok(r.s === 403, 'blocked thread read 403');
  r = await j(ub + '/block', A(b.token, { target: a.player.id })); ok(r.s === 200, 'block idempotent');
  // unread semantics under block: A sends B a message, B has unread; block suppresses count both ways, unblock restores, nothing deleted
  await j(ub + '/unblock', A(b.token, { target: a.player.id }));
  await j(ua + '/dm', A(a.token, { to: b.player.id, body: 'unread-probe' }));
  r = await j(ub + '/dm/unread', G(b.token)); const n0 = r.b.unread.length && r.b.unread[0].n; ok(n0 >= 1, 'B has unread from A before block (n=' + n0 + '): ' + JSON.stringify(r.b.unread));
  await j(ub + '/block', A(b.token, { target: a.player.id }));
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.length === 0, 'blocker unread count from blocked sender suppressed: ' + JSON.stringify(r.b.unread));
  await j(ub + '/unblock', A(b.token, { target: a.player.id })); await j(ua + '/block', A(a.token, { target: b.player.id }));
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.length === 0, 'unread suppressed when the SENDER is the blocker too');
  await j(ua + '/unblock', A(a.token, { target: b.player.id }));
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.length === 1 && r.b.unread[0].n === n0, 'unread count returns unchanged after unblock, message kept');
  r = await j(ub + '/dm?with=' + a.player.id, G(b.token)); ok(r.b.messages.some(m => m.body === 'unread-probe'), 'message still readable after unblock');
  await j(ub + '/block', A(b.token, { target: a.player.id }));
  r = await j(ub + '/unblock', A(b.token, { target: a.player.id })); ok(r.s === 200, 'unblock');
  r = await j(ua + '/dm', A(a.token, { to: b.player.id, body: 'back' })); ok(r.s === 201, 'dm works after unblock');
  r = await j(ub + '/block', A(b.token, { target: 'p_nope' })); ok(r.s === 404, 'block unknown 404');
  r = await j(ub + '/block', A(b.token, { target: b.player.id })); ok(r.s === 404, 'block self 404');
  // report
  r = await j(ub + '/report', A(b.token, { target: a.player.id, category: 'spam', reason: 'r'.repeat(500) })); ok(r.s === 200, 'report ok');
  r = await j(ub + '/report', A(b.token, { target: a.player.id, category: 'bogus' })); ok(r.s === 200, 'unknown category stored as other');
  r = await j(ub + '/report', A(b.token, { target: 'p_nope' })); ok(r.s === 404, 'report unknown 404');
  await new Promise(r => setTimeout(r, 400));
  let reps;
  if (PGBASE) { const { default: pg } = await import('pg'); const c = new pg.Client({ connectionString: PGBASE + '/lk8958' }); await c.connect(); reps = (await c.query('select category, length(reason) len from reports order by id')).rows.map(x => ({ category: x.category, reason: { length: x.len } })); await c.end(); }
  else reps = JSON.parse(fs.readFileSync(on.data, 'utf8')).socialReports;
  ok(reps.length === 2 && reps[0].category === 'spam' && reps[0].reason.length === 200 && reps[1].category === 'other', 'reports stored capped/normalised');
  // rate limit: 20 dm/min per sender
  let n429 = 0; for (let i = 0; i < 25; i++) { r = await j(ua + '/dm', A(a.token, { to: c.player.id, body: 'f' + i })); if (r.s === 429) n429++; }
  ok(n429 >= 5, 'dm rate limit triggers (' + n429 + ' x429 of 25 after earlier sends)');
}
// 51+ window: only delivered ids are marked read; older page reachable; isolation/unauth/blocked
{ const j = mkj(big.B); const a = await join(j, 'WA'), b = await join(j, 'WB'), c = await join(j, 'WC'); const ua = '/api/players/' + a.player.id, ub = '/api/players/' + b.player.id, uc = '/api/players/' + c.player.id;
  for (let i = 1; i <= 51; i++) { await j(ua + '/dm', A(a.token, { to: b.player.id, body: 'm' + i })); if (i % 15 === 0) await new Promise(r => setTimeout(r, 0)); }
  await j(uc + '/dm', A(c.token, { to: b.player.id, body: 'from-c' }));
  let r = await j(ub + '/dm/unread', G(b.token)); const un = Object.fromEntries(r.b.unread.map(x => [x.sender, x.n]));
  ok(un[a.player.id] === 51 && un[c.player.id] === 1, 'unread before: A=51 C=1 got ' + JSON.stringify(un));
  r = await j(ub + '/dm?with=' + a.player.id, G(b.token)); const ids = r.b.messages.map(m => m.id);
  ok(r.b.messages.length === 50 && r.b.hasMore === true && r.b.messages[0].body === 'm2' && r.b.messages[49].body === 'm51', 'latest page = m2..m51, hasMore');
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.find(x => x.sender === a.player.id).n === 1, 'only the 50 delivered are marked read; 1 older still unread: ' + JSON.stringify(r.b.unread));
  ok(r.b.unread.find(x => x.sender === c.player.id).n === 1, 'other sender unread untouched');
  r = await j(ub + '/dm?with=' + a.player.id + '&before=' + ids[0], G(b.token)); ok(r.b.messages.length === 1 && r.b.messages[0].body === 'm1' && r.b.hasMore === false, 'older page via before= returns m1');
  r = await j(ub + '/dm/unread', G(b.token)); ok(!r.b.unread.some(x => x.sender === a.player.id), 'after reading older page, A unread = 0');
  r = await j(ub + '/dm?with=' + a.player.id + '&before=abc', G(b.token)); ok(r.s === 200 && r.b.messages.length === 50, 'non-numeric before ignored');
  r = await j(uc + '/dm?with=' + a.player.id, G(c.token)); ok(r.b.messages.length === 0, 'third party C sees none of the A-B thread');
  r = await j(ub + '/dm?with=' + a.player.id, { headers: {} }); ok(r.s === 401, 'unauthenticated read 401');
  r = await j(ub + '/dm?with=' + a.player.id, G(c.token)); ok(r.s === 401, "C's token cannot read as B");
  r = await j(ua + '/dm?with=' + b.player.id, G(a.token)); ok(r.b.messages.length === 50 && r.b.messages.every(m => m.sender === a.player.id), 'sender reads own thread: 50 sent messages returned');
  r = await j(ub + '/dm/unread', G(b.token)); ok(r.b.unread.find(x => x.sender === c.player.id).n === 1, 'sender-side read did not clear receiver unread of C');
  await j(ub + '/block', A(b.token, { target: a.player.id })); r = await j(ub + '/dm?with=' + a.player.id + '&before=999999', G(b.token)); ok(r.s === 403, 'blocked: paged read 403');
}
console.log(`social-api: ${pass} passed, ${fail} failed`); cleanup(); process.exit(fail ? 1 : 0);
