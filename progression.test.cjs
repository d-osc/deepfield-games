const assert=require('node:assert/strict'),G=require('./progression.js'),Base=require('./engine.js');
const sequence=(...values)=>{let i=0;return()=>values[i++]??.999999;};
function ready(type=0,sector=0){let s=G.fresh();s.tools[0].type=type;s.tools[0].dur=G.types[type].dur;s.player.level=100;s.player.energy=G.maxEnergy(s);s.unlocked=G.mines.map((m,i)=>i);s.sector=sector;return s;}
function hit(s,quality=100,rng=()=>.999999){assert(G.startMining(s).ok);return G.mine(s,quality,s.sector,rng);}
assert.equal(G.foods.length,30);assert.equal(new Set(G.foods.map(f=>f.name)).size,30);
assert.equal(G.mines.length,50);assert.equal(new Set(G.mines.map(m=>m.debuff.name)).size,50);
assert.equal(new Set(G.mines.map(m=>[...m.drops].sort().join(','))).size,50);
assert.equal(new Set(G.mines.flatMap(m=>m.drops)).size,80);
for(let sector=0;sector<50;sector++)for(const type of [0,29,39,49,59,99]){
 const st=ready(type,sector);eat(st,14);const rates=G.dropRates(st,sector,100);
 assert.deepEqual(new Set(rates.map(r=>r.ore.id)),new Set(G.mines[sector].drops));
 const result=hit(st,100,()=>0);assert(G.mines[sector].drops.includes(result.ore.id));if(result.bonus)assert(G.mines[sector].drops.includes(result.bonus.id));
 if(!G.mines[sector].drops.includes('diamond'))assert(!rates.some(r=>r.ore.id==='diamond'));
}
let s=G.fresh();assert(G.valid(s));assert.deepEqual(s.unlocked,[0]);assert(G.maxEnergy(s)>0);
const before=G.maxEnergy(s);G.addXp(s,G.xpNeeded(1));assert.equal(s.player.level,2);assert.equal(G.maxEnergy(s),before+12);
s.player.energy=0;s.player.recoveredAt=1000;G.recover(s,30999);assert.equal(s.player.energy,0);G.recover(s,31000);assert.equal(s.player.energy,1);G.recover(s,91000);assert.equal(s.player.energy,3);G.recover(s,1e9);assert.equal(s.player.energy,G.maxEnergy(s));
s=G.fresh();s.player.energy=0;s.player.recoveredAt=Date.now();const unchanged=JSON.stringify(s);assert(!G.startMining(s).ok);assert.equal(s.pending,null);assert.equal(s.hits,0);
// Energy is paid once at start; no switching equipment/food midway and no double reward.
s=ready();let energy=s.player.energy,cost=G.energyCost(s);assert(G.startMining(s).ok);assert.equal(s.player.energy,energy-cost);assert(!G.startMining(s).ok);assert(!G.action(s,'eat',0));assert(!G.action(s,'equip',1));G.mine(s,0);assert.equal(G.mine(s,100),null);assert.equal(Object.values(s.ores).reduce((a,b)=>a+b,0),0);
// Exact ring overlap is 100%; wrong key and timeout are resolved as zero.
assert.equal(G.score(85/110),100);assert.equal(G.score(0),0);assert.equal(G.score(1),0);assert.equal(G.score(NaN),0);assert(G.score(.7)>G.score(.4));assert(G.score(.9)<100);
s=ready();let poor=hit(s,20);assert.equal(poor.quality,20);assert(poor.ore);assert.equal(s.crits,0);const xp=poor.xp;let perfect=hit(ready(),100);assert(perfect.critical);assert(perfect.xp>xp);
// Paid unlocks cannot charge twice or travel into a locked mine.
s=G.fresh();const price=G.mines[1].unlockPrice;s.money=price-1;assert(!G.action(s,'unlock',1));assert(!G.action(s,'travel',1));s.money=price;assert(G.action(s,'unlock',1));assert.equal(s.money,0);assert(!G.action(s,'unlock',1));assert(G.action(s,'travel',1));assert(G.valid(s));
// Every food can be bought and consumed, with no stacking the same buff family.
for(const f of G.foods){s=ready();s.money=10000;s.player.energy=1;s.foods[f.id]=0;assert(G.action(s,'buyFood',f.id));assert.equal(s.money,10000-f.price);assert(G.action(s,'eat',f.id));assert.equal(s.foods[f.id],0);assert.equal(s.player.energy,1+f.restore);if(f.kind!=='restore'){assert.equal(G.buffValue(s,f.kind),f.value);s.foods[f.id]=1;assert(G.action(s,'eat',f.id));assert.equal(s.buffs.length,1);let remaining=s.buffs[0].remaining;hit(s,0);assert.equal(s.buffs[0].remaining,remaining-1);}assert(G.valid(s));}
function eat(s,id){s.foods[id]++;assert(G.action(s,'eat',id));}
let plain=ready(30),boost=ready(30);eat(boost,9);assert(hit(boost).amount>hit(plain).amount);
plain=ready(0,19);boost=ready(0,19);eat(boost,14);assert(G.dropRates(boost).find(r=>r.ore.id==='diamond').chance>G.dropRates(plain).find(r=>r.ore.id==='diamond').chance);
plain=ready(99);boost=ready(99);eat(boost,19);assert(G.energyCost(boost)<G.energyCost(plain));
plain=ready();boost=ready();eat(boost,24);assert(hit(boost).xp>hit(plain).xp);
plain=ready(0,5);boost=ready(0,5);eat(boost,29);assert(G.debuff(boost).value<G.debuff(plain).value);assert(G.energyCost(boost)<=G.energyCost(plain));
// Each mine's displayed table sums to 100% and exactly drives the main roll.
for(let sector=0;sector<50;sector++){
 s=ready(30,sector);const rates=G.dropRates(s,sector,100);assert(Math.abs(rates.reduce((n,r)=>n+r.chance,0)-1)<1e-10);
 let cumulative=0;for(const row of rates){const midpoint=cumulative+row.chance/2;cumulative+=row.chance;let st=ready(30,sector);const rng=G.mines[sector].debuff.kind==='wear'?sequence(.999999,midpoint):sequence(midpoint);const result=hit(st,100,rng);assert.equal(result.ore.id,row.ore.id,`mine ${sector}, ore ${row.ore.id}`);}
 const d=G.mines[sector].debuff;assert(d.value>0);assert(d.description);if(d.kind==='speed')assert(G.timingFactor(s)<1);if(d.kind==='energy')assert(G.energyCost(s)>G.types[30].energyCost);
 assert(G.valid(s));
}
// Quality, equipment and food effects must be reflected in the same public table.
for(const type of [0,20,29,39,49,59,99])for(const quality of [1,25,75,100]){s=ready(type,7);eat(s,14);const rates=G.dropRates(s,7,quality);assert(Math.abs(rates.reduce((n,r)=>n+r.chance,0)-1)<1e-10);}
assert(G.dropRates(ready(0,19),19,100).find(r=>r.ore.id==='diamond').chance>G.dropRates(ready(0,19),19,30).find(r=>r.ore.id==='diamond').chance);
// Old inventory and selected mine survive schema migration; new saves round-trip.
let old=Base.fresh();old.sector=19;old.money=12345;old.ores.gold=7;let migrated=G.migrate(old);assert(G.valid(migrated));assert.equal(migrated.money,12345);assert.equal(migrated.ores.gold,7);assert(migrated.unlocked.includes(19));assert.equal(migrated.player.level,1);
assert(G.valid(G.migrate(JSON.parse(JSON.stringify(migrated)))));assert(!G.valid({...migrated,player:{...migrated.player,energy:-1}}));assert(!G.valid({...migrated,unlocked:[0]}));assert(!G.valid({...migrated,foods:{...migrated.foods,0:-1}}));
assert.equal(new Set(G.types.map(t=>t.energyCost)).size,100);
for(let type=0;type<100;type++){
 s=ready(type);s.money=1e9;s.ores.stone=s.ores.copper=s.ores.iron=10000;
 const energy=s.player.energy,result=hit(s);assert(result.ore);assert(s.player.energy<energy);assert(G.valid(s));
 s.tools[0].dur=0;assert(!G.startMining(s).ok);assert(G.action(s,'repair',1));assert(G.action(s,'upgrade',1));assert(G.valid(G.migrate(JSON.parse(JSON.stringify(s)))));
}
// Debuffs affect the promised stat, and protective food mitigates each family.
for(const sector of [0,1,2,3,4]){
 let a=ready(30,sector),b=ready(30,sector);eat(b,29);let kind=G.mines[sector].debuff.kind;
 if(kind==='energy')assert(G.energyCost(b)<=G.energyCost(a));
 if(kind==='wear'){let before=a.tools[0].dur;hit(a,0,()=>0);assert.equal(a.tools[0].dur,before-2);}
 if(kind==='luck'){a=ready(0,42);b=ready(0,42);eat(b,29);assert(G.dropRates(b).find(r=>r.ore.id==='diamond').chance>G.dropRates(a).find(r=>r.ore.id==='diamond').chance);}
 if(kind==='yield')assert(hit(b).amount>=hit(a).amount);
 if(kind==='speed')assert(G.timingFactor(b)>G.timingFactor(a));
}
console.log('PASS: levels/energy, 100 tool costs and lifecycles, QTE quality, 30 foods, buffs, 50 debuffs/unlocks, exact drop tables, migration and invalid saves');
// Rock durability, break/unlock/reset and legacy-save compatibility.
{
 const rockState=G.fresh(),max=G.rockMax(0);assert.equal(rockState.rockHealth[0],max);
 assert(G.startMining(rockState).ok);G.mine(rockState,0);assert.equal(rockState.rockHealth[0],max);assert.deepEqual(rockState.unlocked,[0]);
 assert(G.startMining(rockState).ok);const damage=G.mine(rockState,100);assert(damage.rockDamage>0);assert.equal(rockState.rockHealth[0],max-damage.rockDamage);
 const persisted=G.migrate(JSON.parse(JSON.stringify(rockState)));assert.equal(persisted.rockHealth[0],rockState.rockHealth[0]);
 rockState.rockHealth[0]=1;assert(G.startMining(rockState).ok);const broken=G.mine(rockState,100);assert(broken.rockBroken);assert.equal(broken.unlockedMine,1);assert(rockState.unlocked.includes(1));assert.equal(rockState.sector,0);assert.equal(rockState.rockHealth[0],max);
 assert.equal(G.mine(rockState,100),null);assert.equal(rockState.unlocked.filter(i=>i===1).length,1);
 assert(G.action(rockState,'travel',1));rockState.rockHealth[1]=3;assert(G.action(rockState,'travel',0));assert.equal(rockState.rockHealth[0],max);assert.equal(rockState.rockHealth[1],3);
 const last=ready(0,49);last.rockHealth[49]=1;assert(G.startMining(last).ok);const final=G.mine(last,100);assert(final.rockBroken);assert.equal(final.unlockedMine,null);assert.equal(last.rockHealth[49],G.rockMax(49));assert(G.valid(last));
 const legacy=G.fresh();delete legacy.rockHealth;assert(G.valid(legacy));assert.deepEqual(G.migrate(legacy).rockHealth,G.fresh().rockHealth);
 for(const hp of [-1,0,1.5,Infinity,G.rockMax(0)+1]){const invalid=G.fresh();invalid.rockHealth[0]=hp;assert(!G.valid(invalid));}
 console.log('PASS: rock damage, miss without damage, break/reset, next-mine unlock, per-mine persistence, last mine and migration');
}

{
 const previous=G.fresh();delete previous.rockVersion;previous.rockHealth=G.mines.map((_,i)=>(30+i*12));previous.rockHealth[0]=15;
 const upgraded=G.migrate(previous);assert.equal(upgraded.rockHealth[0],30);assert.equal(upgraded.rockHealth[49],G.rockMax(49));assert.equal(upgraded.rockVersion,2);
 assert.deepEqual(G.migrate(upgraded).rockHealth,upgraded.rockHealth);assert.equal(previous.rockHealth[0],15);
 assert.equal(G.rockMax(0),60);assert.equal(G.rockMax(49),1236);assert(!G.valid({...upgraded,rockVersion:99}));
 console.log('PASS: doubled rock durability, proportional legacy migration and no repeat scaling');
}
