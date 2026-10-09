import {readFileSync,writeFileSync,existsSync,mkdirSync,cpSync,rmSync,lstatSync,readlinkSync,symlinkSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
const action=process.argv[2];
if(!['install','uninstall'].includes(action)) throw Error('Usage: node scripts/profile.mjs install|uninstall');
const root=fileURLToPath(new URL('../',import.meta.url));
const home=resolve(process.env.DSH_HOME || join(homedir(),'.dsh'));
const profile=join(home,'profiles','desktop'), manifest=join(profile,'package.json');
const target=join(home,'plugins','desktop','dsh-snake'), link=join(profile,'node_modules','dsh-snake');
const hasLink=()=>{try{lstatSync(link);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};
const config=JSON.parse(readFileSync(manifest,'utf8'));
if(existsSync(target) && (lstatSync(target).isSymbolicLink() || JSON.parse(readFileSync(join(target,'package.json'),'utf8')).name!=='dsh-snake'))throw Error('Target is occupied by a different package');
if(hasLink() && (!lstatSync(link).isSymbolicLink() || resolve(join(link,'..'),readlinkSync(link))!==target))throw Error('Profile entry is occupied; no files changed');
if(action==='install' && !existsSync(join(root,'dist','client.js')))throw Error('Run npm run build first');
const backup=join(home,'backups','dsh-snake',new Date().toISOString().replace(/[:.]/g,'-'));
mkdirSync(backup,{recursive:true});cpSync(manifest,join(backup,'package.json'));
if(existsSync(target))cpSync(target,join(backup,'plugin'),{recursive:true});
if(action==='install'){
  const stage=join(backup,'new-plugin');mkdirSync(stage);
  for(const file of ['package.json','index.js','cordis.patch.yml','dist','assets','README.md','LICENSE','ASSETS.md'])cpSync(join(root,file),join(stage,file),{recursive:true});
  if(existsSync(target))rmSync(target,{recursive:true});mkdirSync(join(home,'plugins','desktop'),{recursive:true});renameSync(stage,target);
  mkdirSync(join(profile,'node_modules'),{recursive:true});if(!hasLink())symlinkSync(target,link,'dir');
  config.dependencies??={};config.dependencies['dsh-snake']='file:../../plugins/desktop/dsh-snake';
  config.dsh??={};config.dsh.profile??={};config.dsh.profile.bundles??=[];
  if(!config.dsh.profile.bundles.includes('dsh-snake'))config.dsh.profile.bundles.push('dsh-snake');
}else{
  if(hasLink())rmSync(link);if(existsSync(target))rmSync(target,{recursive:true});
  delete config.dependencies?.['dsh-snake'];
  if(config.dsh?.profile?.bundles)config.dsh.profile.bundles=config.dsh.profile.bundles.filter(x=>x!=='dsh-snake');
}
const pending=manifest+'.dsh-snake.tmp';writeFileSync(pending,JSON.stringify(config,null,2)+'\n',{mode:lstatSync(manifest).mode});renameSync(pending,manifest);
console.log(`${action}: dsh-snake. Backup: ${backup}. Restart DeepSeek Harness.`);
