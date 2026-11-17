import * as THREE from '/vendor/three.module.js';
// Optional solo game-road practice. No score, saving, network or vehicle control.
// Cache asphalt topology only. Temporary blockers are checked when offering/starting.
const routeCache=new WeakMap();
export function practiceRoute(world,player,blocked,segmentClear=null){

 let routes=routeCache.get(world);if(!routes){routes=[];
 for(const road of world.roads||[]){
  if(road.pts||!['x','z'].includes(road.ax))continue;
  const alongZ=road.ax==='x',point=t=>alongZ?{x:road.c,z:t}:{x:t,z:road.c};
  for(let t=road.from+3;t+90<=road.to-3;t+=6){
   let ok=true;for(let k=0;k<=90;k+=1){const p=point(t+k);if(!world.roadAsphalt?.(p.x,p.z,0)){ok=false;break;}}
   if(!ok)continue;const gates=[0,30,60,90].map(k=>point(t+k));
   routes.push(gates);
  }
 }
 routeCache.set(world,routes);}
 const nearby=routes.map(source=>{const gates=source.map(p=>({...p}));if(Math.hypot(player.x-gates[3].x,player.z-gates[3].z)<Math.hypot(player.x-gates[0].x,player.z-gates[0].z))gates.reverse();return{gates,d:Math.hypot(player.x-gates[0].x,player.z-gates[0].z)};}).filter(q=>q.d<=12).sort((a,b)=>a.d-b.d);
 return nearby.find(q=>courseClear(world,q.gates,blocked,false,segmentClear))?.gates||null;
}
// Cached topology is only a candidate: parked vehicles can change clearance.
function courseClear(world,gates,blocked,corner=false,segmentClear=null){
 for(let j=1;j<gates.length;j++){const a=gates[j-1],b=gates[j],n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)));
  if(segmentClear&&!segmentClear(a.x,a.z,b.x,b.z,2.4))return false;
  for(let k=0;k<=n;k++){const x=a.x+(b.x-a.x)*k/n,z=a.z+(b.z-a.z)*k/n;if(blocked(x,z,2.4)||!world.roadAsphalt?.(x,z,0))return false;
   if(corner)for(let i=0;i<8;i++)if(!world.roadAsphalt(x+Math.sin(i*Math.PI/4)*2.4,z+Math.cos(i*Math.PI/4)*2.4,0))return false;
  }
 }return true;
}
// A corner is offered only where both arms and a full turning disc fit existing asphalt.
const cornerCache=new WeakMap();
export function cornerPracticeRoute(world,player,blocked,segmentClear=null){
 let routes=cornerCache.get(world);if(!routes){routes=[];
 const roads=(world.roads||[]).filter(r=>!r.pts&&['x','z'].includes(r.ax));
 const clear=(x,z)=>{for(let i=0;i<8;i++)if(!world.roadAsphalt?.(x+Math.sin(i*Math.PI/4)*2.4,z+Math.cos(i*Math.PI/4)*2.4,0))return false;return true;};
 for(const a of roads.filter(r=>r.ax==='x'))for(const b of roads.filter(r=>r.ax==='z')){
  const x=a.c,z=b.c;if(z<a.from||z>a.to||x<b.from||x>b.to)continue;
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const gates=[{x,z:z+sz*30},{x,z},{x:x+sx*30,z},{x:x+sx*60,z}];
   let ok=true;for(let j=1;j<gates.length&&ok;j++){const p=gates[j-1],q=gates[j],n=Math.ceil(Math.hypot(q.x-p.x,q.z-p.z));for(let k=0;k<=n;k++)if(!clear(p.x+(q.x-p.x)*k/n,p.z+(q.z-p.z)*k/n)){ok=false;break;}}
   if(ok)routes.push(gates);
  }
 }cornerCache.set(world,routes);}
 let best=null,d=Infinity;for(const gates of routes){const n=Math.hypot(player.x-gates[0].x,player.z-gates[0].z);if(n<d&&n<=12&&courseClear(world,gates,blocked,true,segmentClear)){d=n;best=gates;}}return best?best.map(p=>({...p})):null;
}
// Validate only the unfinished part of the current leg, not road already passed.
export function remainingPracticeCourse(route,index,player){
 if(index<=0)return route;
 const a=route[index-1],b=route[index];if(!b)return [];
 const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.z-a.z)*dz)/l)):0;
 return [{x:a.x+dx*t,z:a.z+dz*t},...route.slice(index)];
}
// A ring course follows its current road leg, not a shortcut across the scenery.
export function practiceOffCourse(world,route,index,player){
 if(!world.roadAsphalt?.(player.x,player.z,0))return true;
 if(index<=0)return false;
 const a=route[index-1],b=route[index];if(!a||!b)return false;
 const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((player.x-a.x)*dx+(player.z-a.z)*dz)/l)):0;
 return Math.hypot(player.x-a.x-dx*t,player.z-a.z-dz*t)>6;
}
export function createDrivePractice({getWorld,getPlayer,isPlaying,blocked,segmentClear=null,scene,onMap}){
 const panel=document.createElement('section');panel.id='drive-practice';panel.hidden=true;panel.setAttribute('aria-label','Solo driving practice');
 const title=document.createElement('strong'),status=document.createElement('span'),note=document.createElement('small'),start=document.createElement('button'),end=document.createElement('button');title.textContent='Solo driving practice';note.textContent='Game roads only · no saved points or shared gates';start.textContent='Show practice';end.textContent='End practice';start.type=end.type='button';panel.append(title,status,note,start,end);document.body.append(panel);
 let expanded=false;const options=document.createElement('button');options.type='button';options.textContent='Options';options.className='practice-options';options.setAttribute('aria-expanded','false');panel.append(options);options.onclick=()=>{expanded=!expanded;panel.classList.toggle('expanded',expanded);options.setAttribute('aria-expanded',String(expanded));options.textContent=expanded?'Hide options':'Options';};
 let kind='straight';const choose=document.createElement('select');choose.setAttribute('aria-label','Practice course');for(const [value,text]of [['straight','Straight course'],['corner','Corner course']]){const o=document.createElement('option');o.value=value;o.textContent=text;choose.append(o);}panel.insertBefore(choose,start);const map=document.createElement('button');map.type='button';map.textContent='Course map';map.hidden=true;map.onclick=()=>{if(route)onMap?.();};panel.append(map);
 let world=null,route=null,group=null,index=0,elapsed=0,done=false,obstructed=false,offCourse=false,clearWait=0,key='',candidate=null,checkedX=Infinity,checkedZ=Infinity,offerWait=0;
 const find=()=>kind==='corner'?cornerPracticeRoute(world,getPlayer(),blocked,segmentClear):practiceRoute(world,getPlayer(),blocked,segmentClear);
 choose.onchange=()=>{dispose();kind=choose.value;candidate=find();checkedX=getPlayer().x;checkedZ=getPlayer().z;render();};
 const eligible=()=>isPlaying()&&['car','roadster','supercar','suv','pickup','van','bike','scooter','bicycle'].includes(getPlayer()?.vkind);
 function dispose(){if(group){group.removeFromParent();group.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});group=null;}route=null;done=false;obstructed=false;offCourse=false;clearWait=0;index=0;elapsed=0;key='';}
 function render(){const p=getPlayer(),d=route&&!done?Math.round(Math.hypot(p.x-route[index].x,p.z-route[index].z)):0,k=JSON.stringify([kind,!!route,!!candidate,index,d,done,obstructed,offCourse,Math.floor(elapsed)]);if(k===key)return;key=k;panel.classList.toggle('active',!!route);options.hidden=false;panel.hidden=!eligible()||(!route&&!candidate&&kind==='straight');choose.disabled=!!route;start.disabled=!candidate;start.hidden=!!route;end.hidden=!route;map.hidden=!route;status.textContent=!route?candidate?(kind==='corner'?'Four rings with a right-angle turn. Steer through the junction.':'Follow four rings in order with your own controls. No timer limit.'):'No clear '+kind+' course nearby. Try another junction or Straight.':offCourse?'Return to the current game-road leg · practice paused':obstructed?'Course blocked · wait for a clear road or end practice':done?'Practice complete · '+elapsed.toFixed(1)+' s · session only':index===0?'Drive into the gold start ring · '+d+' game units direct':'Ring '+(index+1)+' / 4 · '+d+' game units direct · '+elapsed.toFixed(0)+' s';}
 start.onclick=()=>{if(!eligible()||world!==getWorld())return;const fresh=find();if(!fresh){candidate=null;render();return;}dispose();expanded=false;options.textContent='Options';panel.classList.remove('expanded');options.setAttribute('aria-expanded','false');route=fresh;group=new THREE.Group();group.name='solo-driving-practice';route.forEach((p,i)=>{const ring=new THREE.Mesh(new THREE.TorusGeometry(2.6,.07,6,36),new THREE.MeshStandardMaterial({color:i===0?'#ffe188':'#91b6af',emissive:i===0?'#9b7c22':'#102a26',emissiveIntensity:.3}));ring.rotation.x=-Math.PI/2;ring.position.set(p.x,world.groundY(p.x,p.z)+.1,p.z);group.add(ring);});scene().add(group);render();};
 end.onclick=()=>{dispose();render();};
 function tick(dt){const p=getPlayer();if(world!==getWorld()){dispose();world=getWorld();candidate=null;checkedX=checkedZ=Infinity;offerWait=0;}if(!eligible()){dispose();panel.hidden=true;return;}
  if(route){if(!done){offCourse=practiceOffCourse(world,route,index,p);clearWait-=Math.max(0,dt);if(clearWait<=0){clearWait=.5;obstructed=!courseClear(world,remainingPracticeCourse(route,index,p),blocked,kind==='corner',segmentClear);group.children[index].material.color.set(obstructed?'#ed906b':'#ffe188');}if(!obstructed&&!offCourse){if(index>0)elapsed+=Math.min(.05,Math.max(0,dt));const q=route[index];if(Math.hypot(p.x-q.x,p.z-q.z)<2.6){group.children[index].material.color.set('#7fc895');index++;if(index===route.length){done=true;}else group.children[index].material.color.set('#ffe188');}}if(Math.min(...route.map(q=>Math.hypot(p.x-q.x,p.z-q.z)))>40){dispose();candidate=null;checkedX=Infinity;}}}
  if(!route){offerWait-=Math.max(0,dt);if(offerWait<=0||Math.hypot(p.x-checkedX,p.z-checkedZ)>5){offerWait=2;candidate=find();checkedX=p.x;checkedZ=p.z;}}render();
 }
 return{tick,stop:dispose,get snapshot(){return{active:!!route,kind,index,done,obstructed,offCourse,elapsed,gates:route?.map(p=>({...p}))||[],offered:!!candidate};}};
}
