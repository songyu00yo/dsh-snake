import {writeSync,readFileSync,writeFileSync,existsSync,mkdirSync,cpSync,readdirSync,rmSync,lstatSync,realpathSync,symlinkSync,renameSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {homedir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';

const trace=message=>{if(process.env.DSH_SNAKE_TRACE)writeSync(2,message+'\n');};
const action=process.argv[2];
if(!['install','uninstall'].includes(action))throw Error('Usage: node scripts/profile.mjs install|uninstall [--profile desktop|web]');
const {values}=parseArgs({args:process.argv.slice(3),options:{profile:{type:'string',default:'desktop'}}});
const profileName=values.profile;
if(!['desktop','web'].includes(profileName))throw Error('Profile must be desktop or web');
const root=fileURLToPath(new URL('../',import.meta.url));
const home=resolve(process.env.DSH_HOME||join(homedir(),'.dsh'));
const profile=join(home,'profiles',profileName),manifest=join(profile,'package.json');
const target=join(home,'plugins',profileName,'dsh-snake'),link=join(profile,'node_modules','dsh-snake');
const pending=manifest+'.dsh-snake.tmp';
const present=path=>{try{lstatSync(path);return true;}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR')return false;throw e;}};
const linkType=process.platform==='win32'?'junction':'dir';
// Avoid the Windows native copy-file crash on non-ASCII paths.
const copy=(source,destination)=>{
  if(process.platform!=='win32')return cpSync(source,destination,{recursive:true});
  const stat=lstatSync(source);
  if(stat.isDirectory()){
    mkdirSync(destination,{recursive:true});
    for(const name of readdirSync(source))copy(join(source,name),join(destination,name));
  }else if(stat.isSymbolicLink())cpSync(source,destination);
  else writeFileSync(destination,readFileSync(source),{mode:stat.mode});
};

if(!existsSync(manifest))throw Error(profileName==='desktop'?'Open DeepSeek Harness Desktop once, then quit it before installing.':'Run dsh web once to initialize the web profile, then stop the server before installing.');
const original=readFileSync(manifest,'utf8'),config=JSON.parse(original),mode=lstatSync(manifest).mode;
for(const value of [config.dependencies,config.dsh,config.dsh?.profile]){
  if(value!=null&&(typeof value!=='object'||Array.isArray(value)))throw Error('Invalid profile configuration; no files changed');
}
if(config.dsh?.profile?.bundles!=null&&!Array.isArray(config.dsh.profile.bundles))throw Error('Invalid profile bundles; no files changed');
const hadTarget=present(target),hadLink=present(link);
if(hadTarget&&(lstatSync(target).isSymbolicLink()||JSON.parse(readFileSync(join(target,'package.json'),'utf8')).name!=='dsh-snake'))throw Error('Target is occupied by a different package');
if(hadLink&&(!lstatSync(link).isSymbolicLink()||!hadTarget||realpathSync(link)!==realpathSync(target)))throw Error('Profile entry is occupied; no files changed');
if(present(pending))throw Error('Profile temporary file is occupied; no files changed');
if(action==='install'&&!existsSync(join(root,'dist','client.js')))throw Error('Run npm run build first');
trace('validation complete');
const backup=join(home,'backups','dsh-snake',profileName,new Date().toISOString().replace(/[:.]/g,'-'));
trace('creating backup directory');mkdirSync(backup,{recursive:true});trace('copying manifest');copy(manifest,join(backup,'package.json'));
if(hadTarget)copy(target,join(backup,'plugin'));
trace('backup complete');
try{
  if(action==='install'){
    const stage=join(backup,'new-plugin');mkdirSync(stage);
    for(const file of ['package.json','index.js','cordis.patch.yml','dist','assets','scripts','README.md','LICENSE','ASSETS.md'])copy(join(root,file),join(stage,file));
    trace('staged files copied');
    if(hadTarget)rmSync(target,{recursive:true});
    mkdirSync(join(home,'plugins',profileName),{recursive:true});renameSync(stage,target);
    trace('target renamed');
    mkdirSync(join(profile,'node_modules'),{recursive:true});
    trace('creating profile link');
    if(!hadLink)symlinkSync(target,link,linkType);
    trace('profile link complete');
    config.dependencies??={};config.dependencies['dsh-snake']=`file:../../plugins/${profileName}/dsh-snake`;
    config.dsh??={};config.dsh.profile??={};config.dsh.profile.bundles??=[];
    if(!config.dsh.profile.bundles.includes('dsh-snake'))config.dsh.profile.bundles.push('dsh-snake');
  }else{
    if(hadLink)rmSync(link);
    trace('staged files copied');
    if(hadTarget)rmSync(target,{recursive:true});
    delete config.dependencies?.['dsh-snake'];
    if(config.dsh?.profile?.bundles)config.dsh.profile.bundles=config.dsh.profile.bundles.filter(name=>name!=='dsh-snake');
  }
  trace('writing config');
  writeFileSync(pending,JSON.stringify(config,null,2)+'\n',{mode});renameSync(pending,manifest);
}catch(error){
  try{
    if(present(link))rmSync(link);
    if(present(target))rmSync(target,{recursive:true});
    if(hadTarget)copy(join(backup,'plugin'),target);
    if(hadLink)symlinkSync(target,link,linkType);
    writeFileSync(pending,original,{mode});renameSync(pending,manifest);
  }catch(restoreError){throw new AggregateError([error,restoreError],`Installation failed; restore from ${backup}`);}
  throw error;
}finally{if(present(pending))rmSync(pending);}
console.log(`${action}: dsh-snake (${profileName}). Backup: ${backup}. ${profileName==='web'?'Restart the Web Harness server and refresh the browser.':'Restart DeepSeek Harness Desktop.'}`);
