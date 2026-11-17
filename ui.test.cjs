(async()=>{
// Integration smoke test for UI event wiring, without a browser dependency.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let now=0;const events={},nodes=new Map(),gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
function node(k){if(!nodes.has(k))nodes.set(k,{style:{},textContent:'',innerHTML:'',clientWidth:900,clientHeight:430,getContext:()=>context,classList:{toggle(){}},scrollIntoView(){},focus(){}});return nodes.get(k);}
const legacy=require('./engine.js').fresh();legacy.sector=19;legacy.money=10000;
let saved;const values=new Map([['deepfield-v1',JSON.stringify(legacy)]]);
const box={crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder,btoa,atob,document:{querySelector:node,querySelectorAll:()=>[],addEventListener:(k,f)=>(events[k]??=[]).push(f)},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);if(k==='deepfield-v1')saved=JSON.parse(v);}},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setInterval(){},performance:{now:()=>now},devicePixelRatio:1,console};
vm.createContext(box);
vm.runInContext(fs.readFileSync('storage.js','utf8'),box);
box.__loaded=await vm.runInContext('SaveStorage.load()',box);
for(const f of ['engine.js','progression.js','assets/kenney/rocks.js','game.js'])vm.runInContext(fs.readFileSync(f,'utf8').replace('await SaveStorage.load()','__loaded'),box);
const run=code=>vm.runInContext(code,box),click=dataset=>{for(const handler of events.click)handler({target:{closest:()=>({dataset})}});};
assert(node('#playercard').innerHTML.includes('Lv.1'));assert.equal(run('state.sector'),19);assert.equal(run('state.version'),2);
assert.equal((node('#deposits').innerHTML.match(/data-rate=/g)||[]).length,50);
assert(node('#deposits').innerHTML.includes('ปลดล็อก'));assert(node('#droprates').innerHTML.includes('อัตราดรอป'));
assert.equal((node('#droprates').innerHTML.match(/class="rate-row"/g)||[]).length,run('M.mines[19].drops.length'));
click({tab:'map'});assert.equal(node('#game-window').hidden,false);assert.equal(node('#mineview').hidden,false);assert.equal(node('#mine-atlas').hidden,false);assert.equal(node('#storeview').hidden,true);
for(const h of events.keydown)h({key:'Escape',preventDefault(){}});assert.equal(node('#game-window').hidden,true);assert.equal(run('tab'),'mine');
click({tab:'shop'});assert.equal((node('#storeview').innerHTML.match(/data-action="buyFood"/g)||[]).length,30);
assert.equal(node('#mineview').hidden,false);assert.equal(node('#game-window').hidden,false);assert.equal(node('#mine-atlas').hidden,true);
click({shopTab:'foods'});assert(node('#storeview').innerHTML.includes('shop-content shop-foods'));assert(node('#storeview').innerHTML.includes('data-shop-tab="tools"'));
run('state.player.energy=1');click({action:'buyFood',id:'5'});click({action:'eat',id:'5'});assert.equal(run('state.buffs[0].kind'),'yield');assert(node('#playercard').innerHTML.includes('แซนด์วิชไข่'));
click({tab:'bag'});click({bagTab:'foods'});assert(node('#storeview').innerHTML.includes('aria-label="ช่องอาหาร"'));assert(node('#storeview').innerHTML.includes('กินอาหาร'));
click({tab:'mine'});for(const h of events.keydown)h({key:'b',code:'KeyB',target:{tagName:'BODY'},preventDefault(){}});assert.equal(run('tab'),'bag');assert.equal(node('#game-window').hidden,false);
click({tab:'mine'});click({sector:'1'});assert.equal(run('sector'),19);const money=run('state.money');click({action:'unlock',id:'1'});assert.equal(run('state.money'),money-run('M.mines[1].unlockPrice'));click({sector:'1'});assert.equal(run('sector'),1);
let energy=run('state.player.energy');run('begin()');assert(run('!!qte'));assert(run('!!state.pending'));assert(run('state.player.energy')<energy);
const key=run('qte.key');now=run('qte.start+qte.duration*(85/110)');for(const h of events.keydown)h({key,code:'Key'+key,target:{tagName:'BODY'},preventDefault(){}});
assert.equal(run('qte'),null);assert.equal(run('state.pending'),null);assert(node('#toast').textContent.includes('100%'));assert(run('state.player.xp')>0);
assert.equal(run('lootDrops.length'),0); // Actual ore sprites wait for pickaxe impact.
now+=900;run(`frame(${now})`);run('begin()');const wrongKey=run("qte.key==='Z'?'x':'z'");for(const h of events.keydown)h({key:wrongKey,code:'Key'+wrongKey.toUpperCase(),target:{tagName:'BODY'},preventDefault(){}});assert(node('#toast').textContent.includes('0%'));assert(node('#toast').textContent.includes('ไม่ได้รับแร่'));
await run('SaveStorage.flush()');assert.equal(saved.format,'deepfield-local-chain');assert(run('M.valid(state)'));assert(!node('#storeview').innerHTML.includes('NaN'));
// All 100 models and all 50 mine scenes can render with progression metadata.
run('state.pending=null;qte=null;swing=null;state.unlocked=M.mines.map((m,i)=>i);state.player.level=100;state.player.energy=M.maxEnergy(state)');
for(let i=0;i<50;i++){click({sector:String(i)});run(`frame(${now})`);assert.equal(node('#rockname').textContent,run(`M.mines[${i}].name`));}
for(let i=0;i<100;i++){run(`state.tools[0].type=${i};state.tools[0].dur=M.types[${i}].dur;tab='upgrade';renderStore();drawPickaxe(100)`);assert(node('#storeview').innerHTML.includes(run(`M.types[${i}].effect.description`)));}
// Use loaded image doubles to exercise actual sprite drawing as well as fallback rendering.
box.Image=class{constructor(){this.complete=true;this.naturalWidth=32;}};
let drawn=0;context.drawImage=()=>drawn++;
const inventoryBefore=run('JSON.stringify(state.ores)');
run("lootDrops=[];lootBursts=[];spawnLootEffects({ore:M.ores[1],amount:7,bonus:M.ores[4],quality:100,critical:true},[450,200],5000)");
assert(node('#loot-banner').innerHTML.includes('ทองแดง'));assert(node('#loot-banner').innerHTML.includes('เพชร'));assert(node('#loot-banner').innerHTML.includes('PERFECT DROP'));assert(run('lootDrops.length')>0);
run('drawLootEffects(5200)');assert(drawn>0);run('drawLootEffects(9000)');assert.equal(run('lootDrops.length'),0);assert.equal(run('lootBursts.length'),0);assert.equal(node('#loot-banner').hidden,true);assert.equal(run('JSON.stringify(state.ores)'),inventoryBefore);
run("tab='mine';qte=null;swing=null;state.tools[0].type=0;state.tools[0].dur=40;state.sector=sector=0;state.player.energy=M.maxEnergy(state);begin();finish(0)");now+=400;run(`frame(${now})`);assert.equal(run('lootDrops.length'),0);
console.log('PASS: game HUD, menus, QTE, 50 scenes/100 tools, impact-timed ore sprites, bonus/Perfect drops, cleanup and no duplicate rewards');

})().catch(error=>{console.error(error);process.exitCode=1;});
