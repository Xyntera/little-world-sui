import {createPrivateTransport} from './private-voice-transport.js';
// Unwired controller. api must authenticate as the participant; caller owns cadence,
// media permission, playback and stopping its supplied stream on releaseMedia.
export function createPrivateCallSession({api,callId,peerId,playerId,stream=null,listenOnly,releaseMedia,onStream=()=>{},onState=()=>{},transportFactory=createPrivateTransport}){
 if(!callId||!peerId||!playerId||typeof api!=='function'||typeof listenOnly!=='boolean'||(!listenOnly&&!stream)||(listenOnly&&stream)||(stream&&typeof releaseMedia!=='function'))throw new Error('Accepted call and explicit media choice required');
 let closed=false,transport=null,started=false,busy=false,joined=false,startPromise=null,endPromise=null;
 const valid=c=>c&&c.id===callId&&c.peer===peerId&&c.state==='accepted';
 const close=()=>{if(closed)return;closed=true;try{transport?.close();}finally{releaseMedia?.();}};
 const endRemote=async()=>{try{await api('/private-call/end',{id:callId});}catch(e){if(e.status!==404)throw e;}};
 const check=async()=>{const r=await api('/private-call');if(!valid(r.call)){const e=new Error('Private invitation ended or changed');e.code='CALL_ENDED';throw e;}return r.call;};
 const begin=async()=>{if(started||closed)return;started=true;
   try{await check();if(closed)return;await api('/voice/join',{dm:peerId,callId,listenOnly});joined=true;if(closed){await endRemote().catch(()=>{});return;}
    transport=transportFactory({stream,initiator:playerId<peerId,onStream:s=>{if(!closed)onStream(s);},onState:s=>{if(!closed)onState(s);},send:data=>closed?undefined:api('/voice/signal',{to:peerId,callId,data})});
    await transport.start();
   }catch(e){close();if(joined)await endRemote().catch(()=>{});throw e;}
 };
 return{
  start(){if(!startPromise)startPromise=begin();return startPromise;},
  async tick(){if(closed||!transport||busy)return;busy=true;
   try{await check();if(closed)return;const r=await api('/voice');if(closed)return;
    for(const s of r.signals||[]){if(closed)return;if(s.from===peerId&&s.callId===callId)await transport.receive(s.data);}
   }catch(e){close();throw e;}finally{busy=false;}
  },
  end(){close();if(!endPromise)endPromise=(async()=>{try{await startPromise;}catch{}await endRemote();})().finally(()=>{endPromise=null;});return endPromise;},
  close,
  stats:()=>transport?transport.stats():Promise.resolve({state:closed?'closed':'new',receivedBytes:0}),
  get closed(){return closed;}
 };
}
