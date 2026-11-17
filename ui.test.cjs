(async()=>{
// Integration smoke test for UI event wiring, without a browser dependency.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
let now=0;const events={},nodes=new Map(),gradient={addColorStop(){}};
const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
function node(k){if(!nodes.has(k))nodes.set(k,{style:{},textContent:'',innerHTML:'',clientWidth:900,clientHeight:430,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:900,height:430}),classList:{toggle(){}},scrollIntoView(){},focus(){}});return nodes.get(k);}
const legacy=require('./engine.js').fresh();legacy.sector=19;legacy.money=10000;
let saved;const values=new Map([['deepfield-v1',JSON.stringify(legacy)]]);
const box={crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder,btoa,atob,document:{querySelector:node,querySelectorAll:()=>[],addEventListener:(k,f)=>(events[k]??=[]).push(f)},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>{values.set(k,v);if(k==='deepfield-v1')saved=JSON.parse(v);}},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setInterval(){},performance:{now:()=>now},devicePixelRatio:1,console};
vm.createContext(box);
vm.runInContext(fs.readFileSync('storage.js','utf8'),box);
box.__loaded=await vm.runInContext('SaveStorage.load()',box);
for(const f of ['engine.js','progression.js','assets/kenney/rocks.js','audio.js','game.js'])vm.runInContext(fs.readFileSync(f,'utf8').replace('await SaveStorage.load()','__loaded'),box);
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
click({tab:'mine'});for(const h of events.keydown)h({key:'b',code:'KeyB',isTrusted:true,target:{tagName:'BODY'},preventDefault(){}});assert.equal(run('tab'),'bag');assert.equal(node('#game-window').hidden,false);
click({tab:'mine'});click({sector:'1'});assert.equal(run('sector'),19);const money=run('state.money');click({action:'unlock',id:'1'});assert.equal(run('state.money'),money-run('M.mines[1].unlockPrice'));click({sector:'1'});assert.equal(run('sector'),1);
let energy=run('state.player.energy');run('begin()');assert(run('!!qte'));assert(run('!!state.pending'));assert(run('state.player.energy')<energy);
const tap=(extra={})=>{for(const h of events.pointerdown)h({isTrusted:true,isPrimary:true,button:0,clientX:450,clientY:200,target:{closest:selector=>selector==='.scene'?node('.scene'):null},preventDefault(){},...extra});};
now=run('qte.start+qte.duration*(85/110)');tap();
assert.equal(run('qte'),null);assert.equal(run('pressBlasts.at(-1).perfect'),true);assert.equal(run('state.pending'),null);assert(node('#toast').textContent.includes('100%'));assert(run('state.player.xp')>0);
assert.equal(run('lootDrops.length'),0); // Actual ore sprites wait for pickaxe impact.
now+=900;run(`frame(${now})`);run('begin()');tap();assert(node('#toast').textContent.includes('0%'));assert(node('#toast').textContent.includes('ไม่ได้รับแร่'));
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
run('rockFragments=[];spawnRockFragments([450,200],0,true)');assert(run('rockFragments.length>0'));run('drawRockFragments(2000)');assert.equal(run('rockFragments.length'),0);
run('drawPressBlasts(1e9)');assert.equal(run('pressBlasts.length'),0);node('#sound-toggle').onclick();assert.equal(node('#sound-toggle').textContent,'🔇');node('#sound-toggle').onclick();assert.equal(node('#sound-toggle').textContent,'🔊');
// Mouse/touch mining, pointer tracking and trusted primary input only.
run("tab='mine';qte=null;swing=null;state.pending=null;state.tools[0].dur=40;state.player.energy=M.maxEnergy(state)");
const keydown=(key,code)=>{for(const h of events.keydown)h({key,code,isTrusted:true,target:{tagName:'BODY'},preventDefault(){}});};
keydown('w','KeyW');assert.equal(run('qte'),null);
tap({pointerType:'touch'});assert(run('!!qte'));assert(run('qte.duration>=300&&qte.duration<=3000'));
const hitsBeforeSynthetic=run('state.hits');tap({isTrusted:false});tap({button:2});tap({isPrimary:false});assert(run('!!qte'));assert.equal(run('state.hits'),hitsBeforeSynthetic);
const beforeAim=run('JSON.stringify(projectTool(pickaxePoint([0,0,0],0,0)))');
for(const h of events.pointermove)h({clientX:800,clientY:100,isPrimary:true,target:{closest:()=>node('.scene')}});
assert.notEqual(run('JSON.stringify(projectTool(pickaxePoint([0,0,0],0,0)))'),beforeAim);
now=run('qte.start+qte.duration*(85/110)');tap({pointerType:'touch'});assert.equal(run('qte'),null);assert(node('#toast').textContent.includes('100%'));
run('swing=null');node('#auto-mine').onclick();assert(run('autoMining'));assert(run('!!qte'));
const hitsBefore=run('state.hits'),oresBeforeAuto=run('JSON.stringify(state.ores)');
now=run('qte.start+qte.duration*(85/110)+1');run(`frame(${now})`);assert(run('!!qte'));assert.equal(run('state.hits'),hitsBefore);assert.equal(run('JSON.stringify(state.ores)'),oresBeforeAuto);
now=run('qte.start+qte.duration+1');run(`frame(${now})`);assert.equal(run('qte'),null);assert.equal(run('state.hits'),hitsBefore+1);assert.equal(run('JSON.stringify(state.ores)'),oresBeforeAuto);assert(node('#toast').textContent.includes('หมดเวลา'));
now+=900;run(`frame(${now})`);assert(run('!!qte'));now=run('qte.start+qte.duration*(85/110)');tap();assert.equal(run('qte'),null);assert(node('#toast').textContent.includes('100%'));assert.notEqual(run('JSON.stringify(state.ores)'),oresBeforeAuto);
now+=900;run(`frame(${now})`);assert(run('!!qte'));const beforeWrong=run('JSON.stringify(state.ores)');tap();assert.equal(run('qte'),null);assert.equal(run('JSON.stringify(state.ores)'),beforeWrong);
now+=900;run(`frame(${now})`);assert(run('!!qte'));assert(run('autoMining'));
node('#auto-mine').onclick();assert.equal(run('autoMining'),false);assert(run('!!qte'));
keydown('Escape','Escape');assert.equal(run('qte'),null);
run('swing=null;state.player.energy=M.maxEnergy(state)');node('#auto-mine').onclick();click({tab:'bag'});assert.equal(run('autoMining'),false);assert.equal(run('qte'),null);
click({tab:'mine'});run('swing=null;state.player.energy=M.maxEnergy(state)');node('#auto-mine').onclick();box.document.hidden=true;for(const h of events.visibilitychange)h();assert.equal(run('autoMining'),false);assert.equal(run('qte'),null);box.document.hidden=false;
run('swing=null;state.player.energy=0');node('#auto-mine').onclick();assert.equal(run('autoMining'),false);assert.equal(run('qte'),null);
run('swing=null;state.player.energy=M.maxEnergy(state);state.tools[0].dur=0');node('#auto-mine').onclick();assert.equal(run('autoMining'),false);assert.equal(run('qte'),null);
// All rock silhouettes contain the full ring on desktop, portrait and landscape.
run('qte=null;swing=null');
for(const [width,height] of [[900,430],[390,844],[844,390]])for(let i=0;i<50;i++){
 run(`W=${width};H=${height};sector=${i}`);
 assert(run('(()=>{const location=ringLocation();return ringFits(location.x/100*W,location.y/100*H,location.scale*78+3);})()'),`ring outside mine ${i} at ${width}x${height}`);
}
run('W=900;H=430;sector=0;pointerAim={x:.47,y:.51};swing={aim:{...pointerAim},start:0,impacted:false}');
run('pointerAim={x:.9,y:.1}');
assert(run('(()=>{const p=projectTool(pickaxePoint([-2,3.1,-.25],-.55,0));return Math.abs(p[0]-.47*W)<1e-6&&Math.abs(p[1]-.51*H)<1e-6;})()'));
run('swing=null');
await run('SaveStorage.flush()');
console.log('PASS: game HUD, menus, QTE, 50 scenes/100 tools, impact-timed ore sprites, bonus/Perfect drops, cleanup and no duplicate rewards');

})().catch(error=>{console.error(error);process.exitCode=1;});
