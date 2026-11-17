// cap eviction -> Load older reload, plus remote deletion inside the window. Run: node dm-client-bound.cjs
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const N=5200;let messages=Array.from({length:N},(_,i)=>({id:i+1,sender:'A',body:'m'+(i+1)}));
const els={};const el=id=>els[id]??={value:'',textContent:'',innerHTML:'',children:[],appendChild(x){this.children.push(x)},setAttribute(){},addEventListener(){},scrollHeight:10,scrollTop:0,clientHeight:5};
const ctx={$:el,state:{panel:'dm',account:{playerId:'me'}},document:{createElement(){return {setAttribute(){},appendChild(){}}}},api:async(p)=>{const n=Number(new URL('http://local'+p).searchParams.get('before'))||Infinity;const page=messages.filter(m=>m.id<n).slice(-50);return {messages:page,hasMore:page.length===50&&page[0].id>1,retentionDays:14}},setInterval:()=>1,clearInterval(){},confirm:()=>true,setPanel(){}};
vm.createContext(ctx);let src=fs.readFileSync(__dirname+'/../../public/app.js','utf8').split('/* ---- social DMs')[1];
vm.runInContext('/* ---- social DMs'+src+'\nglobalThis.t={DM,dmPoll,dmLoadOlder,DM_GONE};SOCIAL_ON=true;',ctx);
(async()=>{const {DM,dmPoll,dmLoadOlder,DM_GONE}=ctx.t;DM.peer={id:'A',name:'A'};
for(const m of messages)DM.seen.set(m.id,m);
messages=messages.filter(m=>m.id!==5000&&m.id!==300); // remote deletion: one inside window, one far outside it
await dmPoll();const min=Math.min(...DM.seen.keys());
console.log('after poll size',DM.seen.size,'min',min,'more',DM.more,'has5000',DM.seen.has(5000),'tombstones',DM_GONE.size);
assert(!DM.seen.has(5000),'deleted row inside window removed');assert(min>1,'old rows evicted');assert(DM.more===true);assert(![...DM_GONE].some(id=>id<min&&id!==300&&id!==5000),'evicted ids not tombstoned');
await dmLoadOlder();console.log('after Load older min',Math.min(...DM.seen.keys()));assert(Math.min(...DM.seen.keys())<min,'Load older re-fetches evicted legitimate rows');
console.log('PASS');})().catch(e=>{console.log('FAIL',e.message);process.exit(1)});
