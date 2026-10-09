export const COLS = 17, ROWS = 13, STEP_MS = 160;
export const DIRECTIONS = { ArrowUp:[0,-1], w:[0,-1], ArrowDown:[0,1], s:[0,1], ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0] };
export function foodFor(snake, random = Math.random) {
  const empty = [];
  for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++)
    if (!snake.some(p => p[0]===x && p[1]===y)) empty.push([x,y]);
  return empty.length ? empty[Math.min(empty.length-1, Math.floor(random()*empty.length))] : null;
}
export function createGame() {
  const snake = [[8,6],[7,6],[6,6],[5,6],[4,6]];
  return {snake, direction:[1,0], queued:null, food:foodFor(snake), phase:'ready', open:false, played:false, working:false, finished:false, score:0};
}
export function start(game) {
  if (game.phase==='over' || game.phase==='won') Object.assign(game, createGame(), {working:game.working, finished:game.finished});
  game.open=true; game.played=true; game.phase='playing';
}
export function pause(game) { if (game.phase==='playing') game.phase='paused'; }
export function turn(game, key) {
  const next=DIRECTIONS[key.length===1 ? key.toLowerCase() : key];
  if (!next || game.phase!=='playing' || game.queued) return false;
  if (next[0]===-game.direction[0] && next[1]===-game.direction[1]) return false;
  if (next[0]===game.direction[0] && next[1]===game.direction[1]) return false;
  game.queued=next; return true;
}
export function step(game, random=Math.random) {
  if (game.phase!=='playing') return;
  const direction=game.queued || game.direction; game.direction=direction; game.queued=null;
  const head=[(game.snake[0][0]+direction[0]+COLS)%COLS, (game.snake[0][1]+direction[1]+ROWS)%ROWS];
  const eating=game.food && head[0]===game.food[0] && head[1]===game.food[1];
  const body=eating ? game.snake : game.snake.slice(0,-1);
  if (body.some(p=>p[0]===head[0] && p[1]===head[1])) {game.phase='over'; return;}
  game.snake.unshift(head);
  if (eating) {game.score++; game.food=foodFor(game.snake,random); if (!game.food) game.phase='won';}
  else game.snake.pop();
}
export function workChanged(game, working) {
  if (working===game.working) return;
  game.working=working;
  if (working) {if (!game.open) game.played=false; game.open=true; game.finished=false;}
  else {game.finished=true; if (!game.played) {game.open=false; pause(game);}}
}
