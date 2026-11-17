# DEEPFIELD — Offline Mining

ลิขสิทธิ์: สงวนสิทธิ์ ห้ามนำไปหารายได้ คัดลอก เผยแพร่ซ้ำ แก้ไข หรือดัดแปลงโดยไม่ได้รับอนุญาต ดู [LICENSE](LICENSE) แอสเซ็ตของบุคคลที่สามคงสิทธิ์ CC0 เดิมตามใบอนุญาตที่แนบ

เกมขุดแร่เล่นคนเดียว เปิด `index.html` ใน Chrome, Edge หรือ Firefox ได้ทันที ไม่ใช้เซิร์ฟเวอร์ dependency ภายนอก หรืออินเทอร์เน็ตตอนเล่น

## หน้าจอเกม

ฉากเหมืองแสดงเต็มพื้นที่หน้าต่าง พร้อม HUD เลเวล/กำลังด้านซ้ายบน เงินและแร่ที่เก็บได้ด้านขวา อีเตอร์ที่สวมใส่ด้านซ้ายล่าง และแถบเมนูเกมด้านล่าง ร้านค้า กระเป๋า ซ่อม อัปเกรด และแผนที่เปิดเป็นหน้าต่างทับฉาก ปิดด้วย Escape หรือปุ่ม X ร้านค้าแยกหมวดขายแร่ อีเตอร์ และอาหาร

ควบคุม: คลิกเมาส์หรือแตะเพื่อขุด, C ร้านค้า, R ซ่อม, U อัปเกรด, B กระเป๋า เมนูเซฟอยู่ที่ปุ่มเฟืองมุมขวาบน และมีปุ่มขยายเต็มหน้าจอ การเลือกเข้าเหมืองจากแผนที่จะปิดหน้าต่างและกลับไปขุดทันที

## ผู้เล่นและกำลัง

- เริ่ม Lv.1 กำลังสูงสุด 100 เพิ่ม 12 ต่อเลเวล
- ขุดได้รับ EXP ตามคุณภาพ: สำเร็จ `ceil(5 + คุณภาพ × 0.2)` พลาดได้ 2 EXP ก่อนบัฟอาหาร
- EXP ที่ต้องใช้เพื่อเลเวลถัดไปคือ `60 + (เลเวล − 1) × 30`
- อีเตอร์แต่ละรุ่นใช้กำลังพื้นฐานต่างกัน 2–101 ต่อครั้ง รวมดีบัฟเหมืองและส่วนลดอาหารก่อนเริ่มขุด
- กำลังจ่ายตอนเริ่มขุด ไม่คืนเมื่อพลาดหรือยกเลิก ฟื้นเอง 1 ต่อ 30 วินาที รวมช่วงปิดเกม ไม่เกินกำลังสูงสุด
- เมื่อกำลังไม่พอ ให้พักหรือกินอาหาร เพิ่มเลเวลแล้วได้กำลังเพิ่มตามเพดานที่เพิ่มขึ้น

## การขุด 0–100%

วงเกิดสุ่มบนหินเองทุก 0.35–0.75 วินาที พร้อมกันได้สูงสุด 6 วง คลิกหรือแตะวงที่ต้องการเมื่อหดทับเส้นเป้าหมาย วงซ้อนกันรับวงบนสุดก่อน อีเตอร์ขยับตามเมาส์หรือตำแหน่งสัมผัส ไม่ต้องกดปุ่มเริ่มขุด

- วงบีบสุ่ม 0.3–3 วินาทีก่อนดีบัฟแรงสั่นสะเทือน โดยยังไม่ต่ำกว่า 0.3 วินาที
- กดถูกปุ่มตอนวงสีขาวทับเส้นเขียวได้ 100% (Perfect) กดก่อนหรือหลังคิดเปอร์เซ็นต์จากระยะห่างของเส้นวง
- ปล่อยวงหมดเวลาหรือออกจากหน้าเหมืองไม่เสียอะไร ส่วนคลิกวงที่คุณภาพ 0% ไม่ได้แร่ แต่เสียกำลังและความทนทานตามการขุดหนึ่งครั้ง
- คุณภาพลดจำนวนแร่และโอกาสเพชร พื้นฐานเพชรเท่ากับ `2% + 23% × (คุณภาพ/100)²` ก่อนเอฟเฟกต์อีเตอร์ อาหาร และดีบัฟ
- ขุดสำเร็จได้แร่หลักอย่างน้อย 1 ชิ้น อีเตอร์เสียงสะท้อนอาจสุ่มเพิ่มอีก 1 ชิ้น
- ช่วงเปลี่ยนเมนูระหว่างขุดจะนับเป็นการยกเลิกหนึ่งครั้งและใช้ระยะบัฟ

## เหมือง อีเตอร์ และอาหาร

