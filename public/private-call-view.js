// Unwired private audio consent/status view. Application supplies every effect.
// Nothing here captures media, plays audio, discovers people or joins the game.
export function mountPrivateCallView(root,{peerName,start,end,stopLocal,mute=()=>{},play=async()=>{},dismiss=()=>{}}){
 if(typeof stopLocal!=='function')throw new Error('Local audio shutdown callback required');
 let gen=0,busy=false,phase='ready',muted=false,mode=null,error='',disposed=false,connectedPending=false;
 const title=document.createElement('h2');title.textContent='Private voice with '+peerName;
 const detail=document.createElement('p'),status=document.createElement('p'),message=document.createElement('p'),actions=document.createElement('div');
 status.setAttribute('role','status');message.setAttribute('role','status');actions.style.cssText='display:flex;flex-wrap:wrap;gap:10px';
 const make=(label,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='min-height:44px;padding:10px 14px;border-radius:22px;border:1px solid #8aab9a;background:#103f35;color:#fff';b.onclick=fn;actions.append(b);return b;};
 const listen=make('Connect listen only',()=>connect(true)),speak=make('Use microphone and connect',()=>connect(false)),toggle=make('Mute microphone',()=>{muted=!muted;mute(muted);render();}),sound=make('Enable sound',async()=>{try{await play();error='';}catch{error='Sound is still paused. Try Enable sound again.';}render();}),stop=make('End private voice',finish),back=make('Back without connecting',()=>{if(!busy&&(phase==='ready'||phase==='ended'))dismiss();});
 root.replaceChildren(title,detail,status,actions,message);
 function render(){if(disposed)return;
 detail.textContent='An accepted invitation is separate from microphone permission. Listen only never sends your microphone. Using a microphone requires its own permission. City voice is not switched automatically.';
 status.textContent=phase==='ready'?'Invitation accepted. No audio connected.':phase==='starting'?(mode?'Connecting without a microphone.':'Waiting for microphone permission or a private connection. You can end here.'):
 phase==='waiting'?'Joined the private room. Waiting for the audio connection.':phase==='live'?(mode?'Private voice connected. Your microphone is off.':muted?'Private voice connected. Your microphone is muted.':'Private voice connected. Your microphone is on.'):
 phase==='ending'?'Microphone stopped. Finishing private voice exit.':phase==='cleanup'?'Audio stopped here. Could not confirm the other side has ended. Retry ending.':'Private voice ended. No audio connected.';
 listen.hidden=speak.hidden=phase!=='ready';back.hidden=phase!=='ready'&&phase!=='ended';back.textContent=phase==='ended'?'Back to chat':'Back without connecting';toggle.hidden=phase!=='live'||mode;sound.hidden=phase!=='live';stop.hidden=phase==='ready'||phase==='ended';stop.textContent=phase==='cleanup'?'Retry ending':'End private voice';
 listen.disabled=speak.disabled=busy;stop.disabled=phase==='ending';toggle.textContent=muted?'Unmute microphone':'Mute microphone';toggle.setAttribute('aria-pressed',String(muted));message.textContent=error;
 }
 async function connect(listenOnly){if(disposed||busy||phase!=='ready')return;const owner=++gen;busy=true;mode=listenOnly;connectedPending=false;phase='starting';error='';render();
 try{await start({listenOnly});if(disposed||owner!==gen)return;phase=connectedPending?'live':'waiting';}
 catch(e){if(disposed||owner!==gen)return;stopLocal();phase='ready';error=e?.message||'Could not connect. No audio connected.';}
 finally{if(!disposed&&owner===gen){busy=false;render();}}
 }
 async function finish(){if(disposed||phase==='ending'||phase==='ended'||phase==='ready')return;++gen;stopLocal();busy=true;phase='ending';error='';render();
 try{await end();if(disposed)return;phase='ended';}catch{if(disposed)return;phase='cleanup';error='The connection may be offline. Audio stays stopped here.';}finally{if(!disposed){busy=false;render();}}
 }
 render();return{cleanupFailed(){if(disposed)return;++gen;stopLocal();busy=false;phase='cleanup';error='The connection may be offline. Audio stays stopped here.';render();},connected(){if(disposed)return;if(phase==='starting')connectedPending=true;else if(phase==='waiting'){phase='live';render();}},ended(){if(disposed)return;++gen;stopLocal();phase='ended';busy=false;error='';render();},dispose(){stopLocal();disposed=true;++gen;root.replaceChildren();}};
}
