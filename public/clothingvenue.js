import * as THREE from '/vendor/three.module.js';
import {box,put} from '/world.js';
// Original game-only pavilion, not a real Sydney business or geographic address.
export function buildClothingVenue(world,colliders,places,id){
 if(id!=='sydney')return null;
 const x=36,z=28,solids=[[-4.8,0,.4,7,3.7,'#206459'],[4.8,0,.4,7,3.7,'#206459'],[0,-3.3,10,.4,3.7,'#206459'],[-3.4,-1.5,1.4,2.8,1.1,'#d9b982'],[3.4,-1.5,1.4,2.8,1.1,'#d9b982']];
 const cameraSolids=new Set(),surfaces=[];
 const group=new THREE.Group();group.name='Original clothing pavilion';world.add(group);
 for(const[dx,dz,w,d,h,color]of solids){const mesh=put(group,box(w,h,d,color),x+dx,.62+h/2,z+dz),solid={x:x+dx,z:z+dz,hw:w/2,hd:d/2};colliders.push(solid);cameraSolids.add(solid);surfaces.push(mesh);}
 put(group,box(9.5,.04,6.4,'#dfcfac'),x,.64,z);
 // A rear shade and open front keep the doorway and dressing area readable.
 const roof=put(group,box(10.5,.25,3.8,'#f1d679'),x,4.45,z-1.7);
 for(const dx of[-4.8,4.8]){const post=put(group,box(.26,4,.26,'#f1d679'),x+dx,2.62,z+3.3),solid={x:x+dx,z:z+3.3,hw:.13,hd:.13};colliders.push(solid);cameraSolids.add(solid);surfaces.push(post);}
 for(const[dx,color]of[[-3.4,'#66b9e5'],[3.4,'#f39885']]){surfaces.push(put(group,box(.85,1.2,.3,color),x+dx,2.18,z-1.5),put(group,box(1.5,.35,.3,color),x+dx,2.55,z-1.5),put(group,box(.22,.24,.25,'#f1d679'),x+dx,2.92,z-1.5));}
 const mirror=put(group,box(2.4,2.6,.12,'#9ed4d0',{metalness:.4,roughness:.25}),x,2.2,z-3.02);surfaces.push(mirror);
 const c=document.createElement('canvas');c.width=640;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle='#103e35';ctx.fillRect(0,0,640,128);ctx.fillStyle='#fff0c4';ctx.textAlign='center';ctx.font='bold 40px system-ui';ctx.fillText('THE STYLE PAVILION',320,53);ctx.font='25px system-ui';ctx.fillText('FREE TRY-ON · ORIGINAL GAME SPACE',320,96);const texture=new THREE.CanvasTexture(c);const sign=new THREE.Mesh(new THREE.PlaneGeometry(7.8,1.56),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));sign.position.set(x,4.8,z+3.48);group.add(sign);
 // View-only treatment. Geometry and walking solids stay unchanged.
 group.updateMatrixWorld(true);
 const overhead=[roof,sign],bounds=overhead.map(o=>new THREE.Box3().setFromObject(o).expandByScalar(.05)),hold=[0,0],ray=new THREE.Raycaster(),sample=new THREE.Vector2(),hits=[];
 const surfaceBounds=surfaces.map(o=>new THREE.Box3().setFromObject(o).expandByScalar(.12)),fadeHold=surfaces.map(()=>0),surfaceHit=new THREE.Vector3(),surfaceTarget=new THREE.Vector3();
 // A 22-unit ground-level vicinity covers the pavilion footprint plus the normal
 // 15-unit zoom range. Only its own camera solids are skipped, never walking solids.
 const inside=p=>Math.abs(p.x-x)<4.55&&p.z>z-3.05&&p.z<z+3.55&&(p.alt||0)<.3;
 const around=p=>Math.hypot(p.x-x,p.z-z)<22&&(p.alt||0)<.3;
 function cameraColliders(player,colliders){return around(player)?colliders.filter(c=>!cameraSolids.has(c)):colliders;}
 // Only foreground pavilion solids/mirror fade. Walking still uses every original collider.
 function surfaceCutaway(camera,player,enabled,dt){
  const nearby=enabled&&around(player);
  surfaces.forEach((o,i)=>{
   let blocked=false;
   if(nearby){
    blocked=surfaceBounds[i].containsPoint(camera.position);
    for(const side of[-.7,0,.7])for(const y of[.8,1.55,2]){
     surfaceTarget.set(player.x+camera.matrixWorld.elements[0]*side,.62+(player.alt||0)+y,player.z+camera.matrixWorld.elements[2]*side);
     const d=surfaceTarget.distanceTo(camera.position);
     ray.set(camera.position,surfaceTarget.sub(camera.position).normalize());
     if(ray.ray.intersectBox(surfaceBounds[i],surfaceHit)&&surfaceHit.distanceTo(camera.position)<d-.15)blocked=true;
    }
   }
   fadeHold[i]=nearby?(blocked?.2:Math.max(0,fadeHold[i]-dt)):0;
   const target=fadeHold[i]>0?.12:1,alpha=nearby?1-Math.exp(-dt*14):1;
   o.material.opacity+=(target-o.material.opacity)*alpha;
   if(Math.abs(o.material.opacity-target)<.005)o.material.opacity=target;
   const transparent=o.material.opacity<1;
   if(o.material.transparent!==transparent){o.material.transparent=transparent;o.material.needsUpdate=true;}
   o.material.depthWrite=!transparent;
  });
 }
 const samples=[[-.65,.2],[0,.2],[.65,.2],[-.65,.65],[0,.65],[.65,.65],[-.65,.9],[0,.9],[.65,.9]];
 const insideSamples=[...samples,[-.65,.4],[0,.4],[.65,.4],[-.65,0],[0,0],[.65,0]];
 function cameraCutaway(camera,player,enabled,dt){
  camera.updateMatrixWorld(true);
  surfaceCutaway(camera,player,enabled,dt);
  if(!enabled||!around(player)){overhead.forEach((o,i)=>{o.visible=true;hold[i]=0;});return;}
  const distance=Math.hypot(camera.position.x-player.x,camera.position.y-(.62+(player.alt||0)+1.55),camera.position.z-player.z);
  const blocked=bounds.map(b=>b.containsPoint(camera.position));
  for(const[sx,sy]of inside(player)?insideSamples:samples){sample.set(sx,sy);ray.setFromCamera(sample,camera);ray.far=Math.max(.1,distance+4);hits.length=0;ray.intersectObjects(overhead,false,hits);for(const h of hits)if(h.object===sign?(camera.position.z<sign.position.z||(player.z<sign.position.z&&h.distance<distance-.25)):h.distance<distance-.25)blocked[overhead.indexOf(h.object)]=true;}
  overhead.forEach((o,i)=>{hold[i]=blocked[i]?.2:Math.max(0,hold[i]-dt);o.visible=hold[i]===0;});
 }
 const entry={x,z:z+3.8};places.push({name:'Style pavilion (fictional) · free try-on',x:entry.x,z:entry.z,r:5});return{...entry,name:'The Style Pavilion',center:{x,z},cameraCutaway,cameraColliders};
}