- [เหมือง 50 แห่ง](MINES.md): เหมืองแรกฟรี ปลดล็อกเหมืองอื่นด้วยเงินครั้งเดียว มีดีบัฟ 5 กลุ่มรวม 50 ชื่อ/ความแรง ได้แก่เพิ่มกำลังที่ใช้ เพิ่มการสึกหรอ ลดโอกาสเพชร ลดจำนวนแร่ หรือเร่งวง
- แต่ละเหมืองมีชุดแร่ต่างกัน แร่ที่ไม่อยู่ในชุดนั้นไม่ดรอป รวมถึงเพชรที่พบได้เฉพาะบางเหมือง ทุกการ์ดเหมืองแสดงอัตราแร่เด่นที่คุณภาพ 100% กด “ดูแร่ที่ดรอป” และเลื่อนคุณภาพเพื่อดูตารางจริง รวม 100% ต่อการสุ่มแร่หลักหนึ่งครั้ง คำนวณจากอีเตอร์และบัฟปัจจุบัน
- [อีเตอร์ 100 แบบ](PICKAXES.md): ซื้อ ขาย สวมใส่ ซ่อม และอัปเกรดถึง Lv.10 มีเอฟเฟกต์ 10 กลุ่ม กลุ่มละ 10 ความแรง เช่น เพิ่มแร่ ประหยัดความทนทาน เพิ่มโอกาสเพชร เน้นหมวดแร่ เพิ่มราคาขาย ลดค่าซ่อม/อัปเกรด และแร่โบนัส
- [อาหาร 30 แบบ](FOODS.md): ซื้อที่ร้านค้า กินจากร้านค้าหรือช่องอาหารในกระเป๋า เริ่มต้นมีขนมปัง 3 ชิ้น มีทั้งฟื้นกำลังอย่างเดียวและบัฟเพิ่มแร่/เพชร ลดกำลัง เพิ่ม EXP หรือต้านดีบัฟ
- บัฟอาหารใช้ตามจำนวนครั้งขุดรวมครั้งที่พลาด บัฟชนิดเดียวกันแทนที่กัน ต่างชนิดซ้อนกันได้สูงสุด 5 กลุ่ม
- [แร่และอัญมณี 80 ชนิด](RESOURCES.md): มีราคาและช่องกระเป๋า ขายเป็นชนิดได้ที่ร้านค้า บางชนิดใช้ภาพร่วมกัน
- อีเตอร์ที่พังยังซ่อมได้ด้วยเงินและหิน อัปเกรดใช้เงิน ทองแดง และเหล็ก คลังเก็บอีเตอร์ได้ 100 ชิ้นรวมชิ้นซ้ำ ขายอีเตอร์ชิ้นสุดท้ายไม่ได้

## เซฟและการทำงาน offline

บันทึกอัตโนมัติใน localStorage พร้อมส่งออก/นำเข้า JSON ย้ายเซฟไปเครื่องหรือเบราว์เซอร์อื่นได้ หากปิดกั้น localStorage ให้ส่งออกเซฟสำรอง เซฟเก่าจะย้ายเป็นรุ่น 2 โดยเก็บเงิน แร่ อีเตอร์ และเหมืองล่าสุดไว้ เริ่มระบบผู้เล่นที่ Lv.1 พร้อมกำลังเต็ม เหมืองแรกและเหมืองล่าสุดจากเซฟเก่าปลดล็อกให้

