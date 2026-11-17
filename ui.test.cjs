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

const tap=(extra={})=>{for(const h of events.pointerdown)h({isTrusted:true,isPrimary:true,button:0,clientX:run('rings[0]?.x/100*W')||450,clientY:run('rings[0]?.y/100*H')||220,target:{closest:selector=>selector==='.scene'?node('.scene'):null},preventDefault(){},...extra});};
run("tab='mine';stopAuto();state.pending=null;state.player.energy=M.maxEnergy(state);state.tools[0].dur=40");
const beforeIdle=run('JSON.stringify(state)');run('tickRings(0)');assert(run('rings.length>0'));assert.equal(run('state.pending'),null);assert.equal(run('JSON.stringify(state)'),beforeIdle);
run('rings[0].duration=3000;nextRingAt=350');now=400;run('tickRings(400)');assert.equal(run('rings.length'),2);assert.equal(run('JSON.stringify(state)'),beforeIdle);
run('rings.forEach(r=>r.duration=300)');now=4000;run('tickRings(4000)');assert.equal(run('JSON.stringify(state)'),beforeIdle);assert.equal(run('rings.length'),1);
// Two overlapping rings resolve separately, newest on top. No duplicate costs.
run('rings=[{...rings[0],id:100,start:4000,duration:1000},{...rings[0],id:101,start:4000,duration:1000}];nextRingAt=10000');
now=4000+1000*85/110;const energy=run('state.player.energy'),cost=run('M.energyCost(state)'),hits=run('state.hits');
tap({isTrusted:false});tap({button:2});tap({isPrimary:false});assert.equal(run('state.hits'),hits);
tap({pointerType:'touch'});assert.equal(run('rings.length'),0);assert.equal(run('state.hits'),hits+2);assert.equal(run('state.player.energy'),energy-cost*2);assert(node('#toast').textContent.includes('100%'));assert.equal(run('state.pending'),null);
tap();assert.equal(run('state.hits'),hits+2); // Already consumed rings cannot pay twice.
now+=900;run(`updateSwing(${now})`);run('tickRings('+now+')');assert.equal(run('state.hits'),hits+2); // No additional hits on expiration.
const afterHit=run('JSON.stringify(state)');run('stopAuto();tickRings(9000)');click({tab:'bag'});assert.equal(run('rings.length'),0);assert.equal(run('JSON.stringify(state)'),afterHit);
click({tab:'mine'});run('tickRings(10000)');box.document.hidden=true;for(const h of events.visibilitychange)h();assert.equal(run('rings.length'),0);assert.equal(run('JSON.stringify(state)'),afterHit);box.document.hidden=false;
// Rapid taps and a second touch are accepted during the current swing.
click({tab:'mine'});run('stopAuto();pendingImpacts=[];nextRingAt=1e9;begin(5000);rings[0].duration=3000');now=6000;const rapidHits=run('state.hits');tap();assert.equal(run('state.hits'),rapidHits+1);run('begin(5000);rings[0].duration=3000');tap({pointerType:'touch',isPrimary:false});assert.equal(run('state.hits'),rapidHits+2);assert.equal(run('pendingImpacts.length'),2);run('updateSwing(6400)');assert(run('pendingImpacts.every(hit=>hit.impacted)'));const fragmentsAfterRapid=run('rockFragments.length');run('updateSwing(6400)');assert.equal(run('rockFragments.length'),fragmentsAfterRapid);
// Resource shortages never consume a ring or charge state.
run('state.player.energy=0;stopAuto();tickRings(11000);nextRingAt=1e9');now=run('rings[0].start+rings[0].duration*85/110');const noEnergyHits=run('state.hits');tap();assert.equal(run('state.hits'),noEnergyHits);assert.equal(run('rings.length'),1);
run('state.player.energy=M.maxEnergy(state);state.tools[0].dur=0');tap();assert.equal(run('state.hits'),noEnergyHits);
run('state.tools[0].dur=40;stopAuto();swing=null');const aimBefore=run('JSON.stringify(projectTool(pickaxePoint([0,0,0],0,0)))');for(const h of events.pointermove)h({clientX:800,clientY:100,isPrimary:true,target:{closest:()=>node('.scene')}});assert.notEqual(run('JSON.stringify(projectTool(pickaxePoint([0,0,0],0,0)))'),aimBefore);
// All mine scenes, tools and ring boundaries still render across viewports.
run('state.unlocked=M.mines.map((m,i)=>i)');for(let i=0;i<50;i++){click({sector:String(i)});assert.equal(node('#rockname').textContent,run(`M.mines[${i}].name`));}
for(let i=0;i<100;i++)run(`state.tools[0].type=${i};state.tools[0].dur=M.types[${i}].dur;tab='upgrade';renderStore();drawPickaxe(100)`);
for(const [width,height] of [[900,430],[390,844],[390,674],[320,568],[844,390]])for(let i=0;i<50;i++){run(`W=${width};H=${height};sector=${i}`);assert(run('(()=>{const location=ringLocation();return ringFits(location.x/100*W,location.y/100*H,location.scale*78+3);})()'));}
run('W=900;H=430;sector=0;rockFragments=[];spawnRockFragments([450,200],0,true);drawRockFragments(2000)');assert.equal(run('rockFragments.length'),0);
node('#sound-toggle').onclick();assert.equal(node('#sound-toggle').textContent,'🔇');
await run('SaveStorage.flush()');assert.equal(saved.format,'deepfield-local-chain');assert(run('M.valid(state)'));
console.log('PASS: free automatic overlapping rings, expiration/cancellation without cost, trusted per-ring clicks, touch, resource costs, menus, models and all viewport ring bounds');
})().catch(error=>{console.error(error);process.exitCode=1;});
