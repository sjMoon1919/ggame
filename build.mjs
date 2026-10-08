import {mkdir,copyFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.dirname(fileURLToPath(import.meta.url));
const output=path.join(root,'dist');
await mkdir(output,{recursive:true});
for(const file of ['index.html','style.css','game.js','physics.js','ai.js']){
  await copyFile(path.join(root,file),path.join(output,file));
}
console.log('Static game built successfully: dist/ (5 files)');
