import { mkdir, copyFile, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output=path.resolve(root, 'dist');
await mkdir(output, {recursive:true});
for(const name of ['index.html','style.css','game-ui.css','engine.js','progression.js','game.js','LICENSE']){
  await copyFile(path.join(root,name),path.join(output,name));
}
async function assets(from,to){
  await mkdir(to,{recursive:true});
  for(const entry of await readdir(from,{withFileTypes:true})){
    if(entry.isDirectory())await assets(path.join(from,entry.name),path.join(to,entry.name));
    else if(/\.(png|js|md|txt)$/i.test(entry.name))await copyFile(path.join(from,entry.name),path.join(to,entry.name));
  }
}
await assets(path.join(root,'assets'),path.join(output,'assets'));
// Validate every local entry-point script/style reference before publishing.
const html=await readFile(path.join(output,'index.html'),'utf8');
for(const [,ref]of html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g))await readFile(path.join(output,ref));
console.log('GitHub Pages artifact prepared at dist/ (runtime files, assets and license notices).');
