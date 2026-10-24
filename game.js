'use strict';
const canvas = document.getElementById('canvas'), ctx = canvas.getContext('2d');
const ui = Object.fromEntries(['level','score','lives','time','overlay','title','message','play','pill','hint','status','announcement'].map(id => [id,document.getElementById(id)]));
const W=960,H=500,FLOOR=416, keys=new Set();
let state='ready',player,shots,enemies,level,elapsed,score,lives,invincible,attack,notice,last=0,paused=false;
function reset(){
  player={x:480,y:FLOOR,vx:0,vy:0,grounded:true}; shots=[]; enemies=[];
  level=1;elapsed=0;score=0;lives=3;invincible=0;attack=1.2;notice=0;paused=false;shotTurn=0;keys.clear();
  makeEnemies();updateHUD();
}
function makeEnemies(){
  enemies=Array.from({length:Math.min(level,4)},(_,i)=>({x:i%2===0?54:906,y:FLOOR-(i>=2?85:0),side:i%2===0?1:-1}));
}
function overlay(title,message,label,pill){
  ui.title.innerHTML=title;ui.message.innerHTML=message;ui.play.innerHTML=label+' <span>↗</span>';ui.pill.textContent=pill;ui.overlay.hidden=false;
}
function start(){reset();state='playing';ui.overlay.hidden=true;ui.hint.hidden=true;setPauseLabel();}
function setPauseLabel(){document.getElementById('soundless').innerHTML=paused?'▶ <span>Resume</span>':'Ⅱ <span>Pause</span>';}
function pause(){
  if(state!=='playing')return;
  paused=!paused;keys.clear();setPauseLabel();
  if(paused)overlay('Take a breather.','Your admirers can wait.','Resume','PAUSED');else ui.overlay.hidden=true;
}
ui.play.onclick=()=>{if(paused)pause();else start();};
document.getElementById('soundless').onclick=pause;
const controls=['ArrowLeft','ArrowRight','ArrowUp','Space','KeyA','KeyD','KeyW'];
addEventListener('keydown',e=>{
  if(controls.includes(e.code)){e.preventDefault();if(!e.repeat)keys.add(e.code);}
  if(e.code==='Enter'&&!e.repeat){if(state!=='playing')start();else if(paused)pause();}
  if(e.code==='Escape'&&!e.repeat)pause();
});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if(state==='playing'&&!paused)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing'&&!paused)pause();last=0;});
document.querySelectorAll('[data-key]').forEach(button=>{
  button.onpointerdown=e=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);};
  button.onpointerup=button.onpointercancel=()=>keys.delete(button.dataset.key);
});
function updateHUD(){
  ui.level.textContent=String(level).padStart(2,'0');ui.score.textContent=String(Math.floor(score)).padStart(5,'0');
  ui.lives.textContent='♥ '.repeat(lives)+'♡ '.repeat(3-lives);ui.time.innerHTML=Math.ceil(20-elapsed)+'<span>s</span>';
  ui.status.textContent=state==='over'?'THAT WAS CHARMING':state==='ready'?'READY WHEN YOU ARE':paused?'TAKING A BREATHER':'STAY CHARMING. KEEP MOVING.';
}
function update(dt){
  if(state!=='playing'||paused||document.hidden){updateHUD();return;}
  elapsed+=dt;score+=dt*10;invincible=Math.max(0,invincible-dt);notice=Math.max(0,notice-dt);
  if(elapsed>=20){elapsed-=20;level++;score+=200;makeEnemies();shots=[];attack=1.5;notice=2;ui.announcement.textContent='Level '+level+' · '+enemies.length+' admirer'+(enemies.length>1?'s':'');}
  ui.announcement.classList.toggle('visible',notice>0);
  const direction=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  player.vx=direction*310;player.x=Math.max(115,Math.min(W-115,player.x+player.vx*dt));
  if(player.grounded&&(keys.has('Space')||keys.has('ArrowUp')||keys.has('KeyW'))){player.vy=-650;player.grounded=false;keys.delete('Space');keys.delete('ArrowUp');keys.delete('KeyW');}
  player.vy+=1800*dt;player.y+=player.vy*dt;
  if(player.y>=FLOOR){player.y=FLOOR;player.vy=0;player.grounded=true;}
  attack-=dt;
  if(attack<=0){
    // One shared attack clock preserves space between volleys, even with four admirers.
    const enemy=enemies[shotTurn++%enemies.length];
    shots.push({x:enemy.x+enemy.side*25,y:FLOOR-22-Math.random()*16,vx:enemy.side*Math.min(370,190+(level-1)*18),icon:['💗','🌷','💌'][Math.floor(Math.random()*3)],dead:false});
    attack=Math.max(.78,1.65-(level-1)*.1)+Math.random()*.22;
  }
  for(const shot of shots){
    shot.x+=shot.vx*dt;
    if(!invincible&&Math.abs(shot.x-player.x)<21&&shot.y+9>player.y-53&&shot.y-9<player.y-5){
      shot.dead=true;lives--;invincible=1;
      if(!lives){state='over';keys.clear();overlay('Too much<br><em>of a good thing.</em>','You scored <b>'+Math.floor(score)+'</b> points and reached level <b>'+level+'</b>.<br>Ready to play it cool again?','Play again','CHARM OVERLOAD');ui.hint.hidden=true;break;}
    }
  }
  shots=shots.filter(s=>!s.dead&&s.x>-40&&s.x<W+40);updateHUD();
}
let shotTurn=0;
function ellipse(x,y,rx,ry,color){ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();}
function line(x,y,x2,y2,color,width=4){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x2,y2);ctx.stroke();}
function person(x,y,female=false,side=1){
  ctx.save();ctx.translate(x,y);ctx.scale(side,1);
  ellipse(0,1,22,5,'#344e3c18');
  const stride=!female&&state==='playing'&&!paused&&player.vx?Math.sin(performance.now()/85)*7:0;
  line(-7,-22,-9-stride,-3,'#344858',7);line(7,-22,9+stride,-3,'#344858',7);
  line(-10-stride,-2,-4-stride,-2,'#fff9e9',5);line(8+stride,-2,14+stride,-2,'#fff9e9',5);
  if(female){ellipse(0,-58,15,20,'#654435');ctx.fillStyle='#db8f83';ctx.beginPath();ctx.moveTo(-10,-40);ctx.lineTo(11,-40);ctx.lineTo(18,-19);ctx.lineTo(-17,-19);ctx.fill();}
  else {ctx.fillStyle='#789b72';ctx.beginPath();ctx.roundRect(-13,-45,26,26,6);ctx.fill();}
  line(-11,-39,-17,-25,'#eab68c',6);line(11,-39,20,female?-38:-28,'#eab68c',6);
  ellipse(0,-58,12,14,'#f0c39a');
  ctx.fillStyle=female?'#654435':'#3e4136';ctx.beginPath();ctx.arc(-1,-64,12,Math.PI,Math.PI*2);ctx.fill();
  if(!female){line(-10,-68,2,-72,'#3e4136',5);line(0,-70,9,-67,'#3e4136',5);}
  ellipse(4,-59,1.3,1.6,'#3d4339');line(3,-52,7,-53,'#a56c54',1.4);
  if(female){ellipse(8,-55,3,1.6,'#e69a87');ellipse(-10,-68,4,3,'#f3d08b');}
  ctx.restore();
}
function draw(){
  ctx.clearRect(0,0,W,H);ctx.fillStyle='#eaf0df';ctx.fillRect(0,0,W,H);
  // A soft little park, all drawn locally.
  ellipse(120,420,210,165,'#e0e8cf');ellipse(850,430,225,177,'#e1e9d1');
  ctx.strokeStyle='#d3ddc5';ctx.lineWidth=1;
  for(let x=24;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,358);ctx.lineTo(x,414);ctx.stroke();}
  line(0,369,W,369,'#d3ddc5',2);
  ctx.fillStyle='#d7e1c4';ctx.fillRect(0,FLOOR,W,H-FLOOR);ctx.fillStyle='#b0c291';ctx.fillRect(0,FLOOR,W,3);
  for(let x=16;x<W;x+=37){line(x,449,x+9,449,'#c4d2af',2);}
  ctx.font='16px Georgia';ctx.fillStyle='#a7b994';ctx.fillText('✦',180,120);ctx.fillText('♡',765,150);ctx.fillText('✧',690,80);ctx.fillText('♡',260,220);
  for(const e of enemies){if(e.y<FLOOR){ctx.fillStyle='#c3d0ae';ctx.fillRect(e.x-30,e.y+4,60,8);}person(e.x,e.y,true,e.side);}
  if(!invincible||Math.floor(invincible*14)%2===0)person(player.x,player.y,false,player.vx<0?-1:1);
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='28px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
  for(const s of shots)ctx.fillText(s.icon,s.x,s.y);
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  if(state==='ready'){ctx.fillStyle='#779364';ctx.font='bold 9px Arial';ctx.fillText('YOUR ADMIRER',19,FLOOR+29);}
}
function frame(now){const dt=last?Math.min((now-last)/1000,.033):0;last=now;update(dt);draw();requestAnimationFrame(frame);}
reset();requestAnimationFrame(frame);
