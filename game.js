'use strict';
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['level','score','health','fill','meter','time','clock-label','objectives','overlay','title','message','play','pill','status','scene-note','announcement','skip','pause'].map(id=>[id,document.getElementById(id)]));
const W=960,H=500,WORLD=1920,MAP_H=700,GOAL=1780,keys=new Set();
const dates=[{title:'A sweet surprise for GG',item:'Cookies ’n’ Creme',lines:['You: A little something for you, GG.','GG: My favourite! You remembered.','You: One pack. Two very happy people.','GG: The best part is spending time with you.']},{title:'Dinner for two',item:'Dinner date',lines:['You: A table for us, away from the busy day.','GG: This smells amazing. Let’s dig in!','You: Tell me the best part of your day.','GG: A toast to little moments like this.']},{title:'Just one more scene',item:'Movie night',lines:['GG: Popcorn? Check. Favourite person? Check.','You: Our tiny astronaut is going places!','GG: That moon is definitely made of cheese.','You: Five stars for the company.']},{title:'The long way home',item:'Sunset drive',lines:['You: Seat belts on. Nowhere to rush.','GG: This song! Turn it up a little.','You: Look at that sunset, GG.','GG: Let’s take the scenic route again.']}];
const gardens=['Peach-sky park','Lavender evening','Moonlit garden'];
const pond={x:790,y:400,rx:150,ry:110};
let mode='ready',paused=false,level=1,score=0,balance=100,dayTime=0,sceneTime=0,sceneIndex=0,clock=0,last=0,notice=0;
let player,flowers,notes,rain,camera=0,cameraY=0,collected=0,particles=[],messageStage=0;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function buildMap(){
  flowers=[{x:370,y:480,name:'A rose for GG',color:'#d17e8a',taken:false},{x:1010,y:245,name:'A little lavender',color:'#a08dbb',taken:false},{x:1320,y:505,name:'A sunny daisy',color:'#e2b862',taken:false}];
  notes=[{x:560,y:265,read:false,text:'GG: No rush. I saved our favourite spot for us.'},{x:1430,y:260,read:false,text:'You: The little things remind me of you, GG.'}];
  rain={x:1160,y:450,r:78};player={x:95,y:435,vx:0,vy:0};camera=0;cameraY=140;collected=0;dayTime=0;particles=[];messageStage=0;keys.clear();
}
function reset(){level=1;score=0;balance=100;sceneTime=0;sceneIndex=0;clock=0;last=0;notice=0;paused=false;mode='ready';buildMap();ui.skip.hidden=true;ui.announcement.classList.remove('visible');refresh();}
function start(){reset();mode='walk';ui.overlay.hidden=true;announce('GG: Meet me under the rose arch ♡',4);refresh();}
function showOverlay(title,message,label,pill){ui.title.innerHTML=title;ui.message.innerHTML=message;ui.play.textContent=label;ui.pill.textContent=pill;ui.overlay.hidden=false;}
function announce(value,seconds=3){ui.announcement.textContent=value;notice=seconds;}
function currentDate(){return level===1?0:1+(level-2)%3;}
function beginDate(){mode='date';sceneIndex=currentDate();sceneTime=0;player.vx=0;player.vy=0;keys.clear();notice=0;ui.announcement.classList.remove('visible');ui.skip.hidden=false;score+=300;refresh();}
function finishDate(){if(mode!=='date'||paused)return;balance=100;score+=150;sceneTime=0;level++;mode='walk';ui.skip.hidden=true;buildMap();announce('A new evening · Balance full ♡');refresh();}
function togglePause(){if(mode!=='walk'&&mode!=='date')return;paused=!paused;keys.clear();last=0;if(paused)showOverlay('Stay a little.','Your evening will be right here.','Resume','PAUSED');else ui.overlay.hidden=true;refresh();}
ui.play.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;ui.skip.onclick=finishDate;
const controls=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Space','KeyA','KeyD','KeyW','KeyS','KeyE'];
function distance(a,b){return Math.hypot(a.x-b.x,a.y-b.y);}
function nearest(){
  const targets=[...flowers.filter(f=>!f.taken).map(item=>({kind:'flower',item})),...notes.map(item=>({kind:'note',item})),{kind:'gg',item:{x:GOAL,y:390}}];
  return targets.filter(t=>distance(player,t.item)<76).sort((a,b)=>distance(player,a.item)-distance(player,b.item))[0];
}
function interact(){
  if(mode!=='walk'||paused||document.hidden)return;const target=nearest();if(!target)return;
  if(target.kind==='flower'){target.item.taken=true;collected++;score+=75;balance=Math.min(100,balance+4);burst(target.item.x,target.item.y,'#e7a4b0');announce(collected===3?'A whole bouquet. Now find GG under the rose arch ♡':target.item.name+' · '+collected+'/3 flowers');}
  else if(target.kind==='note'){if(!target.item.read){target.item.read=true;score+=25;}announce(target.item.text,5);}
  else if(collected===3){beginDate();}else announce('GG: A bouquet? There are '+(3-collected)+' flowers left along the path ♡',4);
  refresh();
}
function press(code){keys.add(code);if(code==='KeyE')interact();}
function release(code){keys.delete(code);}
addEventListener('keydown',e=>{if(controls.includes(e.code)){e.preventDefault();if(!e.repeat)press(e.code);}if(e.code==='Enter'&&!e.repeat&&e.target.tagName!=='BUTTON'){if(paused)togglePause();else if(mode==='ready'||mode==='over')start();}if(e.code==='Escape'&&!e.repeat)togglePause();});
addEventListener('keyup',e=>release(e.code));
addEventListener('blur',()=>{keys.clear();if((mode==='walk'||mode==='date')&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='walk'||mode==='date')&&!paused)togglePause();last=0;});
document.querySelectorAll('[data-key]').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>release(button.dataset.key);});
function refresh(){
  ui.level.textContent=String(level).padStart(2,'0');ui.score.textContent=String(Math.floor(score)).padStart(5,'0');const hp=Math.ceil(balance);
  ui.health.textContent=hp+'%';ui.fill.style.width=balance+'%';ui.fill.classList.toggle('low',balance<30);ui.meter.setAttribute('aria-valuenow',hp);
  ui['clock-label'].textContent=mode==='date'?'SCENE LEFT':'TIME TOGETHER';ui.time.textContent=(mode==='date'?Math.ceil(20-sceneTime):Math.floor(dayTime))+'s';
  const objectives='<span class="objective">'+gardens[(level-1)%3]+'</span><span class="objective">♡ Bouquet '+collected+' / 3</span><span class="objective">✉ '+notes.filter(n=>n.read).length+' / 2 notes</span><span class="objective">'+(collected===3?'Meet GG at the rose arch →':'Find the three marked flowers')+'</span>';
  if(ui.objectives.innerHTML!==objectives)ui.objectives.innerHTML=objectives;
  ui.pause.textContent=paused?'▶ Resume':'Ⅱ Pause';ui.pause.disabled=mode==='ready'||mode==='over';ui.skip.disabled=paused;
  ui['scene-note'].textContent=mode==='date'?'BALANCE REFILLS AFTER YOUR TIME TOGETHER':'TONIGHT: '+dates[currentDate()].item.toUpperCase();
  let status='WASD / arrows: stroll · E: pick / read · Hold Space: umbrella';const target=nearest();
  if(mode==='ready')status='A SHORT WALK. A LITTLE THOUGHT. A MOMENT WITH GG.';else if(mode==='over')status='A FRESH EVENING IS JUST A CLICK AWAY.';else if(paused)status='PAUSED · TAKE YOUR TIME';else if(mode==='date')status=dates[sceneIndex].lines[Math.min(3,Math.floor(sceneTime/5))];
  else if(target)status=target.kind==='flower'?'E · Pick '+target.item.name:target.kind==='note'?'E · Read a little note':collected===3?'E · Give GG the bouquet and spend time together':'GG is here. Finish your bouquet, then press E ♡';
  else if(distance(player,rain)<rain.r)status=keys.has('Space')?'A little rain, a little shelter. Keep strolling ♡':'A passing shower · Hold Space to open your umbrella';
  if(ui.status.textContent!==status)ui.status.textContent=status;
}
function burst(x,y,color='#e7a4b0'){for(let i=0;i<12;i++)particles.push({x,y,vx:Math.cos(i)*35,vy:-20+Math.sin(i)*30,life:1,color});}
function blocked(x,y){return ((x-pond.x)/pond.rx)**2+((y-pond.y)/pond.ry)**2<1 && !(y>=369&&y<=431);}
function walk(dt){
  clock+=dt;dayTime+=dt;notice=Math.max(0,notice-dt);rain.x=1160+Math.sin(clock*.35)*65;rain.y=440+Math.sin(clock*.27)*45;
  const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const y=Number(keys.has('KeyS')||keys.has('ArrowDown'))-Number(keys.has('KeyW')||keys.has('ArrowUp'));
  const length=Math.hypot(x,y)||1,speed=keys.has('Space')?135:180;player.vx=x/length*speed;player.vy=y/length*speed;
  const nextX=clamp(player.x+player.vx*dt,35,WORLD-45),nextY=clamp(player.y+player.vy*dt,170,MAP_H-70);
  if(!blocked(nextX,player.y))player.x=nextX;
  if(!blocked(player.x,nextY))player.y=nextY;
  balance=Math.max(0,balance-dt*(.12+(distance(player,rain)<rain.r&&!keys.has('Space')?5:0)));
  if(balance<=0){mode='over';keys.clear();showOverlay('Evenings need<br><em>a little rest.</em>','GG: Take care of yourself, too.<br>Let’s take another little walk.','Try another evening ♡','A FRESH START');}
  if(player.x>680&&messageStage===0){messageStage=1;announce('GG: I’ll be the one smiling when you get here.',4);}
  camera+=(clamp(player.x-W/2,0,WORLD-W)-camera)*Math.min(1,dt*7);cameraY+=(clamp(player.y-300,0,MAP_H-H)-cameraY)*Math.min(1,dt*7);
  particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;}
}
function update(dt){
  if(paused||document.hidden||mode==='ready'||mode==='over')return;
  if(mode==='date'){clock+=dt;sceneTime=Math.min(20,sceneTime+dt);if(sceneTime>=20)finishDate();}
  else{let remaining=dt;while(remaining>0&&mode==='walk'){const step=Math.min(remaining,1/60);walk(step);remaining-=step;}}
  ui.announcement.classList.toggle('visible',notice>0);refresh();
}
// All artwork is drawn locally; no images, fonts, or network requests.
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
function chocolate(x,y,scale=1){ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);box(-61,-28,122,56,'#f9f2d9',4);box(-61,-28,10,56,'#bdc4ca',2);box(51,-28,10,56,'#bdc4ca',2);text('HERSHEY’S',0,-6,15,'#514743');text('Cookies ’n’ Creme',0,12,10,'#514743');for(let i=0;i<4;i++)oval(-34+i*22,21,2,2,'#615349');ctx.restore();}
function dateScene(){
  const t=sceneTime,phase=Math.min(3,Math.floor(t/5));
  box(0,0,W,H,sceneIndex===2?'#343c54':sceneIndex===3?'#f5d3b1':'#f0e8d8');
  text(dates[sceneIndex].title,480,56,25,sceneIndex===2?'#fff6da':'#4a5c46','Georgia');
  if(sceneIndex===0){
    oval(790,110,38,38,'#f4d99b');tree(140,350);tree(820,350);box(0,360,W,140,'#d6e1c3');
    box(300,340,350,15,'#ae9272',5);line(325,350,325,402,'#8c7f66',6);line(625,350,625,402,'#8c7f66',6);
    const approach=Math.min(1,t/5);person(180+approach*220,399,false,1.65,t>=10,1);person(565,399,true,1.65,t>=10,-1,t>=5);
    chocolate(t<5?225+approach*220:480,t<10?302:345,.83);
    if(t>=5)for(let i=0;i<5;i++)heart(400+i*43,225-((t*13+i*15)%65),14+i%2*7);
    caption(phase===0?'One pack. Her favourite flavour.':phase===1?'GG lights up: “You remembered!”':phase===2?'Sharing chocolate and stories from the day.':'A sweet little moment, just for you two.');
  }else if(sceneIndex===1){
    for(const x of [175,785]){box(x-48,98,96,130,'#a0ad99',40);box(x-40,106,80,115,'#d6dcbf',35);line(x,110,x,215,'#fff5de',4);}
    box(0,370,W,130,'#d4bda4');person(320,390,false,1.7,true,1);person(640,390,true,1.7,true,-1);
    box(360,325,240,15,'#fcf3df',9);line(385,340,385,408,'#8c7c62',7);line(575,340,575,408,'#8c7c62',7);
    const plateX=phase===0?980-Math.min(1,t/5)*550:430;
    oval(plateX,320,32,9,'#fffdf2');oval(plateX,318,20,6,'#b9c27a');oval(plateX+100,320,32,9,'#fffdf2');oval(plateX+100,318,20,6,'#d69375');
    line(480,320,480,285,'#d49b6c',4);oval(480,280,4,9,'#f5d385');
    for(const x of [395,565]){const lift=phase===3?20+Math.sin(t*2)*5:0;line(x,316-lift,x,296-lift,'#9ba9a1',2);box(x-7,280-lift,14,16,'#de9b82',4);}
    if(phase===2){text('Best part of your day?',480,205,17);heart(590,220,22);}if(phase===3){text('Cheers to us, GG!',480,205,20);heart(480,175,24);}
    caption(['A cozy table, a busy day left at the door.','Dinner is served. There’s always room for fries.','Good food. Better conversation.','A cheerful toast to time together.'][phase]);
  }else if(sceneIndex===2){
    box(226,84,508,224,'#222b3b',12);box(241,99,478,194,'#637b94',3);
    for(let i=0;i<22;i++)oval(253+(i*67)%450,109+(i*31)%166,1.5,1.5,'#f8eac1');
    oval(640,145,25,25,phase>=2?'#e7d8a1':'#ced3bd');
    const rx=phase===0?390:phase===1?390+(t-5)*35:phase===2?575:575-(t-15)*35;
    box(rx,phase===0?240-t*15:165,18,30,'#f6e5c7',7);oval(rx+9,phase===0?249-t*15:174,5,5,'#96bac5');
    if(phase===1)text('✦',rx+9,220+Math.sin(t*9)*6,24,'#efbc6f');
    text(['A TINY SPACE ADVENTURE','NEXT STOP: THE MOON','CHEESE MOON DISCOVERED!','THE JOURNEY HOME'][phase],480,274,14,'#fff1ce');
    box(300,350,360,65,'#9e737f',12);person(425,411,false,1.35,true,1);person(540,411,true,1.35,true,-1);
    box(470,362,34,37,'#fff1d3',4);for(let i=0;i<5;i++)oval(472+i*7,362+(i%2)*3,6,5,'#f3d58b');
    if(phase>=2){heart(485,319+Math.sin(t*3)*4,18);text('Ha!',590,337,15,'#f9e5d8');}
    caption(['The lights dim. The popcorn is ready.','A rocket launch. Two very invested critics.','An unexpected twist. Shared giggles.','The credits roll. GG gives the evening five stars.'][phase]);
  }else{
    oval(735,174+t*2,52,52,'#e7aa78');
    for(let i=0;i<8;i++){const x=((i*180-t*55)%1400+1400)%1400-220;oval(x,300,140,90,i%2?'#a4b394':'#bdc5a0');}
    box(0,340,W,160,'#8d9690');box(0,343,W,5,'#dfe0ca');
    for(let i=0;i<10;i++){const x=((i*145-t*170)%1450+1450)%1450-150;box(x,406,70,5,'#e8e0c6',2);}
    const bob=Math.sin(t*5)*2;ctx.save();ctx.translate(0,bob);
    person(442,348,false,1.0,true,1);person(522,348,true,1.0,true,-1);
    box(345,318,280,64,'#7d9e9a',18);box(370,368,46,12,'#5f7b79',4);box(553,368,46,12,'#5f7b79',4);
    line(412,319,433,280,'#b8d6cb',5);line(433,280,577,280,'#b8d6cb',5);line(577,280,594,322,'#b8d6cb',5);
    line(429,293,452,317,'#445b57',3);line(536,294,513,317,'#445b57',3);
    for(const x of [405,566]){oval(x,382,25,25,'#455653');oval(x,382,12,12,'#d9d7bd');line(x-10*Math.cos(t*7),382-10*Math.sin(t*7),x+10*Math.cos(t*7),382+10*Math.sin(t*7),'#7c8e86',3);}
    box(603,336,15,8,'#f9e4ad',3);ctx.restore();
    if(t>=5)for(let i=0;i<3;i++)text('♫',390+i*80,240-((t*15+i*13)%80),22,'#7d8c6c');
    caption(['Seat belts on. The scenic route is calling.','Their favourite song, playing softly.','A golden sky and nowhere to rush.','The long way home feels just right.'][phase]);
  }
  box(330,485,300,4,sceneIndex===2?'#596176':'#d2cbb7',2);box(330,485,300*t/20,4,'#be8678',2);
}
function blossom(x,y,color='#eab0b9',size=9){
  line(x,y+5,x-2,y+22,'#7e9f7b',2);for(let i=0;i<5;i++)oval(x+Math.cos(i*1.257)*size*.65,y+Math.sin(i*1.257)*size*.65,size*.5,size*.5,color);oval(x,y,size*.3,size*.3,'#f9e5a9');
}
function lantern(x,y){
  oval(x,y-90,37,37,'#ffe5b322');line(x,y,x,y-110,'#977887',4);line(x,y-110,x+20,y-110,'#977887',3);box(x+9,y-107,24,30,'#ffe5b3',7);box(x+6,y-110,30,5,'#a57f89',3);
}
function bench(x,y){box(x-50,y-12,100,13,'#b39585',4);box(x-50,y-43,100,26,'#c7aa96',5);line(x-38,y,x-38,y+13,'#8e8176',4);line(x+38,y,x+38,y+13,'#8e8176',4);}
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
  for(const f of flowers){
    oval(f.x,f.y+5,28,11,'#acc29f');
    if(!f.taken){blossom(f.x,f.y-13,f.color,12);blossom(f.x-14,f.y-3,f.color,8);blossom(f.x+14,f.y-5,f.color,8);heart(f.x,f.y-45+Math.sin(clock*2)*3,16);text('E · Pick',f.x,f.y+32,12,'#866b77');}else text('♡',f.x,f.y,17,'#8eaa89');
  }
  // A small passing shower asks for an umbrella, rather than a jump.
  oval(rain.x,rain.y-130,76,23,'#a6a9bf55');oval(rain.x-30,rain.y-142,37,25,'#b0b2c555');
  for(let i=0;i<16;i++){const x=rain.x-65+(i*37)%130,y=rain.y-115+((clock*90+i*23)%150);line(x,y,x-3,y+9,'#839cb46a',1.5);}
  text('passing shower',rain.x,rain.y-170,11,'#7d7d96');
  // Strings of lights lead to GG's rose arch.
  ctx.strokeStyle='#a28d8c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(1540,220);ctx.quadraticCurveTo(1690,290,1860,220);ctx.stroke();
  for(let i=0;i<10;i++){const x=1540+i*35,y=220+Math.sin(i/9*Math.PI)*35;oval(x,y,10,10,'#ffedb344');oval(x,y,4,5,'#fff0bb');}
  line(GOAL-55,415,GOAL-55,292,'#a6ad8e',8);line(GOAL+55,415,GOAL+55,292,'#a6ad8e',8);
  ctx.strokeStyle='#a6ad8e';ctx.lineWidth=8;ctx.beginPath();ctx.arc(GOAL,292,55,Math.PI,0);ctx.stroke();
  for(let i=0;i<9;i++)blossom(GOAL+Math.cos(Math.PI+i*Math.PI/8)*55,292+Math.sin(Math.PI+i*Math.PI/8)*55,'#d898a8',9);
  person(GOAL,390,true,1.08,false,-1);text('GG',GOAL,294,19,'#9d647c');heart(GOAL+28,307+Math.sin(clock*2)*4,19);
  // Character is larger than before, with a bouquet that grows as you collect.
  person(player.x,player.y,false,1.12,false,player.vx<0?-1:1);
  for(let i=0;i<collected;i++)blossom(player.x+18+(i-1)*6,player.y-35-(i%2)*6,flowers[i].color,5);
  if(keys.has('Space')&&mode==='walk'){
    line(player.x+15,player.y-30,player.x+15,player.y-103,'#7c6a7a',2);
    ctx.fillStyle='#ba879f';ctx.beginPath();ctx.arc(player.x+15,player.y-101,45,Math.PI,0);ctx.closePath();ctx.fill();line(player.x-30,player.y-101,player.x+60,player.y-101,'#e7b9c6',2);heart(player.x+15,player.y-114,15);
  }
  for(const p of particles)heart(p.x,p.y,10*p.life);
  for(let i=0;i<18;i++){const x=(i*147+clock*14)%WORLD,y=180+(i*83+clock*11)%450;oval(x,y,3,1.8,'#efd1d5');}
  const target=nearest();if(mode==='walk'&&target){box(player.x-76,player.y+17,152,25,'#fff5e9ee',12);text(target.kind==='flower'?'E · Add to bouquet':target.kind==='note'?'E · A little note':'E · Talk to GG',player.x,player.y+34,12,'#8d647b');}
  ctx.restore();
  // A tiny map makes the short walk easy to navigate.
  box(W-236,16,220,83,'#fff8e7e8',12);text('YOUR LITTLE WALK',W-126,35,10,'#876c7c');line(W-218,65,W-34,65,'#d8b8b9',3);
  for(const f of flowers){const x=W-218+f.x/WORLD*184;heart(x,62,f.taken?10:14);}
  oval(W-218+player.x/WORLD*184,78,4,4,'#577f70');text('GG',W-40,57,10,'#9d647c');
}
function draw(){ctx.clearRect(0,0,W,H);if(mode==='date')dateScene();else worldDraw();}
function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;update(dt);draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
