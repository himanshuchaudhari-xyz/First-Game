'use strict';
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['level','score','health','fill','meter','time','clock-label','objectives','overlay','title','message','play','pill','status','scene-note','announcement','skip','pause','task-panel','finale'].map(id=>[id,document.getElementById(id)]));
const W=960,H=500,WORLD=1920,MAP_H=700,GOAL=1780,keys=new Set();
const dates=[
 {title:'Eternals, with my favourite person',item:'Marvel’s Eternals',lines:['You: I booked Eternals. Two seats together, just for us.','GG: You booked it already? And got our popcorn too?','You: A whole universe on screen. My favourite person beside me.','GG: This is my kind of movie night.']},
 {title:'A Mexican McAloo Tikki surprise',item:'Mexican McAloo Tikki',lines:['You: I made a little McDonald’s stop for you.','GG: Mexican McAloo Tikki! You know my favourite.','You: Your burger, your drink, and our favourite spot.','GG: It’s these little things you do that make me smile.']},
 {title:'Back waters, just the two of us',item:'Back waters & gerberas',lines:['You: Full tank. Route to Back waters saved.','GG: You thought of everything before meeting me?','You: And white and pink gerberas, just for you.','GG: The flowers, the sunset, you… this is perfect.']}
];
const plans=[
 [
  {place:'Eternals booking kiosk',name:'Book Eternals together',kind:'choice',icon:'TICKET',reward:'Eternals · F7 + F8',purpose:'Book Marvel’s Eternals with two seats next to each other.',options:['F7 + F8 · together','A2 + H9 · apart'],correct:0,success:'Eternals booked: row F, seats 7 and 8. Two seats together.'},
  {place:'Ticket collection',name:'Collect Eternals tickets',kind:'hold',icon:'TICKET',reward:'Eternals tickets collected',duration:1.8,purpose:'Scan your Eternals reservation and print both tickets before meeting GG.',success:'Both Eternals tickets printed. No queue when you arrive together.'},
  {place:'Popcorn counter',name:'Pack shared popcorn',kind:'timing',icon:'POP',reward:'Shared popcorn',purpose:'Press E in the green zone to fill and pack a bucket for the two of you.',success:'Popcorn packed. Eternals night is ready!'}
 ],
 [
  {place:'McD order kiosk',name:'Order Mexican McAloo Tikki',kind:'choice',icon:'M',reward:'Mexican McAloo Tikki order',purpose:'GG’s favourite is the Mexican McAloo Tikki. Pick her favourite burger.',options:['Mexican McAloo Tikki','Plain cheeseburger'],correct:0,success:'Order #27 placed: Mexican McAloo Tikki for GG.'},
  {place:'McDonald’s pickup',name:'Collect her burger',kind:'hold',icon:'M',reward:'Fresh Mexican McAloo Tikki',duration:1.8,purpose:'Match order #27 and collect GG’s fresh Mexican McAloo Tikki.',success:'Mexican McAloo Tikki collected. Her favourite is in your bag.'},
  {place:'Drinks counter',name:'Pack her drink',kind:'timing',icon:'CUP',reward:'Her favourite drink',purpose:'Press E in green to seal her drink without a spill.',success:'Drink sealed! A complete little meal for GG.'}
 ],
 [
  {place:'Fuel station',name:'Fill the fuel tank',kind:'timing',icon:'FUEL',reward:'Full fuel tank',purpose:'Press E in the green zone to finish filling the tank before meeting GG.',success:'Tank filled. Enough fuel to reach Back waters and come home.'},
  {place:'Route planner',name:'Plan the Back waters drive',kind:'choice',icon:'MAP',reward:'Back waters route saved',purpose:'GG loves a quiet sunset by the water. Choose the route to Back waters.',options:['Busy city highway','Back waters · sunset route'],correct:1,success:'Back waters route saved. Your sunset spot is marked.'},
  {place:'Gerbera florist',name:'Wrap white & pink gerberas',kind:'hold',icon:'FLOWER',reward:'White & pink gerberas',duration:1.8,purpose:'Wrap a bouquet of white and pink gerberas to surprise GG at Back waters.',success:'White and pink gerberas wrapped. One last little surprise for GG.'}
 ]
];
const pond={x:790,y:400,rx:150,ry:110};
let mode='ready',paused=false,level=1,score=0,balance=100,dayTime=0,sceneTime=0,sceneIndex=0,clock=0,last=0,notice=0;
let finaleTime=0,memoryIndex=-1,photoSources=[];
let player,tasks,notes,camera=0,cameraY=0,particles=[],messageStage=0,taskOpen=null,challengeTime=0,challengeMessage='',dateInventory=[];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function currentDate(){return Math.min(2,level-1);}
function buildMap(){
  const positions=[[370,480],[1010,245],[1320,505]];
  tasks=plans[currentDate()].map((t,i)=>({...t,x:positions[i][0],y:positions[i][1],done:false,progress:0}));
  notes=[{x:560,y:265,read:false,text:tasks[0].purpose},{x:1430,y:260,read:false,text:'GG: The little things you do mean the most. See you soon ♡'}];
  player={x:95,y:435,vx:0,vy:0};camera=0;cameraY=140;dayTime=0;particles=[];messageStage=0;taskOpen=null;challengeTime=0;challengeMessage='';ui['task-panel'].hidden=true;keys.clear();
}
function reset(){ui.finale.hidden=true;finaleTime=0;memoryIndex=-1;level=1;score=0;balance=100;sceneTime=0;sceneIndex=0;clock=0;last=0;notice=0;paused=false;mode='ready';dateInventory=[];buildMap();ui.skip.hidden=true;ui.announcement.classList.remove('visible');refresh();}
function start(){reset();mode='walk';ui.overlay.hidden=true;announce('A little plan: '+dates[currentDate()].item+' for GG ♡',4);refresh();}
function showOverlay(title,message,label,pill){ui.title.innerHTML=title;ui.message.innerHTML=message;ui.play.textContent=label;ui.pill.textContent=pill;ui.overlay.hidden=false;}
function announce(value,seconds=3){ui.announcement.textContent=value;notice=seconds;}
function readyForGG(){return tasks.every(t=>t.done);}
function beginDate(){if(!readyForGG())return;mode='date';sceneIndex=currentDate();sceneTime=0;dateInventory=tasks.map(t=>t.reward);player.vx=0;player.vy=0;keys.clear();notice=0;ui.announcement.classList.remove('visible');ui.skip.hidden=false;score+=300;refresh();}
function finishDate(){if(mode!=='date'||paused)return;balance=100;score+=150;sceneTime=0;ui.skip.hidden=true;if(level===3){beginFinale();return;}level++;mode='walk';buildMap();announce('Stage '+level+' / 3 · '+dates[currentDate()].item+' · Balance full ♡');refresh();}
function togglePause(){if(mode!=='walk'&&mode!=='date'&&mode!=='finale')return;paused=!paused;keys.clear();last=0;if(paused)showOverlay('Stay a little.','Your evening will be right here.','Resume','PAUSED');else ui.overlay.hidden=true;refresh();}
ui.play.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;ui.skip.onclick=finishDate;
const controls=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS','KeyE','Digit1','Digit2'];
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function nearest(){
  const targets=[...tasks.map((item,i)=>({kind:'task',item,i})),...notes.map(item=>({kind:'note',item})),{kind:'gg',item:{x:GOAL,y:390}}];
  return targets.filter(t=>distance(player,t.item)<80).sort((a,b)=>distance(player,a.item)-distance(player,b.item))[0];
}
function interact(){
  if(mode!=='walk'||paused||document.hidden)return;
  if(taskOpen!==null){if(tasks[taskOpen].kind==='timing')attemptTiming();return;}
  const target=nearest();if(!target)return;
  if(target.kind==='task'){
    const pending=tasks.findIndex(t=>!t.done);
    if(target.item.done)announce('Already prepared: '+target.item.reward+' ✓');
    else if(target.i!==pending)announce('First: '+tasks[pending].name+' at '+tasks[pending].place,4);
    else openTask(target.i);
  }else if(target.kind==='note'){if(!target.item.read){target.item.read=true;score+=25;}announce(target.item.text,5);}
  else if(readyForGG())beginDate();else announce('Before meeting GG: '+tasks.find(t=>!t.done).name+' ♡',4);
  refresh();
}
function press(code){keys.add(code);if(code==='KeyE')interact();if((code==='Digit1'||code==='Digit2')&&taskOpen!==null)chooseTask(code==='Digit1'?0:1);}
function release(code){keys.delete(code);}
addEventListener('keydown',e=>{if(controls.includes(e.code)){e.preventDefault();if(!e.repeat)press(e.code);}if(e.code==='Enter'&&!e.repeat&&e.target.tagName!=='BUTTON'){if(paused)togglePause();else if(mode==='ready'||mode==='over')start();}if(e.code==='Escape'&&!e.repeat)togglePause();});
addEventListener('keyup',e=>release(e.code));
addEventListener('blur',()=>{keys.clear();if((mode==='walk'||mode==='date'||mode==='finale')&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='walk'||mode==='date'||mode==='finale')&&!paused)togglePause();last=0;});
document.querySelectorAll('[data-key]').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>release(button.dataset.key);});
function openTask(i){
  taskOpen=i;challengeTime=0;challengeMessage='';player.vx=0;player.vy=0;const t=tasks[i];
  ui['task-panel'].innerHTML='<div class="task-card"><span class="pill">STOP '+(i+1)+' / 3 · '+t.place+'</span><h3>'+t.name+'</h3><p>'+t.purpose+'</p><div id="task-action"></div><p id="task-feedback" role="status"></p><button id="task-back" class="task-back">Back to the walk</button></div>';
  const action=document.getElementById('task-action');
  if(t.kind==='choice'){
    t.options.forEach((label,index)=>{const button=document.createElement('button');button.className='task-option';button.textContent=(index+1)+'. '+label;button.onclick=()=>chooseTask(index);action.appendChild(button);});
  }else{
    action.innerHTML='<div class="challenge-track">'+(t.kind==='timing'?'<span class="good-zone"></span><i id="challenge-marker"></i>':'<span id="hold-fill"></span>')+'</div><p class="challenge-hint">'+(t.kind==='timing'?'E or click Stop when the marker is in green.':'Hold E or hold the button to prepare this item.')+'</p><button id="challenge-button" class="primary">'+(t.kind==='timing'?'Stop in green':'Hold to prepare')+'</button>';
    const button=document.getElementById('challenge-button');
    if(t.kind==='timing')button.onclick=attemptTiming;else{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add('KeyE');};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete('KeyE');}
  }
  document.getElementById('task-back').onclick=closeTask;ui['task-panel'].hidden=false;renderChallenge();
}
function closeTask(){taskOpen=null;ui['task-panel'].hidden=true;keys.clear();refresh();}
function completeTask(){
  if(taskOpen===null||paused||document.hidden)return;const t=tasks[taskOpen];t.done=true;score+=100;balance=Math.min(100,balance+3);burst(t.x,t.y);closeTask();announce(t.success,4);refresh();
}
function chooseTask(option){
  if(taskOpen===null||paused||document.hidden)return;const t=tasks[taskOpen];if(t.kind!=='choice')return;
  if(option===t.correct)completeTask();else{challengeMessage='Check GG’s request above. You can choose again ♡';renderChallenge();}
}
function needle(){return 1-Math.abs(1-(challengeTime*.7)%2);}
function attemptTiming(){
  if(taskOpen===null||paused||document.hidden||tasks[taskOpen].kind!=='timing')return;
  if(needle()>=.62&&needle()<=.87)completeTask();else{challengeMessage='Not quite in green. Try again when the marker comes around.';renderChallenge();}
}
function renderChallenge(){
  if(taskOpen===null)return;const t=tasks[taskOpen],feedback=document.getElementById('task-feedback');feedback.textContent=challengeMessage||('This adds: '+t.reward);
  if(t.kind==='hold')document.getElementById('hold-fill').style.width=t.progress*100+'%';
  if(t.kind==='timing')document.getElementById('challenge-marker').style.left=needle()*100+'%';
}
function refresh(){
  ui.level.textContent=level+' / 3';ui.score.textContent=String(Math.floor(score)).padStart(5,'0');const hp=Math.ceil(balance);
  ui.health.textContent=hp+'%';ui.fill.style.width=balance+'%';ui.fill.classList.toggle('low',balance<30);ui.meter.setAttribute('aria-valuenow',hp);
  const ended=mode==='finale'||mode==='complete';ui['clock-label'].textContent=ended?'OUR STORY':mode==='date'?'SCENE LEFT':'PREP TIME';ui.time.textContent=ended?'♡':(mode==='date'?Math.ceil(20-sceneTime):Math.floor(dayTime))+'s';
  const objectives=ended?dates.map(d=>'<span class="objective done">✓ '+d.item+'</span>').join('')+'<span class="objective">For GG ♡</span>':tasks.map((t,i)=>'<span class="objective '+(t.done?'done':'')+'">'+(t.done?'✓ ':i+1+'. ')+t.name+'</span>').join('')+'<span class="objective">'+(readyForGG()?'Ready! Meet GG →':'Prepare '+tasks.filter(t=>t.done).length+' / 3')+'</span>';
  if(ui.objectives.innerHTML!==objectives)ui.objectives.innerHTML=objectives;
  ui.pause.textContent=paused?'▶ Resume':'Ⅱ Pause';ui.pause.disabled=mode==='ready'||mode==='over'||mode==='complete';ui.skip.disabled=paused;
  ui['scene-note'].textContent=ended?'THREE LITTLE SURPRISES. ONE FAVOURITE PERSON.':mode==='date'?'BALANCE REFILLS AFTER YOUR TIME TOGETHER':'TONIGHT: '+dates[currentDate()].item.toUpperCase();
  let status='WASD / arrows: stroll · E: prepare / talk · Follow stops 1 → 2 → 3';const target=nearest();
  if(mode==='finale'||mode==='complete')status='FOR GG · THANK YOU FOR BEING MY FAVOURITE LITTLE THING.';else if(mode==='ready')status='LITTLE PLANS. REAL SURPRISES. A MOMENT WITH GG.';else if(mode==='over')status='A FRESH EVENING IS JUST A CLICK AWAY.';else if(paused)status='PAUSED · TAKE YOUR TIME';else if(mode==='date')status=dates[sceneIndex].lines[Math.min(3,Math.floor(sceneTime/5))];
  else if(taskOpen!==null)status=tasks[taskOpen].purpose;
  else if(target)status=target.kind==='task'?'E · '+(target.item.done?'Prepared: '+target.item.reward:target.item.name):target.kind==='note'?'E · Read GG’s note':readyForGG()?'E · Surprise GG with everything you prepared':'GG is here. Finish your preparations first ♡';
  if(ui.status.textContent!==status)ui.status.textContent=status;
}
function burst(x,y,color='#e7a4b0'){for(let i=0;i<12;i++)particles.push({x,y,vx:Math.cos(i)*35,vy:-20+Math.sin(i)*30,life:1,color});}
function blocked(x,y){return ((x-pond.x)/pond.rx)**2+((y-pond.y)/pond.ry)**2<1 && !(y>=369&&y<=431);}
function walk(dt){
  clock+=dt;dayTime+=dt;notice=Math.max(0,notice-dt);
  if(taskOpen!==null){challengeTime+=dt;const t=tasks[taskOpen];if(t.kind==='hold'&&keys.has('KeyE')){t.progress=Math.min(1,t.progress+dt/t.duration);if(t.progress>=1)completeTask();}renderChallenge();return;}
  const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  const length=Math.hypot(x,y)||1;player.vx=x/length*180;player.vy=y/length*180;
  const nextX=clamp(player.x+player.vx*dt,35,WORLD-45),nextY=clamp(player.y+player.vy*dt,170,MAP_H-70);
  if(!blocked(nextX,player.y))player.x=nextX;if(!blocked(player.x,nextY))player.y=nextY;
  balance=Math.max(0,balance-dt*.12);
  if(balance<=0){mode='over';keys.clear();showOverlay('Evenings need<br><em>a little rest.</em>','GG: Take care of yourself, too.<br>Let’s plan another little evening.','Try another evening ♡','A FRESH START');}
  if(player.x>680&&messageStage===0){messageStage=1;announce('GG: Looking forward to seeing you. You’re being mysterious ♡',4);}
  camera+=(clamp(player.x-W/2,0,WORLD-W)-camera)*Math.min(1,dt*7);cameraY+=(clamp(player.y-300,0,MAP_H-H)-cameraY)*Math.min(1,dt*7);
  particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
}
function update(dt){
  if(paused||document.hidden||mode==='ready'||mode==='over'||mode==='complete')return;
  if(mode==='finale'){finaleTime+=dt;renderFinale();refresh();return;}
  if(mode==='date'){clock+=dt;sceneTime=Math.min(20,sceneTime+dt);if(sceneTime>=20)finishDate();}
  else{let remaining=dt;while(remaining>0&&mode==='walk'){const step=Math.min(remaining,1/60);walk(step);remaining-=step;}}
  ui.announcement.classList.toggle('visible',notice>0);refresh();
}
// Keep selected photos local; bundled sources can be added once original files are available.
const bundledPhotos=[];
function beginFinale(){
  mode='finale';paused=false;finaleTime=0;memoryIndex=-1;keys.clear();ui.finale.hidden=false;ui.overlay.hidden=true;ui['task-panel'].hidden=true;ui.announcement.classList.remove('visible');renderFinale();refresh();
}
const memoryCaptions=[
 'My favourite place is next to you.',
 'Thank you for every little smile you bring into my life.',
 'Some sunsets stay with us. So do you.',
 'GG, you make the ordinary feel beautiful.',
 'A thousand little things. One favourite person. You.'
];
function renderFinale(){
  const count=photoSources.length,quote=finaleTime<6;
  document.getElementById('finale-quote').hidden=!quote;
  document.getElementById('memory-album').hidden=quote||!count;
  document.getElementById('photo-invitation').hidden=quote||count>0;
  const index=count?Math.min(count-1,Math.max(0,Math.floor((finaleTime-6)/5))):-1;
  if(index!==memoryIndex){memoryIndex=index;document.querySelectorAll('.memory-photo').forEach((img,i)=>img.classList.toggle('active',i===index));document.getElementById('memory-caption').textContent=memoryCaptions[index]||memoryCaptions[0];document.getElementById('memory-count').textContent=count?(index+1)+' / '+count:'';}
  const finished=finaleTime>=6+count*5;
  document.getElementById('finale-end').hidden=!finished;
  document.getElementById('memory-prev').disabled=index<=0;document.getElementById('memory-next').disabled=index>=count-1;
  if(finished&&mode==='finale'){mode='complete';refresh();}
}
function showMemory(index){
  if(!photoSources.length)return;index=clamp(index,0,photoSources.length-1);finaleTime=6+index*5;memoryIndex=-1;mode='finale';paused=false;ui.overlay.hidden=true;renderFinale();refresh();
}
function loadMemoryPhotos(sources){
  photoSources=sources.slice(0,5);const frame=document.getElementById('memory-frame');frame.replaceChildren();
  photoSources.forEach((src,i)=>{const img=new Image();img.className='memory-photo';img.alt='A favourite memory with GG, photo '+(i+1);img.src=src;frame.appendChild(img);});
  document.getElementById('photo-status').textContent=photoSources.length+' photos ready for the ending';
  if(mode==='finale'||mode==='complete'){finaleTime=0;memoryIndex=-1;mode='finale';paused=false;ui.overlay.hidden=true;renderFinale();}
}
document.getElementById('photo-input').onchange=async e=>{
  const files=Array.from(e.target.files).filter(f=>f.type.startsWith('image/')).slice(0,5);if(!files.length)return;
  const sources=await Promise.all(files.map(file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);}))).catch(()=>null);
  if(sources){loadMemoryPhotos(sources);}else document.getElementById('photo-status').textContent='Could not read the photos. Please select them again.';
};
document.querySelectorAll('[data-add-photos]').forEach(button=>button.onclick=()=>document.getElementById('photo-input').click());
document.getElementById('memory-prev').onclick=()=>showMemory(memoryIndex-1);document.getElementById('memory-next').onclick=()=>showMemory(memoryIndex+1);
document.getElementById('memory-replay').onclick=()=>showMemory(0);document.getElementById('finale-restart').onclick=start;
if(bundledPhotos.length)loadMemoryPhotos(bundledPhotos);
// Scenes are drawn locally; the finale can display your own bundled or selected photos.
function box(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x,y,x2,y2,color,width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function text(value,x,y,size=14,color='#304d3e',font='Arial'){ctx.font=(font==='Georgia'?'':'600 ')+size+'px '+font;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(value,x,y);}
function person(x,y,female=false,scale=1,seated=false,side=1,happy=true){
  ctx.save();ctx.translate(x,y);ctx.scale(scale*side,scale);
  oval(0,2,22,5,'#344e3c18');
  const walk=mode==='walk'&&!female&&(player.vx||player.vy)?Math.sin(clock*14)*7:0;
  if(seated){line(-8,-24,-19,-14,'#344858',7);line(-19,-14,-18,0,'#344858',7);line(7,-24,16,-15,'#344858',7);line(16,-15,17,0,'#344858',7);}else{line(-7,-23,-9-walk,-3,'#344858',7);line(7,-23,9+walk,-3,'#344858',7);}
  line(-13-walk,0,-5-walk,0,'#fff9e9',5);line(13+walk,0,20+walk,0,'#fff9e9',5);
  if(female){oval(0,-59,16,22,'#654435');ctx.fillStyle='#d78c85';ctx.beginPath();ctx.moveTo(-10,-43);ctx.lineTo(11,-43);ctx.lineTo(18,-20);ctx.lineTo(-17,-20);ctx.fill();}else box(-13,-45,26,26,'#789b72',6);
  line(-11,-39,-17,-25,'#eab68c',6);line(11,-39,23,-32+Math.sin(clock*3)*2,'#eab68c',6);
  oval(0,-59,12,14,'#f0c39a');ctx.fillStyle=female?'#654435':'#3e4136';ctx.beginPath();ctx.arc(-1,-65,12,Math.PI,Math.PI*2);ctx.fill();
  if(!female)line(-9,-69,3,-73,'#3e4136',5);
  oval(4,-60,1.3,1.6,'#3d4339');
  if(happy){ctx.strokeStyle='#9f6351';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(3,-55,4,0,Math.PI*.8);ctx.stroke();}else line(1,-52,6,-52,'#9f6351',1.5);
  if(female){oval(8,-55,3,1.6,'#e69a87');oval(-10,-69,4,3,'#f3d08b');}ctx.restore();
}
function tree(x,y){box(x-4,y-90,8,90,'#9caa82');oval(x,y-105,30,38,'#a7bd8f');oval(x+17,y-85,24,30,'#b4c79a');}
function heart(x,y,size=20){text('♥',x,y,size,'#cf817f');}
function caption(value){box(210,432,540,40,'#fffaf1',14);text(value,480,458,16);}
function burger(x,y,scale=1){
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);box(-49,-60,98,87,'#c86b66',5);text('M',0,-23,35,'#f8d775');text('McDonald’s',0,4,11,'#fff1d4');
  box(-53,25,106,9,'#fff3d7',4);box(-42,4,84,20,'#d39a54',10);box(-40,-2,80,7,'#8c5f3d',3);box(-43,-8,86,7,'#95ae65',3);box(-41,-30,82,22,'#edbe79',20);
  for(const dx of [-22,0,22])oval(dx,-21,2,1,'#fff0c2');ctx.restore();
}
function dateScene(){
  const t=sceneTime,phase=Math.min(3,Math.floor(t/5));
  box(0,0,W,H,sceneIndex===0?'#292c43':sceneIndex===2?'#f2d2bd':'#f0e8d8');
  text(dates[sceneIndex].title,480,45,25,sceneIndex===0?'#fff0d0':'#6e5861','Georgia');
  if(sceneIndex===0){
    box(210,91,540,223,'#171d30',14);box(225,106,510,193,'#343954',4);
    for(let i=0;i<35;i++)oval(236+(i*71)%486,117+(i*43)%169,1.3,1.3,'#e8d6ad');
    ctx.strokeStyle='#d6b774';ctx.lineWidth=2;
    for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(480,185,45+i*27,45+i*15,clock*.15+i,0,Math.PI*2);ctx.stroke();}
    text('MARVEL STUDIOS',480,134,11,'#f2deb6');text('E T E R N A L S',480,208,28,'#ead19a','Georgia');
    text(['A COSMIC BEGINNING','ACROSS THE CENTURIES','TOGETHER AGAINST THE UNKNOWN','SOME CONNECTIONS ARE ETERNAL'][phase],480,279,11,'#e6cfaa');
    box(302,351,356,64,'#9e737f',12);person(425,411,false,1.35,true,1);person(540,411,true,1.35,true,-1);
    box(470,362,34,37,'#fff1d3',4);for(let i=0;i<5;i++)oval(472+i*7,362+(i%2)*3,6,5,'#f3d58b');
    box(770,130,153,66,'#f6e7c9',9);text('ETERNALS',846,152,14);text('F7 + F8 · FOR TWO',846,176,11);heart(485,328+Math.sin(t*3)*4,19);
    caption(['Eternals booked. Popcorn packed. Her seat beside yours.','GG: “You already booked Eternals for us?”','A Marvel universe on screen. Your favourite person beside you.','The credits roll. You’d choose this seat beside her, every time.'][phase]);
  }else if(sceneIndex===1){
    oval(790,130,38,38,'#f4d99b');tree(140,350);tree(820,350);box(0,360,W,140,'#d6e1c3');
    box(300,340,350,15,'#ae9272',5);line(325,350,325,402,'#8c7f66',6);line(625,350,625,402,'#8c7f66',6);
    const approach=Math.min(1,t/5);person(180+approach*220,399,false,1.65,t>=10,1);person(565,399,true,1.65,t>=10,-1);
    burger(t<5?225+approach*220:480,t<10?302:345,.83);
    if(t>=5){box(620,300,28,48,'#efe3bb',5);text('♡',634,328,18,'#bc7b8d');for(let i=0;i<5;i++)heart(400+i*43,225-((t*13+i*15)%65),14+i%2*7);}
    caption(['A McDonald’s stop for her Mexican McAloo Tikki.','GG: “Mexican McAloo Tikki! You know my favourite.”','Her favourite burger, her drink, and your favourite smile.','The little things taste even better when shared.'][phase]);
  }else if(t<8){
    oval(735,190,52,52,'#e7aa78');for(let i=0;i<8;i++){const x=((i*180-t*55)%1400+1400)%1400-220;oval(x,310,140,90,i%2?'#a4b394':'#bdc5a0');}
    box(0,340,W,160,'#8d9690');for(let i=0;i<10;i++)box(((i*145-t*170)%1450+1450)%1450-150,406,70,5,'#e8e0c6',2);
    const bob=Math.sin(t*5)*2;ctx.save();ctx.translate(0,bob);person(442,348,false,1,true,1);person(522,348,true,1,true,-1);
    box(345,318,280,64,'#7d9e9a',18);line(412,319,433,280,'#b8d6cb',5);line(433,280,577,280,'#b8d6cb',5);line(577,280,594,322,'#b8d6cb',5);
    for(const x of [405,566]){oval(x,382,25,25,'#455653');oval(x,382,12,12,'#d9d7bd');}ctx.restore();
    box(748,100,170,62,'#fff1d5',9);text('FUEL · FULL',833,120,12);box(767,133,132,12,'#86a58a',5);
    box(35,195,212,48,'#fff1d5',6);text('BACK WATERS →',141,224,14);
    caption('A full tank, gerberas in the back, and Back waters ahead.');
  }else{
    oval(690,165,48,48,'#f2bb88');box(0,215,W,170,'#b0c2c4');
    for(let i=0;i<26;i++){const y=235+(i*31)%125,x=(i*89+Math.sin(t+i)*12)%940;line(x,y,x+35+(i%3)*12,y,'#e5d4bd',2);}
    oval(140,216,240,43,'#9ea994');oval(895,219,230,40,'#a4ac97');box(0,365,W,135,'#d7c7ac');
    box(302,340,356,14,'#aa8e77',5);line(320,354,320,404,'#8c7f66',6);line(640,354,640,404,'#8c7f66',6);
    person(415,402,false,1.6,true,1);person(550,402,true,1.6,true,-1);
    for(let i=0;i<5;i++)gerbera(478+(i-2)*13,330-Math.sin(i)*9,i%2?'#f4b6ca':'#fffaf0',10);
    text('B A C K   W A T E R S',480,125,17,'#8a6973');heart(490,242+Math.sin(t*2)*5,23);
    caption(t<13?'GG: “White and pink gerberas… you remembered.”':'Back waters, a sunset, and all your favourite little things.');
  }
  text(dateInventory.join(' · '),480,73,11,sceneIndex===0?'#f8e5c2':'#876c7c');
  box(330,485,300,4,sceneIndex===0?'#596176':'#d2cbb7',2);box(330,485,300*t/20,4,'#be8678',2);
}
function gerbera(x,y,color='#fffaf0',size=12){
  line(x,y+5,x-2,y+26,'#7e9f7b',2);
  for(let i=0;i<18;i++){const angle=i*Math.PI/9;ctx.save();ctx.translate(x,y);ctx.rotate(angle);oval(size*.72,0,size*.55,size*.16,color);ctx.restore();}
  oval(x,y,size*.29,size*.29,'#8c6a43');oval(x,y,size*.14,size*.14,'#d5ac61');
}
function blossom(x,y,color='#eab0b9',size=9){
  line(x,y+5,x-2,y+22,'#7e9f7b',2);for(let i=0;i<5;i++)oval(x+Math.cos(i*1.257)*size*.65,y+Math.sin(i*1.257)*size*.65,size*.5,size*.5,color);oval(x,y,size*.3,size*.3,'#f9e5a9');
}
function lantern(x,y){
  oval(x,y-90,37,37,'#ffe5b322');line(x,y,x,y-110,'#977887',4);line(x,y-110,x+20,y-110,'#977887',3);box(x+9,y-107,24,30,'#ffe5b3',7);box(x+6,y-110,30,5,'#a57f89',3);
}
function bench(x,y){box(x-50,y-12,100,13,'#b39585',4);box(x-50,y-43,100,26,'#c7aa96',5);line(x-38,y,x-38,y+13,'#8e8176',4);line(x+38,y,x+38,y+13,'#8e8176',4);}
function drawStop(t,i){
  const x=t.x,y=t.y,pending=tasks.findIndex(q=>!q.done),color=t.done?'#8aa88d':i===pending?'#bc879d':'#b7a7ad';
  oval(x,y+8,87,16,'#acbfa588');
  box(x-72,y-101,144,91,'#f0dfcc',8);box(x-80,y-110,160,18,t.icon==='M'?'#bb6865':color,5);
  if(t.icon==='M'){text('M',x,y-63,34,'#d3a948');box(x-55,y-40,110,26,'#c79683',4);text(i===0?'ORDER HERE':'PICKUP #27',x,y-22,11,'#fff4dc');}
  else if(t.icon==='FUEL'){box(x-23,y-88,46,74,'#bf8090',5);box(x-15,y-80,30,24,'#f6edce',3);text('FUEL',x,y-63,10);line(x+26,y-73,x+48,y-55,'#827582',4);line(x+48,y-55,x+48,y-19,'#827582',4);}
  else if(t.icon==='TICKET'){box(x-55,y-83,110,28,'#8c7c99',4);text('ETERNALS',x,y-64,15,'#fff0cc');text(t.done?'F7 + F8 ✓':'SEATS FOR TWO',x,y-27,12);}
  else if(t.icon==='FLOWER'){for(let k=-1;k<=1;k++)gerbera(x+k*25,y-50,k===0?'#f4b6ca':'#fffaf0',13);box(x-56,y-34,112,20,'#b0927f',4);}
  else{box(x-53,y-82,106,42,'#fff3de',5);text(t.icon==='MAP'?'BACK WATERS':t.icon==='POP'?'POPCORN':t.icon==='CUP'?'HER DRINK':t.icon==='TABLE'?'TABLE FOR 2':t.icon==='BAG'?'SUNSET KIT':'PASTA',x,y-55,13,'#8d6a7f');box(x-55,y-34,110,20,color,4);}
  text(t.place,x,y-130,13,'#806673');box(x-16,y+1,32,25,color,12);text(t.done?'✓':String(i+1),x,y+18,15,'#fff7df');
  text(t.done?'Prepared ✓':i===pending?'E · '+t.name:'After stop '+i,x,y+48,12,'#866b77');
}
function worldDraw(){
  const theme=(level-1)%3,bg=['#f4ded6','#ddd5e3','#c6cddb'][theme];box(0,0,W,H,bg);
  ctx.save();ctx.translate(-Math.floor(camera),-Math.floor(cameraY));
  box(0,0,WORLD,MAP_H,['#d7dfcc','#cfd7d4','#b9cbc8'][theme]);
  // Curving garden paths replace platforms and block courses.
  ctx.strokeStyle='#e9d9c6';ctx.lineWidth=94;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(60,435);ctx.bezierCurveTo(200,420,240,500,400,480);ctx.bezierCurveTo(510,460,510,400,640,400);ctx.lineTo(970,400);ctx.bezierCurveTo(1060,400,920,240,1030,245);ctx.bezierCurveTo(1170,250,1160,520,1330,500);ctx.bezierCurveTo(1510,500,1540,370,1820,390);ctx.stroke();
  for(let i=0;i<80;i++){const x=(i*139)%WORLD,y=175+(i*67)%450;if(y<290||y>560)blossom(x,y,i%2?'#e8b4b4':'#e5d2ab',4);}
  oval(pond.x,pond.y,pond.rx+9,pond.ry+9,'#b9cdbf');oval(pond.x,pond.y,pond.rx,pond.ry,'#9cbfc3');
  for(let i=0;i<11;i++)line(680+i*23,345+(i%4)*38+Math.sin(clock+i)*3,699+i*23,345+(i%4)*38,'#d6e3db',2);
  for(const [x,y] of [[725,330],[860,460]]){oval(x,y,15,7,'#86aa92');blossom(x+3,y-2,'#eed1d4',6);}
  box(620,370,340,60,'#bd9d84',7);for(let x=626;x<960;x+=22)line(x,372,x,429,'#e3c5a8',2);
  line(620,367,960,367,'#9a7c71',4);line(620,432,960,432,'#9a7c71',4);
  for(const x of [625,685,895,955]){line(x,365,x,346,'#9a7c71',4);line(x,435,x,451,'#9a7c71',4);}
  for(const [x,y] of [[140,280],[440,195],[650,560],[1090,180],[1480,550],[1630,210],[1830,580]]){tree(x,y);oval(x,y-100,48,42,'#e7b8bd');oval(x+18,y-116,25,27,'#efc6c6');}
  for(const [x,y] of [[270,440],[1040,340],[1500,440],[1680,320]])lantern(x,y);
  for(const n of notes){bench(n.x,n.y);box(n.x-12,n.y-41,24,16,n.read?'#e0c6c0':'#fff5df',3);line(n.x-10,n.y-39,n.x,n.y-32,'#bd9d9d',1);line(n.x,n.y-32,n.x+10,n.y-39,'#bd9d9d',1);text(n.read?'A little memory':'✉ E · Read me',n.x,n.y-63,12,'#806d79');}
  for(let i=0;i<tasks.length;i++)drawStop(tasks[i],i);
  // Strings of lights lead to GG's rose arch.
  ctx.strokeStyle='#a28d8c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1540,220);ctx.quadraticCurveTo(1690,290,1860,220);ctx.stroke();
  for(let i=0;i<10;i++){const x=1540+i*35,y=220+Math.sin(i/9*Math.PI)*35;oval(x,y,10,10,'#ffedb344');oval(x,y,4,5,'#fff0bb');}
  line(GOAL-55,415,GOAL-55,292,'#a6ad8e',8);line(GOAL+55,415,GOAL+55,292,'#a6ad8e',8);
  ctx.strokeStyle='#a6ad8e';ctx.lineWidth=8;ctx.beginPath();ctx.arc(GOAL,292,55,Math.PI,0);ctx.stroke();
  for(let i=0;i<9;i++)blossom(GOAL+Math.cos(Math.PI+i*Math.PI/8)*55,292+Math.sin(Math.PI+i*Math.PI/8)*55,'#d898a8',9);
  person(GOAL,390,true,1.08,false,-1);text('GG',GOAL,294,19,'#9d647c');heart(GOAL+28,307+Math.sin(clock*2)*4,19);
  person(player.x,player.y,false,1.12,false,player.vx<0?-1:1);
  if(tasks.some(t=>t.done)){box(player.x+15,player.y-34,20,25,'#bd8b86',4);text('♡',player.x+25,player.y-17,12,'#fff0d9');}
  for(const p of particles)heart(p.x,p.y,10*p.life);
  for(let i=0;i<18;i++){const x=(i*147+clock*14)%WORLD,y=180+(i*83+clock*11)%450;oval(x,y,3,1.8,'#efd1d5');}
  const target=nearest();if(mode==='walk'&&target){box(player.x-76,player.y+17,152,25,'#fff5e9ee',12);text(target.kind==='task'?(target.item.done?'✓ Prepared':'E · Prepare here'):target.kind==='note'?'E · GG’s note':'E · Surprise GG',player.x,player.y+34,12,'#8d647b');}
  ctx.restore();
  // A tiny map makes the short walk easy to navigate.
  box(W-236,16,220,83,'#fff8e7e8',12);text('PREPARE → SURPRISE GG',W-126,35,10,'#876c7c');line(W-218,65,W-34,65,'#d8b8b9',3);
  for(let i=0;i<tasks.length;i++){const t=tasks[i],x=W-218+t.x/WORLD*184;text(t.done?'✓':String(i+1),x,64,13,t.done?'#6f9677':'#b57c8e');}
  oval(W-218+player.x/WORLD*184,78,4,4,'#577f70');text('GG',W-40,57,10,'#9d647c');
}
function draw(){if(mode==='finale'||mode==='complete')return;ctx.clearRect(0,0,W,H);if(mode==='date')dateScene();else worldDraw();}
function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;update(dt);draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
