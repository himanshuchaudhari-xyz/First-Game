'use strict';
const canvas=document.getElementById('canvas'),ctx=canvas.getContext('2d');
const ui=Object.fromEntries(['level','score','health','fill','meter','time','clock-label','objectives','overlay','title','message','play','pill','status','scene-note','announcement','skip','pause'].map(id=>[id,document.getElementById(id)]));
const W=960,H=500,FLOOR=430,WORLD=6800,GOAL=6570,keys=new Set();
const dates=[{title:'A sweet surprise for GG',item:'Cookies ’n’ Creme',lines:['You: A little something for you, GG.','GG: My favourite! You remembered.','You: One pack. Two very happy people.','GG: The best part is spending time with you.']},{title:'Dinner for two',item:'Dinner date',lines:['You: A table for us, away from the busy day.','GG: This smells amazing. Let’s dig in!','You: Tell me the best part of your day.','GG: A toast to little moments like this.']},{title:'Just one more scene',item:'Movie night',lines:['GG: Popcorn? Check. Favourite person? Check.','You: Our tiny astronaut is going places!','GG: That moon is definitely made of cheese.','You: Five stars for the company.']},{title:'The long way home',item:'Sunset drive',lines:['You: Seat belts on. Nowhere to rush.','GG: This song! Turn it up a little.','You: Look at that sunset, GG.','GG: Let’s take the scenic route again.']}];
const courseNames=['Sunlit Meadows','Canal Gardens','Twilight Heights'];
let mode='ready',paused=false,level=1,score=0,balance=100,dayTime=0,sceneTime=0,sceneIndex=0,clock=0,last=0,notice=0;
let player,solids,coins,slimes,puddles,flags,checkpoint,camera=0,farthest=70,collected=0,hurt=0,jumpBuffer=0,coyote=0,particles=[];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function buildMap(){
  solids=[];coins=[];slimes=[];puddles=[];flags=[1850,3540,5200].map(x=>({x,active:false}));checkpoint=70;camera=0;farthest=70;collected=0;hurt=0;jumpBuffer=0;coyote=0;particles=[];
  const shift=(level-1)%3*18,gaps=[[820,980],[1570,1740],[2440,2620],[3270,3460],[4150,4330],[4930,5120],[5680,5850]].map(([a,b],i)=>[a+(i%2?shift:-shift),b+(i%2?shift:-shift)]);
  let edge=0;for(const [a,b] of [...gaps,[WORLD,WORLD]]){solids.push({x:edge,y:FLOOR,w:a-edge,h:150,kind:'ground'});edge=b;}
  for(const [x,y,w] of [[450,375,85],[1200,350,80],[2030,365,95],[2840,340,90],[3720,360,100],[4550,350,85],[5390,365,90],[6100,355,100]])solids.push({x:x+shift,y,w,h:FLOOR-y,kind:'crate'});
  for(let i=0;i<gaps.length;i++){
    const [a,b]=gaps[i];solids.push({x:a+25,y:328,w:b-a-50,h:18,kind:i%2?'moving':'ledge',base:a+25,phase:i});
    for(let k=0;k<4;k++)coins.push({x:a-20+k*(b-a+40)/3,y:290-Math.sin(k/3*Math.PI)*30,taken:false});
  }
  for(const [x,y] of [[530,275],[660,215],[1330,255],[2130,270],[2930,245],[3830,265],[4650,255],[5480,270],[6220,260]]){
    solids.push({x:x+shift,y,w:95,h:22,kind:'gift',used:false});
    for(let j=0;j<3;j++)coins.push({x:x+shift+18+j*28,y:y-35,taken:false});
  }
  for(let x=200;x<6400;x+=220){if(!gaps.some(([a,b])=>x>a-25&&x<b+25)&&!solids.some(s=>s.kind==='crate'&&x>s.x-30&&x<s.x+s.w+30))coins.push({x,y:382,taken:false});}
  for(const [a,b] of [[1030,1150],[1810,1970],[2650,2780],[3510,3660],[4380,4490],[5220,5340],[5920,6050]])slimes.push({x:a,y:FLOOR,base:a,range:b-a,phase:slimes.length*1.7,dead:false});
  puddles=[{x:2230,w:66},{x:3980,w:70},{x:6380,w:65}];
  player={x:70,y:FLOOR,vx:0,vy:0,grounded:true,riding:null};dayTime=0;keys.clear();
}
function reset(){level=1;score=0;balance=100;sceneTime=0;sceneIndex=0;clock=0;last=0;notice=0;paused=false;mode='ready';buildMap();ui.skip.hidden=true;ui.announcement.classList.remove('visible');refresh();}
function start(){reset();mode='run';ui.overlay.hidden=true;announce('World 1 · '+courseNames[0]);refresh();}
function showOverlay(title,message,label,pill){ui.title.innerHTML=title;ui.message.innerHTML=message;ui.play.textContent=label;ui.pill.textContent=pill;ui.overlay.hidden=false;}
function announce(value){ui.announcement.textContent=value;notice=2.3;}
function currentDate(){return level===1?0:1+(level-2)%3;}
function beginDate(){mode='date';sceneIndex=currentDate();sceneTime=0;player.vx=0;keys.clear();notice=0;ui.announcement.classList.remove('visible');ui.skip.hidden=false;score+=500;refresh();}
function finishDate(){if(mode!=='date'||paused)return;balance=100;score+=150;sceneTime=0;level++;mode='run';ui.skip.hidden=true;buildMap();announce('World '+level+' · Balance full!');refresh();}
function togglePause(){if(mode!=='run'&&mode!=='date')return;paused=!paused;keys.clear();jumpBuffer=0;last=0;if(paused)showOverlay('Take a breather.','Your adventure will be right here.','Resume','PAUSED');else ui.overlay.hidden=true;refresh();}
ui.play.onclick=()=>paused?togglePause():start();ui.pause.onclick=togglePause;ui.skip.onclick=finishDate;
const controls=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyE'];
function press(code){keys.add(code);if((code==='Space'||code==='ArrowUp')&&mode==='run'&&!paused)jumpBuffer=.14;}
function release(code){keys.delete(code);if((code==='Space'||code==='ArrowUp')&&player.vy<-300)player.vy*=.6;}
addEventListener('keydown',e=>{if(controls.includes(e.code)){e.preventDefault();if(!e.repeat)press(e.code);}if(e.code==='Enter'&&!e.repeat&&e.target.tagName!=='BUTTON'){if(paused)togglePause();else if(mode==='ready'||mode==='over')start();}if(e.code==='Escape'&&!e.repeat)togglePause();});
addEventListener('keyup',e=>release(e.code));
addEventListener('blur',()=>{keys.clear();if((mode==='run'||mode==='date')&&!paused)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='run'||mode==='date')&&!paused)togglePause();last=0;});
document.querySelectorAll('[data-key]').forEach(button=>{button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);press(button.dataset.key);};button.onpointerup=button.onpointercancel=button.onlostpointercapture=()=>release(button.dataset.key);});
function refresh(){
  ui.level.textContent=String(level).padStart(2,'0');ui.score.textContent=String(Math.floor(score)).padStart(5,'0');const hp=Math.ceil(balance);
  ui.health.textContent=hp+'%';ui.fill.style.width=balance+'%';ui.fill.classList.toggle('low',balance<30);ui.meter.setAttribute('aria-valuenow',hp);
  ui['clock-label'].textContent=mode==='date'?'SCENE LEFT':'RUN TIME';ui.time.textContent=(mode==='date'?Math.ceil(20-sceneTime):Math.floor(dayTime))+'s';
  const progress=Math.min(100,Math.floor((farthest-70)/(GOAL-70)*100));
  const objectives='<span class="objective">'+courseNames[(level-1)%3]+'</span><span class="objective">★ '+collected+' / '+coins.length+'</span><span class="objective">⚑ '+flags.filter(f=>f.active).length+' / 3</span><span class="objective route"><span style="width:'+progress+'%"></span></span><span class="objective">'+progress+'% → GG</span>';
  if(ui.objectives.innerHTML!==objectives)ui.objectives.innerHTML=objectives;
  ui.pause.textContent=paused?'▶ Resume':'Ⅱ Pause';ui.pause.disabled=mode==='ready'||mode==='over';ui.skip.disabled=paused;
  ui['scene-note'].textContent=mode==='date'?'BALANCE REFILLS AFTER YOUR TIME TOGETHER':'REWARD: '+dates[currentDate()].item.toUpperCase();
  let status='A/D to run · Hold jump for longer leaps · Stars are optional';
  if(mode==='ready')status='A BIG ADVENTURE FOR A LITTLE TIME TOGETHER';else if(mode==='over')status='TAKE A BREATH. TRY ANOTHER RUN.';else if(paused)status='PAUSED · RESUME WHEN YOU’RE READY';else if(mode==='date')status=dates[sceneIndex].lines[Math.min(3,Math.floor(sceneTime/5))];else if(player.x>GOAL-130)status='GG: You made it! Come here ♡';else if(player.x>4200)status='THE SKY GARDENS · Moving ledges, springs, one last stretch!';else if(player.x>2200)status='THE CANAL · Watch the gaps. Checkpoint flags save your progress.';
  if(ui.status.textContent!==status)ui.status.textContent=status;
}
function burst(x,y,color='#f3bd58'){for(let i=0;i<10;i++)particles.push({x,y,vx:Math.cos(i)*90,vy:-70+Math.sin(i)*90,life:.6,color});}
function damage(amount,respawn=false){
  if(hurt>0&&!respawn&&balance>0)return;balance=Math.max(0,balance-amount);hurt=1.5;burst(player.x,Math.min(player.y-25,450),'#eaa193');
  if(balance<=0){mode='over';keys.clear();showOverlay('A little stumble.<br><em>A fresh adventure.</em>','GG: Take your time. I’m cheering for you.<br>World '+level+' · '+Math.floor(score)+' points','Try again ↗','LET’S GO AGAIN');return;}
  if(respawn){player.x=checkpoint;player.y=FLOOR;player.vx=0;player.vy=0;player.grounded=true;player.riding=null;camera=clamp(player.x-260,0,WORLD-W);jumpBuffer=0;coyote=0;announce('Back to your checkpoint · Keep going!');}
  else{player.vy=-340;player.grounded=false;}
}
function overlap(s){return player.x+12>s.x&&player.x-12<s.x+s.w&&player.y>s.y&&player.y-54<s.y+s.h;}
function physics(dt){
  clock+=dt;dayTime+=dt;notice=Math.max(0,notice-dt);hurt=Math.max(0,hurt-dt);balance=Math.max(0,balance-dt*.18);
  if(balance<=0){damage(0);return;}
  for(const s of solids){s.dx=0;if(s.kind==='moving'){const old=s.x;s.x=s.base+Math.sin(clock*1.5+s.phase)*35;s.dx=s.x-old;}}
  if(player.riding&&player.grounded)player.x+=player.riding.dx;
  for(const s of slimes)if(!s.dead)s.x=s.base+(Math.sin(clock*(.95+Math.min(level,5)*.07)+s.phase)+1)*s.range/2;
  coyote=player.grounded?.1:Math.max(0,coyote-dt);jumpBuffer=Math.max(0,jumpBuffer-dt);
  const direction=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const target=direction*320,accel=(direction?2600:2200)*dt;player.vx+=clamp(target-player.vx,-accel,accel);
  if(jumpBuffer>0&&coyote>0){player.vy=-720;player.grounded=false;player.riding=null;jumpBuffer=0;coyote=0;burst(player.x,player.y,'#fff2cc');}
  player.x=clamp(player.x+player.vx*dt,15,WORLD-25);
  for(const s of solids)if(s.kind!=='ledge'&&s.kind!=='moving'&&overlap(s)){if(player.vx>0)player.x=s.x-12;else if(player.vx<0)player.x=s.x+s.w+12;player.vx=0;}
  const oldY=player.y;player.vy+=1850*dt;player.y+=player.vy*dt;player.grounded=false;player.riding=null;
  for(const s of solids){
    if(player.x+12<=s.x||player.x-12>=s.x+s.w)continue;
    if(player.vy>=0&&oldY<=s.y+.5&&player.y>=s.y){player.y=s.y;player.vy=0;player.grounded=true;player.riding=s;}
    else if(s.kind!=='ledge'&&s.kind!=='moving'&&player.vy<0&&oldY-54>=s.y+s.h&&player.y-54<=s.y+s.h){player.y=s.y+s.h+54;player.vy=10;if(s.kind==='gift'&&!s.used){s.used=true;score+=75;balance=Math.min(100,balance+5);burst(s.x+s.w/2,s.y);}}
  }
  if(player.y>H+100){damage(20,true);return;}
  for(const c of coins)if(!c.taken&&Math.abs(c.x-player.x)<25&&Math.abs(c.y-(player.y-30))<37){c.taken=true;collected++;score+=25;balance=Math.min(100,balance+1.5);burst(c.x,c.y);}
  for(const s of slimes)if(!s.dead&&Math.abs(player.x-s.x)<28&&player.y>s.y-26&&player.y-50<s.y){if(player.vy>0&&oldY<=s.y-18){s.dead=true;player.y=s.y-26;player.vy=-530;score+=50;burst(s.x,s.y-15,'#b7dd9f');}else damage(15);}
  if(mode!=='run')return;
  for(const p of puddles)if(player.x+8>p.x&&player.x-8<p.x+p.w&&player.y>FLOOR-8&&player.y<FLOOR+25)damage(15);
  if(mode!=='run')return;
  for(const x of [3080,5510])if(player.grounded&&Math.abs(player.x-x)<24){player.vy=-900;player.grounded=false;burst(x,FLOOR,'#d8c3f1');}
  for(const f of flags)if(!f.active&&player.x>=f.x&&player.y<=FLOOR+5){f.active=true;checkpoint=f.x+30;score+=100;balance=Math.min(100,balance+8);announce('Checkpoint! '+flags.filter(q=>q.active).length+' / 3');burst(f.x,FLOOR-70,'#f5cf69');}
  if(player.x>farthest){score+=(player.x-farthest)*.04;farthest=player.x;}
  camera+= (clamp(player.x-300,0,WORLD-W)-camera)*Math.min(1,dt*7);
  particles=particles.filter(p=>p.life>0);for(const p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=240*dt;}
  if(player.x>=GOAL&&player.grounded)beginDate();
}
function update(dt){
  if(paused||document.hidden||mode==='ready'||mode==='over')return;
  if(mode==='date'){clock+=dt;sceneTime=Math.min(20,sceneTime+dt);if(sceneTime>=20)finishDate();}else{let remaining=dt;while(remaining>0&&mode==='run'){const step=Math.min(remaining,1/120);physics(step);remaining-=step;}}
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
  const walk=mode==='run'&&!female&&player.vx?Math.sin(clock*14)*7:0;
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
function star(x,y,r=10,color='#f5c24e'){
  ctx.fillStyle=color;ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,k=i%2?r*.45:r;const px=x+Math.cos(a)*k,py=y+Math.sin(a)*k;if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}ctx.closePath();ctx.fill();
}
function worldDraw(){
  const zone=Math.floor(player.x/2250),theme=(zone+level-1)%3;
  const sky=['#bfe7ed','#cddedc','#e9c3c6'][theme],hill=['#90bd9b','#92b8a6','#aba5b9'][theme];
  box(0,0,W,H,sky);oval(805-camera*.025,80,40,40,'#fff0bc');
  for(let i=-1;i<8;i++){let x=i*250-(camera*.16)%250;oval(x,95+(i%3)*22,49,17,'#ffffffa0');oval(x+30,85+(i%3)*22,31,23,'#ffffffa0');}
  for(let i=-1;i<7;i++){const x=i*310-(camera*.3)%310;oval(x,430,230,180,hill);oval(x+110,440,180,125,'#b6cd9e');}
  ctx.save();ctx.translate(-Math.floor(camera),0);
  // Signs and distinct scenery mark the three parts of the long route.
  for(let x=120;x<WORLD;x+=420){
    if(x<camera-100||x>camera+W+100)continue;
    if(x<2200)tree(x,430);
    else if(x<4400){
      box(x-6,310,12,120,'#7d9d94',4);box(x-17,294,34,27,'#f4e5ae',5);box(x-21,289,42,7,'#719286',3);
      box(x+45,350,90,65,'#adc4b6',38);box(x+55,360,70,55,'#c6d8cc',30);text('✿',x+90,349,22,'#d98e8b');
    }else{
      box(x-42,340,84,90,'#b1adb9',5);box(x-49,333,98,12,'#ece3d3',4);
      for(const dx of [-23,0,23]){box(x+dx-6,358,12,22,'#eadab5',4);box(x+dx-6,393,12,22,'#d9d1ce',4);}
      box(x-21,311,42,22,'#c58c7d',5);for(const dx of [-10,0,10]){line(x+dx,315,x+dx,298,'#819c7d',2);text('✿',x+dx,298,17,dx?'#f7dfa2':'#e8adac');}
    }
  }
  for(const [x,label] of [[180,'MEADOW RUN →'],[2200,'THE CANAL →'],[4410,'SKY GARDENS →']]){box(x-5,330,7,100,'#a17d5c');box(x-75,318,150,32,'#fff2cd',6);text(label,x,339,12);}
  for(const s of solids){
    if(s.x+s.w<camera-50||s.x>camera+W+50)continue;
    if(s.kind==='ground'){
      box(s.x,s.y,s.w,s.h,s.x>4300?'#ad9b9c':s.x>2200?'#b8b39c':'#c4956b');box(s.x,s.y,s.w,14,s.x>4300?'#b895a6':'#6f9b65',4);box(s.x,s.y+14,s.w,8,'#9ebe79');
      for(let x=s.x+18;x<s.x+s.w;x+=44){if(x<camera-20||x>camera+W+20)continue;box(x,s.y+32,9,5,'#b2825d',2);box(x+16,s.y+56,6,5,'#e0b687',2);}
    }else if(s.kind==='crate'||s.kind==='gift'){
      box(s.x,s.y,s.w,s.h,s.kind==='gift'?(s.used?'#b69b76':'#e6b65b'):'#c8976d',5);
      line(s.x+5,s.y+5,s.x+s.w-5,s.y+5,'#fff1c0',2);
      if(s.kind==='gift')text(s.used?'✓':'★',s.x+s.w/2,s.y+16,15,s.used?'#806e55':'#fff9df');
      else{line(s.x+8,s.y+10,s.x+s.w-8,s.y+s.h-10,'#aa7755',3);line(s.x+s.w-8,s.y+10,s.x+8,s.y+s.h-10,'#aa7755',3);}
    }else{box(s.x,s.y,s.w,s.h,s.kind==='moving'?'#a28bbb':'#7aa38b',6);box(s.x+3,s.y+2,s.w-6,4,'#e4efc5',2);if(s.kind==='moving')text('↔',s.x+s.w/2,s.y+14,13,'#fff5de');}
  }
  // Water below gaps makes the edges easy to read.
  for(let i=0;i<solids.length-1;i++){const a=solids[i],b=solids[i+1];if(a.kind==='ground'&&b.kind==='ground'&&b.x>a.x+a.w){const x=a.x+a.w,w=b.x-x;box(x,487,w,13,'#79b6c0');for(let q=0;q<w;q+=24)line(x+q,488+Math.sin(clock*3+q)*2,x+q+12,488,'#cae7db',2);}}
  for(const c of coins)if(!c.taken&&c.x>camera-30&&c.x<camera+W+30){oval(c.x,c.y+Math.sin(clock*4+c.x)*3,12,12,'#fff4c470');star(c.x,c.y+Math.sin(clock*4+c.x)*3,10);}
  for(const p of puddles){oval(p.x+p.w/2,FLOOR-2,p.w/2,7,'#80b9ca');text('~',p.x+p.w/2,FLOOR-3,16,'#e1f1e9');}
  for(const x of [3080,5510]){box(x-23,FLOOR-9,46,9,'#b39bc6',4);text('↟',x,FLOOR-12,22,'#84669d');}
  for(const s of slimes)if(!s.dead&&s.x>camera-40&&s.x<camera+W+40){oval(s.x,s.y-13,21,16+Math.sin(clock*6)*2,'#b4ce88');oval(s.x-6,s.y-17,3,4,'#3c5c44');oval(s.x+7,s.y-17,3,4,'#3c5c44');line(s.x-4,s.y-8,s.x+4,s.y-8,'#749563',2);}
  for(const f of flags){line(f.x,FLOOR,f.x,300,'#f6edcf',5);box(f.x+2,302,55,34,f.active?'#cc837f':'#8ca991',3);text(f.active?'✓':'⚑',f.x+26,325,20,'#fff8de');text('CHECKPOINT',f.x+20,282,10,'#44614d');}
  box(GOAL-80,330,180,100,'#f2dfb2',12);box(GOAL-95,319,210,15,'#c58b7f',6);box(GOAL-54,343,125,26,'#fff7e4',5);text('YOU MADE IT ♡',GOAL+8,361,12);person(GOAL+35,FLOOR,true,1.12,false,-1);text('GG',GOAL+35,319,19,'#9b5d63');
  if(hurt<=0||Math.floor(hurt*12)%2===0)person(player.x,player.y,false,.92,false,player.vx<-5?-1:1);
  for(const p of particles)oval(p.x,p.y,3,3,p.color);
  ctx.restore();
  if(mode==='run'){box(16,17,148,25,'#fff9e5dd',12);text(['01 · MEADOWS','02 · THE CANAL','03 · SKY GARDENS'][Math.min(2,zone)],90,34,11);}
}
function draw(){ctx.clearRect(0,0,W,H);if(mode==='date')dateScene();else worldDraw();}
function frame(now){const dt=last?Math.min((now-last)/1000,.05):0;last=now;update(dt);draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
