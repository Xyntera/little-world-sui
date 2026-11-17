/* Little World on Sui (testnet hackathon build).
   On-chain Explorer Passport: a player-owned Sui object holding in-game landmark stamps.
   Stamps record in-game exploration only - they do NOT verify real-world travel or location.
   Non-financial collectible: no token, no transfer market, no value promise.
   Real wallets always sign themselves. The demo wallet (only via ?demo=1) is a
   throwaway testnet burner generated in the browser - never send real funds to it. */
import { SuiGrpcClient } from 'https://esm.sh/@mysten/sui@2.39.1/grpc';
import { Transaction } from 'https://esm.sh/@mysten/sui@2.39.1/transactions';
import { Ed25519Keypair } from 'https://esm.sh/@mysten/sui@2.39.1/keypairs/ed25519';
import { getWallets } from 'https://esm.sh/@mysten/wallet-standard@0.16.0';

const PACKAGE_ID = '0xff3b30d0c047513413cb9be57acae4a38fbf418a7a5a40590a6bebb23e5d7587';
const MODULE = 'passport';
const PASSPORT_TYPE = PACKAGE_ID + '::' + MODULE + '::Passport';
const client = new SuiGrpcClient({ network: 'testnet', baseUrl: '/sui-grpc' });
const GQL = '/sui-gql';

/* Landmark city ids (alphabetical, must stay stable; contract allows 0..25) */
// FROZEN explicit city->on-chain-id map (contract MAX_CITY_ID 36). NEVER renumber existing
// entries - old on-chain stamps must keep their meaning. New cities APPEND with the next free id only.
const CITY_ID_MAP = Object.freeze({ amsterdam:0, athens:1, auckland:2, bangkok:3, beijing:4, berlin:5, bogota:6, buenosaires:7, cairo:8, capetown:9, delhi:10, dubai:11, hongkong:12, istanbul:13, jakarta:14, kualalumpur:15, lagos:16, lima:17, lisbon:18, london:19, losangeles:20, madrid:21, marrakesh:22, mexicocity:23, moscow:24, mumbai:25, nairobi:26, newyork:27, paris:28, rio:29, rome:30, seoul:31, singapore:32, stockholm:33, sydney:34, tokyo:35, toronto:36 });
const CITY_IDS = Object.keys(CITY_ID_MAP); // index order = id order

const state = { mode: null, wallet: null, account: null, demoKey: null, passport: null, stamps: new Set(), busy: false };
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const short = a => a ? a.slice(0, 6) + '…' + a.slice(-4) : '';
const explorerUrl = id => 'https://suiscan.xyz/testnet/object/' + id;

function ui(msg, cls) { const el = $('sui-status'); if (el) { el.textContent = msg; el.className = 'sui-status' + (cls ? ' ' + cls : ''); } }
function txDigest(r) { const t = r && (r.Transaction || r); return (t && t.digest) || ''; }
function uiPending(msg, digest) {
  const el = $('sui-status'); if (!el) return;
  el.className = 'sui-status sui-warn'; el.replaceChildren();
  el.append(document.createTextNode(msg));
  if (digest) {
    const a = document.createElement('a');
    a.href = 'https://suiscan.xyz/testnet/tx/' + encodeURIComponent(digest);
    a.target = '_blank'; a.rel = 'noreferrer noopener'; a.textContent = ' view transaction';
    el.append(a);
  }
}
function uiErr(msg, digest) {
  const el = $('sui-status'); if (!el) return;
  el.className = 'sui-status sui-warn'; el.replaceChildren();
  el.append(document.createTextNode(msg));
  if (digest) {
    const a = document.createElement('a');
    a.href = 'https://suiscan.xyz/testnet/tx/' + encodeURIComponent(digest);
    a.target = '_blank'; a.rel = 'noreferrer noopener'; a.textContent = ' view transaction';
    el.append(a);
  }
}

async function gql(query, variables) {
  const r = await fetch(GQL, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!r.ok) throw new Error('query failed (' + r.status + ')');
  return r.json();
}

