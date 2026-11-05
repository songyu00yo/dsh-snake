import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import React, {act} from 'react';
import * as ReactDOM from 'react-dom';
import {createRoot} from 'react-dom/client';
import {JSDOM} from 'jsdom';

const compile=file=>ts.transpileModule(readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{
  compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None},
}).outputText;
const engineSource=compile('engine.ts'),glassSource=compile('glass.ts'),clientSource=compile('client.ts');
const rect=(left,top,width,height)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top,toJSON(){return this;}});

function makeClock(){
  let now=0,nextId=1;
  const timers=new Map();
  const schedule=(callback,delay,repeat=false)=>{
    const id=nextId++,duration=Number(delay)||0;
    timers.set(id,{id,callback,delay:duration,at:now+duration,repeat});
    return id;
  };
  return {
    setTimeout:(callback,delay)=>schedule(callback,delay),
    setInterval:(callback,delay)=>schedule(callback,delay,true),
    clearTimeout:id=>timers.delete(id),clearInterval:id=>timers.delete(id),
    pending:()=>[...timers.values()].sort((a,b)=>a.at-b.at).map(({id,delay,at})=>({id,delay,at})),
    async advance(duration){
      const end=now+duration;
      for(let count=0;;count++){
        const next=[...timers.values()].sort((a,b)=>a.at-b.at)[0];
        if(!next||next.at>end)break;
        assert(count<1000,'timer callbacks must not loop without advancing time');
        now=next.at;
        if(next.repeat)next.at+=next.delay;else timers.delete(next.id);
        await act(async()=>{next.callback();await Promise.resolve();});
      }
      now=end;
    },
  };
}

