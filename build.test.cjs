// Exercise the actual obfuscated production bundle through its DOM controls.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.join(__dirname,'dist'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 assert(html.includes('game.bundle.js'));assert(!html.includes('src="game.js"'));
 function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
 const published=files(root);assert.equal(published.filter(f=>f.endsWith('.js')).length,1);assert(!published.some(f=>/\.(map|zip)$/.test(f)));
 const bundle=fs.readFileSync(path.join(root,'game.bundle.js'),'utf8');assert(!bundle.includes('sourceMappingURL'));assert(!bundle.includes('function renderPlayer('));
 const events={},nodes=new Map(),gradient={addColorStop(){}};let now=0;
 const context=new Proxy({createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:()=>{},set:(o,k,v)=>(o[k]=v,true)});
 function node(k){if(!nodes.has(k))nodes.set(k,{style:{},textContent:'',innerHTML:'',clientWidth:900,clientHeight:430,getContext:()=>context,classList:{toggle(){}},scrollIntoView(){},focus(){}});return nodes.get(k);}
 const legacy=require('./engine.js').fresh();legacy.money=10000;const values=new Map([['deepfield-v1',JSON.stringify(legacy)]]),errors=[];
 const box={crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder,btoa,atob,document:{querySelector:node,querySelectorAll:()=>[],addEventListener:(k,f)=>(events[k]??=[]).push(f)},localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},ResizeObserver:class{observe(){}},requestAnimationFrame(){},setInterval(){},performance:{now:()=>now},devicePixelRatio:1,console:{log(){},warn(){},error:e=>errors.push(e)}};
 vm.createContext(box);vm.runInContext(bundle,box,{timeout:10000});
 async function until(check){for(let i=0;i<200;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,10));}throw Error('Production bundle timed out');}
 await until(()=>node('#playercard').innerHTML.includes('Lv.1'));assert.equal(errors.length,0);
 const click=dataset=>{for(const handler of events.click??[])handler({target:{closest:()=>({dataset})}});};
 click({tab:'map'});assert.equal(node('#game-window').hidden,false);assert.equal((node('#deposits').innerHTML.match(/data-rate=/g)||[]).length,50);
 click({action:'unlock',id:'1'});click({sector:'1'});assert.equal(node('#rockname').textContent,box.Mining.mines[1].name);
 click({tab:'mine'});node('#mine').onclick();assert(node('#prompt').innerHTML.includes('qte'));
 const key=node('#prompt').innerHTML.match(/<b>([^<]+)<\/b>/)[1];now=1000;
 for(const handler of events.keydown)handler({key,code:'Key'+key,target:{tagName:'BODY'},preventDefault(){}});
 await until(()=>{try{return JSON.parse(values.get('deepfield-v1')).blocks?.at(-1).data.pending===null;}catch{return false;}});
 const saved=JSON.parse(values.get('deepfield-v1'));assert.equal(saved.format,'deepfield-local-chain');assert.equal(saved.blocks.at(-1).data.sector,1);assert.equal(errors.length,0);
 assert(node('#playercard').innerHTML.includes('Lv.'));console.log('PASS: production bundle startup, migration, map, unlock/travel, mining and hash-chain save; no original JS or source maps published');
})().catch(error=>{console.error(error);process.exitCode=1;});
