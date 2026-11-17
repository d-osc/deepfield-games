const {Worker:Thread}=require('node:worker_threads'),vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{
 const workers=[];
 class Worker{
  constructor(){this.thread=new Thread(`const {parentPort}=require('node:worker_threads');globalThis.self=globalThis;globalThis.postMessage=value=>parentPort.postMessage(value);parentPort.on('message',data=>globalThis.onmessage({data}));`+fs.readFileSync('dist/save-worker.js','utf8'),{eval:true});workers.push(this);this.thread.on('message',data=>this.onmessage?.({data}));this.thread.on('error',error=>this.onerror?.(error));}
  postMessage(data){this.thread.postMessage(data);}terminate(){this.thread.terminate();}
 }
 try{
  const values=new Map([['deepfield-v1','{"money":12}']]);const box={Worker,setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder,atob,localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}};
  vm.createContext(box);vm.runInContext(fs.readFileSync('storage.js','utf8')+';globalThis.storage=SaveStorage',box);
  assert.equal((await box.storage.load()).money,12);
  const snapshots=Array.from({length:8},(_,i)=>({money:i,name:'นักขุด'}));await Promise.all(snapshots.map(s=>box.storage.save(s)));await box.storage.flush();
  const chain=JSON.parse(values.get('deepfield-v1'));assert.equal(chain.blocks.length,8);assert.equal(chain.blocks.at(-1).data.money,7);assert.equal(chain.blocks[1].previousHash,chain.blocks[0].hash);
  assert.equal((await box.storage.load()).money,7);
  const damaged=JSON.parse(values.get('deepfield-v1'));damaged.blocks[0].data.money=999;values.set('deepfield-v1',JSON.stringify(damaged));const before=values.get('deepfield-v1');await assert.rejects(box.storage.load());await assert.rejects(box.storage.save({money:0}));assert.equal(values.get('deepfield-v1'),before);
  console.log('PASS: actual production worker thread, legacy migration, ordered rapid saves, reload, corruption rejection and preserved existing save');
 }finally{for(const worker of workers)worker.terminate();}
})().catch(error=>{console.error(error);process.exitCode=1;});
