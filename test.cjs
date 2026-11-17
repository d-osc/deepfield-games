const assert=require('node:assert/strict'),M=require('./engine.js');
// Wrong keys, bad timing, timeout and cancellation all resolve as a miss.
for(const reason of ['wrong key','bad timing','timeout','cancel']){
 let missed=M.fresh(),inventory=JSON.stringify(missed.ores),rolls=0;
 let result=M.mine(missed,false,0,()=>{rolls++;return 0;});
 assert.equal(result.ore,null,reason);assert.equal(result.amount,0,reason);
 assert.equal(JSON.stringify(missed.ores),inventory,reason);assert.equal(rolls,0,reason);
 assert.equal(missed.tools[0].dur,39);assert.equal(missed.hits,1);assert.equal(missed.crits,0);
}
let s=M.fresh();assert(M.valid(s));assert.equal(M.mine(s,true,0,()=>0).ore.id,'diamond');assert.equal(s.crits,1);assert.equal(s.tools[0].dur,39);
s.tools[0].dur=1;M.mine(s,false,0,()=>0);assert.equal(M.mine(s,true),null);assert.equal(M.action(s,'upgrade',1),false);
s.ores.stone=100;assert(M.action(s,'repair',1));assert.equal(s.tools[0].dur,40);
s.money=10000;s.ores.copper=100;s.ores.iron=100;assert(M.action(s,'upgrade',1));assert.equal(s.tools[0].level,2);assert.equal(s.tools[0].dur,50);assert.equal(s.money,9850);assert.equal(s.ores.copper,97);
assert.equal(M.action(s,'sellTool',1),false);assert(M.action(s,'buy',2));let id=s.tools[1].id;assert(M.action(s,'equip',id));assert(M.action(s,'sellTool',id));assert.equal(s.equipped,1);assert(M.valid(s));
s.money=0;s.tools[0].dur=0;let before=JSON.stringify(s);assert.equal(M.action(s,'repair',1),false);assert.equal(JSON.stringify(s),before);s.ores.diamond=2;assert(M.action(s,'sellOre','diamond'));assert.equal(s.money,640);assert.equal(s.ores.diamond,0);assert(M.action(s,'repair',1));
assert(!M.valid({...s,money:-1}));assert(!M.valid({...s,nextId:1}));assert(!M.valid({...s,tools:[{id:1,type:M.types.length,level:1,dur:10}]}));
for(let i=0;i<100;i++){let st=M.fresh();for(let j=0;j<40;j++)M.mine(st,j%2===0,2);assert(M.valid(st));assert.equal(st.hits,40);assert.equal(st.crits,20);assert.equal(M.mine(st,false),null);}
// Every new resource is reachable, tradeable and bundled as a local image.
const fs=require('node:fs');
assert.equal(M.ores.length,80);
for(const sector of [0,1,2]){
 const seen=new Set();let diamonds=0;
 for(let i=0;i<10000;i++){let st=M.fresh(),loot=M.mine(st,true,sector,()=>i/10000);seen.add(loot.ore.id);if(loot.ore.id==='diamond')diamonds++;}
 assert.equal(seen.size,80);assert.equal(diamonds,2500);
}
for(const ore of M.ores){let st=M.fresh();st.ores[ore.id]=3;assert(M.action(st,'sellOre',ore.id));assert.equal(st.money,180+ore.price*3);assert.equal(st.ores[ore.id],0);assert(fs.existsSync('assets/ores/'+ore.icon));}
let old=M.fresh();for(const o of M.ores.slice(5))delete old.ores[o.id];old.money=777;old.ores.iron=12;old.tools[0].level=2;assert(!M.valid(old));let migrated=M.migrate(old);assert(M.valid(migrated));assert.equal(migrated.money,777);assert.equal(migrated.ores.iron,12);assert.equal(migrated.tools[0].level,2);assert.equal(migrated.ores.gold,0);assert(!('gold' in old.ores));assert.deepEqual(M.migrate(migrated),migrated);
let corrupt=M.fresh();corrupt.ores.gold=-1;assert(!M.valid(M.migrate(corrupt)));delete old.ores.stone;assert(!M.valid(M.migrate(old)));
assert.equal(M.types.length,100);assert.equal(new Set(M.types.map(t=>t.name)).size,100);
// Exercise the entire lifecycle for each model, including the new high-tier tools.
for(let i=0;i<M.types.length;i++){
 let st=M.fresh(),type=M.types[i];st.money=10000000;st.ores.stone=10000;st.ores.copper=10000;st.ores.iron=10000;
 assert(M.action(st,'buy',i));let t=st.tools.at(-1);assert.equal(t.type,i);assert.equal(t.dur,type.dur);
 assert(M.action(st,'equip',t.id));let rolls=0,loot=M.mine(st,true,0,()=>rolls++===0?0:.999);assert.equal(loot.amount,type.power);assert.equal(t.dur,type.dur-1);
 t.dur=0;assert.equal(M.mine(st,true),null);assert(M.action(st,'repair',t.id));assert.equal(t.dur,type.dur);
 for(let level=2;level<=10;level++){assert(M.action(st,'upgrade',t.id));assert.equal(t.level,level);}
 assert.equal(M.action(st,'upgrade',t.id),false);assert.equal(M.maxDur(t),type.dur+90);assert(M.valid(st));assert(M.valid(JSON.parse(JSON.stringify(st))));
 const money=st.money;assert(M.action(st,'sellTool',t.id));assert.equal(st.money-money,Math.floor(type.price*.4));assert.equal(st.equipped,1);
}
let collection=M.fresh();collection.money=1e10;for(let i=1;i<M.types.length;i++)assert(M.action(collection,'buy',i));assert.equal(collection.tools.length,100);assert.equal(new Set(collection.tools.map(t=>t.type)).size,100);assert(M.valid(collection));assert.equal(M.action(collection,'buy',0),false);assert(M.action(collection,'equip',collection.tools.at(-1).id));assert.equal(M.tool(collection).type,99);
assert.equal(M.mines.length,50);assert.equal(new Set(M.mines.map(m=>m.name)).size,50);
for(let sector=0;sector<M.mines.length;sector++){
 const mine=M.mines[sector],seen=new Set();let featured=0,diamonds=0;
 assert(mine.featured.every(id=>M.ores.some(o=>o.id===id)));assert(mine.model>=0&&mine.model<3);
 for(let i=0;i<10000;i++){let st=M.fresh(),result=M.mine(st,true,sector,()=>i/10000);seen.add(result.ore.id);if(mine.featured.includes(result.ore.id))featured++;if(result.ore.id==='diamond')diamonds++;}
 assert.equal(seen.size,80);assert.equal(diamonds,2500);assert(featured>0);
 let saved=M.fresh();saved.sector=sector;assert(M.valid(JSON.parse(JSON.stringify(saved))));
}
let previous=M.fresh();delete previous.sector;previous.ores.gold=7;assert(M.valid(M.migrate(previous)));assert.equal(M.migrate(previous).sector,0);assert.equal(M.migrate(previous).ores.gold,7);assert(!M.valid({...M.fresh(),sector:50}));
// Every model has a unique effect description, and each effect changes gameplay.
assert.equal(new Set(M.types.map(t=>t.effect.description)).size,100);
function effectState(type){let st=M.fresh();st.tools[0].type=type;st.tools[0].dur=M.types[type].dur;return st;}
function sequence(...values){let i=0;return()=>values[i++]??.999;}
for(let i=0;i<100;i++){
 const type=M.types[i],e=type.effect;let st=effectState(i);
 if(e.kind==='extra'){
  let result=M.mine(st,true,0,sequence(0,0));assert(result.triggered);assert.equal(result.amount,type.power+Math.max(1,Math.floor(type.power*.5)));
  assert(!M.mine(effectState(i),true,0,sequence(0,e.value/100)).triggered);
 }else if(e.kind==='durability'){
  assert(M.mine(st,true,0,sequence(0,0)).triggered);assert.equal(st.tools[0].dur,type.dur);
  st=effectState(i);M.mine(st,true,0,sequence(0,e.value/100));assert.equal(st.tools[0].dur,type.dur-1);
  st=effectState(i);M.mine(st,false,0,()=>0);assert.equal(st.tools[0].dur,type.dur-1);assert.equal(Object.values(st.ores).reduce((a,b)=>a+b,0),0);
 }else if(e.kind==='diamond'){
  const chance=(25+e.value)/100;assert(Math.abs(M.diamondChance(st.tools[0])-chance)<1e-12);
  assert.equal(M.mine(st,true,0,()=>chance-1e-8).ore.id,'diamond');assert.notEqual(M.mine(st,true,0,()=>chance+1e-8).ore.id,'diamond');
 }else if(['metal','gem','fantasy'].includes(e.kind)){
  let boosted=0,base=0;
  for(let r=0;r<1000;r++){let boostedResult=M.mine(effectState(i),true,0,sequence(r/1000,.999)),baseResult=M.mine(effectState(0),true,0,sequence(r/1000,.999));if(boostedResult.ore.category===e.kind&&boostedResult.ore.id!=='diamond')boosted++;if(baseResult.ore.category===e.kind&&baseResult.ore.id!=='diamond')base++;}
  assert(boosted>base,`${type.name} must increase its target category`);
 }else if(e.kind==='sale'){
  st.ores.gold=100;const expected=Math.floor(100*80*(1+e.value/100));assert.equal(M.oreValue(st,'gold'),expected);const before=st.money;assert(M.action(st,'sellOre','gold'));assert.equal(st.money-before,expected);
  st.tools.push({id:2,type:0,level:1,dur:40});st.nextId=3;M.action(st,'equip',2);assert.equal(M.oreValue(st,'gold',100),8000);
 }else if(e.kind==='repair'){
  st.tools[0].dur=0;const c=M.repairCost(st.tools[0]);assert.equal(c.money,Math.ceil(Math.ceil(type.dur*1.5)*(1-e.value/100)));assert.equal(c.stone,Math.ceil(Math.ceil(type.dur/10)*(1-e.value/100)));st.money=c.money;st.ores.stone=c.stone;assert(M.action(st,'repair',1));assert.equal(st.money,0);assert.equal(st.ores.stone,0);
 }else if(e.kind==='upgrade'){
  const c=M.upgradeCost(st.tools[0]);assert.equal(c.money,Math.ceil(150*(i+1)*(1-e.value/100)));assert.equal(c.copper,Math.ceil(3*(1-e.value/100)));st.money=c.money;st.ores.copper=c.copper;assert(M.action(st,'upgrade',1));assert.equal(st.money,0);assert.equal(st.tools[0].level,2);
 }else if(e.kind==='echo'){
  const result=M.mine(st,true,0,sequence(0,0,.999));assert(result.triggered);assert(result.bonus);assert.equal(Object.values(st.ores).reduce((a,b)=>a+b,0),type.power+1);
  assert(!M.mine(effectState(i),true,0,sequence(0,e.value/100)).bonus);
 }
 assert(M.valid(st));
}
console.log('PASS: 100 distinct pickaxe effects and lifecycle checks; 50 mines, 80 resources, trading and legacy saves');