async function mountDock({withComposer=true,reducedMotion=true}={}){
  const dom=new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>',{pretendToBeVisual:true,url:'https://snake.test/'});
  const {window}=dom,{document}=window,clock=makeClock();
  const originalGlobals=new Map();
  for(const [name,value] of Object.entries({window,document,navigator:window.navigator,IS_REACT_ACT_ENVIRONMENT:true})){
    originalGlobals.set(name,Object.getOwnPropertyDescriptor(globalThis,name));
    Object.defineProperty(globalThis,name,{configurable:true,writable:true,value});
  }
  window.matchMedia=()=>({matches:reducedMotion,addEventListener(){},removeEventListener(){}});
  const contexts=new WeakMap(),resizeObservers=new Set(),mutationObservers=new Set();
  class ResizeObserver {
    constructor(callback){this.callback=callback;this.targets=new Set();resizeObservers.add(this);}
    observe(target){this.targets.add(target);}
    disconnect(){this.targets.clear();}
  }
  class MutationObserver {
    constructor(callback){this.inner=new window.MutationObserver(callback);this.active=false;mutationObservers.add(this);}
    observe(...args){this.active=true;this.inner.observe(...args);}
    disconnect(){this.active=false;this.inner.disconnect();}
  }
  class Image {complete=false;naturalWidth=0;naturalHeight=0;onload=null;onerror=null;}
  window.HTMLCanvasElement.prototype.getContext=function(){
    if(!contexts.has(this)){
      const context={paints:0,setTransform(){this.paints++;},clearRect(){},beginPath(){},arc(){},fill(){},fillText(){},save(){},clip(){},drawImage(){},restore(){}};
      contexts.set(this,context);
    }
    return contexts.get(this);
  };
  window.HTMLElement.prototype.getBoundingClientRect=function(){
    if(!this.isConnected)return rect(0,0,0,0);
    const parent=this.tagName==='CANVAS'?this.parentElement:this;
    return rect(Number.parseFloat(parent.style.left)||0,Number.parseFloat(parent.style.top)||0,Number.parseFloat(parent.style.width)||0,Number.parseFloat(parent.style.height)||0);
  };
  const conversations=new Map();
  const makeComposer=(target,top=580)=>{
    const element=document.createElement('div'),layout={top};
    element.setAttribute('data-composer-card','');
    element.getBoundingClientRect=()=>rect(20,layout.top,760,100);
    target.append(element);
    return {element,layout};
  };
  for(const session of ['one','two']){
    const target=document.createElement('div'),layout={width:800,height:700};
    target.setAttribute('data-conversation-content','');
    target.setAttribute('data-conversation-session',session);
    target.getBoundingClientRect=()=>rect(0,0,layout.width,layout.height);
    Object.defineProperty(target,'clientWidth',{get:()=>layout.width});
    document.body.append(target);
    conversations.set(session,{target,layout,composer:withComposer?makeComposer(target):null});
  }
  const engine=new Function(`${engineSource}\nreturn SnakeEngine;`)(),games=[],moves=[];
  const originalCreate=engine.createGame,originalStep=engine.step;
  engine.createGame=(...args)=>{const game=originalCreate(...args);games.push(game);return game;};
  engine.step=(game,...args)=>{moves.push(game);return originalStep(game,...args);};
  const glass=new Function('document','ResizeObserver','CSS','navigator','ImageData',`${glassSource}\nreturn LiquidGlass;`)(document,ResizeObserver,{supports:()=>false},window.navigator,window.ImageData);
  const glassBindings=[],observeGlass=glass.observe;
  glass.observe=(panel,...args)=>{
    const binding={panel,active:true},cleanup=observeGlass(panel,...args);
    glassBindings.push(binding);
    return ()=>{binding.active=false;cleanup();};
  };
  let definition,Dock;
  window.__ModuleLoader__={load({factory}){definition=factory(name=>name==='react'?React:ReactDOM);}};
  new Function('window','document','MutationObserver','ResizeObserver','Image','getComputedStyle','setTimeout','clearTimeout','setInterval','clearInterval','SnakeEngine','LiquidGlass',clientSource)(
    window,document,MutationObserver,ResizeObserver,Image,window.getComputedStyle.bind(window),clock.setTimeout,clock.clearTimeout,clock.setInterval,clock.clearInterval,engine,glass,
  );
  definition.apply({slots:{inject(name,callback){callback();},register(spec,component){Dock=component;return component;}},effect(){}});
  const root=createRoot(document.getElementById('root'));
  let sessionId='one',working=false,unmounted=false;
  const flush=async callback=>act(async()=>{callback?.();await Promise.resolve();await Promise.resolve();});
  const render=()=>root.render(React.createElement(Dock,{sessionId,useSession:selector=>selector({running:working})}));
  await flush(render);
  const h={
    window,document,clock,engine,games,moves,conversations,glassBindings,
    get game(){return games[sessionId==='one'?0:1];},
    get conversation(){return conversations.get(sessionId);},
    canvas:()=>h.conversation.target.querySelector('canvas'),
    entry:()=>h.conversation.target.querySelector('.dsh-snake-entry'),
    paints:canvas=>contexts.get(canvas)?.paints||0,
    observed:target=>[...resizeObservers].some(observer=>observer.targets.has(target)),
    activeObservers:()=>({resize:[...resizeObservers].filter(observer=>observer.targets.size).length,mutation:[...mutationObservers].filter(observer=>observer.active).length}),
    flush,
    async click(element){assert(element,'click target must exist');await flush(()=>element.dispatchEvent(new window.MouseEvent('click',{bubbles:true,clientX:120,clientY:100})));},
    async focusCanvas(){await flush(()=>h.canvas().focus());},
    async key(key){await flush(()=>h.canvas().dispatchEvent(new window.KeyboardEvent('keydown',{key,bubbles:true})));},
    async hoverEntry(){await flush(()=>h.entry().dispatchEvent(new window.Event('pointerover',{bubbles:true})));},
    async open(){await h.click(h.entry());assert(h.canvas(),'opening must mount a canvas');},
    async play(){await h.focusCanvas();await h.click(h.canvas());},
    async resize(target){await flush(()=>{for(const observer of resizeObservers)if(observer.targets.has(target))observer.callback([{target}]);});},
    async blurWindow(){await flush(()=>window.dispatchEvent(new window.Event('blur')));},
    async setSession(value){sessionId=value;await flush(render);},
    async addComposer(){await flush(()=>{h.conversation.composer=makeComposer(h.conversation.target);});return h.conversation.composer;},
    async replaceComposer(top){
      const previous=h.conversation.composer;
      await flush(()=>{const replacement=makeComposer(h.conversation.target,top);previous.element.replaceWith(replacement.element);h.conversation.composer=replacement;});
      return previous;
    },
    async unmount(){if(!unmounted){await flush(()=>root.unmount());unmounted=true;}},
    async dispose(){
      await h.unmount();
      dom.window.close();
      for(const [name,descriptor] of originalGlobals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
    },
  };
  return h;
}

test('client schedules one move at the current rice speed without resetting on rerenders',async t=>{
  const h=await mountDock({reducedMotion:false});t.after(()=>h.dispose());
  await h.open();await h.play();
  assert.equal(h.clock.pending().length,1);
  assert.equal(h.clock.pending()[0].delay,160);
  const initialTimer=h.clock.pending()[0];
  await h.clock.advance(80);
  await h.key('ArrowUp');await h.hoverEntry();
  assert.deepEqual(h.game.turns,[[0,-1]]);
  assert.equal(h.entry().style.opacity,'1','hover must cause a state change during the opening animation');
  await h.resize(h.conversation.composer.element);
  assert.deepEqual(h.clock.pending(),[initialTimer],'input, hover and layout rerenders must preserve the pending move');
  for(let rice=1;rice<=5;rice++){
    const game=h.game,direction=game.turns[0]||game.direction;
    game.food=[(game.snake[0][0]+direction[0]+17)%17,(game.snake[0][1]+direction[1]+13)%13];
    await h.clock.advance(rice===1?80:160);
    assert.equal(game.score,rice);
    assert.equal(h.moves.length,rice);
    assert.equal(h.clock.pending().length,1);
  }
  assert.equal(h.clock.pending()[0].delay,140,'the first wait after the fifth rice must use the new speed');
  const fasterTimer=h.clock.pending()[0];
  await h.clock.advance(40);await h.key('ArrowLeft');
  assert.deepEqual(h.clock.pending(),[fasterTimer]);
  await h.clock.advance(99);assert.equal(h.moves.length,5);
  await h.clock.advance(1);assert.equal(h.moves.length,6);
  assert.equal(h.clock.pending().length,1);
});

test('pause, collapse, blur and session changes stop moves and retain the score speed',async t=>{
  const h=await mountDock();t.after(()=>h.dispose());
  await h.open();h.game.score=10;await h.play();
  assert.equal(h.clock.pending()[0].delay,120);
  await h.clock.advance(50);await h.key(' ');
  assert.equal(h.game.phase,'paused');assert.equal(h.clock.pending().length,0);
  await h.clock.advance(1000);assert.equal(h.moves.length,0);
  await h.key(' ');assert.equal(h.clock.pending()[0].delay,120);
  await h.click(h.conversation.target.querySelector('button[aria-label="收起贪吃蛇"]'));
  assert.equal(h.game.open,false);assert.equal(h.game.phase,'paused');assert.equal(h.clock.pending().length,0);
  await h.open();assert.equal(h.clock.pending().length,0);
  await h.play();assert.equal(h.clock.pending()[0].delay,120);
  await h.blurWindow();assert.equal(h.game.phase,'paused');assert.equal(h.clock.pending().length,0);
  await h.play();const firstGame=h.game;
  await h.setSession('two');
  assert.equal(firstGame.phase,'paused');assert.equal(h.clock.pending().length,0);
  await h.setSession('one');assert.equal(h.game,firstGame);assert(h.canvas());
  assert.equal(h.clock.pending().length,0);await h.play();
  assert.equal(h.clock.pending()[0].delay,120);
  await h.clock.advance(119);assert.equal(h.moves.length,0);
  await h.clock.advance(1);assert.equal(h.moves.length,1);
});

test('a board hidden by insufficient space pauses and paints a fresh canvas when restored',async t=>{
  const h=await mountDock();t.after(()=>h.dispose());
  await h.open();await h.play();
  const originalCanvas=h.canvas(),snake=structuredClone(h.game.snake);
  assert(h.paints(originalCanvas)>0);
  assert.deepEqual(h.glassBindings.filter(binding=>binding.active).map(binding=>binding.panel),[originalCanvas.parentElement]);
  h.conversation.composer.layout.top=35;
  await h.resize(h.conversation.composer.element);
  assert.equal(h.canvas(),null);assert.equal(h.game.phase,'paused');assert.equal(h.clock.pending().length,0);
  assert.equal(h.observed(originalCanvas),false);
  assert.equal(h.glassBindings.filter(binding=>binding.active).length,0,'hiding the board must release the detached glass panel');
  await h.clock.advance(1000);assert.deepEqual(h.game.snake,snake);
  h.conversation.composer.layout.top=580;
  await h.resize(h.conversation.composer.element);
  const restoredCanvas=h.canvas();
  assert(restoredCanvas);assert.notEqual(restoredCanvas,originalCanvas);
  assert.equal(restoredCanvas.getAttribute('data-snake-phase'),'paused');
  assert(h.paints(restoredCanvas)>0,'the replacement canvas must paint before play resumes');
  assert.deepEqual(h.glassBindings.filter(binding=>binding.active).map(binding=>binding.panel),[restoredCanvas.parentElement]);
  assert(h.observed(restoredCanvas.parentElement),'geometry observation must attach to the replacement panel');
  assert.equal(h.clock.pending().length,0);
  await h.play();assert.equal(h.clock.pending()[0].delay,160);
  await h.clock.advance(160);assert.equal(h.moves.length,1);
});

test('late composer insertion and replacement attach the dock and observe the live composer',async t=>{
  const h=await mountDock({withComposer:false});t.after(()=>h.dispose());
  assert.equal(h.entry(),null);assert.equal(h.canvas(),null);
  await h.resize(h.conversation.target);
  await h.addComposer();assert(h.entry(),'a composer insertion must reveal the dock without a layout resize');
  await h.open();await h.play();
  const originalCanvas=h.canvas();assert(h.paints(originalCanvas)>0);
  const oldComposer=await h.replaceComposer(400);
  assert(h.canvas());assert.equal(h.observed(oldComposer.element),false);
  assert.equal(h.observed(h.conversation.composer.element),true);
  assert.equal(Number.parseFloat(h.canvas().parentElement.style.top),180);
  h.conversation.composer.layout.top=300;
  await h.resize(h.conversation.composer.element);
  assert.equal(Number.parseFloat(h.canvas().parentElement.style.top),80);
  assert(h.paints(h.canvas())>0);assert.equal(h.clock.pending().length,1);
  await h.clock.advance(160);assert.equal(h.moves.length,1);
});

test('unmount clears the move timer, canvas observers and global listeners',async t=>{
  const h=await mountDock();t.after(()=>h.dispose());
  await h.open();await h.play();
  assert.equal(h.clock.pending().length,1);
  assert(h.activeObservers().resize>0);assert(h.activeObservers().mutation>0);
  const game=h.game,canvas=h.canvas(),paints=h.paints(canvas);
  await h.unmount();
  assert.equal(game.phase,'paused');assert.equal(h.clock.pending().length,0);
  assert.deepEqual(h.activeObservers(),{resize:0,mutation:0});
  assert.equal(h.glassBindings.filter(binding=>binding.active).length,0);
  await h.clock.advance(1000);assert.equal(h.moves.length,0);
  await h.flush(()=>h.document.documentElement.setAttribute('data-theme','dark'));
  assert.equal(h.paints(canvas),paints);
  game.phase='playing';
  await h.blurWindow();assert.equal(game.phase,'playing','the unmounted window blur listener must be removed');
});
