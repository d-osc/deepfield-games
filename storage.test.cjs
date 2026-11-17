const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(values=new Map()){
 const box={crypto:require('node:crypto').webcrypto,TextEncoder,TextDecoder,atob,localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)}};
 vm.createContext(box);vm.runInContext(fs.readFileSync('storage.js','utf8')+';globalThis.store=SaveStorage',box);return {store:box.store,values};
}
test('migrates JSON, links snapshots in order and reloads latest state',async()=>{
 const {store,values}=setup(new Map([['deepfield-v1','{"money":12}']]));assert.equal((await store.load()).money,12);
 const state={money:13,name:'นักขุด'};const first=store.save(state);state.money=14;await first;
 assert.equal(JSON.parse(values.get('deepfield-v1')).blocks[0].data.money,13);
 await Promise.all([store.save(state),store.save({money:15})]);
 const chain=JSON.parse(values.get('deepfield-v1'));assert.equal(chain.blocks.length,3);assert.equal(chain.blocks[1].previousHash,chain.blocks[0].hash);
 assert.equal((await setup(values).store.load()).money,15);
});
test('tampered data, hashes, links and order are rejected without overwriting',async()=>{
 const {store,values}=setup();await store.save({money:7});await store.save({money:8});
 for(const mutate of [c=>c.blocks[0].data.money++,c=>c.blocks[0].hash='f'.repeat(64),c=>c.blocks[1].previousHash='0'.repeat(64),c=>c.blocks.reverse()]){
  const chain=JSON.parse(values.get('deepfield-v1'));mutate(chain);const raw=JSON.stringify(chain),copy=new Map([['deepfield-v1',raw]]),broken=setup(copy).store;
  await assert.rejects(broken.load());await assert.rejects(broken.save({money:0}));assert.equal(copy.get('deepfield-v1'),raw);
 }
});
test('retains 100 blocks with a verifiable anchored suffix and continues after reload',async()=>{
 const {store,values}=setup();for(let i=0;i<105;i++)await store.save({money:i});
 const chain=JSON.parse(values.get('deepfield-v1'));assert.equal(chain.blocks.length,100);assert.equal(chain.startIndex,5);assert.equal(chain.anchor,chain.blocks[0].previousHash);
 const loaded=setup(values).store;assert.equal((await loaded.load()).money,104);await loaded.save({money:105});assert.equal((await setup(values).store.load()).money,105);
});
test('reads previous encrypted saves and migrates to plaintext blocks',async()=>{
 const crypto=require('node:crypto').webcrypto,raw=crypto.getRandomValues(new Uint8Array(32)),iv=crypto.getRandomValues(new Uint8Array(12));
 const key=await crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt']);const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode('{"money":42}'));
 const b64=v=>Buffer.from(v).toString('base64'),values=new Map([['deepfield-key-v1',b64(raw)],['deepfield-v1',JSON.stringify({format:'deepfield-aes-gcm',version:1,iv:b64(iv),data:b64(encrypted)})]]);
 const {store}=setup(values),state=await store.load();assert.equal(state.money,42);await store.save(state);assert.equal(JSON.parse(values.get('deepfield-v1')).blocks[0].data.money,42);
});