ภาพหินใช้โมเดล OBJ จาก [Kenney Nature Kit](https://kenney.nl/assets/nature-kit) (CC0) ใน `assets/kenney/` แปลงเพื่อเปิดผ่านไฟล์โดย `python scripts/prepare-rocks.py` ภาพแร่จาก CC0 Mineral Icons/Gem Icons ของ OpenGameArt ใน `assets/ores/` ดูใบอนุญาตใน `ATTRIBUTION.md` ของแต่ละโฟลเดอร์ อาหารใช้สัญลักษณ์ emoji ของเครื่อง

ฉากเป็นกล้องคงที่ ใช้โมเดล 3D ฉายลง Canvas พร้อมแอนิเมชันอีเตอร์และเอฟเฟกต์กระแทก

เมื่ออีเตอร์กระแทกหิน จะแสดงภาพแร่จาก asset จริงเด้งออกมา พร้อมแสง วงกระแทก ชื่อและจำนวนที่ลอยขึ้น ก่อนภาพแร่ลอยเข้ากระเป๋า HUD มีป้ายแร่หลักและแร่โบนัส ส่วน Perfect ใช้เอฟเฟกต์สีทอง การขุดพลาดไม่แสดงแร่ดรอป เอฟเฟกต์เป็นภาพประกอบและไม่เพิ่มไอเทมซ้ำ

## ตรวจสอบระบบ

ใช้ Node.js โดยไม่ต้องติดตั้ง dependency: `npm test`

`test.cjs` ตรวจแคตตาล็อกและเอฟเฟกต์พื้นฐาน `progression.test.cjs` ตรวจระบบเลเวล/กำลัง อาหาร ดีบัฟ ปลดล็อก คุณภาพ ตารางดรอป และเซฟ `ui.test.cjs` จำลอง DOM และอินพุตเพื่อตรวจการเชื่อม UI (ไม่ได้ทดแทนการตรวจภาพในเบราว์เซอร์)

## GitHub Pages

`npm run build` เตรียมไฟล์เล่นเกมและใบอนุญาตแอสเซ็ตใน `dist/` โดยไม่รวมการทดสอบและ Git metadata Workflow `.github/workflows/pages.yml` ทดสอบและ deploy เมื่อ push ไป `main` หรือสั่งด้วย workflow_dispatch ต้องเปิด Pages โดยเลือก Source เป็น GitHub Actions ใน repository settings

Local saves use a local blockchain-style hash chain in localStorage, without encryption, wallets, consensus, or network transactions. Each block stores a full save snapshot, timestamp, sequential index, previous hash and SHA-256 hash. The latest 100 blocks are retained with an anchor to the discarded prefix; older history cannot be verified after pruning. Loading verifies every retained block before restoring the latest snapshot. This detects corruption, but anyone controlling localStorage can rewrite the chain and recompute its hashes. Legacy JSON and previous encrypted saves migrate automatically (encrypted saves still require their original browser key). Unreadable saves are preserved without overwriting. Export/import remains portable JSON. SHA-256 uses Web Crypto and requires HTTPS, localhost, or a browser supporting it for local files.

## SEO and branding

Game icons and the 1200×630 social cover are stored in `assets/marketing/`. The page includes favicon, Apple touch icon, web manifest, Thai description, Open Graph and Twitter Card metadata. Canonical and social image URLs assume the GitHub Pages address `https://d-osc.github.io/deepfield-games/` based on the repository remote; update these in `index.html` if deploying to another domain.

## Protected production build

Run `npm ci`, `npm test`, `npm run build`, then `npm run test:build`. Builds regenerate `dist/` and replace runtime sources with a minified, obfuscated `game.bundle.js`, without source maps. Original source files stay readable in the checkout. GitHub Pages installs locked dev dependencies before building and verifies the generated bundle. Obfuscation raises the effort of reading code; it cannot prevent browser downloads, copying images, reverse engineering, or client-side save manipulation. A public source repository still exposes the original code.

Mining rings spawn automatically every 350–750 ms, up to six simultaneous overlapping rings. A trusted primary click or touch inside a live ring resolves the newest overlapping ring at that position. Resource costs begin only on an accepted click; untouched expiration, hiding the page and opening panels change no game state. Rings are transient and are not saved. Pickaxe animation does not block accepted hits. One click resolves every live ring under the pointer, each with its own timing and resource cost; touch supports multiple fingers. Independent impact effects preserve rapid hits.

Mining feedback includes expanding bursts at the timing ring, golden Perfect rays, and synthesized start/press/miss/rock-impact sounds via Web Audio. Sounds start after a player gesture; use the speaker button to mute for the session. Effects and audio work offline without downloaded sound files. Reduced-motion mode simplifies the new bursts.

The manual mining and continuous-round buttons have been removed. Production HTML versions the bundle URL to refresh browser caches. This remains client-side behavior, not server anti-cheat.

Rock durability is saved separately for all 50 mines (maximum 60 + mine index × 24). Successful player-timed hits deal damage from tool power, upgrades and timing quality; misses do not damage rock. Breaking a rock randomly chooses a different mine from the 49 alternatives and creates a full-durability rock there. There are no paid unlocks or manual mine selection. Old unlock lists are retained only for save compatibility. Each successful impact emits stone chips; a break produces a larger shatter and respawn animation. Timing and result percentages use larger text. Legacy saves receive full rock durability automatically.

Mobile layout includes touch-sized controls, portrait and short landscape rules, safe-area padding, and scene touch handling without unwanted scrolling. Panels remain scrollable. Mining ignores secondary mouse buttons, secondary fingers and UI controls outside the mining button. The pickaxe tracks normalized scene pointer coordinates so resizing does not change the input scale.

The rock now fills a larger central area on desktop and mobile. Rings are placed by testing their circumference against projected rock faces, with responsive scaling and resize repositioning. Scene clicks outside the rock do not resolve mining. Each swing locks its clicked impact position; the pickaxe tip, stone chips and loot originate at that point even if the pointer moves during the swing.

Rock durability balance revision 2 doubles all mine rock HP. Existing rock saves migrate remaining HP proportionally once (15/30 becomes 30/60); subsequent loads preserve the migrated values.

Portrait mobile HUD uses a compact player/energy strip, a bag counter instead of the full ore list, a short tool durability strip and full-width bottom navigation. The mine title/deposits stay above the reserved central rock area, while feedback sits between the tool strip and navigation. Rock projection reserves HUD space rather than drawing behind panels. Verified in-browser at 390×844 and 390×674; ring bounds also cover 320×568.

Random rock flow: break the current rock to automatically draw another mine/rock. The previous location cannot repeat immediately. Old rings clear at the break, and new rings spawn only after the impact switches the scene. Inventory and the current randomized location persist in saves.
