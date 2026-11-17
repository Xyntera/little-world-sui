import * as THREE from '/vendor/three.module.js';
/*219 session-only local discovery. No points, saves, server requests or real-world directions. */
export function createDiscovery({getPlayer,getWorld,getCity,getViewYaw,onReveal,onMap,onInspect,onLook}){
 const pragueStops=[
  {x:99,z:18,r:1.5,title:'The eastern watch',clue:'Find the tall eastern gate beside the bridge.',story:'A fictional keeper leaves a brass token at the gate: every journey begins by noticing what is close.'},
  {x:78,z:13.6,r:2.2,title:'Above the river',clue:'Walk west along the stone bridge. Find its middle span.',story:'In this fictional tale, the token warms above the river. Its keeper counted crossings, never coins.'},
  {x:60,z:9.3,r:1.4,title:'Two towers, one ending',clue:'Stop on the bridge before the western towers. Look ahead at the unequal pair.',story:'The keeper hid the last message between two towers: a place becomes yours when you learn to find your way.'}
 ];
 const pragueChallenges=[
  {question:'Look at the gate ahead. What shape is its dark roof?',answers:['A pointed roof','A round dome','No roof at all'],correct:0,hint:'Look above the square opening for the sharp peak.'},
  {question:'Look to both sides of the bridge. What lies below?',answers:['A dry courtyard','River water','A forest path'],correct:1,hint:'The blue surface runs along both sides of this crossing.'},
  {question:'Look at the two towers beside the western gate. Are they equal in height?',answers:['Yes, identical','There is only one tower','No, one is taller'],correct:2,hint:'Compare the tops of the two neighboring tower bodies.'}
 ];
 const sydneyChallenges=[
  {question:'Look at the pale roof cluster ahead. What shape repeats?',answers:['Curving sails','Square chimneys','A single flat slab'],correct:0,hint:'Look for the separate pointed, curved roof shells.'},
  {question:'Look above the bridge deck. What carries its silhouette?',answers:['A round dome','A steel arch','A row of sails'],correct:1,hint:'The gray steel rises toward the middle and falls at the ends.'},
  {question:'Look up at the slender tower. What sits near its top?',answers:['A green dome','Two square towers','A wider round turret'],correct:2,hint:'Find the wider round platform near the top of the shaft.'}
 ];
 const tokyoChallenges=[
  {question:'Look up at the tower. What can you see between its legs?',answers:['Open gaps and braces','A solid stone wall','A hanging bell'],correct:0,hint:'Look through the orange-and-white framework.'},
  {question:'Look at the front of the temple hall. What repeats beneath its dark roof?',answers:['Round glass domes','Red upright posts','A row of sails'],correct:1,hint:'Follow the red vertical lines down from the long roof edge.'},
  {question:'Look at the red gate before the shrine. How many upright posts hold it?',answers:['One central post','Four corner posts','Two upright posts'],correct:2,hint:'Follow the two red posts down from the crossbars.'}
 ];
 const parisChallenges=[
  {question:'Look at the tower legs. What shape spans the gap above them?',answers:['A curved arch','A red gate','A round glass dome'],correct:0,hint:'Follow the curved beam between the spreading legs.'},
  {question:'Look at the pale side path on the lawn. How does it meet the path ahead?',answers:['It never meets it','At a right angle','As a circle'],correct:1,hint:'Look where the side strip joins the straight path ahead.'},
  {question:'Look at the dome stand-in above the stone block. What finishes its top?',answers:['A pair of sails','A flat roof','A pointed cap and thin spire'],correct:2,hint:'Follow the tapered cap upward to its slender tip.'}
 ];
 let stops=pragueStops,challenges=pragueChallenges,trailCity='prague';
 function chooseTrail(){
  const city=getCity();if(city==='prague'){stops=pragueStops;challenges=pragueChallenges;return true;}
  if(city==='cairo'){
   const ps=getWorld()?.places||[],capped=ps.find(p=>p.name?.includes('Khafre')),small=ps.find(p=>p.name?.includes('Menkaure'));if(!capped||!small)return false;
   stops=[
    {x:0,z:-10,r:2,title:'The first folded edge',clue:'Walk north to the ring south of the central pyramid group. Look north at the large triangular face. Use View for a clear look.',story:'In this fictional tale, a paper-maker folds one edge toward the sky. A broad base becomes a single point.'},
    {x:capped.x,z:capped.z+10,r:2,title:'A lighter corner',clue:'Follow the game streets west to the separate capped pyramid. From its southern ring, look north and up at the top.',story:'The paper-maker leaves the next corner pale. In this imaginary sketch, a change of shade is enough to mark a new page.'},
    {x:small.x,z:small.z-18,r:2,title:'The quiet last fold',clue:'Continue south through the game streets to the smaller separate pyramid. At its northern ring, look south at the unbroken face and tip.',story:'The last fold needs no bright cap. In this fictional tale, the paper-maker leaves one plain triangle as a place for your own thought.'}
   ];challenges=[
    {question:'Look at the large pyramid face. How does its outline finish at the top?',answers:['At one pointed tip','With a round dome','With two towers'],correct:0,hint:'Follow the two sloping edges to where they meet.'},
    {question:'Look at the separate capped pyramid. What changes near its tip?',answers:['A round clock appears','A lighter cap begins','A bridge crosses it'],correct:1,hint:'Compare the small top triangle with the larger face below it.'},
    {question:'Look at the smaller separate pyramid. How does its face look up to the tip?',answers:['A pale cap above a darker face','A round clock in a square','One continuous shade'],correct:2,hint:'Unlike the previous stop, this face keeps one shade up to its point.'}
   ];return true;
  }
  if(city==='london'){
   const ps=getWorld()?.places||[],abbey=ps.find(p=>p.name?.includes('Westminster Abbey')),plaza=ps.find(p=>p.name?.includes('Trafalgar Square'));if(!abbey||!plaza)return false;
   stops=[
    {x:-7,z:-10,r:2,title:'The first clock mark',clue:'Walk to the ring southwest of the clock tower. Look northeast and up at its square clock face. Use View if needed.',story:'In this fictional tale, a timekeeper draws a circle inside a square. The first page is a reminder to stop long enough to look.'},
    {x:abbey.x,z:abbey.z+14,r:2,title:'A pair on the page',clue:'Follow the game streets toward the abbey-inspired church. From the ring south of it, look north at its two pointed towers. Use View for a clear look.',story:'The timekeeper folds the next page into two pointed towers. In this imaginary letter, a pair of marks can hold a memory better than a name.'},
    {x:plaza.x+9,z:plaza.z+10,r:2,title:'The last tall mark',clue:'Continue north through the game streets to the plaza. From the ring southeast of its column, look northwest and up.',story:'A slender column becomes the last stroke on the page. In this fictional letter, the timekeeper asks for no reply: remembering one small shape is enough.'}
   ];challenges=[
    {question:'Look up at the clock tower. What shape surrounds its round clock face?',answers:['A square frame','A curved sail','An open arch'],correct:0,hint:'Look at the straight outer edges around the pale clock.'},
    {question:'Look at the abbey-inspired church. How many tall pointed towers stand at its front?',answers:['One tower','Two towers','Four towers'],correct:1,hint:'Compare the two tall blocks and their pointed caps.'},
    {question:'Look at the plaza monument. What gives it its height?',answers:['A low arch','A wide glass dome','A tall slender column'],correct:2,hint:'Follow the narrow vertical shaft up from its broad base.'}
   ];return true;
  }
  if(city==='paris'){
   const ps=getWorld()?.places||[],lawn=ps.find(p=>p.name?.includes('Champ de Mars')),dome=ps.find(p=>p.name?.includes('Les Invalides'));if(!lawn||!dome)return false;
   stops=[
    {x:0,z:-13,r:2,title:'A curve in the sketch',clue:'Walk north from the central road toward the tower. At the ring south of it, look north between its legs.',story:'In this fictional tale, a gardener opens a blank sketchbook beneath a curved tower arch. The first line bends like a branch.'},
    {x:lawn.x,z:lawn.z+7,r:2,title:'Two paths on a page',clue:'Follow the game streets toward the small lawn. At its southern ring, look north at the pale paths across the green. Use View to see their junction.',story:'A side path meets a straight line at a right angle on the next page. The imaginary gardener leaves the spaces green: a garden needs room between its paths.'},
    {x:dome.x-12,z:dome.z-6,r:2,title:'The last mark',clue:'Continue through the game streets to the dome stand-in. From the ring west of it, look east and up at its pointed cap. Use View if needed.',story:'The last mark is a slender tip above a tapering roof. In this fictional sketchbook, the gardener draws a seed beneath it, then closes the page.'}
   ];challenges=parisChallenges;return true;
  }
  if(city==='tokyo'){
   const ps=getWorld()?.places||[],hall=ps.find(p=>p.name?.includes('Zojoji')),shrine=ps.find(p=>p.name?.includes('Atago Shrine'));if(!hall||!shrine)return false;
   stops=[
    {x:0,z:-10,r:2,title:'The lantern-maker\'s frame',clue:'Walk north from the central road to the orange-and-white tower. Look through its open frame from the ring.',story:'In this fictional tale, a lantern-maker sketches a frame that lets the sky show through. The first fold of the paper remembers the empty spaces.'},
    {x:hall.x+17,z:hall.z+16,r:2,title:'Red lines of shelter',clue:'Follow the game streets east to the temple hall. Find the ring southeast of its dark roof and red posts, and look northwest. Use View for a clear look.',story:'The second fold becomes a row of red lines beneath a dark roof. In the imaginary workshop, the lantern-maker gives the paper ribs to hold its shape.'},
    {x:shrine.x,z:shrine.z+9,r:2,title:'A gate for the light',clue:'Walk north through the game streets to the small shrine. At the ring south of it, look north at the red gate.',story:'The lantern-maker sets the finished paper light beside a red gate. In this fictional story, you carry no treasure away, only the shapes you noticed.'}
   ];challenges=tokyoChallenges;return true;
  }
  if(city!=='sydney')return false;
  const places=getWorld()?.places||[],bridge=places.find(p=>p.name?.includes('Sydney Harbour Bridge')),tower=places.find(p=>p.name?.includes('Sydney Tower'));
  if(!bridge||!tower)return false;
  stops=[
   {x:0,z:-14,r:2,title:'A letter in the sails',clue:'From the central road, walk north toward the pale roof shells. The gold ring is outside the podium.',story:'In this fictional tale, a stagehand leaves a paper boat beside the pale sails. Its first line asks you to notice a shape before following a name.'},
   {x:bridge.x+10,z:bridge.z-20,r:2,title:'Under the arch',clue:'Follow the roads west and north toward the bridge arch. Stay in the game streets; the gold ring is northeast of the arch. Look southwest from there; use View for a clear look.',story:'The paper boat unfolds beneath the arch: a crossing can carry a story even when nobody remembers who wrote it.'},
   {x:tower.x,z:tower.z+10,r:2,title:'The round lookout',clue:'Return south through the game streets toward the slender tower and its wider round top. The ring waits south of its base. Use View and drag upward to see the top.',story:'At the round lookout, the stagehand signs the last line: the city was never the prize. Looking closely was the whole journey.'}
  ];challenges=sydneyChallenges;return true;
 }
 const sessions=new Map(),collectionCities=[['sydney','Sydney'],['tokyo','Tokyo'],['paris','Paris'],['london','London'],['cairo','Cairo']];
 let trailWorld=null;
 const current=()=>active&&getCity()===trailCity&&getWorld()===trailWorld;
 let active=false,index=0,seen=[],finished=false,inspecting=false,feedback='',clueView=null;
 //644 A clue peek can return to its prior view only while its camera handle is current.
 function canReturnClue(){if(clueView&&!clueView.available())clueView=null;return !!clueView;}
 function remember(){sessions.set(trailCity,{index,seen:seen.map(q=>({...q})),finished});}
 let compact=false,marker=null,markerWorld=null;
 //238 DOM updates only when visible distance/proximity changes. Explicit actions still render immediately.
 let renderedDistance,renderedNear,renderedWorld,renderedBearing;
 //645 A camera-relative bearing to the ring, never a path through game obstacles.
 function ringBearing(){const p=getPlayer(),s=stops[index],yaw=getViewYaw?.();if(!p||!s)return 'Gold ring marks the spot';if(Math.hypot(s.x-p.x,s.z-p.z)<=s.r)return 'At the gold ring';if(!Number.isFinite(yaw))return 'Gold ring marks the spot';const dx=s.x-p.x,dz=s.z-p.z,a=Math.atan2(-dx*Math.cos(yaw)+dz*Math.sin(yaw),dx*Math.sin(yaw)+dz*Math.cos(yaw)),n=(Math.round(a/(Math.PI/4))+8)%8;return 'Ring: '+['ahead','ahead-right','right','behind-right','behind','behind-left','left','ahead-left'][n]+' of view';}
 const directDistance=()=>{const p=getPlayer(),s=stops[index];return Math.round(Math.hypot(s.x-p.x,s.z-p.z)*(trailCity==='prague'?9.5:17));};
 function clearMarker(){if(marker){marker.removeFromParent();marker.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});marker=null;}markerWorld=null;}
 function updateMarker(){
  const w=getWorld();if(!active||finished||getCity()!==trailCity||!w||!w.group){clearMarker();return;}
  if(markerWorld!==w){clearMarker();markerWorld=w;marker=new THREE.Group();marker.name='fictional-discovery-marker';
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.48,.045,6,28),new THREE.MeshStandardMaterial({color:'#f0d78a',emissive:'#d8aa44',emissiveIntensity:.2}));ring.rotation.x=-Math.PI/2;ring.position.y=.07;marker.add(ring);w.group.add(marker);}
  const p=stops[index];marker.position.set(p.x,w.groundY(p.x,p.z),p.z);
 }

 const compactLayout=()=>matchMedia('(max-width:640px), (max-height:500px) and (orientation:landscape)').matches;
 const hud=document.createElement('section');hud.id='discovery-hud';hud.hidden=true;hud.setAttribute('aria-label','Local discovery walk');
 hud.innerHTML='<button type="button" id="discovery-expand" hidden>Show discovery</button><button type="button" id="discovery-minimize">Hide for view</button><div class="discovery-detail"><small>FICTIONAL DISCOVERY · SESSION ONLY</small><strong id="discovery-title"></strong><p id="discovery-clue"></p><p id="discovery-status" aria-live="polite"></p></div><button type="button" id="discovery-inspect">Inspect nearby spot</button><div id="discovery-question" hidden><button type="button" id="discovery-look">Look around first</button><div class="discovery-copy"><p id="discovery-prompt"></p><p id="discovery-feedback" aria-live="polite"></p><div id="discovery-answers"></div></div></div><button type="button" id="discovery-map">Trail map</button><button type="button" id="discovery-read">Read finds</button><button type="button" id="discovery-restart">Start over</button><button type="button" id="discovery-stop" aria-label="Pause discovery walk">×</button>';
 document.getElementById('play').append(hud);
 hud.querySelector('#discovery-stop').onclick=()=>{active=false;hud.hidden=true;clearMarker();};
 const near=()=>{const p=getPlayer(),s=stops[index];return Math.hypot(p.x-s.x,p.z-s.z)<=s.r;};
 const inspect=hud.querySelector('#discovery-inspect'),question=hud.querySelector('#discovery-question');
 function inspectSpot(){if(!current()||finished||!near())return;if(canReturnClue())clueView.restore();clueView=null;onInspect?.();inspecting=true;feedback='';const c=challenges[index];hud.querySelector('#discovery-prompt').textContent=c.question;const answers=hud.querySelector('#discovery-answers');answers.replaceChildren();c.answers.forEach((text,i)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=()=>answer(i);answers.append(b);});render();hud.querySelector('.discovery-copy').scrollTop=0;hud.querySelector('#discovery-look').focus({preventScroll:true});}
 //643 Model-facing bearings, not place-label bearings. Labels sit in front of several models.
 function clueTarget(){
  if(!current()||finished||getPlayer().vkind)return null;
  const ps=getWorld()?.places||[],at=(name,dz,y)=>{const p=ps.find(q=>q.name?.includes(name));return p?{x:p.x,y,z:p.z+dz}:null;};
  const targets={sydney:[{x:-5.8,y:7,z:-29.2},()=>at('Sydney Harbour Bridge',-4.5,5.8),()=>at('Sydney Tower',-3,13.6)],tokyo:[{x:0,y:5,z:-26},()=>at('Zojoji',-1.4,4),()=>at('Atago Shrine',-2.6,3)],paris:[{x:0,y:5,z:-26},()=>at('Champ de Mars',0,1.3),()=>at('Les Invalides',-7,10.8)],london:[{x:0,y:12.15,z:-26},()=>at('Westminster Abbey',-1.8,11.5),()=>at('Trafalgar Square',0,8)],cairo:[{x:0,y:9.2,z:-26},()=>at('Khafre',-8,10.7),()=>at('Menkaure',-6,6)]};
  const t=targets[trailCity]?.[index];return typeof t==='function'?t():t||null;
 }
 function closeQuestion(faceClue){
  if(!current()||!inspecting)return;
  const target=faceClue&&near()?clueTarget():null;
  inspecting=false;feedback='';compact=compactLayout();
  if(target)clueView=onLook?.(target)||null;render();
  hud.querySelector(compact?'#discovery-expand':'#discovery-inspect').focus({preventScroll:true});
 }
 function showFeedback(){const copy=hud.querySelector('.discovery-copy');copy.scrollTop=0;if(copy.scrollHeight>copy.clientHeight)hud.querySelector('#discovery-look').focus({preventScroll:true});}
 function answer(i){if(!current()||finished||!inspecting)return;if(!near()){feedback='Move back to the spot to answer.';render();showFeedback();return;}const c=challenges[index];if(i!==c.correct){feedback='Not quite. '+c.hint;render();showFeedback();return;}const s=stops[index];seen.push({title:s.title,story:s.story,observation:c.answers[c.correct]});inspecting=false;feedback='';if(index===stops.length-1)finished=true;else index++;remember();if(finished&&compactLayout())compact=true;onReveal(seen,finished,stops.map((s,i)=>({title:s.title,found:i<seen.length,current:!finished&&i===index,clue:i===index?s.clue:''})));render();}
 inspect.onclick=inspectSpot;hud.querySelector('#discovery-look').onclick=()=>closeQuestion(true);
 hud.addEventListener('keydown',e=>{if(e.key==='Escape'&&current()&&inspecting&&!hud.hidden){e.preventDefault();e.stopPropagation();closeQuestion(false);}});
 hud.querySelector('#discovery-minimize').onclick=()=>{compact=true;render();};
 hud.querySelector('#discovery-expand').onclick=()=>{compact=false;if(!finished&&near())inspectSpot();else render();};
 hud.querySelector('#discovery-map').onclick=()=>{if(current())onMap();};
 hud.querySelector('#discovery-read').onclick=()=>{if(!current())return;onReveal(seen,finished,stops.map((s,i)=>({title:s.title,found:i<seen.length,current:!finished&&i===index,clue:i===index?s.clue:''})));};
 function render(){updateMarker();const returning=canReturnClue();const look=hud.querySelector('#discovery-look');look.textContent=onLook&&clueTarget()?'View clue':'Look around first';look.setAttribute('aria-label',onLook&&clueTarget()?'View clue in first person':'Close question and look around');look.title=onLook&&clueTarget()?'Look at the clue in first person. Your position stays the same. Drag to adjust; Back to question restores your previous view.':'Close the question and look around.';hud.classList.toggle('is-compact',compact);hud.querySelector('#discovery-expand').hidden=!compact;hud.querySelector('#discovery-expand').textContent=!finished&&near()?(returning?'Back to question':'Inspect this spot'):finished?'Show discovery':'Show discovery · '+seen.length+'/3';if(!finished&&!near()){const bearing=document.createElement('span');bearing.className='discovery-bearing';bearing.textContent=ringBearing()+' · direct, not a route';hud.querySelector('#discovery-expand').append(bearing);}const s=stops[index];inspect.hidden=finished||inspecting;inspect.disabled=!near();inspect.textContent=near()?(returning?'Back to question':'Inspect this spot'):'Walk closer to inspect';for(const b of[inspect,hud.querySelector('#discovery-expand')]){if(returning)b.setAttribute('aria-label','Back to question and restore previous view');else b.removeAttribute('aria-label');}question.hidden=!inspecting;question.classList.toggle('has-feedback',!!feedback);hud.querySelector('#discovery-feedback').textContent=feedback;hud.querySelector('#discovery-title').textContent=finished?'Walk complete':s.title;hud.querySelector('#discovery-clue').textContent=finished?'All three story fragments found. No points or stamps awarded.':s.clue;hud.querySelector('#discovery-status').textContent=finished?'3 / 3 found':seen.length+' / 3 found · '+Math.round(Math.hypot(s.x-getPlayer().x,s.z-getPlayer().z)*(trailCity==='prague'?9.5:17))+' m direct, not a route. '+ringBearing()+'.';renderedDistance=directDistance();renderedNear=near();renderedWorld=getWorld();renderedBearing=ringBearing();}
 function start(){clueView=null;const city=getCity();if(!chooseTrail())return false;if(city!==trailCity){remember();const saved=sessions.get(city);index=saved?.index||0;seen=(saved?.seen||[]).map(q=>({...q}));finished=!!saved?.finished;}trailCity=city;trailWorld=getWorld();active=true;inspecting=false;feedback='';compact=compactLayout();hud.hidden=false;render();return true;}
 hud.querySelector('#discovery-restart').onclick=()=>{if(!current())return;index=0;seen=[];finished=false;remember();start();};
 function tick(){if(!active)return;const hadReturn=!!clueView,hasReturn=canReturnClue();if(!current()){active=false;hud.hidden=true;clearMarker();return;}if(hadReturn!==hasReturn||ringBearing()!==renderedBearing||getWorld()!==renderedWorld||directDistance()!==renderedDistance||near()!==renderedNear)render();}
 return {start,tick,get collection(){remember();return collectionCities.map(([city,name])=>{const s=sessions.get(city);return{city,name,seen:(s?.seen||[]).map(q=>({...q})),finished:!!s?.finished};});},get hudHint(){return active&&getCity()===trailCity?(finished?'Fictional discovery · walk complete · session only, no points or stamps':'Fictional discovery · '+(index+1)+'/3 · '+stops[index].title+' · '+directDistance()+' m direct, not a route · '+ringBearing()):null;},get available(){return getCity()==='cairo'?!!getWorld()?.places?.some(p=>p.name?.includes('Khafre'))&&!!getWorld()?.places?.some(p=>p.name?.includes('Menkaure')):getCity()==='london'?!!getWorld()?.places?.some(p=>p.name?.includes('Westminster Abbey'))&&!!getWorld()?.places?.some(p=>p.name?.includes('Trafalgar Square')):getCity()==='paris'?!!getWorld()?.places?.some(p=>p.name?.includes('Champ de Mars'))&&!!getWorld()?.places?.some(p=>p.name?.includes('Les Invalides')):getCity()==='tokyo'?!!getWorld()?.places?.some(p=>p.name?.includes('Zojoji'))&&!!getWorld()?.places?.some(p=>p.name?.includes('Atago Shrine')):getCity()==='prague'||(getCity()==='sydney'&&!!getWorld()?.places?.some(p=>p.name?.includes('Sydney Tower'))&&!!getWorld()?.places?.some(p=>p.name?.includes('Sydney Harbour Bridge')));},get city(){return trailCity;},get ending(){return trailCity==='cairo'?'A point, a pale cap, a plain triangle. In this fictional tale, the paper-maker folds the three remembered shapes into a small envelope. Nothing is hidden inside: the shapes you noticed are the letter.':trailCity==='london'?'A circle in a square. Two pointed towers. A slender column. In this fictional tale, the timekeeper folds these three shapes into a letter without an address. The walk is its delivery.':trailCity==='paris'?'A curve, a right angle, a slender tip. In this fictional tale, the gardener turns three noticed shapes into a small garden on paper. The sketch is finished; the world outside its pages is still waiting.':trailCity==='tokyo'?'An open frame. A row of red lines. Two gate posts. In this fictional tale, the lantern-maker folds those remembered shapes into a paper light. Your walk is its final page.':trailCity==='sydney'?'Curving sails. A steel arch. A wider round turret. In this fictional tale, the stagehand leaves you a paper boat: a reminder to notice what each place makes you look up at.':'A pointed roof. Water on both sides. Two unequal towers. In this fictional tale, those small details are the key: the keeper was never guarding treasure, but the habit of paying attention. The brass token is yours to imagine.';},get mapStops(){return active?stops.map((s,i)=>({x:s.x,z:s.z,name:s.title,r:s.r,metersPerUnit:trailCity==='prague'?9.5:17,number:i+1,found:i<seen.length,current:!finished&&i===index})):[];},get state(){return{active,index,seen:[...seen],finished,inspecting,marker:!!marker};}};
}
