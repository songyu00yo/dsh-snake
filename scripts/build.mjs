import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=new URL('../',import.meta.url);
const engine=readFileSync(new URL('engine.js',root),'utf8').replace(/^export /gm,'');
const avatar='data:image/png;base64,'+readFileSync(new URL('assets/deepseek-girl.png',root)).toString('base64');
const client=readFileSync(new URL('client.js',root),'utf8').replace('/* ENGINE */',()=>engine).replace('/* AVATAR */ null',()=>JSON.stringify(avatar));
mkdirSync(new URL('dist/',root),{recursive:true});writeFileSync(new URL('dist/client.js',root),client);
console.log('Built '+fileURLToPath(new URL('dist/client.js',root)));
