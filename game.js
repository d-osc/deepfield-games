const M=Mining,$=s=>document.querySelector(s);let state=M.fresh(),tab='mine',bagTab='ores',sector=0,qte=null,logs=[],particles=[],flash=0,swing=null,lastFrame=0,frameStep=1,lootDrops=[],lootBursts=[],lootBannerUntil=0,lootArrivalUntil=0;
let loadFailed=false;
try{let saved=M.migrate(await SaveStorage.load());if(M.valid(saved))state=saved;}catch{loadFailed=true;}
sector=state.sector;
async function save(){try{await SaveStorage.save(state);$('#savehint').textContent='✓ บันทึกใน blockchain ภายในเครื่องแล้ว';}catch{$('#savehint').textContent='บันทึกอัตโนมัติไม่ได้ • กรุณาส่งออกเซฟ';}}
function toast(t){$('#toast').textContent=t;$('#window-notice').textContent=t;}
function cost(c){return Object.entries(c).filter(([,v])=>v).map(([k,v])=>k==='money'?`${v} G`:`${M.ores.find(o=>o.id===k).name} ${v}`).join(' + ');}
function btn(label,action,id,disabled=false){return `<button data-action="${action}" data-id="${id}" ${disabled?'disabled':''}>${label}</button>`;}
function effectBadge(type){const e=M.types[type].effect;return `<div class="effect-info"><strong>✦ ${e.name}</strong><span>${e.description}</span></div>`;}
let dropSector=0,dropQuality=100;
function renderPlayer(){
 const p=state.player,cost=M.energyCost(state),max=M.maxEnergy(state);
 $('#playercard').innerHTML=`<div class="player-card"><div class="toolrow"><strong>นักขุด Lv.${p.level}</strong><span class="tiny">EXP ${p.xp}/${M.xpNeeded(p.level)}</span></div><div class="bar xp"><i style="width:${p.xp/M.xpNeeded(p.level)*100}%"></i></div><div class="toolrow"><span>⚡ กำลัง</span><strong>${Math.floor(p.energy)} / ${max}</strong></div><div class="bar energy"><i style="width:${p.energy/max*100}%"></i></div><div class="tiny">ขุดครั้งละ ${cost} • พักฟื้น +1 / 30 วินาที</div>${cost>max?'<div class="warning tiny">กำลังสูงสุดไม่พอ • เพิ่มเลเวล เปลี่ยนอีเตอร์ หรือใช้อาหารลดกำลัง</div>':''}${state.buffs.map(b=>`<div class="buff-chip">${M.foods[b.foodId].icon} ${M.foods[b.foodId].name} <small>เหลือ ${b.remaining} ครั้ง</small></div>`).join('')}<button data-tab="bag" data-open-bag="foods" class="quick-food">🍱 กินอาหารจากกระเป๋า</button></div>`;
 $('#mine').disabled=!!qte||!!swing||M.tool(state).dur<=0||p.energy<cost;
}
function renderFood(shop=true){return `<div class="storecard"><div class="eyebrow">MINER'S CANTEEN</div><h3>อาหาร 30 แบบ</h3><p>กินเพื่อฟื้นกำลังและรับบัฟตามจำนวนครั้งขุด บัฟชนิดเดียวกันแทนที่กัน บัฟต่างชนิดใช้ร่วมกันได้ การขุดพลาดนับเป็นหนึ่งครั้งด้วย</p><div class="shop-grid food-grid">${M.foods.map(f=>`<article class="shop-item"><div class="food-art" role="img" aria-label="${f.name}">${f.icon}</div><h4>${f.name}</h4><p class="food-description">${f.description}</p><div class="item-detail">ในกระเป๋า ${state.foods[f.id]} ชิ้น</div>${shop?`<div class="item-price">${f.price} G</div>${btn('ซื้อ 1 ชิ้น','buyFood',f.id,!!qte||state.money<f.price)}`:''}${btn('กินอาหาร','eat',f.id,!!qte||!state.foods[f.id]||(f.kind==='restore'&&state.player.energy>=M.maxEnergy(state)))}</article>`).join('')}</div></div>`;}
function renderRates(){
 const m=M.mines[dropSector],rates=M.dropRates(state,dropSector,dropQuality).sort((a,b)=>b.chance-a.chance);
 $('#droprates').innerHTML=`<div class="storecard rate-panel"><div class="eyebrow">DROP TABLE / PRIMARY ROLL</div><h3>อัตราดรอป • ${m.name}</h3><p>${m.debuff.name}: ${m.debuff.description}</p><label class="quality-slider">คุณภาพการกด <strong>${dropQuality}%</strong><input id="drop-quality" type="range" min="1" max="100" value="${dropQuality}" aria-label="คุณภาพสำหรับคำนวณอัตราดรอป"></label><p class="tiny">แร่ที่ไม่อยู่ในรายการนี้ไม่ดรอปในเหมืองนี้ เอฟเฟกต์อีเตอร์และอาหารไม่เพิ่มชนิดแร่ข้ามเหมือง คำนวณจากอีเตอร์ บัฟอาหาร และดีบัฟปัจจุบัน เมื่อกดถูกปุ่มที่คุณภาพนี้ หนึ่งครั้งสุ่มแร่หลักหนึ่งชนิด รวม 100% โบนัสเสียงสะท้อนสุ่มเพิ่มแยกอีกครั้ง กดผิดหรือหมดเวลาไม่ได้แร่</p><div class="rates-grid">${rates.map(({ore,chance})=>`<div class="rate-row"><img src="assets/ores/${ore.icon}" alt="" width="24" height="24"><span>${ore.name}</span><strong>${(chance*100).toFixed(3)}%</strong></div>`).join('')}</div></div>`;
}
document.addEventListener('change',e=>{if(e.target.id==='drop-quality'){dropQuality=+e.target.value;renderRates();}});
function renderMineBrowser(){
 $('#minecount').textContent=`${state.unlocked.length} / ${M.mines.length} เหมืองปลดล็อกแล้ว`;
 const location=M.mines[sector];$('#deposit-preview').innerHTML=location.drops.map(id=>{const o=M.ores.find(o=>o.id===id);return `<img src="assets/ores/${o.icon}" alt="${o.name}" width="24" height="24">`;}).join('');$('#rockname').textContent=location.name;$('#sectorlabel').textContent=`SECTOR ${String(sector+1).padStart(2,'0')} / ${location.code}`;$('#depth').textContent=`ความลึก ${location.depth} m`;
 if(tab==='mine')$('#viewtitle').textContent=location.name;
 const d=M.debuff(state);$('#criticalinfo').textContent=`คุณภาพ 100%: เพชร ${((M.dropRates(state,sector,100).find(r=>r.ore.id==='diamond')?.chance||0)*100).toFixed(1)}% • ${d.name}: ${d.description} (หลังบัฟ ${d.value.toFixed(1)}%)`;
 $('#deposits').innerHTML=M.mines.map((mine,i)=>{
  const unlocked=state.unlocked.includes(i),rates=M.dropRates(state,i,100);
  return `<article class="mine-card ${sector===i?'selected':''} ${unlocked?'':'is-locked'}"><span class="mine-number" style="color:${mine.color}">${String(i+1).padStart(2,'0')} ◆ ${unlocked?'':'🔒'}</span><strong>${mine.name}</strong><small>ความลึก ${mine.depth} m</small><div class="mine-debuff">⚠ ${mine.debuff.name}<br>${mine.debuff.description}</div><div class="featured-rates">${mine.featured.map(id=>{const r=rates.find(r=>r.ore.id===id);return `<span><img src="assets/ores/${r.ore.icon}" alt="" width="20" height="20">${r.ore.name} ${(r.chance*100).toFixed(2)}%</span>`;}).join('')}</div><small>อัตราที่คุณภาพ 100% ตามอีเตอร์/บัฟปัจจุบัน</small>${unlocked?`<button data-sector="${i}" ${qte||swing?'disabled':''}>${sector===i?'อยู่ในเหมืองนี้':'เข้าเหมือง'}</button>`:btn(`ปลดล็อก ${mine.unlockPrice.toLocaleString()} G`,'unlock',i,!!qte||!!swing||state.money<mine.unlockPrice)}<button data-rate="${i}" class="rate-button">ดูแร่ที่ดรอป ${mine.drops.length} ชนิด</button></article>`;
 }).join('');renderRates();
}
let oreCategory='all',shopTab='ores';
function oreEntries(){return M.ores.map((o,i)=>({o,i})).filter(({o})=>oreCategory==='all'||o.category===oreCategory);}
function oreFilter(){return `<label class="ore-filter">ประเภทแร่ <select id="ore-category" aria-label="กรองประเภทแร่">${Object.entries({all:'ทั้งหมด',metal:'แร่โลหะ',mineral:'แร่ทั่วไป',gem:'อัญมณี',fantasy:'แร่แฟนตาซี'}).map(([id,label])=>`<option value="${id}" ${oreCategory===id?'selected':''}>${label} (${M.ores.filter(o=>id==='all'||o.category===id).length})</option>`).join('')}</select></label>`;}
function pickaxeHead(type){return [
 [[-2,3.1],[-1.25,3.85],[-.4,4.05],[.6,3.9],[1.6,3.15],[.6,3.48],[-.4,3.56],[-1.2,3.4]],
 [[-2,3.1],[-1.3,4],[-.3,4.1],[.8,4],[1.6,3.8],[1.6,3.25],[.7,3.25],[.7,3.55],[-.4,3.6],[-1.3,3.45]],
 [[-2,3.1],[-1.2,3.95],[-.5,3.8],[0,4.35],[.45,3.8],[1.15,3.95],[1.8,3.15],[.7,3.5],[-.7,3.5]],
 [[-2,3.1],[-1.5,4.15],[-.9,4.35],[-1.1,3.95],[.6,3.95],[1.3,4.1],[1.8,3.4],[1,3.6],[-.8,3.55]],
 [[-2,3.1],[-1.6,3.8],[-.7,4.05],[.7,4.05],[1.75,3.5],[1.75,3.05],[.9,3.35],[.5,3.6],[-.7,3.6]],
 [[-2,3.1],[-1.4,4],[-.65,3.85],[-.4,4.2],[0,3.95],[.5,4.2],[.7,3.85],[1.25,4],[1.8,3.15],[.55,3.5],[-.6,3.5]],
 [[-2,3.1],[-1.6,3.9],[-.9,4.15],[.3,4.15],[.9,3.9],[1.7,4.1],[1.7,3.1],[.9,3.3],[.4,3.6],[-.8,3.6]],
 [[-2,3.1],[-1.2,4.05],[-.3,4.05],[0,4.4],[.3,4.05],[1.2,4.05],[1.9,3.15],[.9,3.5],[0,3.65],[-.9,3.5]],
 [[-2,3.1],[-1.45,4.2],[-.8,4.35],[-.9,4],[.5,4],[.8,4.25],[1.5,4.25],[1.5,3.3],[.8,3.3],[.5,3.65],[-.8,3.65]],
 [[-2,3.1],[-1.65,3.8],[-.8,4.15],[0,4.4],[.75,4.15],[1.6,3.8],[1.9,3.15],[.8,3.5],[0,3.7],[-.8,3.5]]
 ][M.types[type].style];}
