globalThis.__storageWorker=true;
const values=new Map();
globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
importScripts('storage.js');
let requests=Promise.resolve();
self.onmessage=({data})=>{requests=requests.then(async()=>{
 try{
  if(data.type==='load'){
   if(data.raw!==null)values.set('deepfield-v1',data.raw);
   if(data.key!==null)values.set('deepfield-key-v1',data.key);
   self.postMessage({id:data.id,value:await SaveStorage.load()});
  }else if(data.type==='save'){
   await SaveStorage.save(data.state);self.postMessage({id:data.id,raw:values.get('deepfield-v1')});
  }else throw Error('Unknown storage request');
 }catch(error){self.postMessage({id:data.id,error:error.message});}
});};
