// Unwired preparation module. Caller supplies signaling and an explicitly owned stream.
// This module never captures a microphone, joins a room, or fetches a network endpoint.
export function createPrivateTransport({stream=null,send,onStream=()=>{},onState=()=>{},initiator=false,PeerConnection=globalThis.RTCPeerConnection,iceServers=[]}){
 if(typeof send!=='function')throw new TypeError('send callback required');
 const pc=new PeerConnection({iceServers}),pending=[];let closed=false,started=false,chain=Promise.resolve();
 const alive=()=>!closed;
 const emit=data=>{if(alive())Promise.resolve().then(()=>alive()&&send(data)).catch(()=>{if(alive())onState('signaling-error');});};
 pc.onicecandidate=e=>{if(e.candidate)emit({candidate:e.candidate.toJSON?e.candidate.toJSON():e.candidate});};
 pc.ontrack=e=>{if(alive())onStream(e.streams[0]||new MediaStream([e.track]));};
 pc.onconnectionstatechange=()=>{if(alive())onState(pc.connectionState);};
 if(stream)for(const t of stream.getAudioTracks())pc.addTrack(t,stream);
 else pc.addTransceiver('audio',{direction:'recvonly'});
 const queue=fn=>{const next=chain.then(()=>alive()&&fn());chain=next.catch(()=>{});return next;};
 const close=()=>{if(closed)return;closed=true;pending.length=0;pc.ontrack=pc.onicecandidate=pc.onconnectionstatechange=null;pc.close();};
 return{
  // Only the designated initiator offers. Recipient waits for that offer.
  start(){if(started||closed)return Promise.resolve();started=true;return queue(async()=>{if(!initiator)return;const d=await pc.createOffer();if(!alive())return;await pc.setLocalDescription(d);if(alive())emit({description:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription});});},
  receive(data){return queue(async()=>{
   if(!data||typeof data!=='object')throw new Error('Invalid signal');
   if(data.description){const d=data.description;if(!['offer','answer'].includes(d.type)||typeof d.sdp!=='string'||d.sdp.length>64000)throw new Error('Invalid description');
    if((initiator&&d.type!=='answer')||(!initiator&&d.type!=='offer'))throw new Error('Unexpected description role');
    await pc.setRemoteDescription(d);if(!alive())return;
    for(const c of pending.splice(0)){await pc.addIceCandidate(c);if(!alive())return;}
    if(d.type==='offer'){const a=await pc.createAnswer();if(!alive())return;await pc.setLocalDescription(a);if(alive())emit({description:pc.localDescription.toJSON?pc.localDescription.toJSON():pc.localDescription});}
   }else if(data.candidate){const c=data.candidate;if(typeof c.candidate!=='string'||c.candidate.length>4000)throw new Error('Invalid candidate');
    if(pc.remoteDescription)await pc.addIceCandidate(c);else{if(pending.length>=64)throw new Error('Too many early candidates');pending.push(c);}
   }else throw new Error('Empty signal');
  });},
  close,
  async stats(){if(closed)return{state:'closed',receivedBytes:0};const reports=await pc.getStats();let receivedBytes=0;reports.forEach(r=>{if(r.type==='inbound-rtp'&&(r.kind||r.mediaType)==='audio')receivedBytes+=r.bytesReceived||0;});return{state:closed?'closed':pc.connectionState,receivedBytes};},
  get closed(){return closed;}
 };
}
