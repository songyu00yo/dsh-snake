import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync,existsSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
test('install twice, uninstall, backups and conflict protection',()=>{
 const home=mkdtempSync(join(tmpdir(),'dsh-snake-'));
 const profile=join(home,'profiles','desktop');mkdirSync(profile,{recursive:true});
 const original={name:'test',dependencies:{other:'1'},dsh:{profile:{bundles:['other']}}};
 const manifest=join(profile,'package.json');writeFileSync(manifest,JSON.stringify(original));
 const run=action=>spawnSync(process.execPath,['scripts/profile.mjs',action],{env:{...process.env,DSH_HOME:home},encoding:'utf8'});
 try{
  for(let i=0;i<2;i++){const result=run('install');assert.equal(result.status,0,result.stderr);}
  const installed=JSON.parse(readFileSync(manifest));assert.deepEqual(installed.dsh.profile.bundles,['other','dsh-snake']);assert.equal(installed.dependencies.other,'1');
  assert(existsSync(join(home,'backups','dsh-snake')));
  const result=run('uninstall');assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(readFileSync(manifest)),original);
  assert(!existsSync(join(home,'plugins','desktop','dsh-snake')));
  symlinkSync(profile,join(profile,'node_modules','dsh-snake'));
  assert.notEqual(run('install').status,0);assert.deepEqual(JSON.parse(readFileSync(manifest)),original);
 }finally{rmSync(home,{recursive:true,force:true});}
});