document.addEventListener('change',e=>{if(e.target.id==='ore-category'){oreCategory=e.target.value;renderStore();}});
function itemArt(kind,index){
 if(kind==='ore'){const ore=M.ores[index];return `<div class="item-art ore ore-${ore.id}"><img src="assets/ores/${ore.icon}" alt="${ore.name}" width="80" height="80"></div>`;}
 const type=M.types[index],head=pickaxeHead(index).map(([x,y])=>`${50+x*18},${96-y*19}`).join(' ');
 return `<div class="item-art tool"><svg viewBox="0 0 100 100" role="img" aria-label="${type.name}"><g transform="rotate(27 50 50)"><path d="M46 24h8v64h-8Z" fill="${type.handle}"/><path d="M46 24h3v64h-3Z" fill="#fff" opacity=".25"/><path d="M44 62h12v19H44Z" fill="#293e36"/><path d="M44 66h12m-12 5h12m-12 5h12" stroke="${type.color}" stroke-width="2" opacity=".7"/><polygon points="${head}" fill="${type.color}" stroke="#34463e" stroke-width="1.5" stroke-linejoin="round"/><path d="M20 30 38 23 55 23 75 30" fill="none" stroke="#fff" stroke-width="2" opacity=".4"/><path d="M44 19h13v13H44Z" fill="${type.handle}"/><path d="m50 21 4 5-4 4-4-4Z" fill="${type.color}"/></g></svg></div>`;
}
function serviceTool(t){return `<div class="service-tool">${itemArt('tool',t.type)}<div class="service-tool-info"><div class="eyebrow">อีเตอร์ที่กำลังใช้</div><h4>${M.types[t.type].name}</h4>${effectBadge(t.type)}<div class="item-detail">ระดับ ${t.level} / 10 • พลังขุด ${M.types[t.type].power+Math.floor((t.level-1)/2)} • ใช้กำลัง ${M.types[t.type].energyCost}</div><div class="bar"><i style="width:${t.dur/M.maxDur(t)*100}%"></i></div><div class="item-detail ${t.dur===0?'warning':''}">${t.dur===0?'พังแล้ว • ':''}ความทนทาน ${t.dur} / ${M.maxDur(t)}</div></div></div>`;}
function renderBag(){
 let count=M.ores.reduce((sum,o)=>sum+state.ores[o.id],0),value=M.ores.reduce((sum,o)=>sum+M.oreValue(state,o.id),0);
 return `<div class="bag-summary"><div><span class="eyebrow">แร่ทั้งหมด</span><strong>${count.toLocaleString()} <small>ชิ้น</small></strong></div><div><span class="eyebrow">มูลค่าแร่รวม</span><strong>${value.toLocaleString()} <small>G</small></strong></div><div><span class="eyebrow">อีเตอร์ในกระเป๋า</span><strong>${state.tools.length} <small>ชิ้น</small></strong></div></div>
 <div class="bag-tabs" role="group" aria-label="ประเภทของในกระเป๋า"><button data-bag-tab="ores" aria-pressed="${bagTab==='ores'}" class="${bagTab==='ores'?'active':''}">◆ ช่องแร่ <small>${count.toLocaleString()} ชิ้น</small></button><button data-bag-tab="tools" aria-pressed="${bagTab==='tools'}" class="${bagTab==='tools'?'active':''}">⚒ ช่องอีเตอร์ <small>${state.tools.length} ชิ้น</small></button><button data-bag-tab="foods" aria-pressed="${bagTab==='foods'}" class="${bagTab==='foods'?'active':''}">🍱 ช่องอาหาร <small>${Object.values(state.foods).reduce((a,b)=>a+b,0)} ชิ้น</small></button></div>
 <section ${bagTab==='ores'?'':'hidden'} aria-label="ช่องแร่"><div class="storecard"><div class="eyebrow">ORE COLLECTION</div><h3>แร่ของคุณ</h3><p>เก็บไว้ซ่อม อัปเกรด หรือขายที่ร้านค้า</p>${oreFilter()}<div class="shop-grid">${oreEntries().map(({o,i})=>`<article class="shop-item ${state.ores[o.id]?'':'empty-item'}">${itemArt('ore',i)}<h4>${o.name}</h4><div class="bag-quantity">${state.ores[o.id].toLocaleString()} <small>ชิ้น</small></div><div class="item-detail">${M.oreValue(state,o.id,1)} G / ชิ้น</div><div class="item-detail">มูลค่ารวม ${M.oreValue(state,o.id).toLocaleString()} G</div></article>`).join('')}</div></div>
 </section><section ${bagTab==='tools'?'':'hidden'} aria-label="ช่องอีเตอร์"><div class="eyebrow">YOUR PICKAXES</div><h3>อีเตอร์ของคุณ</h3><div class="owned-tools bag-slots">${state.tools.map(t=>`<article class="storecard owned-tool ${t.id===state.equipped?'is-equipped':''}">${itemArt('tool',t.type)}<div class="owned-info">${effectBadge(t.type)}<div class="toolrow"><strong>${M.types[t.type].name}</strong><span class="tag">Lv.${t.level}</span></div><div class="item-detail">พลังขุด ${M.types[t.type].power+Math.floor((t.level-1)/2)} • ใช้กำลัง ${M.types[t.type].energyCost} • ความทนทาน ${t.dur} / ${M.maxDur(t)}</div><div class="bar"><i style="width:${t.dur/M.maxDur(t)*100}%"></i></div>${t.dur===0?'<div class="item-detail warning">พังแล้ว • นำไปซ่อมเพื่อใช้ขุดต่อ</div>':''}${btn(t.id===state.equipped?'กำลังใช้':'สวมใส่','equip',t.id,t.id===state.equipped)}</div></article>`).join('')}</div></section><section ${bagTab==='foods'?'':'hidden'} aria-label="ช่องอาหาร">${renderFood(false)}</section>`;
}
function render(){renderPlayer();let t=M.tool(state),max=M.maxDur(t);$('#wallet').textContent=`◈ ${state.money.toLocaleString()} G`;$('#toolcard').innerHTML=`<div class="tool"><div class="hud-tool-art">${itemArt('tool',t.type)}</div><div class="tiny">EQUIPPED PICKAXE</div><div class="tool-icon">⚒</div><strong>${M.types[t.type].name}</strong>${effectBadge(t.type)}<div class="tiny">LEVEL ${t.level} • พลังขุด ${M.types[t.type].power+Math.floor((t.level-1)/2)} • ใช้กำลัง ${M.types[t.type].energyCost}</div><div class="bar"><i style="width:${t.dur/max*100}%;background:${t.dur?'':'#ef9c7e'}"></i></div><div class="tiny">${t.dur===0?'พังแล้ว • ไปที่ร้านซ่อม':'ความทนทาน'} <span style="float:right">${t.dur} / ${max}</span></div></div>`;$('#mine').disabled=!!qte||!!swing||t.dur===0||state.player.energy<M.energyCost(state);$('#count').textContent=Object.values(state.ores).reduce((a,b)=>a+b,0);$('#ores').innerHTML=M.ores.filter(o=>state.ores[o.id]>0).map(o=>`<div class="ore"><img class="ore-thumb ore-${o.id}" src="assets/ores/${o.icon}" alt="" width="32" height="32"><div><strong>${o.name}</strong><small>${M.oreValue(state,o.id,1)} G / ชิ้น</small></div><b>${state.ores[o.id]}</b></div>`).join('')||'<p class="tiny">ยังไม่มีแร่ • ขุดเพื่อสะสมได้เลย</p>';$('#stats').textContent=`ขุด ${state.hits} ครั้ง / CRITICAL ${state.crits}`;$('#log').innerHTML=logs.slice(0,5).map(x=>`<p>${x}</p>`).join('')||'<p>แร่ก้อนแรกกำลังรอคุณอยู่</p>';renderMineBrowser();renderStore();}
function renderStore(){let el=$('#storeview'),t=M.tool(state);if(tab==='bag'){el.innerHTML=renderBag();}else if(tab==='shop'){
el.innerHTML=`<div class="storecard"><div class="eyebrow">ORE EXCHANGE</div><h3>เคาน์เตอร์รับซื้อแร่</h3><p>ขายแยกชนิดเพื่อเก็บวัตถุดิบไว้ซ่อมและอัปเกรด • หินใช้ซ่อมอีเตอร์</p>${oreFilter()}<div class="shop-grid">${oreEntries().map(({o,i})=>`<article class="shop-item">${itemArt('ore',i)}<h4>${o.name}</h4><div class="item-detail">ในกระเป๋า <strong>${state.ores[o.id]} ชิ้น</strong></div><div class="item-price">${M.oreValue(state,o.id,1)} G <small>/ ชิ้น</small></div>${btn(`ขายทั้งหมด · ${M.oreValue(state,o.id)} G`,'sellOre',o.id,!state.ores[o.id])}</article>`).join('')}</div></div>
${renderFood()}<div class="storecard"><div class="eyebrow">PICKAXE SUPPLY</div><h3>ซื้ออีเตอร์ <span class="tiny">${M.types.length} แบบ</span></h3><p>เลือกอีเตอร์คู่ใจ ซื้อแล้วสวมใส่ได้จากคลังด้านล่าง</p><div class="shop-grid">${M.types.map((x,i)=>`<article class="shop-item">${itemArt('tool',i)}<div class="tiny">รุ่น ${String(i+1).padStart(2,'0')} / ${M.types.length}</div><h4>${x.name}</h4>${effectBadge(i)}<div class="item-detail">พลังขุด <strong>${x.power}</strong> • ใช้กำลัง ${x.energyCost} (พื้นฐาน)</div><div class="item-detail">ความทนทาน <strong>${x.dur}</strong></div><div class="item-price">${x.price.toLocaleString()} G</div>${btn('ซื้ออีเตอร์','buy',i,state.money<x.price||state.tools.length>=100)}</article>`).join('')}</div></div>
<h3>คลังอีเตอร์ <span class="tiny">${state.tools.length} ชิ้น</span></h3><div class="owned-tools">${state.tools.map(x=>`<article class="storecard owned-tool ${x.id===state.equipped?'is-equipped':''}">${itemArt('tool',x.type)}<div class="owned-info">${effectBadge(x.type)}<div class="toolrow"><strong>${M.types[x.type].name}</strong><span class="tag">Lv.${x.level}</span></div><div class="item-detail">พลังขุด ${M.types[x.type].power+Math.floor((x.level-1)/2)} • ${x.dur===0?'พังแล้ว • ต้องซ่อม':`ความทนทาน ${x.dur} / ${M.maxDur(x)}`}</div><div class="bar"><i style="width:${x.dur/M.maxDur(x)*100}%"></i></div>${btn(x.id===state.equipped?'กำลังใช้':'สวมใส่','equip',x.id,x.id===state.equipped)}${btn(`ขาย · ${Math.floor(M.types[x.type].price*.4*(.2+.8*x.dur/M.maxDur(x)))} G`,'sellTool',x.id,state.tools.length<=1)}</div></article>`).join('')}</div>`;
}else if(tab==='repair'){let c=M.repairCost(t);el.innerHTML=`<div class="storecard"><div class="eyebrow">THE WORKSHOP</div><h3>กลับมาคมเหมือนเดิม</h3>${serviceTool(t)}<p>ซ่อมได้แม้อีเตอร์พัง เติมความทนทานให้เต็มโดยใช้เงินและหิน</p><p class="cost">ค่าซ่อม: ${cost(c)||'ซ่อมเต็มแล้ว'}</p>${btn('ซ่อมอีเตอร์ให้เต็ม','repair',t.id,t.dur===M.maxDur(t)||!M.afford(state,c))}<p>เงินไม่พอ? ขายแร่บางส่วนที่ร้านค้า เก็บหินไว้สำหรับซ่อมด้วย</p></div>`;}else if(tab==='upgrade'){let c=M.upgradeCost(t);el.innerHTML=`<div class="storecard"><div class="eyebrow">THE FORGE</div><h3>ขุดให้ไกลกว่าเดิม</h3>${serviceTool(t)}<p>เพิ่มความทนทานสูงสุด 10 ต่อระดับ และเพิ่มจำนวนแร่ทุก 2 ระดับ</p><p class="cost">${t.level>=10?'ถึงระดับสูงสุดแล้ว':`ค่าอัปเกรด: ${cost(c)}`}</p>${btn(`อัปเกรดเป็นระดับ ${Math.min(10,t.level+1)}`,'upgrade',t.id,t.level>=10||t.dur===0||!M.afford(state,c))}${t.dur===0?'<p class="warning">ต้องซ่อมอีเตอร์ที่พังก่อนอัปเกรด</p>':''}</div>`;}if(tab==='shop')el.innerHTML=`<div class="shop-tabs" role="group" aria-label="หมวดร้านค้า">${Object.entries({ores:'◈ ขายแร่',tools:'⚒ อีเตอร์ 100 แบบ',foods:'🍱 อาหาร 30 แบบ'}).map(([id,label])=>`<button data-shop-tab="${id}" class="${shopTab===id?'active':''}" aria-pressed="${shopTab===id}">${label}</button>`).join('')}</div><div class="shop-content shop-${shopTab}">${el.innerHTML}</div>`;
}

