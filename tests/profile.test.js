import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync,symlinkSync,realpathSync,lstatSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const original={name:'test',dependencies:{other:'1'},dsh:{profile:{bundles:['other']}}};
const linkType=process.platform==='win32'?'junction':'dir';
const script=resolve('scripts/profile.mjs');
function runProfile(home,action,args=[],{env={},nodeArgs=[],cwd}={}){
 return spawnSync(process.execPath,[...nodeArgs,script,action,...args],{cwd,env:{...process.env,DSH_HOME:home,...env},encoding:'utf8'});
}
function fixture(relativeHome=''){
 const temp=mkdtempSync(join(tmpdir(),'dsh-snake-空 格-')),home=join(temp,relativeHome);
 for(const name of ['desktop','web']){mkdirSync(join(home,'profiles',name),{recursive:true});writeFileSync(join(home,'profiles',name,'package.json'),JSON.stringify(original));}
 return {temp,home,manifest:name=>join(home,'profiles',name,'package.json'),target:name=>join(home,'plugins',name,'dsh-snake'),link:name=>join(home,'profiles',name,'node_modules','dsh-snake'),run:(action,...args)=>runProfile(home,action,args),clean:()=>rmSync(temp,{recursive:true,force:true})};
}
function legacyEntry(f,name='desktop'){
 const config=structuredClone(original);
 config.dependencies['dsh-snake']=`file:../../plugins/${name}/dsh-snake`;config.dsh.profile.bundles.push('dsh-snake');
 writeFileSync(f.manifest(name),JSON.stringify(config));
 for(const [path,version] of [[f.target(name),'old-target'],[f.link(name),'old-copy']]){
  mkdirSync(join(path,'nested'),{recursive:true});writeFileSync(join(path,'package.json'),JSON.stringify({name:'dsh-snake',version}));
  writeFileSync(join(path,'nested','keep.bin'),Buffer.from([0,1,2,255]));writeFileSync(join(path,'keep.txt'),version);
 }
}
function contents(path){
 return Object.fromEntries(readdirSync(path,{withFileTypes:true}).map(entry=>[entry.name,entry.isDirectory()?contents(join(path,entry.name)):readFileSync(join(path,entry.name))]));
}
for(const name of ['desktop','web'])test(`${name}: repeat install, restore config, backups and conflict protection`,()=>{
 const f=fixture(),args=name==='desktop'?[]:['--profile','web'];
 try{
  for(let i=0;i<2;i++){const result=f.run('install',...args);assert.equal(result.status,0,result.stderr);}
  const installed=JSON.parse(readFileSync(f.manifest(name)));assert.deepEqual(installed.dsh.profile.bundles,['other','dsh-snake']);assert.equal(installed.dependencies.other,'1');
  assert.equal(installed.dependencies['dsh-snake'],`link:../../plugins/${name}/dsh-snake`);
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
for(const name of ['desktop','web'])for(const action of ['install','uninstall'])test(`${name}: ${action} accepts an owned legacy materialized package`,()=>{
 const f=fixture(),args=['--profile',name];
 try{
  legacyEntry(f,name);const entry=contents(f.link(name));
  const result=f.run(action,...args);assert.equal(result.status,0,result.stderr);
  const backups=join(f.home,'backups','dsh-snake',name),backup=join(backups,readdirSync(backups)[0]);
  assert.deepEqual(contents(join(backup,'profile-entry')),entry);
  if(action==='install'){
   assert(lstatSync(f.link(name)).isSymbolicLink());assert.equal(realpathSync(f.link(name)),realpathSync(f.target(name)));
   assert.equal(JSON.parse(readFileSync(f.manifest(name))).dependencies['dsh-snake'],`link:../../plugins/${name}/dsh-snake`);
   assert(!existsSync(join(f.target(name),'keep.txt')));
  }else{
   assert(!existsSync(f.link(name)));assert(!existsSync(f.target(name)));assert.deepEqual(JSON.parse(readFileSync(f.manifest(name))),original);
  }
 }finally{f.clean();}
});
test('legacy directory migration rejects unowned targets, dependency paths and package names',()=>{
 const cases=[
  f=>rmSync(f.target('desktop'),{recursive:true}),
  f=>writeFileSync(join(f.target('desktop'),'package.json'),'{"name":"foreign"}'),
  f=>writeFileSync(join(f.link('desktop'),'package.json'),'{"name":"foreign"}'),
  ...[undefined,'1.0.0','link:../../plugins/desktop/dsh-snake','file:../../plugins/web/dsh-snake'].map(dependency=>f=>{
   const config=JSON.parse(readFileSync(f.manifest('desktop')));
   if(dependency===undefined)delete config.dependencies['dsh-snake'];else config.dependencies['dsh-snake']=dependency;
   writeFileSync(f.manifest('desktop'),JSON.stringify(config));
  }),
 ];
 for(const alter of cases){
  const f=fixture();
  try{
   legacyEntry(f);alter(f);const before=readFileSync(f.manifest('desktop'),'utf8'),entry=contents(f.link('desktop'));
   for(const action of ['install','uninstall'])assert.notEqual(f.run(action).status,0);
   assert.equal(readFileSync(f.manifest('desktop'),'utf8'),before);assert.deepEqual(contents(f.link('desktop')),entry);
   assert(!existsSync(join(f.home,'backups')));
  }finally{f.clean();}
 }
});
for(const action of ['install','uninstall'])test(`failed legacy ${action} restores the materialized directory and exact configuration`,()=>{
 const f=fixture();
 try{
  legacyEntry(f);const before=readFileSync(f.manifest('desktop'),'utf8'),target=contents(f.target('desktop')),entry=contents(f.link('desktop'));
  const preload=join(f.temp,'fail-manifest.cjs');
  writeFileSync(preload,`const fs=require('node:fs');const rename=fs.renameSync;let failed=false;
fs.renameSync=(source,destination)=>{if(!failed&&source.endsWith('package.json.dsh-snake.tmp')){failed=true;throw Error('simulated manifest failure');}return rename(source,destination);};
require('node:module').syncBuiltinESMExports();`);
  const result=runProfile(f.home,action,[],{nodeArgs:['--require',preload]});assert.notEqual(result.status,0);assert.match(result.stderr,/simulated manifest failure/);
  assert.equal(readFileSync(f.manifest('desktop'),'utf8'),before);assert(!lstatSync(f.link('desktop')).isSymbolicLink());
  assert.deepEqual(contents(f.link('desktop')),entry);assert.deepEqual(contents(f.target('desktop')),target);
  assert(!existsSync(f.manifest('desktop')+'.dsh-snake.tmp'));
 }finally{f.clean();}
});
test('DSH_HOME follows Harness tilde, whitespace and relative-path rules',()=>{
 for(const override of ['~','~/custom home','~\\custom home',' \t ','relative home']){
  const relativeHome=override==='~'?'user':override.trim()===''?'user/.dsh':override==='relative home'?'relative home':'user/custom home';
  const f=fixture(relativeHome);
  try{
   const options={env:{HOME:join(f.temp,'user'),USERPROFILE:join(f.temp,'user')},cwd:f.temp};
   for(const action of ['install','uninstall']){
    const result=runProfile(override,action,[],options);assert.equal(result.status,0,result.stderr);
    assert.equal(existsSync(f.target('desktop')),action==='install');
   }
   assert.deepEqual(JSON.parse(readFileSync(f.manifest('desktop'))),original);
  }finally{f.clean();}
 }
});
test('real pnpm migrates a file dependency and preserves link registration across updates',t=>{
 const options={shell:process.platform==='win32',encoding:'utf8'};
 const version=spawnSync('pnpm',['--version'],options);
 if(version.error?.code==='ENOENT'||process.platform==='win32'&&spawnSync('where.exe',['pnpm']).status!==0){
  assert(!process.env.CI,'CI requires pnpm for the installer regression');t.skip('pnpm is not available');return;
 }
 assert.equal(version.status,0,version.stderr);
 const f=fixture(),name='web';
 try{
  const profile=join(f.home,'profiles',name);
  writeFileSync(f.manifest(name),JSON.stringify({name:'test',private:true,dependencies:{},dsh:{profile:{bundles:[]}}}));
  writeFileSync(join(profile,'pnpm-workspace.yaml'),`packages:\n  - .\nnodeLinker: hoisted\nautoInstallPeers: false\nstoreDir: ${JSON.stringify(join(f.temp,'pnpm-store'))}\n`);
  const env={...process.env,DSH_HOME:f.home,XDG_DATA_HOME:join(f.temp,'data'),XDG_CACHE_HOME:join(f.temp,'cache'),XDG_CONFIG_HOME:join(f.temp,'config')};
  const install=()=>{const result=spawnSync('pnpm',['install','--ignore-scripts','--offline'],{...options,cwd:profile,env});assert.equal(result.status,0,result.stdout+result.stderr);};
  let result=f.run('install','--profile',name);assert.equal(result.status,0,result.stderr);
  const config=JSON.parse(readFileSync(f.manifest(name)));config.dependencies['dsh-snake']=`file:../../plugins/${name}/dsh-snake`;writeFileSync(f.manifest(name),JSON.stringify(config));
  install();assert(!lstatSync(f.link(name)).isSymbolicLink());
  result=f.run('install','--profile',name);assert.equal(result.status,0,result.stderr);
  assert.equal(JSON.parse(readFileSync(f.manifest(name))).dependencies['dsh-snake'],`link:../../plugins/${name}/dsh-snake`);
  install();assert(lstatSync(f.link(name)).isSymbolicLink());assert.equal(realpathSync(f.link(name)),realpathSync(f.target(name)));
  for(const action of ['install','uninstall']){result=f.run(action,'--profile',name);assert.equal(result.status,0,result.stderr);}
  assert(!existsSync(f.link(name)));assert(!existsSync(f.target(name)));
 }finally{f.clean();}
});
