// Short local vehicle-access segment. Does not change world geometry.
export function clearVehicleExit(w,x0,z0,x1,z1,ownCollider,margin=.55){
 for(const q of w.colliders||[]){
  if(q===ownCollider||q.off||q.wallEast)continue;
  if(q.hw!==undefined){
   let lo=0,hi=1,hit=true;
   for(const[p,d,min,max]of [[x0,x1-x0,q.x-q.hw-margin,q.x+q.hw+margin],[z0,z1-z0,q.z-q.hd-margin,q.z+q.hd+margin]]){
    if(Math.abs(d)<1e-12){if(p<min||p>max){hit=false;break;}}
    else{let a=(min-p)/d,b=(max-p)/d;if(a>b)[a,b]=[b,a];lo=Math.max(lo,a);hi=Math.min(hi,b);if(lo>hi){hit=false;break;}}
   }if(hit)return false;
  }else if(Number.isFinite(q.r)){
   const dx=x1-x0,dz=z1-z0,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((q.x-x0)*dx+(q.z-z0)*dz)/l)):0;
   if(Math.hypot(x0+t*dx-q.x,z0+t*dz-q.z)<q.r+margin)return false;
  }
 }
 const n=Math.max(1,Math.ceil(Math.hypot(x1-x0,z1-z0)/.2));
 for(let i=0;i<=n;i++){const x=x0+(x1-x0)*i/n,z=z0+(z1-z0)*i/n;
  for(const[a,b]of [[0,0],[margin,0],[-margin,0],[0,margin],[0,-margin]]){const px=x+a,pz=z+b,[cx,cz]=w.clamp(px,pz);if(Math.abs(cx-px)>.01||Math.abs(cz-pz)>.01||w.inSwim?.(px,pz))return false;}
 }return true;
}
