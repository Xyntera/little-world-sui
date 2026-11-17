import {mountPrivateCallView} from './private-call-view.js';
import {createPrivateCallSession} from './private-call-session.js';
// Private default-OFF composition. Game supplies no microphone acquisition. acquireAudio is an
// explicit, caller-provided consent operation; this module has no capture API.
export function mountPrivateCall(root,{api,callId,peerId,playerId,peerName,acquireAudio,onDismiss=()=>{},onCleanupError=()=>{},pollMs=1000}){
 let session=null,owned=null,timer=null,generation=0,disposed=false,starting=null;
 const audio=document.createElement('audio');audio.autoplay=true;audio.setAttribute('playsinline','');
 const stop=()=>{++generation;clearInterval(timer);timer=null;session?.close();if(owned){owned.getTracks().forEach(t=>t.stop());owned=null;}audio.pause();audio.srcObject=null;};
 const view=mountPrivateCallView(root,{peerName,
  start({listenOnly}){
   const g=++generation;
   starting=(async()=>{
    // Validate before even requesting caller-supplied media. Never switch city voice.
    const current=await api('/private-call');if(disposed||g!==generation)return;
    if(!current.call||current.call.id!==callId||current.call.peer!==peerId||current.call.state!=='accepted')throw new Error('Private invitation ended. No audio connected.');
    try{await api('/voice');throw new Error('Leave existing voice before connecting private audio.');}catch(e){if(e.status!==409)throw e;}
    if(disposed||g!==generation)return;
    let stream=null;
    if(!listenOnly){if(typeof acquireAudio!=='function')throw new Error('Microphone connection is unavailable in this preview. Choose listen only.');stream=await acquireAudio();if(disposed||g!==generation){stream?.getTracks().forEach(t=>t.stop());return;}owned=stream;}
    session=createPrivateCallSession({api,callId,peerId,playerId,listenOnly,stream,
     releaseMedia(){if(owned){owned.getTracks().forEach(t=>t.stop());owned=null;}},
     onStream(s){if(!disposed&&g===generation){audio.srcObject=s;audio.play().catch(()=>{});}},
     onState(state){if(disposed||g!==generation)return;if(state==='connected')view.connected();else if(state==='failed'){stop();view.cleanupFailed();}}
    });
    await session.start();if(disposed||g!==generation)return;
    timer=setInterval(async()=>{if(disposed||g!==generation)return;try{await session.tick();}catch(e){if(g===generation){stop();if(e.code==='CALL_ENDED')view.ended();else view.cleanupFailed();}}},pollMs);
   })();return starting;
  },
  stopLocal:stop,
  async end(){try{await starting;}catch{}if(session)await session.end();else{try{await api('/private-call/end',{id:callId});}catch(e){if(e.status!==404)throw e;}}},
  mute(muted){owned?.getAudioTracks().forEach(t=>t.enabled=!muted);},
  play:()=>audio.play(),dismiss:onDismiss
 });
 return{async stats(){return session?session.stats():{state:'new',receivedBytes:0};},dispose(){if(disposed)return;disposed=true;stop();view.dispose();audio.remove();if(starting)(async()=>{try{await starting;}catch{}try{if(session)await session.end();else await api('/private-call/end',{id:callId});}catch(e){if(e.status!==404)onCleanupError({callId,error:e});}})();},get stream(){return owned;}};
}