function openPanel(next,bagSection){
 if(!['mine','map','shop','bag','repair','upgrade'].includes(next))return;
 if(qte)finish(0,'ยกเลิกการขุด');
 if(bagSection)bagTab=bagSection;tab=next;
 $('#mineview').hidden=false;$('#game-window').hidden=tab==='mine';$('#mine-atlas').hidden=tab!=='map';$('#storeview').hidden=tab==='mine'||tab==='map';
 document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
 document.body?.classList?.toggle('panel-open',tab!=='mine');
 $('#viewtitle').textContent={mine:M.mines[sector].name,map:'แผนที่เหมือง',shop:'ร้านค้าค่ายนักขุด',bag:'กระเป๋านักขุด',repair:'โรงซ่อมอีเตอร์',upgrade:'เตาหลอมอัปเกรด'}[tab];
 $('#window-notice').textContent='';render();
 if(tab==='mine')$('#mine').focus();else $('.window-close').focus();
}

document.addEventListener('click',e=>{
 let b=e.target.closest('button');if(!b)return;
 if(b.dataset.shopTab){shopTab=b.dataset.shopTab;renderStore();return;}
 if(b.dataset.rate!==undefined){const next=+b.dataset.rate;if(!M.mines[next])return;dropSector=next;renderRates();$('#droprates').scrollIntoView({behavior:'smooth',block:'nearest'});return;}
 if(b.dataset.bagTab&&tab==='bag'){bagTab=b.dataset.bagTab;renderStore();return;}
 if(b.dataset.tab){openPanel(b.dataset.tab,b.dataset.openBag);return;}
 if(b.dataset.sector!==undefined&&!qte&&!swing){const next=+b.dataset.sector;if(Number.isInteger(next)&&M.mines[next]&&M.action(state,'travel',next)){sector=state.sector;dropSector=sector;save();openPanel('mine');toast('เข้าสู่'+M.mines[sector].name);}return;}
 if(b.dataset.action){
  let a=b.dataset.action,id=a==='sellOre'?b.dataset.id:+b.dataset.id;
  if(M.action(state,a,id)){save();render();if(a==='unlock')toast('ปลดล็อก'+M.mines[id].name+'แล้ว');else if(a==='eat')toast('กิน'+M.foods[id].name+'แล้ว');else if(a==='buyFood')toast('ซื้อ'+M.foods[id].name+'แล้ว');else if(a==='buy')toast('ซื้อ'+M.types[id].name+'แล้ว');else toast('ทำรายการเรียบร้อย');}
  else toast('ทำรายการไม่ได้ • ตรวจสอบเงิน วัตถุดิบ หรือกำลัง');
 }
});
$('#fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement?.requestFullscreen?.().catch(()=>toast('เบราว์เซอร์นี้ไม่รองรับเต็มหน้าจอ'));};
function begin(){
 if(qte||swing||tab!=='mine')return;const started=M.startMining(state,sector);if(!started.ok){toast(started.message);renderPlayer();return;}
 let key='ADEFGHIJKLNOPQSTVWXYZ'[Math.floor(Math.random()*21)];qte={key,start:performance.now(),duration:Math.max(150,Math.min(1450,(150+Math.random()*1300)*M.timingFactor(state,sector))),x:30+Math.random()*40,y:28+Math.random()*25};
 $('#prompt').innerHTML=`<div class="qte" style="left:${qte.x}%;top:${qte.y}%"><i class="target"></i><i class="ring"></i><b>${key}</b><small class="qte-score">0%</small></div>`;toast('กด '+key+' เมื่อวงสีขาวทับเส้นเขียว • ตรงเส้น 100%');save();render();
}
function finish(quality,reason){
 if(!qte)return;const percent=typeof quality==='boolean'?(quality?100:0):quality;qte=null;$('#prompt').innerHTML='';let result=M.mine(state,percent,sector);if(!result)return;
 let msg=result.ore?`${result.critical?'✦ PERFECT! ':''}${result.quality}% • ${result.ore.name} +${result.amount}`:'0% • ขุดพลาด ไม่ได้รับแร่';
 if(result.bonus)msg+=` • โบนัส ${result.bonus.name} +1`;if(result.triggered)msg+=` • ✦ ${result.effect.name}`;if(reason)msg+=' • '+reason;msg+=` • EXP +${result.xp}`;if(result.levels)msg+=` • LEVEL UP! Lv.${state.player.level}`;
 toast(msg);logs.unshift(msg);swing={start:performance.now(),critical:result.critical,color:result.ore?.color||'#889b90',impacted:false,loot:result};if(M.tool(state).dur===0)toast(msg+' • อีเตอร์พังแล้ว ไปซ่อมได้ที่ร้านซ่อม');save();render();
}
$('#mine').onclick=begin;
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){e.preventDefault();if(qte)finish(0,'ยกเลิกการขุด');if(tab!=='mine')openPanel('mine');return;}
 if(e.key==='Tab'&&tab!=='mine'){
  const controls=[...$('#game-window').querySelectorAll('button:not(:disabled), input, select, [tabindex="0"]')].filter(el=>el.offsetParent!==null);
  if(controls.length){const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;
 }
 if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;
 if(e.code==='Space'){if(e.target.tagName==='BUTTON'&&!qte)return;e.preventDefault();if(!qte)begin();return;}
 if(qte&&/^[a-z]$/i.test(e.key)){e.preventDefault();let p=(performance.now()-qte.start)/qte.duration,correct=e.key.toUpperCase()===qte.key;finish(correct?M.score(p):0,correct?'':'ผิดปุ่ม');return;}
 const shortcut={b:'bag',m:'map',c:'shop',r:'repair',u:'upgrade'}[e.key.toLowerCase()];if(shortcut){e.preventDefault();openPanel(tab===shortcut?'mine':shortcut);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&qte)finish(false,'หยุดการขุดเมื่อสลับหน้าต่าง');});
