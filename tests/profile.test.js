import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync,symlinkSync,realpathSync,lstatSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const original={name:'test',dependencies:{other:'1'},dsh:{profile:{bundles:['other']}}};
const linkType=process.platform==='win32'?'junction':'dir';
function fixture(){
 const home=mkdtempSync(join(tmpdir(),'dsh-snake-空 格-'));
 for(const name of ['desktop','web']){mkdirSync(join(home,'profiles',name),{recursive:true});writeFileSync(join(home,'profiles',name,'package.json'),JSON.stringify(original));}
 return {home,manifest:name=>join(home,'profiles',name,'package.json'),target:name=>join(home,'plugins',name,'dsh-snake'),link:name=>join(home,'profiles',name,'node_modules','dsh-snake'),run:(action,...args)=>spawnSync(process.execPath,['scripts/profile.mjs',action,...args],{env:{...process.env,DSH_HOME:home,DSH_SNAKE_TRACE:'1'},encoding:'utf8'}),clean:()=>rmSync(home,{recursive:true,force:true})};
}
for(const name of ['desktop','web'])test(`${name}: repeat install, restore config, backups and conflict protection`,()=>{
 const f=fixture(),args=name==='desktop'?[]:['--profile','web'];
 try{
  for(let i=0;i<2;i++){const result=f.run('install',...args);assert.equal(result.status,0,result.stderr);}
  const installed=JSON.parse(readFileSync(f.manifest(name)));assert.deepEqual(installed.dsh.profile.bundles,['other','dsh-snake']);assert.equal(installed.dependencies.other,'1');
  assert.equal(installed.dependencies['dsh-snake'],`file:../../plugins/${name}/dsh-snake`);
  assert(existsSync(join(f.target(name),'scripts','profile.mjs')));
  assert(lstatSync(f.link(name)).isSymbolicLink());assert.equal(realpathSync(f.link(name)),realpathSync(f.target(name)));
  assert(readdirSync(join(f.home,'backups','dsh-snake',name)).length>=2);
  assert.deepEqual(JSON.parse(readFileSync(f.manifest(name==='web'?'desktop':'web'))),original);
  const result=f.run('uninstall',...args);assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(readFileSync(f.manifest(name))),original);assert(!existsSync(f.target(name)));
  assert.equal(f.run('uninstall',...args).status,0);
  symlinkSync(resolve(f.home,'profiles',name),f.link(name),linkType);
  assert.notEqual(f.run('install',...args).status,0);assert.deepEqual(JSON.parse(readFileSync(f.manifest(name))),original);
 }finally{f.clean();}
});
test('desktop and web coexist; removing either profile leaves the other intact',()=>{
 const f=fixture();
 try{
  assert.equal(f.run('install').status,0);assert.equal(f.run('install','--profile','web').status,0);
  const web=readFileSync(f.manifest('web'),'utf8');
  assert.equal(f.run('uninstall').status,0);assert.equal(readFileSync(f.manifest('web'),'utf8'),web);assert(existsSync(f.target('web')));
  assert.equal(f.run('uninstall','--profile','web').status,0);assert.deepEqual(JSON.parse(readFileSync(f.manifest('desktop'))),original);
 }finally{f.clean();}
});
test('missing and invalid profiles fail without creating configuration',()=>{
 const f=fixture();
 try{
  assert.notEqual(f.run('install','--profile','../desktop').status,0);
  assert.notEqual(f.run('install','--profile','unknown').status,0);
  assert.notEqual(f.run('install','--unexpected').status,0);
  rmSync(join(f.home,'profiles','web'),{recursive:true});
  const result=f.run('install','--profile','web');assert.notEqual(result.status,0);assert.match(result.stderr,/Run dsh web once/);
  assert(!existsSync(f.manifest('web')));assert(!existsSync(join(f.home,'plugins')));assert(!existsSync(join(f.home,'backups')));
 }finally{f.clean();}
});
test('foreign plugin directory is never overwritten or uninstalled',()=>{
 const f=fixture();
 try{
  mkdirSync(f.target('web'),{recursive:true});const foreign='{"name":"other-plugin"}';writeFileSync(join(f.target('web'),'package.json'),foreign);
  for(const action of ['install','uninstall'])assert.notEqual(f.run(action,'--profile','web').status,0);
  assert.equal(readFileSync(join(f.target('web'),'package.json'),'utf8'),foreign);assert.deepEqual(JSON.parse(readFileSync(f.manifest('web'))),original);
 }finally{f.clean();}
});
test('failed registration restores the previous plugin and exact configuration',()=>{
 const f=fixture();
 try{
  mkdirSync(f.target('desktop'),{recursive:true});writeFileSync(join(f.target('desktop'),'package.json'),'{"name":"dsh-snake","version":"old"}');writeFileSync(join(f.target('desktop'),'keep.txt'),'previous plugin');
  writeFileSync(join(f.home,'profiles','desktop','node_modules'),'occupied');
  const before=readFileSync(f.manifest('desktop'),'utf8');assert.notEqual(f.run('install').status,0);
  assert.equal(readdirSync(join(f.home,'backups','dsh-snake','desktop')).length,1);
  assert.equal(readFileSync(f.manifest('desktop'),'utf8'),before);assert.equal(readFileSync(join(f.target('desktop'),'keep.txt'),'utf8'),'previous plugin');assert.equal(JSON.parse(readFileSync(join(f.target('desktop'),'package.json'))).version,'old');
  assert.equal(readFileSync(join(f.home,'profiles','desktop','node_modules'),'utf8'),'occupied');
 }finally{f.clean();}
});
