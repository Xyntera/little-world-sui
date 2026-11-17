import * as THREE from '/vendor/three.module.js';
// Free local practice. Not shared, saved, rewarded or connected to the city score.
export function practiceFields(world,city){
 if(city!=='kerala')return[];
 return(world?.places||[]).flatMap(p=>p.name?.startsWith('EMS-inspired football ground')?[{x:p.x,z:p.z,along:'z',half:16,wide:11,goal:3,name:'Kozhikode practice'}]:p.name?.startsWith('JLN-inspired stadium')||p.name?.startsWith('Greenfield-inspired stadium')?[{x:p.x,z:p.z,along:'x',half:9,wide:6,goal:1.8,name:p.name.startsWith('JLN')?'Kochi practice':'Thiruvananthapuram practice'}]:[]);
}
// Judge the ball at the goal line, not where a later simulation step ends.
export function footballGoalCrossing(oldU,oldV,u,v,half,mouth){
 const line=Math.sign(u)*(half+.38),delta=u-oldU;
 if(!delta)return false;
 const t=(line-oldU)/delta;
 return t>=0&&t<=1&&Math.abs(oldV+(v-oldV)*t)<mouth-.38;
}
export function createFootball({getWorld,getPlayer,getCity,isPlaying,scene,onMessage,onGoal}){
 const panel=document.createElement('section');panel.id='football-practice';panel.hidden=true;panel.setAttribute('aria-label','Local football practice');
 const title=document.createElement('strong'),status=document.createElement('span'),note=document.createElement('small');note.textContent='Walk into the ball to push it, or face the goal and kick nearby. Gold arrow: kick direction. No saved points or shared ball';
 const kick=document.createElement('button');kick.type='button';kick.textContent='Kick ball';kick.setAttribute('aria-label','Kick nearby football in the direction you face');
 const start=document.createElement('button'),reset=document.createElement('button'),stop=document.createElement('button');for(const b of[start,reset,stop])b.type='button';start.textContent='Start practice';reset.textContent='Reset ball';stop.textContent='End practice';panel.append(title,status,note,start,reset,stop,kick);document.body.append(panel);const options=document.createElement('button');options.type='button';options.textContent='Options';options.setAttribute('aria-expanded','false');panel.append(options);let expanded=false;options.onclick=()=>{expanded=!expanded;panel.classList.toggle('expanded',expanded);options.setAttribute('aria-expanded',String(expanded));};
 let world=null,active=null,ball=null,aim=null,tally=0,x=0,z=0,vx=0,vz=0,lastPlayer=null,renderKey=null,kickWait=0;
 function dispose(){if(aim){aim.removeFromParent();aim.geometry.dispose();aim.material.dispose();aim=null;}if(ball){ball.removeFromParent();ball.geometry.dispose();ball.material.dispose();ball=null;}active=null;lastPlayer=null;}
 function center(){kickWait=0;x=active.x;z=active.z;vx=vz=0;if(ball)ball.position.set(x,getWorld().groundY(x,z)+.38,z);lastPlayer=null;}
 function eligible(){const p=getPlayer();return isPlaying()&&p&&!p.vkind;}
 function nearby(){const p=getPlayer();if(!p||!eligible())return null;return practiceFields(getWorld(),getCity()).find(f=>Math.abs(p.x-f.x)<(f.along==='x'?f.half:f.wide)+5&&Math.abs(p.z-f.z)<(f.along==='z'?f.half:f.wide)+5);}
 function startPractice(expected){const f=nearby();if(!f||(expected&&(f.name!==expected.name||f.x!==expected.x||f.z!==expected.z)))return false;dispose();world=getWorld();active=f;tally=0;expanded=false;panel.classList.remove('expanded');options.setAttribute('aria-expanded','false');ball=new THREE.Mesh(new THREE.IcosahedronGeometry(.38,1),new THREE.MeshStandardMaterial({color:'#f4eee0',flatShading:true,roughness:.8}));ball.castShadow=true;scene().add(ball);const shape=new THREE.Shape();shape.moveTo(-.08,0);shape.lineTo(.08,0);shape.lineTo(.08,.8);shape.lineTo(.24,.8);shape.lineTo(0,1.2);shape.lineTo(-.24,.8);shape.lineTo(-.08,.8);shape.closePath();aim=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#ffdc58',side:THREE.DoubleSide,depthWrite:false}));aim.name='football-kick-direction';aim.rotation.x=Math.PI/2;scene().add(aim);center();render();return true;}
 start.onclick=()=>startPractice();
 kick.onclick=()=>{const p=getPlayer();if(!active||world!==getWorld()||!eligible()||kickWait>0||Math.hypot(x-p.x,z-p.z)>1.8)return;vx=Math.sin(p.dir)*11;vz=Math.cos(p.dir)*11;kickWait=.35;renderKey=null;render();};
 reset.onclick=()=>{if(active&&world===getWorld()&&eligible())center();};stop.onclick=()=>{dispose();render();};
 function ballCue(){const p=getPlayer();if(!active||!p)return '';const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<=1.8)return 'Ball in kick range';const angle=Math.atan2(dx,dz)-p.dir,turn=Math.atan2(Math.sin(angle),Math.cos(angle)),direction=Math.abs(turn)>2.35?'behind you':Math.abs(turn)<.65?'ahead':turn>0?'to your left':'to your right';return 'Ball '+Math.round(d)+' game units '+direction;}
 function render(){const near=nearby(),show=active||near,key=JSON.stringify([show?.name,!!active,tally,ballCue(),active&&Math.hypot(x-getPlayer().x,z-getPlayer().z)<=1.8,kickWait>0]);if(key===renderKey)return;renderKey=key;panel.hidden=!show;panel.classList.toggle('active',!!active);options.hidden=!active;if(!show)return;title.textContent=(active||near).name;status.textContent=active?'Goals: '+tally+' · '+ballCue()+' · local only':'Walk onto the pitch, then start a free solo practice';kick.hidden=!active;kick.disabled=!active||kickWait>0||Math.hypot(x-getPlayer().x,z-getPlayer().z)>1.8;start.hidden=!!active;reset.hidden=stop.hidden=!active;}
 function tick(dt){
  if(world!==getWorld()){dispose();world=getWorld();}const p=getPlayer();
  if(active&&(!eligible()||Math.abs(p.x-active.x)>(active.along==='x'?active.half:active.wide)+12||Math.abs(p.z-active.z)>(active.along==='z'?active.half:active.wide)+12))dispose();
  if(active){
   dt=Math.min(.05,Math.max(0,dt));kickWait=Math.max(0,kickWait-dt);const moved=lastPlayer?Math.hypot(p.x-lastPlayer.x,p.z-lastPlayer.z):0;lastPlayer={x:p.x,z:p.z};
   const oldU=active.along==='x'?x-active.x:z-active.z,oldV=active.along==='x'?z-active.z:x-active.x;
   const dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d>.001&&d<.94&&moved>.001){const kick=Math.min(11,3+moved/Math.max(.001,dt)*.8);vx=dx/d*kick;vz=dz/d*kick;x=p.x+dx/d*.95;z=p.z+dz/d*.95;}
   x+=vx*dt;z+=vz*dt;const damping=Math.exp(-dt*1.25);vx*=damping;vz*=damping;
   const u=active.along==='x'?x-active.x:z-active.z,v=active.along==='x'?z-active.z:x-active.x;
   if(Math.abs(u)>active.half+.38){if(footballGoalCrossing(oldU,oldV,u,v,active.half,active.goal)){tally++;onGoal?.({...active});onMessage('Goal! Local practice only. Ball back at the centre.');center();}else{onMessage('Out of play. Ball back at the centre.');center();}}
   else if(Math.abs(v)>active.wide-.38){if(active.along==='x'){z=active.z+Math.sign(v)*(active.wide-.38);vz*=-.6;}else{x=active.x+Math.sign(v)*(active.wide-.38);vx*=-.6;}}
   aim.visible=kickWait===0&&Math.hypot(x-p.x,z-p.z)<=1.8;if(aim.visible){aim.position.set(x+Math.sin(p.dir)*.55,Math.max(.76,world.groundY(x,z)+.14),z+Math.cos(p.dir)*.55);aim.rotation.set(Math.PI/2,0,-p.dir);}
   ball.position.set(x,world.groundY(x,z)+.38,z);ball.rotation.x+=vz*dt/.38;ball.rotation.z-=vx*dt/.38;
  }render();
 }
 return{tick,startPractice,isPractice:expected=>world===getWorld()&&!!active&&active.name===expected?.name&&active.x===expected.x&&active.z===expected.z,canStart:expected=>{const f=nearby();return !!f&&f.name===expected?.name&&f.x===expected.x&&f.z===expected.z;},stop:()=>{dispose();renderKey=null;panel.hidden=true;},get snapshot(){return{active:active?.name||null,x,z,vx,vz,tally};}};
}