$('#export').onclick=()=>{let u=URL.createObjectURL(new Blob([JSON.stringify(state,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='deepfield-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('#import').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{if(f.size>100000)throw Error();let s=M.migrate(JSON.parse(await f.text()));if(!M.valid(s))throw Error();if(!confirm('นำเข้าเซฟนี้แทนความคืบหน้าปัจจุบัน?'))return;if(qte){qte=null;$('#prompt').innerHTML='';}state=s;sector=state.sector;dropSector=sector;logs=[];lootDrops=[];lootBursts=[];lootBannerUntil=0;$('#loot-banner').hidden=true;save();render();toast('นำเข้าเซฟเรียบร้อย');}catch{alert('ไฟล์เซฟไม่ถูกต้อง');}finally{e.target.value='';}};
// Perspective-projected low-poly cave, rendered locally with no network assets.
const canvas=$('#world'),ctx=canvas.getContext('2d');let W=800,H=430,dpr=1;function resize(){dpr=Math.min(devicePixelRatio||1,2);W=canvas.clientWidth;H=canvas.clientHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}new ResizeObserver(resize).observe(canvas);
let seed=42;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}const stones=Array.from({length:42},()=>({x:(rand()-.5)*26,y:rand()*1.2-2.5,z:rand()*22+4,s:.4+rand()*2}));
function project(p){let z=p[2]+13;return[W/2+p[0]*W*.8/z,H*.38-p[1]*W*.8/z];}
function poly(points,color){ctx.beginPath();points.map(project).forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle=color;ctx.fill();}
function rock(x,y,z,s,color){let a=[x-s,y,z-s],b=[x+s,y,z-s],c=[x+s*.9,y,z+s],d=[x-s,y,z+s],top=[x-s*.2,y+s*1.6,z],l=[x-s*.7,y+s*.7,z-s*.7],r=[x+s*.7,y+s*.8,z-s*.4];poly([d,c,top],color[0]);poly([a,d,top,l],color[1]);poly([b,a,l,r],color[2]);poly([c,b,r,top],color[3]);poly([l,top,r],color[4]);}
function frame(now){frameStep=Math.min(2.5,(now-(lastFrame||now-16.67))/16.67);lastFrame=now;updateSwing(now);ctx.clearRect(0,0,W,H);let bg=ctx.createLinearGradient(0,0,0,H);bg.addColorStop(0,M.mines[sector].bg);bg.addColorStop(1,M.mines[sector].floor);ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);poly([[-30,-3,0],[30,-3,0],[30,-3,50],[-30,-3,50]],M.mines[sector].floor);for(let i=0;i<8;i++){let x=(i-3.5)*6;rock(x,-3,27,4,['#152724','#1a2c27','#22362c','#112420','#304235']);}for(const r of [...stones].sort((a,b)=>b.z-a.z))rock(r.x,r.y,r.z,r.s,['#34493b','#2b3b32','#405442','#253b32','#4a5d46']);let shake=impactShake(now);ctx.save();ctx.translate(shake,shake*.4);drawMiningBoulder();ctx.restore();drawPickaxe(now);let glow=ctx.createRadialGradient(W*.5,H*.45,0,W*.5,H*.45,W*.45);glow.addColorStop(0,'#c9e88b0c');glow.addColorStop(1,'#00000080');ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);for(let i=0;i<22;i++){let x=(i*137.5+Math.sin(now*.0002+i)*20)%W,y=(i*51-now*.012)%H;if(y<0)y+=H;ctx.fillStyle='#e2efbc33';ctx.fillRect(x,y,2,2);}for(let p of particles){p.x+=p.vx*frameStep;p.y+=p.vy*frameStep;p.vy+=.12*frameStep;p.life-=.025*frameStep;ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,4,4);}particles=particles.filter(p=>p.life>0);ctx.globalAlpha=1;if(flash>0){ctx.fillStyle=`rgba(211,255,163,${flash*.15})`;ctx.fillRect(0,0,W,H);flash=Math.max(0,flash-.025*frameStep);}drawLootEffects(now);if(qte){let p=(now-qte.start)/qte.duration;if(p>=1)finish(false,'หมดเวลา');else{let ring=$('.ring');if(ring){let size=150-110*p;ring.style.width=ring.style.height=size+'px';let quality=M.score(p);ring.style.borderColor=quality===100?'#c4f589':'#ffffff';const score=$('.qte-score');if(score)score.textContent=quality+'%';}}}requestAnimationFrame(frame);}
// Imported Kenney Nature Kit OBJ meshes, bundled locally under CC0.
function stoneNoise(n){let v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);}
const rockMeshes=M.mines.map((mine,index)=>{
 const model=RockAssets[mine.model],yaw=(index%5)*.35,c=Math.cos(yaw),s=Math.sin(yaw);
 const min=[0,1,2].map(k=>Math.min(...model.vertices.map(p=>p[k])));
 const max=[0,1,2].map(k=>Math.max(...model.vertices.map(p=>p[k])));
 const scale=6.2/Math.max(...max.map((v,k)=>v-min[k]));
 const vertices=model.vertices.map(p=>[(p[0]-(min[0]+max[0])/2)*scale,(p[1]-min[1])*scale-2.9,(p[2]-(min[2]+max[2])/2)*scale+2]);
 for(const p of vertices){const x=p[0],z=p[2]-2;p[0]=x*c+z*s;p[2]=2-x*s+z*c;}
 return model.faces.map((face,id)=>{
  const p=face.indices.map(i=>vertices[i]),center=[0,1,2].map(k=>p.reduce((v,a)=>v+a[k],0)/3),n=[face.normal[0]*c+face.normal[2]*s,face.normal[1],-face.normal[0]*s+face.normal[2]*c];
  const visible=n[0]*-center[0]+n[1]*-center[1]+n[2]*(-13-center[2])>0;
  return {p,center,id,visible,light:Math.max(0,n[0]*-.45+n[1]*.72+n[2]*-.52)};
 }).filter(f=>f.visible).sort((a,b)=>b.center[2]-a.center[2]);
});
function stonePoint(face,a,b){let c=1-a-b;return face.p[0].map((n,k)=>n*a+face.p[1][k]*b+face.p[2][k]*c);}
function drawMiningBoulder(){
 let shadow=project([0,-2.95,2]);ctx.save();ctx.translate(...shadow);ctx.scale(1,.24);ctx.beginPath();ctx.arc(0,0,W*.205,0,Math.PI*2);ctx.fillStyle='#07100c77';ctx.fill();ctx.restore();
 const oreColors=[M.mines[sector].color,M.mines[sector].color,'#e3edcf'];
 for(const f of rockMeshes[sector]){
  let grain=stoneNoise(f.id+17)*14,shade=Math.round(42+f.light*64+grain);
  poly(f.p,`rgb(${shade},${shade+5},${shade+1})`);
  // Speckles stay attached to their triangle as the rock shakes.
  for(let i=0;i<7;i++){
   let a=stoneNoise(f.id*31+i*3),b=stoneNoise(f.id*71+i*7)*(1-a),p=project(stonePoint(f,a,b));
   ctx.fillStyle=i%2?'#e7e5cd20':'#111b1940';ctx.fillRect(p[0],p[1],1+stoneNoise(i+f.id)*2,1);
  }
  let vein=Math.sin(f.center[0]*2.4+f.center[1]*1.9+sector*.8);
  if(Math.abs(vein)<.55&&f.center[1]>-1.9){
   let a=stonePoint(f,.12,.16),b=stonePoint(f,.74,.12),c=stonePoint(f,.23,.64),d=stonePoint(f,.3,.32);
   poly([a,b,d],oreColors[0]);poly([b,c,d],oreColors[1]);poly([c,a,d],oreColors[2]);
  }
  if(stoneNoise(f.id+810)>.73){let a=project(stonePoint(f,.12,.25)),b=project(stonePoint(f,.3,.35)),c=project(stonePoint(f,.55,.13));ctx.beginPath();ctx.moveTo(...a);ctx.lineTo(...b);ctx.lineTo(...c);ctx.strokeStyle='#17201a80';ctx.lineWidth=1;ctx.stroke();}
 }
}
// A solid 3D pickaxe: rotate vertices through the swing before perspective projection.
function pickaxePoint(p,angle,lift){
 let [x,y,z]=p,c=Math.cos(angle),s=Math.sin(angle),yaw=-.42;
 let rx=x*c-y*s,ry=x*s+y*c;
 return [2.8+rx*Math.cos(yaw)+z*Math.sin(yaw),-3.2+ry+lift,-2.5-rx*Math.sin(yaw)+z*Math.cos(yaw)];
}
function pickaxeMesh(angle,lift){
 const faces=[],type=M.tool(state).type,design=M.types[type];
 function prism(outline,depth,palette){
  let front=outline.map(([x,y])=>pickaxePoint([x,y,-depth],angle,lift));
  let back=outline.map(([x,y])=>pickaxePoint([x,y,depth],angle,lift));
  faces.push({p:front,color:palette[0]},{p:back,color:palette[1]});
  for(let i=0;i<outline.length;i++){let j=(i+1)%outline.length;faces.push({p:[front[i],front[j],back[j],back[i]],color:palette[2+i%2]});}
 }
 prism([[-.15,-.4],[.15,-.4],[.15,3.7],[-.15,3.7]],.14,[design.handle,'#39433b',design.handle,'#60543d']);
 prism([[-.21,.1],[.21,.1],[.21,1.1],[-.21,1.1]],.18,['#35423f','#1b2926','#687467','#27372f']);
 const metal=[design.color,'#445d56','#edf6e5',design.color];
 prism(pickaxeHead(type),.25,metal);
 prism([[-.27,3.35],[.27,3.35],[.27,3.95],[-.27,3.95]],.31,['#b7a16f','#645335','#ead49c','#8a764e']);
 return faces.sort((a,b)=>b.p.reduce((v,p)=>v+p[2],0)/b.p.length-a.p.reduce((v,p)=>v+p[2],0)/a.p.length);
}
function swingPose(now){
 if(swing){let t=(now-swing.start)/1000;
  // Wind-up, fast strike, short contact hold, then eased recovery.
  if(t<.14)return {angle:.95+t/.14*.35,lift:.25};
  if(t<.32){let p=(t-.14)/.18;return {angle:1.3-1.85*p*p,lift:.25-.25*p};}
  if(t<.39)return {angle:-.55,lift:0};
  let p=Math.min(1,(t-.39)/.46),ease=1-(1-p)**3;
  return {angle:-.55+.7*ease,lift:0};
 }
 if(qte){let p=Math.min(1,(now-qte.start)/qte.duration);return {angle:.15+.8*Math.sin(p*Math.PI/2),lift:.25*p};}
 return {angle:.15+Math.sin(now*.0015)*.025,lift:Math.sin(now*.002)*.025};
}
function drawPickaxe(now){if(M.tool(state).dur===0&&!swing)return;let pose=swingPose(now);for(let f of pickaxeMesh(pose.angle,pose.lift))poly(f.p,f.color);}
function impactShake(now){if(!swing?.impacted)return 0;let t=(now-swing.start-320)/400;return t>=0&&t<1?Math.sin(t*65)*(1-t)*(swing.critical?12:5):0;}
const lootImages=new Map();
function lootImage(ore){
 if(lootImages.has(ore.id))return lootImages.get(ore.id);
 if(typeof Image==='undefined')return null;
 const image=new Image();image.src='assets/ores/'+ore.icon;lootImages.set(ore.id,image);return image;
}
function spawnLootEffects(result,tip,now){
 const entries=[{ore:result.ore,amount:result.amount,bonus:false}];
 if(result.bonus)entries.push({ore:result.bonus,amount:1,bonus:true});
 for(const [entryIndex,entry]of entries.entries()){
  lootImage(entry.ore);
  const count=Math.min(6,2+Math.ceil(Math.log2(entry.amount+1)));
  for(let i=0;i<count;i++)lootDrops.push({ore:entry.ore,start:now+i*45+entryIndex*110,duration:1550+i*65,x:tip[0]/W,y:tip[1]/H,dx:((i-(count-1)/2)*34+(Math.random()-.5)*25)/W,dy:-(100+Math.random()*65)/H,size:entry.bonus?32:36,spin:(Math.random()-.5)*1.2,bonus:entry.bonus,perfect:result.critical});
  lootBursts.push({x:tip[0]/W,y:tip[1]/H,start:now+entryIndex*110,color:entry.ore.color,perfect:result.critical||entry.bonus,label:`${entry.bonus?'✦ ':''}+${entry.amount} ${entry.ore.name}`,bonus:entry.bonus});
 }
 lootDrops=lootDrops.slice(-48);lootBursts=lootBursts.slice(-8);
 $('#loot-banner').innerHTML=`<div class="loot-award ${result.critical?'is-perfect':''}"><div class="loot-award-icon"><img class="ore-${result.ore.id}" src="assets/ores/${result.ore.icon}" alt="${result.ore.name}" width="64" height="64"></div><div class="loot-award-text"><small>${result.critical?'✦ PERFECT DROP':'ได้รับแร่'} <span>${result.quality}%</span></small><strong>${result.ore.name} <b>+${result.amount}</b></strong>${result.bonus?`<div class="loot-bonus">✦ โบนัส <img src="assets/ores/${result.bonus.icon}" alt="" width="22" height="22"> ${result.bonus.name} +1</div>`:''}</div></div>`;
 const banner=$('#loot-banner');banner.hidden=false;banner.style.animation='none';void banner.offsetWidth;banner.style.animation='';lootBannerUntil=now+2400;
}
function lootDestination(){
 const destination=$('.hud-findings').getBoundingClientRect?.(),surface=canvas.getBoundingClientRect?.();
 return destination&&surface?[destination.left-surface.left+destination.width*.5,destination.top-surface.top+32]:[W*.88,H*.2];
}
function drawLootEffects(now){
 const [tx,ty]=lootDestination();
 for(const burst of lootBursts){
  const t=(now-burst.start)/650;if(t<0||t>1)continue;
  const x=burst.x*W,y=burst.y*H,r=12+(burst.perfect?115:80)*(1-(1-t)**3);
  ctx.save();ctx.globalAlpha=(1-t)*.8;ctx.strokeStyle=burst.perfect?'#f4dc91':burst.color;ctx.lineWidth=2*(1-t)+.5;ctx.shadowColor=burst.color;ctx.shadowBlur=18;
  ctx.beginPath();ctx.ellipse(x,y,r,r*.5,0,0,Math.PI*2);ctx.stroke();
  for(let i=0;i<10;i++){let angle=i/10*Math.PI*2;ctx.beginPath();ctx.moveTo(x+Math.cos(angle)*r*.75,y+Math.sin(angle)*r*.65);ctx.lineTo(x+Math.cos(angle)*(r+14*(1-t)),y+Math.sin(angle)*(r+14*(1-t))*.65);ctx.stroke();}
  ctx.globalAlpha=Math.min(1,(1-t)*2);ctx.textAlign='center';ctx.font=`600 ${burst.perfect?19:16}px "Segoe UI",sans-serif`;ctx.lineWidth=4;ctx.strokeStyle='#0b1715';ctx.strokeText(burst.label,x,y-20-t*60-(burst.bonus?26:0));ctx.fillStyle=burst.perfect?'#f5df9e':burst.color;ctx.fillText(burst.label,x,y-20-t*60-(burst.bonus?26:0));
  ctx.restore();
 }
 lootBursts=lootBursts.filter(b=>now-b.start<650);
 for(const drop of lootDrops){
  const t=(now-drop.start)/drop.duration;if(t<0)continue;
  if(t>=1){lootArrivalUntil=now+240;continue;}
  const sx=drop.x*W,sy=drop.y*H,bx=sx+drop.dx*W,by=sy+drop.dy*H+55;
  let x,y,scale,rotation;
  if(t<.4){let p=t/.4;x=sx+drop.dx*W*p;y=sy+drop.dy*H*p+55*p*p;scale=.3+.8*Math.sin(p*Math.PI/2);rotation=drop.spin*p;}
  else if(t<.62){let p=(t-.4)/.22;x=bx;y=by-Math.sin(p*Math.PI)*9;scale=1.1;rotation=drop.spin;}
  else{let p=(t-.62)/.38,ease=p*p*(3-2*p);x=bx+(tx-bx)*ease;y=by+(ty-by)*ease-Math.sin(p*Math.PI)*45;scale=1.1-.9*p;rotation=drop.spin*(1-p);}
  ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=t>.96?(1-t)/.04:Math.min(1,t/.06);ctx.shadowColor=drop.ore.color;ctx.shadowBlur=drop.perfect||drop.bonus?24:14;
  const halo=ctx.createRadialGradient(0,0,0,0,0,drop.size*scale);halo.addColorStop(0,drop.ore.color+'66');halo.addColorStop(1,drop.ore.color+'00');ctx.fillStyle=halo;ctx.beginPath();ctx.arc(0,0,drop.size*scale,0,Math.PI*2);ctx.fill();
  const image=lootImage(drop.ore),size=drop.size*scale;ctx.imageSmoothingEnabled=false;
  if(image?.complete&&image.naturalWidth>0)ctx.drawImage(image,-size/2,-size/2,size,size);
  else{ctx.fillStyle=drop.ore.color;ctx.beginPath();ctx.moveTo(0,-size*.5);ctx.lineTo(size*.4,0);ctx.lineTo(0,size*.5);ctx.lineTo(-size*.4,0);ctx.closePath();ctx.fill();}
  // A bright glint makes even dark ore visible against the cave.
  ctx.shadowBlur=0;ctx.fillStyle='#fff5d5';ctx.globalAlpha*=.75;ctx.fillRect(-size*.25,-size*.25,3*scale,3*scale);ctx.restore();
 }
 lootDrops=lootDrops.filter(d=>now-d.start<d.duration);
 $('.hud-findings').classList.toggle('loot-arrival',now<lootArrivalUntil);
 if(lootBannerUntil&&now>=lootBannerUntil){$('#loot-banner').hidden=true;lootBannerUntil=0;}
}
function updateSwing(now){if(!swing)return;let elapsed=now-swing.start;
 if(elapsed>=320&&!swing.impacted){swing.impacted=true;flash=swing.critical?1:.4;
  let tip=project(pickaxePoint([-2,3.1,-.25],-.55,0));
  if(swing.loot?.ore)spawnLootEffects(swing.loot,tip,now);
  for(let i=0;i<(swing.critical?48:22);i++)particles.push({x:tip[0],y:tip[1],vx:(Math.random()-.5)*(swing.critical?15:9),vy:-2-Math.random()*7,life:1,color:i%3?swing.color:'#f7f9d0'});
 }
 if(elapsed>=850){swing=null;render();}
}
dropSector=sector;render();resize();requestAnimationFrame(frame);
setInterval(()=>{if(M.recover(state)){renderPlayer();save();}},1000);

if(loadFailed)$('#savehint').textContent='อ่านเซฟไม่ได้ • เก็บเซฟเดิมไว้แล้ว กรุณานำเข้าเซฟสำรอง';else save();
