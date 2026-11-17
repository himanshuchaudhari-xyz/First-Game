'use strict';
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['level','score','health','fill','meter','time','clock-label','objectives','overlay','title','message','play','pill','status','scene-note','announcement','skip','pause'].map(id=>[id,document.getElementById(id)]));
const W=960,H=500,FLOOR=414,keys=new Set();
const stations=[{x:155,label:'Class',name:'Attend class',color:'#b8c9dc'},{x:370,label:'Library',name:'Study notes',color:'#d9c8a3'},{x:590,label:'Friends',name:'Meet friends',color:'#b7cda5'}];
const dates=[{title:'A sweet surprise for GG',item:'Cookies ’n’ Creme',lines:['You: A little something for you, GG.','GG: My favourite! You remembered.','You: One pack. Two very happy people.','GG: The best part is spending time with you.']},{title:'Dinner for two',item:'Dinner date',lines:['You: A table for us, away from the busy day.','GG: This smells amazing. Let’s dig in!','You: Tell me the best part of your day.','GG: A toast to little moments like this.']},{title:'Just one more scene',item:'Movie night',lines:['GG: Popcorn? Check. Favourite person? Check.','You: Our tiny astronaut is going places!','GG: That moon is definitely made of cheese.','You: Five stars for the company.']},{title:'The long way home',item:'Sunset drive',lines:['You: Seat belts on. Nowhere to rush.','GG: This song! Turn it up a little.','You: Look at that sunset, GG.','GG: Let’s take the scenic route again.']}];
let mode='ready',paused=false,level=1,score=0,balance=100,dayTime=0,sceneTime=0,sceneIndex=0,clock=0,last=0,notice=0,ggProgress=0,player,tasks;
function buildDay(){
  const extra=Math.min(3,Math.floor((level-1)/2));
  tasks=stations.map((s,i)=>({done:0,target:1+(i<extra?1:0),progress:0,duration:Math.min(5,2.5+(level-1)*.25)}));
  player={x:70,y:FLOOR,vy:0,vx:0,grounded:true};dayTime=0;ggProgress=0;keys.clear();
}
function reset(){level=1;score=0;balance=100;sceneTime=0;sceneIndex=0;clock=0;last=0;notice=0;paused=false;mode='ready';buildDay();ui.skip.hidden=true;ui.announcement.classList.remove('visible');refresh();}
function start(){reset();mode='campus';ui.overlay.hidden=true;announce('Day 1 · A sweet surprise for GG');refresh();}
function showOverlay(title,message,label,pill){ui.title.innerHTML=title;ui.message.innerHTML=message;ui.play.textContent=label;ui.pill.textContent=pill;ui.overlay.hidden=false;}
function announce(text){ui.announcement.textContent=text;notice=2.5;}
function allDone(){return tasks.every(t=>t.done>=t.target);}
function currentDate(){return level===1?0:1+(level-2)%3;}
function beginDate(){mode='date';sceneIndex=currentDate();sceneTime=0;ggProgress=0;player.vx=0;keys.clear();notice=0;ui.announcement.classList.remove('visible');ui.skip.hidden=false;score+=200;refresh();}
function finishDate(){if(mode!=='date'||paused)return;balance=100;score+=150;sceneTime=0;level++;mode='campus';ui.skip.hidden=true;buildDay();announce('Day '+level+' · Balance fully restored ♡');refresh();}
function togglePause(){
  if(mode!=='campus'&&mode!=='date')return;
  paused=!paused;keys.clear();last=0;
  if(paused)showOverlay('Take a breather.','The day can wait. Your progress is saved here.','Resume','PAUSED');else ui.overlay.hidden=true;
  refresh();
}
ui.play.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;ui.skip.onclick=finishDate;
const controls=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyE'];
function press(code){if((code==='Space'||code==='ArrowUp')&&mode==='campus'&&!paused&&player.grounded){player.vy=-610;player.grounded=false;}keys.add(code);}
addEventListener('keydown',e=>{
  if(controls.includes(e.code)){e.preventDefault();if(!e.repeat)press(e.code);}
  if(e.code==='Enter'&&!e.repeat&&e.target.tagName!=='BUTTON'){if(paused)togglePause();else if(mode==='ready'||mode==='over')start();}
  if(e.code==='Escape'&&!e.repeat)togglePause();
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if((mode==='campus'||mode==='date')&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='campus'||mode==='date')&&!paused)togglePause();last=0;});
document.querySelectorAll('[data-key]').forEach(button=>{
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);};
  button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>keys.delete(button.dataset.key);
});
function nearby(){if(!player.grounded)return -1;return stations.findIndex(s=>Math.abs(s.x-player.x)<58);}
function refresh(){
  ui.level.textContent=String(level).padStart(2,'0');ui.score.textContent=String(Math.floor(score)).padStart(5,'0');
  const hp=Math.ceil(balance);ui.health.textContent=hp+'%';ui.fill.style.width=balance+'%';ui.fill.classList.toggle('low',balance<30);ui.meter.setAttribute('aria-valuenow',hp);
  ui['clock-label'].textContent=mode==='date'?'SCENE LEFT':'DAY TIME';ui.time.textContent=(mode==='date'?Math.ceil(20-sceneTime):Math.floor(dayTime))+'s';
  const objectives=stations.map((s,i)=>'<span class="objective '+(tasks[i].done>=tasks[i].target?'done':'')+'">'+(tasks[i].done>=tasks[i].target?'✓ ':'')+s.name+' '+tasks[i].done+'/'+tasks[i].target+'</span>').join('')+'<span class="objective '+(allDone()?'done':'')+'">'+(allDone()?'♡ Meet GG':'Then: meet GG')+'</span>';
  if(ui.objectives.innerHTML!==objectives)ui.objectives.innerHTML=objectives;
  ui.pause.textContent=paused?'▶ Resume':'Ⅱ Pause';ui.pause.disabled=mode==='ready'||mode==='over';ui.skip.disabled=paused;
  ui['scene-note'].textContent=mode==='date'?'BALANCE REFILLS AFTER YOUR TIME TOGETHER':'NEXT: '+dates[currentDate()].item.toUpperCase();
  let status='Move to a marker. Hold E to complete a task.';
  const i=nearby();
  if(mode==='ready')status='READY WHEN YOU ARE';else if(mode==='over')status='A FRESH START IS ALWAYS OKAY.';else if(paused)status='PAUSED · RESUME WHEN YOU’RE READY';
  else if(mode==='date')status=dates[sceneIndex].lines[Math.min(3,Math.floor(sceneTime/5))];
  else if(Math.abs(player.x-835)<65&&player.grounded)status=allDone()?'Hold E to spend time with GG ♡':'GG: Take your time. Finish your tasks, then come find me!';
  else if(i>=0)status=tasks[i].done>=tasks[i].target?'All done here! Head to your next task.':'Hold E: '+stations[i].name+' · '+Math.floor(tasks[i].progress/tasks[i].duration*100)+'%';
  if(ui.status.textContent!==status)ui.status.textContent=status;
}
function update(dt){
  if(paused||document.hidden||mode==='ready'||mode==='over')return;
  clock+=dt;notice=Math.max(0,notice-dt);ui.announcement.classList.toggle('visible',notice>0);
  if(mode==='date'){sceneTime=Math.min(20,sceneTime+dt);if(sceneTime>=20)finishDate();refresh();return;}
  dayTime+=dt;score+=dt*2;balance=Math.max(0,balance-dt*Math.min(2,1.15+level*.08));
  if(balance<=0){mode='over';keys.clear();notice=0;ui.announcement.classList.remove('visible');showOverlay('Even busy days<br><em>need a reset.</em>','You reached day '+level+' with '+Math.floor(score)+' points.<br>GG: Take care of yourself, too. Let’s try again.','Try a fresh day ↗','TIME TO RECHARGE');refresh();return;}
  const direction=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  player.vx=direction*275;player.x=Math.max(30,Math.min(W-30,player.x+player.vx*dt));player.vy+=1700*dt;player.y+=player.vy*dt;
  if(player.y>=FLOOR){player.y=FLOOR;player.vy=0;player.grounded=true;}
  const i=nearby();
  if(keys.has('KeyE')&&direction===0&&i>=0&&tasks[i].done<tasks[i].target){const task=tasks[i];task.progress+=dt;if(task.progress>=task.duration){task.progress=0;task.done++;score+=100;announce(stations[i].name+' ✓'+(allDone()?' · GG is waiting!':''));}}
  if(keys.has('KeyE')&&direction===0&&player.grounded&&Math.abs(player.x-835)<65&&allDone()){ggProgress+=dt;if(ggProgress>=.8)beginDate();}else ggProgress=0;
  refresh();
}
// All artwork is drawn locally; no images, fonts, or network requests.
function box(x,y,w,h,color,r=0){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill();}
function oval(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x,y,x2,y2,color,width=3){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function text(value,x,y,size=14,color='#304d3e',font='Arial'){ctx.font=(font==='Georgia'?'':'600 ')+size+'px '+font;ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(value,x,y);}
function person(x,y,female=false,scale=1,seated=false,side=1,happy=true){
  ctx.save();ctx.translate(x,y);ctx.scale(scale*side,scale);
  oval(0,2,22,5,'#344e3c18');
  const walk=mode==='campus'&&!female&&player.vx?Math.sin(clock*14)*7:0;
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
function campus(){
  box(0,0,W,H,'#eaf0df');oval(140,338,265,115,'#e1e8d0');oval(790,320,250,120,'#dfe8ce');oval(835,73,30,30,'#f5dfa6');
  for(const x of [35,270,480,725,925])tree(x,365);
  box(0,366,W,48,'#e9e5d1');box(0,FLOOR,W,H-FLOOR,'#d6e1c3');box(0,FLOOR,W,3,'#a7bd8f');
  for(let x=10;x<W;x+=40)line(x,399,x+15,399,'#d5cfb7',2);
  stations.forEach((s,i)=>{
    const done=tasks[i].done>=tasks[i].target;box(s.x-72,207,144,159,s.color,6);box(s.x-82,199,164,13,'#7e9274',3);
    box(s.x-59,222,118,29,'#fffcf2',4);text(s.label.toUpperCase(),s.x,241,13);
    box(s.x-15,302,30,64,'#7e8978',3);
    for(const dx of [-45,37])box(s.x+dx,270,18,24,'#f6edcc',3);
    text(done?'✓':String(i+1),s.x,179,20,done?'#658653':'#526e53');
    text(done?'All done':s.name,s.x,455,14);
    if(!done){box(s.x-45,467,90,6,'#d4dec5',3);box(s.x-45,467,90*tasks[i].progress/tasks[i].duration,6,'#799764',3);}
  });
  person(635,400,false,.7);person(660,400,true,.7,false,-1);
  box(785,383,105,9,'#ac9473',3);line(795,392,795,414,'#8a8267',4);line(879,392,879,414,'#8a8267',4);
  person(850,FLOOR,true,1, false,-1);text('GG',850,327,17,'#a36361');text(allDone()?'♡ Hold E':'♡ Meet after tasks',835,455,14,'#a36361');
  person(player.x,player.y,false,1,false,player.vx<0?-1:1);
  const i=nearby();
  if(mode==='campus'&&i>=0&&tasks[i].done<tasks[i].target){box(player.x-64,player.y-105,128,23,'#fffaf1',10);text('Hold E · '+Math.floor(tasks[i].progress/tasks[i].duration*100)+'%',player.x,player.y-89,11);}
  if(ggProgress>0){box(795,470,80*ggProgress/.8,5,'#c78279',3);}
}
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
function draw(){ctx.clearRect(0,0,W,H);if(mode==='date')dateScene();else campus();}
function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;update(dt);draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