async function refreshPassport() {
  const data = await gql(`query($owner: SuiAddress!) { address(address: $owner) { objects(filter: { type: "` + PASSPORT_TYPE + `" }, first: 5) { nodes { address contents { json } } } } }`, { owner: state.account });
  const obj = (data.data?.address?.objects?.nodes || [])[0];
  if (!obj) { state.passport = null; state.stamps = new Set(); return; }
  const fields = obj.contents?.json || {};
  state.passport = { id: obj.address, name: fields.player_name || 'Explorer' };
  state.stamps = new Set((fields.stamps || []).map(Number));
}

async function execTx(build) {
  const tx = new Transaction();
  tx.setSender(state.account);
  build(tx);
  if (state.mode === 'demo') {
    return client.signAndExecuteTransaction({ signer: state.demoKey, transaction: tx });
  }
  const feat = state.wallet.features['sui:signAndExecuteTransaction'];
  return feat.signAndExecuteTransaction({ transaction: tx, account: state.wallet.accounts.find(a => a.address === state.account), chain: 'sui:testnet' });
}

function txFailed(r) {
  const t = r?.Transaction || r;
  const st = t?.effects?.status || t?.status;
  return st && st.success === false ? (st.error || 'transaction failed') : null;
}

async function connectWallet() {
  const wallets = getWallets().get().filter(w => w.features['sui:signAndExecuteTransaction'] && w.features['standard:connect']);
  if (!wallets.length) { ui('No Sui wallet found in this browser. Install a Sui wallet, or add ?demo=1 to the address for a throwaway testnet demo wallet.', 'sui-warn'); return; }
  const w = wallets[0];
  const res = await w.features['standard:connect'].connect();
  const acct = res.accounts[0];
  state.mode = 'wallet'; state.wallet = w; state.account = acct.address;
  await refreshPassport();
  render();
}

function connectDemo() {
  if (!new URLSearchParams(location.search).has('demo')) { ui('Demo wallet is only available with ?demo=1 in the address.', 'sui-warn'); return; }
  let stored = null;
  try { stored = localStorage.getItem('lw.suiDemoKey'); } catch {}
  let kp = null;
  if (stored) { try { kp = Ed25519Keypair.fromSecretKey(stored); } catch { kp = null; } }
  if (!kp) { kp = new Ed25519Keypair(); try { localStorage.setItem('lw.suiDemoKey', kp.getSecretKey()); } catch {} }
  state.mode = 'demo'; state.wallet = null; state.demoKey = kp; state.account = kp.toSuiAddress();
  refreshPassport().then(render).catch(e => { ui('Could not load passport: ' + (e.message || e), 'sui-warn'); render(); });
}

async function createPassport(playerName) {
  state.busy = true; ui('Creating your on-chain passport…');
  try {
    const r = await execTx(tx => tx.moveCall({ target: PACKAGE_ID + '::' + MODULE + '::create_passport', arguments: [tx.pure.string(playerName || 'Explorer')] }));
    const err = txFailed(r); if (err) throw new Error(err);
    // real wallets return bcs-encoded effects we cannot parse, so confirm via read-back
    await refreshPassport();
    if (!state.passport) { uiPending('Transaction sent - the passport is not confirmed on-chain yet (indexing can lag).', txDigest(r)); }
    else { ui('Passport created on Sui testnet.', 'sui-ok'); }
  } catch (e) { uiErr('Could not create passport: ' + String(e.message || e).slice(0, 160), e.digest); }
  state.busy = false; render();
}

