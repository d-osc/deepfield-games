import { mkdir, copyFile, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';
import JavaScriptObfuscator from 'javascript-obfuscator';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output=path.resolve(root, 'dist');
if(path.dirname(output)!==root||path.basename(output)!=='dist')throw Error('Unsafe build output');
// Always regenerate the publish directory so old readable scripts/ZIPs cannot leak.
await rm(output,{recursive:true,force:true});
await mkdir(output, {recursive:true});
for(const name of ['style.css','game-ui.css','manifest.webmanifest','LICENSE']){
  await copyFile(path.join(root,name),path.join(output,name));
}
const runtime=['engine.js','progression.js','assets/kenney/rocks.js','storage.js','audio.js'];
const sources=await Promise.all(runtime.map(name=>readFile(path.join(root,name),'utf8')));
const game=await readFile(path.join(root,'game.js'),'utf8');
const workerSource=await readFile(path.join(root,'save-worker.js'),'utf8');
const storageSource=await readFile(path.join(root,'storage.js'),'utf8');
const workerCombined=workerSource.replace("importScripts('storage.js');",storageSource);
const workerMinified=await transform(workerCombined,{minify:true,target:'es2022',legalComments:'none'});
const workerCode=JavaScriptObfuscator.obfuscate(workerMinified.code,{target:'browser',compact:true,sourceMap:false,seed:2718}).getObfuscatedCode();
await writeFile(path.join(output,'save-worker.js'),workerCode);
const workerRevision=createHash('sha256').update(workerCode).digest('hex').slice(0,12);
sources[sources.length-2]=sources[sources.length-2].replace("new Worker('save-worker.js')",`new Worker('save-worker.js?v=${workerRevision}')`);

const combined=`(()=>{${sources.join('\n;\n')}\n;(async()=>{${game}\n})().catch(error=>{console.error(error);document.querySelector('#savehint').textContent='เปิดเกมไม่ได้ กรุณาโหลดหน้าใหม่';});})();`;
const minified=await transform(combined,{minify:true,target:'es2022',legalComments:'none',sourcemap:false});
const protectedCode=JavaScriptObfuscator.obfuscate(minified.code,{
 target:'browser',compact:true,seed:2718,renameGlobals:false,renameProperties:false,
 identifierNamesGenerator:'hexadecimal',stringArray:true,stringArrayEncoding:['base64'],
 stringArrayThreshold:0.8,splitStrings:true,splitStringsChunkLength:12,
 controlFlowFlattening:false,deadCodeInjection:false,debugProtection:false,
 selfDefending:false,disableConsoleOutput:false,sourceMap:false
}).getObfuscatedCode();
await writeFile(path.join(output,'game.bundle.js'),protectedCode);
let html=await readFile(path.join(root,'index.html'),'utf8');
html=html.replace(/<script\b[^>]*\bsrc="[^"]+"[^>]*><\/script>/g,'');
const revision=createHash('sha256').update(protectedCode).digest('hex').slice(0,12);
html=html.replace('</body>',`<script defer src="game.bundle.js?v=${revision}"></script></body>`);
for(const name of ['style.css','game-ui.css']){
 const css=await readFile(path.join(output,name),'utf8');
 const cssRevision=createHash('sha256').update(css).digest('hex').slice(0,12);
 html=html.replace(`href="${name}"`,`href="${name}?v=${cssRevision}"`);
}
await writeFile(path.join(output,'index.html'),html);
async function assets(from,to){
  await mkdir(to,{recursive:true});
  for(const entry of await readdir(from,{withFileTypes:true})){
    if(entry.isDirectory())await assets(path.join(from,entry.name),path.join(to,entry.name));
    else if(/\.(png|md|txt)$/i.test(entry.name))await copyFile(path.join(from,entry.name),path.join(to,entry.name));
  }
}
await assets(path.join(root,'assets'),path.join(output,'assets'));
for(const [,ref]of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css|png|webmanifest))(?:\?[^"#]*)?"/g))await readFile(path.join(output,ref));
console.log('Protected GitHub Pages build prepared at dist/ (single obfuscated JS bundle, no source maps or original scripts).');
