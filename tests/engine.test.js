import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGame,start,pause,turn,step,foodFor,workChanged,COLS,ROWS} from '../engine.js';
test('movement and rice growth',()=>{
 const g=createGame();start(g);g.food=[9,6];step(g,()=>0);
 assert.equal(g.snake.length,6);assert.equal(g.score,1);assert.deepEqual(g.snake[0],[9,6]);
 assert(!g.snake.some(p=>p[0]===g.food[0] && p[1]===g.food[1]));step(g);assert.equal(g.snake.length,6);
});
test('arrows, WASD, reverse rejection and one turn per step',()=>{
 for(const key of ['ArrowUp','w','W','ArrowDown','s','S']){const g=createGame();start(g);assert.equal(turn(g,'a'),false);assert(turn(g,key));assert.equal(turn(g,'a'),false);step(g);assert.deepEqual(g.snake[0],[8,key==='ArrowDown'||key.toLowerCase()==='s'?7:5]);}
 for(const key of ['ArrowLeft','a','ArrowRight','d']){const g=createGame();start(g);g.snake=[[8,6],[8,7]];g.direction=[0,-1];assert(turn(g,key));step(g);assert.deepEqual(g.snake[0],[key==='ArrowLeft'||key==='a'?7:9,6]);}
});
test('wraps at walls, self collision, tail cell and restart',()=>{
 const g=createGame();start(g);g.snake=[[16,6],[15,6]];step(g);assert.equal(g.phase,'playing');assert.deepEqual(g.snake[0],[0,6]);g.phase='over';start(g);assert.equal(g.phase,'playing');assert.equal(g.snake.length,5);
 g.snake=[[2,2],[2,3],[3,3],[3,2]];g.food=[0,0];g.direction=[0,-1];turn(g,'d');step(g);assert.equal(g.phase,'playing');
 g.snake=[[2,2],[3,2],[3,3],[2,3],[1,3]];g.direction=[0,-1];g.queued=null;turn(g,'d');step(g);assert.equal(g.phase,'over');
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
