import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const compiled=ts.transpileModule(readFileSync(new URL('../engine.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const E=new Function(`${compiled}\nreturn SnakeEngine;`)();
const secret=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','b','a'];
function unlock(g,input=E.createInput(),begin=100){secret.forEach((key,i)=>E.inputKey(g,input,key,false,begin+i*100));return input;}
const fixture=(snake,direction,food)=>Object.assign(E.createGame(),{snake,direction,food,phase:'playing',auto:true});

test('secret starts each phase, clears turns and preserves active game',()=>{
 for(const phase of ['ready','playing','paused','over','won']){
  const g=E.createGame();g.phase=phase;g.turns=[[0,-1]];const snake=g.snake;
  unlock(g);assert(g.auto);assert.equal(g.phase,'playing');assert.deepEqual(g.turns,[]);
  assert.equal(g.snake===snake,!['over','won'].includes(phase));
 }
 const a=E.createGame(),b=E.createGame();unlock(a);assert(!b.auto);
 E.pause(a);assert(a.auto);const snake=structuredClone(a.snake);E.step(a);assert.deepEqual(a.snake,snake);E.start(a);assert(a.auto);
});
test('wrong keys, timeout, reset, repeated events and arrow-only secret',()=>{
 for(const kind of ['wrong','timeout','reset','wasd']){
  const g=E.createGame(),input=E.createInput();
  secret.forEach((key,i)=>{
   if(i===3&&kind==='reset')E.resetInput(input);
   E.inputKey(g,input,kind==='wrong'&&i===3?'x':kind==='wasd'&&key==='ArrowUp'?'w':key,false,100+i*100+(kind==='timeout'&&i>=3?1600:0));
  });assert(!g.auto,kind);
 }
 const g=E.createGame(),input=E.createInput();E.inputKey(g,input,'ArrowUp',false,100);E.inputKey(g,input,'ArrowUp',true,110);
 assert.equal(input.sequence.length,1);secret.slice(1).forEach((k,i)=>E.inputKey(g,input,k.toUpperCase().length===1?k.toUpperCase():k,false,200+i*100));assert(g.auto);
 const h=E.createGame(),state=E.createInput();E.start(h);
 assert.equal(E.inputKey(h,state,'ArrowUp',false,1),'manual');assert(E.turn(h,'ArrowUp'));assert.deepEqual(h.turns,[[0,-1]]);
});
test('same logical direction twice exits, repeat and timeout do not; reverse is rejected',()=>{
 const g=E.createGame(),input=unlock(g);
 assert.equal(E.inputKey(g,input,'ArrowUp',false,2000),'ignored');assert.equal(E.inputKey(g,input,'w',true,2010),'ignored');assert(g.auto);
 assert.equal(E.inputKey(g,input,'W',false,2600),'manual');assert(!g.auto);assert(E.turn(g,'W'));
 unlock(g,input,3000);E.inputKey(g,input,'ArrowLeft',false,5000);
 assert.equal(E.inputKey(g,input,'a',false,5601),'ignored');assert(g.auto);
 assert.equal(E.inputKey(g,input,'ArrowLeft',false,5700),'manual');assert(!g.auto);
 assert.equal(E.turn(g,'a'),false);assert.deepEqual(g.turns,[]);
 unlock(g,input,6000);E.inputKey(g,input,'w',false,8000);E.inputKey(g,input,'d',false,8100);assert(g.auto);
 E.resetInput(input);E.inputKey(g,input,'d',false,8200);assert(g.auto);
});
test('BFS takes shortest wrapping path and simulation respects moving tail and growth',()=>{
 assert.deepEqual(E.findRoute([[16,6],[15,6]],[1,0],[0,6]),[[1,0]]);
 const body=[[2,2],[2,3],[3,3],[3,2]];
 assert.deepEqual(E.simulateRoute(body,[0,-1],[0,0],[[1,0]]),[[3,2],[2,2],[2,3],[3,3]]);
 assert.equal(E.simulateRoute(body,[0,-1],[3,2],[[1,0]]),null);
 assert.equal(E.simulateRoute(body,[0,-1],null,[[0,1]]),null);
 const g=fixture([[16,6],[15,6]],[1,0],[0,6]);assert.deepEqual(E.planDirection(g),[1,0]);E.step(g,()=>0);assert.equal(g.score,1);assert.deepEqual(g.snake[0],[0,6]);
});
test('food trap is rejected in favour of following the tail',()=>{
 // Eating right fills the pocket; its three other neighbours are body cells.
 const snake=[[2,2],[2,1],[3,1],[4,1],[4,2],[4,3],[3,3],[2,3],[1,3],[1,2]];
 const g=fixture(snake,[0,1],[3,2]);
 const path=E.findRoute(snake,g.direction,g.food);assert.deepEqual(path,[[1,0]]);
 const after=E.simulateRoute(snake,g.direction,g.food,path);assert(after);
 assert.equal(E.findRoute(after,[1,0],after.at(-1)),null);
 assert.deepEqual(E.planDirection(g),[-1,0]);E.step(g);assert.equal(g.phase,'playing');assert.equal(g.score,0);
});
test('no legal step ends normally and full board disables auto',()=>{
 const g=fixture([[2,2],[1,2],[1,1],[2,1],[3,1],[3,2],[3,3],[2,3],[1,3],[0,3]],[1,0],[0,0]);
 E.step(g);assert.equal(g.phase,'over');assert(!g.auto);
 const cells=[];for(let y=0;y<E.ROWS;y++)for(let x=0;x<E.COLS;x++)cells.push([x,y]);
 const win=fixture([[15,12],...cells.filter(([x,y])=>!(x===15&&y===12)&&!(x===16&&y===12))],[1,0],[16,12]);
 E.step(win);assert.equal(win.phase,'won');assert(!win.auto);
});
test('fixed-seed games are deterministic and every planned move obeys the rules',()=>{
 const random=seed=>()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 function run(seed){
  const rng=random(seed),g=E.createGame();g.food=E.foodFor(g.snake,rng);E.start(g);g.auto=true;
  for(let i=0;i<600&&g.phase==='playing';i++){
   const before=g.snake.map(p=>[...p]),direction=E.planDirection(g),predicted=E.simulateRoute(before,g.direction,g.food,[direction]);
   E.step(g,rng);
   if(predicted){assert.deepEqual(g.snake,predicted);assert.notEqual(g.phase,'over');}
   else assert.equal(g.phase,'over');
   assert.equal(new Set(g.snake.map(p=>p.join(','))).size,g.snake.length);
   assert(g.snake.every(([x,y])=>x>=0&&x<E.COLS&&y>=0&&y<E.ROWS));
   if(g.food)assert(!g.snake.some(p=>p[0]===g.food[0]&&p[1]===g.food[1]));
  }
  assert(g.score>=5);return {snake:g.snake,score:g.score,phase:g.phase};
 }
 for(const seed of [1,7,42,2026,0xffffffff])assert.deepEqual(run(seed),run(seed));
});
test('fallback ties keep current direction and the planner has no side effects',()=>{
 const g=fixture([[5,5]],[0,1],null),before=structuredClone(g);
 assert.deepEqual(E.planDirection(g),[0,1]);assert.deepEqual(g,before);
});
