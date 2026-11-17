// Ephemeral invitation state for the disabled private-voice pilot. No messages or media are stored.
const crypto=require('crypto');
function createCalls({ringMs=60000,id=()=>crypto.randomBytes(12).toString('hex')}={}){
 const calls=new Map(),of=new Map();
 const remove=c=>{calls.delete(c.id);for(const p of [c.from,c.to])if(of.get(p)===c.id)of.delete(p);};
 const sweep=now=>{for(const c of calls.values())if(now>=c.expires)remove(c);};
 const get=(pid,now)=>{sweep(now);return calls.get(of.get(pid))||null;};
 const view=(c,pid)=>c?{id:c.id,peer:c.from===pid?c.to:c.from,incoming:c.to===pid,state:c.state,expires:c.expires}:null;
 return{
  get,view,sweep,
  invite(from,to,now){sweep(now);if(from===to)return{error:'Choose another person',status:400};if(of.has(from)||of.has(to))return{error:'One of you already has a private call pending or active',status:409};const c={id:id(),from,to,state:'ringing',expires:now+ringMs};calls.set(c.id,c);of.set(from,c.id);of.set(to,c.id);return{call:c};},
  accept(pid,cid,now){const c=get(pid,now);if(!c||c.id!==cid)return{error:'This invitation is no longer available',status:404};if(c.to!==pid||c.state!=='ringing')return{error:'Only the invited person can accept',status:403};c.state='accepted';c.expires=now+120000;return{call:c};},
  end(pid,cid,now){const c=get(pid,now);if(!c||c.id!==cid)return false;remove(c);return true;},
  endPlayer(pid,now){const c=get(pid,now);if(c)remove(c);return c;},
  allowed(a,b,now){const c=get(a,now);return !!(c&&c.state==='accepted'&&((c.from===a&&c.to===b)||(c.from===b&&c.to===a)));}
 };
}
module.exports={createCalls};
