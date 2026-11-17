const SaveStorage=(()=>{
 const slot='deepfield-v1',limit=100;
 let queue=Promise.resolve(),blocked=false,chain=null;
 async function hash(block){
  const bytes=new TextEncoder().encode(JSON.stringify([block.index,block.timestamp,block.previousHash,block.data]));
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 }
 async function load(){
  try{
   const raw=localStorage.getItem(slot);if(raw===null)return null;
   const data=JSON.parse(raw);
   // Read the previous encrypted format only to migrate existing saves.
   if(data?.format==='deepfield-aes-gcm'){
    if(data.version!==1)throw Error('Unsupported save format');
    const decode=text=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
    const rawKey=localStorage.getItem('deepfield-key-v1');if(!rawKey)throw Error('Save key missing');
    const key=await crypto.subtle.importKey('raw',decode(rawKey),'AES-GCM',false,['decrypt']);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(data.iv)},key,decode(data.data));
    return JSON.parse(new TextDecoder().decode(plain));
   }
   if(data?.format!=='deepfield-local-chain')return data;
   if(data.version!==1||!Array.isArray(data.blocks)||!data.blocks.length||data.blocks.length>limit)throw Error('Invalid chain');
   let previous=data.anchor,index=data.startIndex;
   if(!Number.isSafeInteger(index)||index<0||typeof previous!=='string'||!/^[a-f0-9]{64}$/.test(previous)||(index===0&&previous!=='0'.repeat(64)))throw Error('Invalid anchor');
   for(const block of data.blocks){
    if(block.index!==index++||!Number.isSafeInteger(block.timestamp)||block.timestamp<0||block.previousHash!==previous||await hash(block)!==block.hash)throw Error('Broken save chain');
    previous=block.hash;
   }
   chain=data;return JSON.parse(JSON.stringify(data.blocks.at(-1).data));
  }catch(error){blocked=true;throw error;}
 }
 function save(state){
  // Snapshot before queuing so rapid saves retain their own state and order.
  const snapshot=JSON.parse(JSON.stringify(state));
  const result=queue.then(async()=>{
   if(blocked)throw Error('Existing save could not be loaded');
   const next=chain?JSON.parse(JSON.stringify(chain)):{format:'deepfield-local-chain',version:1,startIndex:0,anchor:'0'.repeat(64),blocks:[]};
   const last=next.blocks.at(-1),block={index:last?last.index+1:0,timestamp:Date.now(),previousHash:last?last.hash:next.anchor,data:snapshot};
   block.hash=await hash(block);next.blocks.push(block);
   if(next.blocks.length>limit){next.anchor=next.blocks.shift().hash;next.startIndex=next.blocks[0].index;}
   localStorage.setItem(slot,JSON.stringify(next));chain=next;
  });
  queue=result.catch(()=>{});return result;
 }
 return {load,save,flush:()=>queue};
})();
