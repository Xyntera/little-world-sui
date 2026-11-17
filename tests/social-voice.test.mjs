// social port P2: block enforcement in city voice rooms + 1:1 DM voice room. SOCIAL=1 + VOICE_ENABLED=1; and OFF check.
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path'; import fs from 'fs';
const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const mk = (port, social) => { const data = '/tmp/lk-sv-' + port + '-' + process.pid + '.json';
  const env = Object.assign({}, process.env, { PORT: String(port), DATA_FILE: data, PGSSL: 'false', VOICE_ENABLED: '1' }); delete env.DATABASE_URL; delete env.SOCIAL; delete env.SOCIAL_PAIR_VOICE; if (process.env.TEST_PG) env.DATABASE_URL = process.env.TEST_PG + '/lk' + port; if (social) env.SOCIAL = '1'; if (social === 'pair') env.SOCIAL_PAIR_VOICE = '1';
  return { p: spawn(process.execPath, ['server.js'], { cwd: ROOT, env, stdio: 'ignore' }), data, B: 'http://localhost:' + port }; };
const off = mk(8961, false), on = mk(8962, 'pair'), nopair = mk(8963, true);
const cleanup = () => { for (const s of [off, on, nopair]) { try { s.p.kill(); } catch {} try { fs.rmSync(s.data, { force: true }); } catch {} } };
process.on('exit', cleanup);
for (const s of [off, on, nopair]) { let up = false; for (let i = 0; i < 100 && !up; i++) { await new Promise(r => setTimeout(r, 100)); up = await fetch(s.B + '/api/health').then(r => r.ok).catch(() => false); } if (!up) { console.log('FAIL server did not start'); process.exit(1); } }
let pass = 0, fail = 0; const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL', m); } };
const H = { 'content-type': 'application/json' };
const mkj = B => async (p, o) => { const r = await fetch(B + p, o); return { s: r.status, b: await r.json().catch(() => ({})) }; };
const A = (t, b) => ({ method: 'POST', headers: Object.assign({ authorization: 'Bearer ' + t }, H), body: JSON.stringify(b || {}) });
const G = t => ({ headers: { authorization: 'Bearer ' + t } });
const join = (j, n) => j('/api/join', { method: 'POST', headers: H, body: JSON.stringify({ name: n, district: 'none', adult: true }) }).then(r => r.b);
const U = p => '/api/players/' + p.player.id;
{ // OFF: dm join 404, city voice view unchanged
  const j = mkj(off.B); const a = await join(j, 'A'), b = await join(j, 'B');
  await j(U(a) + '/ping', A(a.token, { city: 'kerala', x: 0, z: 0 })); await j(U(b) + '/ping', A(b.token, { city: 'kerala', x: 1, z: 1 }));
  let r = await j(U(a) + '/voice/join', A(a.token, { dm: b.player.id })); ok(r.s === 404, 'OFF dm voice join 404: ' + r.s);
  r = await j(U(a) + '/voice/join', A(a.token, {})); ok(r.s === 200 && r.b.room === 'city:kerala' && r.b.max === 50, 'OFF city join unchanged, max 50');
}
{ const j = mkj(on.B); const a = await join(j, 'A'), b = await join(j, 'B'), c = await join(j, 'C');
  for (const [p, x] of [[a, 0], [b, 1], [c, 2]]) await j(U(p) + '/ping', A(p.token, { city: 'kerala', x, z: 0 }));
  for (const p of [a, b, c]) await j(U(p) + '/voice/join', A(p.token, {}));
  let r = await j(U(a) + '/voice', G(a.token)); ok(r.b.members.length === 3 && r.b.max === 50 && r.b.room === 'city:kerala', 'city room 3 members, max 50, per-city');
  ok(r.b.hear.includes(b.player.id) && r.b.hear.includes(c.player.id), 'A hears B and C before block');
  await j(U(b) + '/block', A(b.token, { target: a.player.id }));
  r = await j(U(a) + '/voice', G(a.token)); ok(!r.b.members.some(m => m.id === b.player.id) && !r.b.hear.includes(b.player.id) && r.b.hear.includes(c.player.id), 'A no longer sees/hears B (B blocked A); still hears C');
  r = await j(U(b) + '/voice', G(b.token)); ok(!r.b.members.some(m => m.id === a.player.id) && !r.b.hear.includes(a.player.id) && !(r.b.inbound || []).includes(a.player.id) && !(r.b.pos || {})[a.player.id], 'symmetric: B no longer sees/hears A, no pos leak');
  r = await j(U(c) + '/voice', G(c.token)); ok(r.b.members.some(m => m.id === a.player.id) && r.b.members.some(m => m.id === b.player.id), 'C unaffected');
  r = await j(U(a) + '/voice/signal', A(a.token, { to: b.player.id, data: { x: 1 } })); ok(r.s === 404, 'signal to blocking peer refused: ' + r.s);
  r = await j(U(b) + '/voice/signal', A(b.token, { to: a.player.id, data: { x: 1 } })); ok(r.s === 404, 'signal from blocker to blocked refused');
  r = await j(U(a) + '/voice/signal', A(a.token, { to: c.player.id, data: { x: 1 } })); ok(r.s === 200, 'signal to unrelated peer ok');
  // queued-before-block: B queues a signal for A, then A blocks C... use a fresh pair D,E in same room
  { const d = await join(j, 'D'), e = await join(j, 'E'); for (const p of [d, e]) { await j(U(p) + '/ping', A(p.token, { city: 'kerala', x: 3, z: 0 })); await j(U(p) + '/voice/join', A(p.token, {})); }
    await j(U(d) + '/voice/signal', A(d.token, { to: e.player.id, data: { pre: 'block' } }));
    await j(U(e) + '/block', A(e.token, { target: d.player.id }));
    let q = await j(U(e) + '/voice', G(e.token)); ok(q.s === 200 && q.b.signals.length === 0, 'signal queued BEFORE block is dropped, not delivered after: ' + JSON.stringify(q.b.signals));
    await j(U(d) + '/voice/signal', A(d.token, { to: c.player.id, data: { ok: 1 } }));
    q = await j(U(c) + '/voice', G(c.token)); ok(q.b.signals.some(g => g.from === d.player.id), 'unrelated pair signal still delivered');
    // bidirectional: SENDER is the blocker (D blocks E after queueing for E): E's poll must not receive it either
    await j(U(d) + '/voice/signal', A(d.token, { to: e.player.id, data: { pre: 'senderblocks' } }));
    await j(U(d) + '/block', A(d.token, { target: e.player.id }));
    q = await j(U(e) + '/voice', G(e.token)); ok(q.s === 200 && q.b.signals.length === 0, 'queued signal dropped when sender is the blocker: ' + JSON.stringify(q.b.signals));
    // sender left the room after queueing, then block: still dropped
    await j(U(d) + '/unblock', A(d.token, { target: e.player.id })); await j(U(e) + '/unblock', A(e.token, { target: d.player.id }));
    await j(U(d) + '/voice/signal', A(d.token, { to: e.player.id, data: { pre: 'leave' } }));
    await j(U(d) + '/voice/leave', A(d.token, {}));
    await j(U(e) + '/block', A(e.token, { target: d.player.id }));
    q = await j(U(e) + '/voice', G(e.token)); ok(q.s === 200 && q.b.signals.length === 0, 'queued signal from departed sender dropped after block');
    await j(U(e) + '/unblock', A(e.token, { target: d.player.id }));
  }
  await j(U(b) + '/unblock', A(b.token, { target: a.player.id }));
  r = await j(U(a) + '/voice', G(a.token)); ok(r.b.members.some(m => m.id === b.player.id), 'unblock restores view immediately (cache invalidated)');
  // Private rooms require recipient acceptance; no silent room switch.
  for(const p of [a,b,c])await j(U(p)+'/voice/leave',A(p.token,{}));
  const acceptPair=async(x,y)=>{const inv=await j(U(x)+'/private-call/invite',A(x.token,{to:y.player.id}));if(inv.s!==201)throw Error(JSON.stringify(inv));const accepted=await j(U(y)+'/private-call/accept',A(y.token,{id:inv.b.call.id}));if(accepted.s!==200)throw Error(JSON.stringify(accepted));return inv.b.call.id;};
  r=await j(U(a)+'/voice/join',A(a.token,{dm:b.player.id}));ok(r.s===409,'uninvited private join denied');
  const pairId=await acceptPair(a,b);
  r=await j(U(a)+'/voice/join',A(a.token,{dm:b.player.id,callId:pairId,listenOnly:true}));const dmroom=r.b.room;ok(r.s===200&&r.b.max===2,'accepted caller joins pair room');
  r=await j(U(c)+'/voice/join',A(c.token,{dm:b.player.id}));ok(r.s===409,'third party cannot enter private call');
  r=await j(U(b)+'/voice/join',A(b.token,{dm:a.player.id,callId:pairId,listenOnly:true}));ok(r.s===200&&r.b.room===dmroom&&r.b.members.length===2,'recipient joins accepted room');
  r=await j(U(a)+'/voice/join',A(a.token,{listenOnly:true}));ok(r.s===409,'active call not silently replaced by city room');
  await j(U(b)+'/voice/signal',A(b.token,{to:a.player.id,callId:pairId,data:{call:'inflight'}}));
  await j(U(b)+'/block',A(b.token,{target:a.player.id}));
  r=await j(U(a)+'/voice',G(a.token));ok(r.s===409&&!r.b.signals,'block ends call and queued signals');
  r=await j(U(b)+'/voice',G(b.token));ok(r.s===409,'block ends both memberships');

}
{ // SOCIAL=1 without SOCIAL_PAIR_VOICE: text/block features on, 1:1 voice rooms stay closed
  const j = mkj(nopair.B), a = await join(j, 'NoPairA'), b = await join(j, 'NoPairB');
  const h = await fetch(nopair.B + '/api/health').then(r => r.json());
  ok(h.social === true && h.pairVoice === false, 'health: social on, pairVoice off: ' + JSON.stringify([h.social, h.pairVoice]));
  const r = await j(U(a) + '/voice/join', A(a.token, { dm: b.player.id }));
  ok(r.s === 404, 'SOCIAL=1 without SOCIAL_PAIR_VOICE: dm voice join 404: ' + r.s);
  const r2 = await j(U(a) + '/block', A(a.token, { target: b.player.id }));
  ok(r2.s === 200, 'blocks still work without pair voice: ' + r2.s);
}
console.log(`social-voice: ${pass} passed, ${fail} failed`);const stopped=[off,on,nopair].map(s=>new Promise(r=>s.p.once('exit',r)));cleanup();await Promise.all(stopped);process.exit(fail?1:0);
