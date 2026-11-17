(function(root){
'use strict';
const Base=typeof module!=='undefined'?require('./engine.js'):root.Mining;
const G={...Base},clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const foodGroups=[
 {kind:'restore',names:['ขนมปัง','กล้วย','ข้าวปั้น','มันอบ','ชุดอาหารนักขุด'],icons:['🍞','🍌','🍙','🥔','🍱']},
 {kind:'yield',names:['แซนด์วิชไข่','ข้าวผัด','สเต๊กเห็ด','แกงกะหรี่','มื้อพลังขุด'],icons:['🥪','🍚','🍄','🍛','🥩']},
 {kind:'luck',names:['น้ำผลไม้','เยลลี่องุ่น','พายเบอร์รี','เค้กมงคล','ชาวิเศษ'],icons:['🧃','🍇','🥧','🍰','🍵']},
 {kind:'energy',names:['ซุปผัก','สลัด','ปลาย่าง','ซุปไก่','สตูว์พลังงาน'],icons:['🥣','🥗','🐟','🍗','🍲']},
 {kind:'xp',names:['นมอุ่น','คุกกี้','แพนเค้ก','พุดดิ้ง','ข้าวกล่องนักสำรวจ'],icons:['🥛','🍪','🥞','🍮','🍱']},
 {kind:'shield',names:['น้ำสมุนไพร','ซุปขิง','น้ำผึ้งมะนาว','ชาขิง','หม้อไฟต้านภัย'],icons:['🍵','🥣','🍯','🫖','🍲']}
];
const foods=foodGroups.flatMap((g,group)=>g.names.map((name,i)=>{
 const rank=i+1,value=g.kind==='shield'?40+rank*10:rank*10;
 const effects={yield:`เพิ่มจำนวนแร่ ${value}%`,luck:`เพิ่มโอกาสเพชร ${rank}%`,energy:`ลดกำลังที่ใช้ขุด ${value}%`,xp:`เพิ่ม EXP ${value}%`,shield:`ลดความรุนแรงดีบัฟเหมือง ${value}%`};
 return {id:group*5+i,name,icon:g.icons[i],kind:g.kind,value:g.kind==='luck'?rank:value,restore:20+rank*15,uses:g.kind==='restore'?0:5+rank*2,price:8+rank*7+group*12,
 description:g.kind==='restore'?`ฟื้นกำลัง ${20+rank*15}`:`ฟื้นกำลัง ${20+rank*15} • ${effects[g.kind]} นาน ${5+rank*2} ครั้งขุด`};
}));
const debuffNames=['อากาศเบาบาง','ชั้นหินแข็ง','ฝุ่นบดบัง','แร่เปราะ','แรงสั่นสะเทือน'];
const debuffKinds=['energy','wear','luck','yield','speed'];
const debuffDescriptions=(kind,value)=>({energy:`ใช้กำลังเพิ่ม ${value}%`,wear:`มีโอกาส ${value}% เสียความทนทานเพิ่ม 1`,luck:`ลดโอกาสเพชรสัมพัทธ์ ${value}%`,yield:`ลดจำนวนแร่ ${value}%`,speed:`วงบีบเร็วขึ้น ${value}%`})[kind];
const mines=Base.mines.map((m,i)=>{
 const rank=Math.floor(i/5)+1,kind=debuffKinds[i%5],value=4+rank*3;
 const diamondMines=[15,18,19,25,42,47,48,49];
 const extras=i===28?['rhodochrosite']:[];
 const drops=[...new Set(['stone',...m.featured,...extras,...(diamondMines.includes(i)?['diamond']:[])])];
 return {...m,drops,unlockPrice:i===0?0:250+i*i*125,debuff:{kind,value,name:debuffNames[i%5]+' '+rank,description:debuffDescriptions(kind,value)}};
});
const types=Base.types.map((t,i)=>({...t,energyCost:2+i}));
const maxEnergy=s=>100+(s.player.level-1)*12;
const xpNeeded=level=>60+(level-1)*30;
function buffValue(s,kind){return (s.buffs.find(b=>b.kind===kind)||{}).value||0;}
function debuff(s,sector=s.sector){const d=mines[sector].debuff;return {...d,value:d.value*(1-buffValue(s,'shield')/100)};}
function energyCost(s,t=G.tool(s),sector=s.sector){let d=debuff(s,sector);return Math.max(1,Math.ceil(types[t.type].energyCost*(1+(d.kind==='energy'?d.value/100:0))*(1-buffValue(s,'energy')/100)));}
function timingFactor(s,sector=s.sector){let d=debuff(s,sector);return d.kind==='speed'?1-d.value/100:1;}
function score(progress){if(!Number.isFinite(progress)||progress<0||progress>=1)return 0;const distance=Math.abs((150-110*progress)-65);if(distance<=1)return 100;return clamp(Math.floor(100*(1-distance/65)),0,99);}
const rockMax=sector=>30+sector*12;
const freshRocks=()=>mines.map((_,i)=>rockMax(i));
function fresh(){const s=Base.fresh();return {...s,version:2,rockHealth:freshRocks(),player:{level:1,xp:0,energy:100,recoveredAt:Date.now()},foods:Object.fromEntries(foods.map(f=>[f.id,f.id===0?3:0])),buffs:[],unlocked:[0],pending:null};}
function migrate(s){
 if(!s||![1,2].includes(s.version))return s;
 if(s.version===2){if(!valid(s))return s;let copy=JSON.parse(JSON.stringify(s));copy.rockHealth??=freshRocks();copy.pending=null;recover(copy);return copy;}
 const old=Base.migrate(s);if(!Base.valid(old))return s;
 const next={...fresh(),...old,version:2,rockHealth:freshRocks(),player:{level:1,xp:0,energy:100,recoveredAt:Date.now()},foods:Object.fromEntries(foods.map(f=>[f.id,f.id===0?3:0])),buffs:[],unlocked:[...new Set([0,old.sector])],pending:null};
 return next;
}
function valid(s){
 if(!s||s.version!==2||!Base.valid({...s,version:1})||!s.player)return false;
 if(s.rockHealth!==undefined&&(!Array.isArray(s.rockHealth)||s.rockHealth.length!==mines.length||!s.rockHealth.every((hp,i)=>Number.isSafeInteger(hp)&&hp>0&&hp<=rockMax(i))))return false;
 const p=s.player;
 if(!Number.isInteger(p.level)||p.level<1||p.level>10000||!Number.isSafeInteger(p.xp)||p.xp<0||p.xp>=xpNeeded(p.level)||!Number.isFinite(p.energy)||p.energy<0||p.energy>maxEnergy(s)||!Number.isFinite(p.recoveredAt)||p.recoveredAt<0)return false;
 if(!s.foods||!foods.every(f=>Number.isSafeInteger(s.foods[f.id])&&s.foods[f.id]>=0&&s.foods[f.id]<=1e6))return false;
 if(!Array.isArray(s.unlocked)||!s.unlocked.includes(0)||!s.unlocked.includes(s.sector)||new Set(s.unlocked).size!==s.unlocked.length||!s.unlocked.every(i=>Number.isInteger(i)&&i>=0&&i<mines.length))return false;
 if(!Array.isArray(s.buffs)||s.buffs.length>5||new Set(s.buffs.map(b=>b.kind)).size!==s.buffs.length||!s.buffs.every(b=>foods.some(f=>f.id===b.foodId&&f.kind===b.kind&&f.kind!=='restore'&&f.value===b.value&&Number.isInteger(b.remaining)&&b.remaining>0&&b.remaining<=f.uses)))return false;
 if(s.pending!==null){const q=s.pending;if(!q||q.sector!==s.sector||!Number.isSafeInteger(q.toolId)||q.toolId!==s.equipped||!Number.isFinite(q.cost)||q.cost<1)return false;}
 return true;
}
function recover(s,now=Date.now()){
 const p=s.player;if(now<p.recoveredAt){p.recoveredAt=now;return false;}
 if(p.energy>=maxEnergy(s)){p.recoveredAt=now;return false;}
 const ticks=Math.floor((now-p.recoveredAt)/30000);if(ticks<=0)return false;
 const before=p.energy;p.energy=Math.min(maxEnergy(s),p.energy+ticks);p.recoveredAt+=ticks*30000;return p.energy!==before;
}
function addXp(s,amount){let p=s.player,levels=0;p.xp+=amount;while(p.level<10000&&p.xp>=xpNeeded(p.level)){p.xp-=xpNeeded(p.level);p.level++;p.energy=Math.min(maxEnergy(s),p.energy+12);levels++;}if(p.level===10000)p.xp=Math.min(p.xp,xpNeeded(p.level)-1);return levels;}
function startMining(s,sector=s.sector,now=Date.now()){
 recover(s,now);const t=G.tool(s);
 if(s.pending||!mines[sector]||sector!==s.sector||!s.unlocked.includes(sector)||t.dur<=0)return {ok:false,message:'เหมืองยังล็อก หรืออีเตอร์ใช้ไม่ได้'};
 const cost=energyCost(s,t,sector);
 if(cost>maxEnergy(s))return {ok:false,message:`ต้องการกำลัง ${cost} มากกว่ากำลังสูงสุด • เพิ่มเลเวล ใช้อาหารลดกำลัง หรือเปลี่ยนอีเตอร์`};
 if(s.player.energy<cost)return {ok:false,message:`กำลังไม่พอ ต้องการ ${cost} • พักให้กำลังฟื้น หรือกินอาหาร`};
 s.player.energy-=cost;s.pending={sector,toolId:t.id,cost};return {ok:true,cost};
}
function dropRates(s,sector=s.sector,quality=100){
 const location=mines[sector],pool=Base.ores.filter(o=>location.drops.includes(o.id));
 const q=clamp(Number(quality)||0,0,100)/100;if(!q)return pool.map(o=>({ore:o,chance:0}));
 const e=types[G.tool(s).type].effect,d=debuff(s,sector);
 let diamond=.02+.23*q*q+(e.kind==='diamond'?e.value/100:0)+buffValue(s,'luck')/100;
 if(d.kind==='luck')diamond*=1-d.value/100;diamond=location.drops.includes('diamond')?clamp(diamond,0,.75):0;
 const weights=pool.map(o=>o.id==='diamond'?0:o.weight*(o.price>=80?1+sector*.04:1)*(location.featured.includes(o.id)?4:1)*(e.kind===o.category?e.value:1)),total=weights.reduce((a,b)=>a+b,0);
 return pool.map((ore,i)=>({ore,chance:ore.id==='diamond'?diamond:(1-diamond)*weights[i]/total}));
}
function roll(rates,rng){let r=rng();for(const entry of rates){r-=entry.chance;if(r<0)return entry.ore;}return rates[rates.length-1].ore;}
function mine(s,quality,sector=s.sector,rng=Math.random){
 const pending=s.pending,t=G.tool(s);if(!pending||pending.sector!==sector||pending.toolId!==t.id)return null;
 const percent=typeof quality==='boolean'?(quality?100:0):clamp(Math.round(Number(quality)||0),0,100),e=types[t.type].effect,d=debuff(s,sector),critical=percent===100;
 const rates=dropRates(s,sector,percent),xpBoost=buffValue(s,'xp');s.pending=null;t.dur=Math.max(0,t.dur-1);s.hits++;if(critical)s.crits++;
 let wearExtra=false;if(d.kind==='wear'&&rng()<d.value/100){t.dur=Math.max(0,t.dur-1);wearExtra=true;}
 let result={ore:null,amount:0,quality:percent,critical,bonus:null,triggered:false,effect:e,wearExtra};
 if(percent>0){
  const ore=roll(rates,rng);let multiplier=percent/100*(1+buffValue(s,'yield')/100)*(d.kind==='yield'?1-d.value/100:1);
  let amount=Math.max(1,Math.ceil((types[t.type].power+Math.floor((t.level-1)/2))*multiplier));
  if(e.kind==='extra'&&rng()<e.value/100){amount+=Math.max(1,Math.floor(amount*.5));result.triggered=true;}
  if(e.kind==='durability'&&rng()<e.value/100){t.dur=Math.min(G.maxDur(t),t.dur+1);result.triggered=true;}
  s.rockHealth??=freshRocks();
  result.rockDamage=Math.max(1,Math.ceil((types[t.type].power+Math.floor((t.level-1)/2))*percent/100));
  s.rockHealth[sector]=Math.max(0,s.rockHealth[sector]-result.rockDamage);
  result.rockBroken=s.rockHealth[sector]===0;result.unlockedMine=null;
  if(result.rockBroken){s.rockHealth[sector]=rockMax(sector);if(sector+1<mines.length&&!s.unlocked.includes(sector+1)){s.unlocked.push(sector+1);result.unlockedMine=sector+1;}}
  s.ores[ore.id]+=amount;result.ore=ore;result.amount=amount;
  if(e.kind==='echo'&&rng()<e.value/100){result.bonus=roll(rates,rng);s.ores[result.bonus.id]++;result.triggered=true;}
 }
 result.xp=Math.ceil((percent>0?5+percent*.2:2)*(1+xpBoost/100));result.levels=addXp(s,result.xp);
 s.buffs=s.buffs.map(b=>({...b,remaining:b.remaining-1})).filter(b=>b.remaining>0);
 return result;
}
function action(s,name,id){
 if(s.pending)return false;
 if(name==='unlock'){
  const m=mines[id];if(!m||s.unlocked.includes(id)||s.money<m.unlockPrice)return false;
  s.money-=m.unlockPrice;s.unlocked.push(id);return true;
 }
 if(name==='travel'){
  if(!s.unlocked.includes(id))return false;s.sector=id;return true;
 }
 if(name==='buyFood'){
  const f=foods[id];if(!f||s.foods[id]>=1e6||s.money<f.price)return false;
  s.money-=f.price;s.foods[id]++;return true;
 }
 if(name==='eat'){
  const f=foods[id];if(!f||s.foods[id]<=0)return false;recover(s);
  if(f.kind==='restore'&&s.player.energy>=maxEnergy(s))return false;
  s.foods[id]--;s.player.energy=Math.min(maxEnergy(s),s.player.energy+f.restore);
  if(f.kind!=='restore'){s.buffs=s.buffs.filter(b=>b.kind!==f.kind);s.buffs.push({foodId:f.id,kind:f.kind,value:f.value,remaining:f.uses});}return true;
 }
 return Base.action(s,name,id);
}
Object.assign(G,{rockMax,types,mines,foods,fresh,migrate,valid,recover,maxEnergy,xpNeeded,buffValue,debuff,energyCost,timingFactor,score,startMining,dropRates,mine,action,addXp});
if(typeof module!=='undefined')module.exports=G;else root.Mining=G;
})(globalThis);