async function mintStamp(cityId) {
  if (!state.passport || state.busy) return;
  state.busy = true; ui('Minting stamp on Sui testnet…');
  try {
    const r = await execTx(tx => tx.moveCall({ target: PACKAGE_ID + '::' + MODULE + '::add_stamp', arguments: [tx.object(state.passport.id), tx.pure.u64(cityId)] }));
    const err = txFailed(r); if (err) throw new Error(err);
    // fullnode read-after-write can lag; retry briefly, then trust the confirmed tx
    await refreshPassport();
    for (let i = 0; i < 3 && !state.stamps.has(cityId); i++) { await new Promise(res => setTimeout(res, 1500)); await refreshPassport(); }
    // real wallets return bcs-encoded effects we cannot parse, so confirm via read-back
    if (!state.stamps.has(cityId)) { uiPending('Transaction sent - the stamp is not confirmed on-chain yet (indexing can lag). Check the transaction before retrying.', txDigest(r)); }
    else { ui('Stamp minted on-chain.', 'sui-ok'); }
  } catch (e) { uiErr('Mint failed: ' + String(e.message || e).slice(0, 160), e.digest); }
  state.busy = false; render();
}

function render() {
  const root = $('sui-passport'); if (!root) return;
  root.replaceChildren();
  const h = document.createElement('h3'); h.textContent = 'Sui passport (testnet)';
  const note = document.createElement('p'); note.className = 'sui-note';
  note.textContent = 'Experimental hackathon feature. On-chain stamps record in-game exploration only - not real-world travel. Non-financial collectible; no token, no sale, no value promise.';
  root.append(h, note);
  if (!state.account) {
    const b1 = document.createElement('button'); b1.className = 'lk-btn'; b1.type = 'button'; b1.textContent = 'Connect Sui wallet'; b1.onclick = () => connectWallet().catch(e => ui('Connect failed: ' + (e.message || e), 'sui-warn'));
    root.append(b1);
    if (new URLSearchParams(location.search).has('demo')) {
      const b2 = document.createElement('button'); b2.className = 'lk-btn lk-btn-ghost'; b2.type = 'button'; b2.textContent = 'Use throwaway demo wallet (testnet)'; b2.onclick = connectDemo;
      root.append(b2);
    }
    return;
  }
  const addr = document.createElement('p'); addr.className = 'sui-addr';
  addr.textContent = (state.mode === 'demo' ? 'Demo wallet (testnet, throwaway): ' : 'Wallet: ') + short(state.account);
  root.append(addr);
  if (!state.passport) {
    const b = document.createElement('button'); b.className = 'lk-btn'; b.type = 'button'; b.disabled = state.busy;
    b.textContent = 'Create on-chain passport';
    b.onclick = () => createPassport((window.LW_PLAYER_NAME || 'Explorer').slice(0, 24));
    root.append(b);
    return;
  }
  const p = document.createElement('p');
  p.innerHTML = 'Passport <a href="' + explorerUrl(state.passport.id) + '" target="_blank" rel="noreferrer noopener">' + esc(short(state.passport.id)) + '</a> · ' + state.stamps.size + ' / ' + CITY_IDS.length + ' on-chain stamps';
  root.append(p);
  const sessionStamps = (window.LW_SESSION_PASSPORT || {});
  const list = document.createElement('ul'); list.className = 'sui-stamps';
  CITY_IDS.forEach((cid, i) => {
    if (!sessionStamps[cid]) return; // only cities stamped this session can be minted now
    const li = document.createElement('li');
    const onchain = state.stamps.has(i);
    li.textContent = cid + (onchain ? ' · on-chain ✓' : '');
    if (!onchain) {
      const b = document.createElement('button'); b.className = 'lk-btn lk-btn-ghost'; b.type = 'button'; b.disabled = state.busy;
      b.textContent = 'Mint on-chain';
      b.onclick = () => mintStamp(i);
      li.append(' ', b);
    }
    list.append(li);
  });
  if (!list.children.length) {
    const li = document.createElement('li'); li.textContent = 'Stamp a landmark this session, then mint it here.';
    list.append(li);
  }
  root.append(list);
}

window.LWSui = {
  init() {
    render();
    window.addEventListener('lw-session-stamp', () => render());
  },
  sessionStamp() { window.dispatchEvent(new CustomEvent('lw-session-stamp')); },
};

// boot
try { window.LWSui.init(); } catch (e) { console.error('sui init failed', e); }
