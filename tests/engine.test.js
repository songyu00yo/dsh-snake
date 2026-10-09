import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../engine.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const {createGame,start,pause,turn,step,foodFor,workChanged,clampPosition,aboveInput,COLS,ROWS}=new Function(`${compiled}\nreturn SnakeEngine;`)();
test('movement and rice growth',()=>{
 const g=createGame();start(g);g.food=[9,6];step(g,()=>0);
 assert.equal(g.snake.length,6);assert.equal(g.score,1);assert.deepEqual(g.snake[0],[9,6]);
 assert(!g.snake.some(p=>p[0]===g.food[0] && p[1]===g.food[1]));step(g);assert.equal(g.snake.length,6);
});
test('arrows, WASD and reverse rejection',()=>{
 for(const key of ['ArrowUp','w','W','ArrowDown','s','S']){const g=createGame();start(g);assert.equal(turn(g,'a'),false);assert(turn(g,key));assert.equal(turn(g,key),false);assert.equal(turn(g,key==='ArrowUp'||key.toLowerCase()==='w'?'ArrowDown':'ArrowUp'),false);step(g);assert.deepEqual(g.snake[0],[8,key==='ArrowDown'||key.toLowerCase()==='s'?7:5]);}
 for(const key of ['ArrowLeft','a','ArrowRight','d']){const g=createGame();start(g);g.snake=[[8,6],[8,7]];g.direction=[0,-1];assert(turn(g,key));step(g);assert.deepEqual(g.snake[0],[key==='ArrowLeft'||key==='a'?7:9,6]);}
});
test('wraps at walls, self collision, tail cell and restart',()=>{
 const g=createGame();start(g);g.snake=[[16,6],[15,6]];step(g);assert.equal(g.phase,'playing');assert.deepEqual(g.snake[0],[0,6]);g.phase='over';start(g);assert.equal(g.phase,'playing');assert.equal(g.snake.length,5);
 g.snake=[[2,2],[2,3],[3,3],[3,2]];g.food=[0,0];g.direction=[0,-1];turn(g,'d');step(g);assert.equal(g.phase,'playing');
 g.snake=[[2,2],[3,2],[3,3],[2,3],[1,3]];g.direction=[0,-1];g.turns=[];turn(g,'d');step(g);assert.equal(g.phase,'over');
});
test('pause and task lifecycle',()=>{
 const g=createGame();workChanged(g,true);assert(g.open);assert.equal(g.phase,'ready');workChanged(g,false);assert(!g.open);
 workChanged(g,true);start(g);workChanged(g,false);assert(g.open);assert.equal(g.phase,'playing');assert(g.finished);
 pause(g);const snake=structuredClone(g.snake);step(g);assert.deepEqual(g.snake,snake);
 workChanged(g,true);assert(g.open);assert(!g.finished);workChanged(g,false);assert(g.open);
});
test('full board wins',()=>{
 const cells=[];for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)cells.push([x,y]);assert.equal(foodFor(cells),null);
 const g=createGame();start(g);g.snake=[[15,12],...cells.filter(([x,y])=>!(x===15&&y===12)&&!(x===16&&y===12))];g.food=[16,12];step(g);
 assert.equal(g.phase,'won');assert.equal(g.food,null);assert.equal(g.snake.length,COLS*ROWS);
});

test('wraps in all four directions',()=>{for(const [head,dir,expected] of [[[0,5],[-1,0],[16,5]],[[16,5],[1,0],[0,5]],[[5,0],[0,-1],[5,12]],[[5,12],[0,1],[5,0]]]){const g=createGame();start(g);g.snake=[head];g.direction=dir;step(g);assert.deepEqual(g.snake[0],expected);assert.equal(g.phase,'playing');}});

test('floating panel starts at upper right and stays within a resized conversation',()=>{
 assert.deepEqual(clampPosition(null,800,600,420,321),{x:364,y:16});
 assert.deepEqual(clampPosition({x:600,y:500},420,300,272,240),{x:148,y:60});
 assert.deepEqual(clampPosition({x:-20,y:-10},240,180,208,220),{x:0,y:0});
});

test('buffers rapid turns for consecutive steps and restarts toward the pressed direction',()=>{
 const g=createGame();start(g);assert(turn(g,'w'));assert(turn(g,'a'));assert.equal(turn(g,'s'),false);
 step(g);assert.deepEqual(g.snake[0],[8,5]);assert.deepEqual(g.direction,[0,-1]);
 step(g);assert.deepEqual(g.snake[0],[7,5]);assert.deepEqual(g.direction,[-1,0]);
 g.phase='over';start(g,[0,1]);assert.deepEqual(g.direction,[0,1]);assert.deepEqual(g.snake[1],[8,5]);step(g);assert.deepEqual(g.snake[0],[8,7]);
});

test('board anchors above input and dragging or resizing cannot cover it',()=>{
 const area={left:100,top:50,width:800,height:700},input={right:850,top:600};
 const normal=aboveInput(area,input);
 assert.equal(normal.width,272);assert.equal(normal.height,208);
 assert.deepEqual(normal.position,{x:478,y:330});assert.deepEqual(normal.entry,{x:702,y:510});
 const dragged=aboveInput(area,input,{x:2000,y:2000});
 assert(dragged.position.y+dragged.height<=input.top-area.top-12);
 const narrow=aboveInput({left:0,top:0,width:200,height:200},{right:190,top:130},{x:600,y:600});
 assert(narrow.width<=168);assert(narrow.position.y+narrow.height<=118);
 assert(narrow.position.x+narrow.width<=200);
});
