import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

const source=readFileSync(new URL('../glass.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const load=(document,ResizeObserver,CSS,navigator,ImageData)=>new Function('document','ResizeObserver','CSS','navigator','ImageData',`${compiled}\nreturn LiquidGlass;`)(document,ResizeObserver,CSS,navigator,ImageData);

test('glass refraction stays within 6px and leaves the center neutral at each size',()=>{
 const {displacement}=load();
 for(const [width,height] of [[272,208],[180,138]]){
  const map=displacement(width,height);assert.equal(map.length,width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
   const i=(y*width+x)*4;
   assert(Math.abs(((map[i]-.5)/255-.5)*12)<=6);
   assert(Math.abs(((map[i+1]-.5)/255-.5)*12)<=6);
   if(x>=28&&x<width-28&&y>=28&&y<height-28)assert.deepEqual([...map.slice(i,i+2)],[128,128]);
  }
  const edge=(Math.floor(height/2)*width+6)*4;assert(map[edge]>240);
 }
});

test('glass map only regenerates on resize and releases observer and canvas',()=>{
 let callback,disconnected=false,renders=0;
 const canvas={width:0,height:0,getContext:()=>({putImageData(){}}),toDataURL:()=>`map-${++renders}`};
 class Observer{constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}}
 class ImageData{constructor(data,width,height){Object.assign(this,{data,width,height});}}
 const {observe}=load({createElement:()=>canvas},Observer,{supports:()=>true},{userAgent:'Chrome/130'},ImageData);
 const panel={clientWidth:272,clientHeight:208},maps=[];
 const dispose=observe(panel,'unique-filter',map=>maps.push(map));
 assert.equal(renders,1);callback();assert.equal(renders,1);
 panel.clientWidth=180;panel.clientHeight=138;callback();assert.equal(renders,2);
 assert.equal(maps[1].width,180);assert.equal(maps[1].height,138);
 dispose();assert(disconnected);assert.equal(canvas.width,0);assert.equal(canvas.height,0);
});

test('unsupported backdrop filters fall back without allocating a map',()=>{
 let fallback=false;
 const {observe}=load({createElement(){assert.fail('unexpected canvas');}},null,{supports:()=>false},{userAgent:'Chrome/130'});
 observe({},'filter',map=>{fallback=map===null;})();assert(fallback);
});
