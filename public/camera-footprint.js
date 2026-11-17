// First entry into a static ground footprint along the on-foot camera segment.
export function cameraFootprintFraction(x0,z0,x1,z1,colliders,pad=.25){
 const dx=x1-x0,dz=z1-z0,l=dx*dx+dz*dz;let first=1;
 for(const c of colliders){
  if(c.off||c.wallEast)continue;
  if(c.hw!==undefined){
   let lo=0,hi=1;
   for(const[p,d,a,b]of[[x0,dx,c.x-c.hw-pad,c.x+c.hw+pad],[z0,dz,c.z-c.hd-pad,c.z+c.hd+pad]]){
    if(Math.abs(d)<1e-12){if(p<a||p>b){lo=2;break;}}
    else{let u=(a-p)/d,v=(b-p)/d;if(u>v)[u,v]=[v,u];lo=Math.max(lo,u);hi=Math.min(hi,v);}
   }if(lo<=hi)first=Math.min(first,Math.max(0,lo));
  }else if(Number.isFinite(c.r)){
   const ox=x0-c.x,oz=z0-c.z,r=c.r+pad,q=ox*ox+oz*oz-r*r;
   if(q<=0){first=0;continue;}if(!l)continue;
   const b=ox*dx+oz*dz,d=b*b-l*q;if(d<0)continue;
   const t=(-b-Math.sqrt(d))/l;if(t>=0&&t<=1)first=Math.min(first,t);
  }
 }return first;
}
