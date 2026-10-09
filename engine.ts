namespace SnakeEngine {
  export type Point = [number, number];
  export type Phase = 'ready' | 'playing' | 'paused' | 'over' | 'won';

  export interface Game {
    snake: Point[];
    direction: Point;
    turns: Point[];
    food: Point | null;
    phase: Phase;
    open: boolean;
    played: boolean;
    working: boolean;
    finished: boolean;
    score: number;
    position?: {x: number; y: number};
    drag?: {pointer: number; x: number; y: number; left: number; top: number};
  }

  export const COLS = 17, ROWS = 13, STEP_MS = 160;
  export const DIRECTIONS: Record<string, Point> = {
    ArrowUp:[0,-1], w:[0,-1], ArrowDown:[0,1], s:[0,1],
    ArrowLeft:[-1,0], a:[-1,0], ArrowRight:[1,0], d:[1,0],
  };

  export function clampPosition(position: Game['position'] | null, width: number, height: number, panelWidth: number, panelHeight: number, inset=16) {
    const maxX=Math.max(0,width-panelWidth), maxY=Math.max(0,height-panelHeight);
    return {x:Math.min(maxX,Math.max(0,position?.x ?? maxX-inset)),y:Math.min(maxY,Math.max(0,position?.y ?? inset))};
  }

  export function aboveInput(area: {left:number;top:number;width:number;height:number},input: {right:number;top:number},position?: Game['position'],widthLimit=272) {
    const bottom=Math.max(0,Math.min(area.height,input.top-area.top-12));
    const width=Math.floor(Math.min(widthLimit,Math.max(0,area.width-32),bottom*COLS/ROWS)),height=width*ROWS/COLS;
    return {width,height,bottom,
      position:clampPosition(position||{x:input.right-area.left-width,y:bottom-height},area.width,bottom,width,height),
      entry:clampPosition({x:input.right-area.left-56,y:input.top-area.top-52},area.width,area.height,56,44)};
  }

  export function foodFor(snake: Point[], random = Math.random): Point | null {
    const empty: Point[] = [];
    for (let y=0; y<ROWS; y++) for (let x=0; x<COLS; x++)
      if (!snake.some(p => p[0]===x && p[1]===y)) empty.push([x,y]);
    return empty.length ? empty[Math.min(empty.length-1, Math.floor(random()*empty.length))] : null;
  }

  export function createGame(direction: Point=[1,0]): Game {
    const snake=Array.from({length:5},(_,i)=>[(8-direction[0]*i+COLS)%COLS,(6-direction[1]*i+ROWS)%ROWS] as Point);
    return {snake,direction:[...direction],turns:[],food:foodFor(snake),phase:'ready',open:false,played:false,working:false,finished:false,score:0};
  }

  export function start(game: Game, direction?: Point): void {
    if (game.phase==='over' || game.phase==='won') Object.assign(game,createGame(direction),{working:game.working,finished:game.finished});
    game.open=true; game.played=true; game.phase='playing';
  }

  export function pause(game: Game): void { if (game.phase==='playing') game.phase='paused'; }

  export function turn(game: Game, key: string): boolean {
    const next=DIRECTIONS[key.length===1 ? key.toLowerCase() : key];
    if (!next || game.phase!=='playing' || game.turns.length>=2) return false;
    const current=game.turns.at(-1)||game.direction;
    if (next[0]===-current[0] && next[1]===-current[1]) return false;
    if (next[0]===current[0] && next[1]===current[1]) return false;
    game.turns.push(next);return true;
  }

  export function step(game: Game, random=Math.random): void {
    if (game.phase!=='playing') return;
    const direction=game.turns.shift()||game.direction;game.direction=direction;
    const head: Point=[(game.snake[0][0]+direction[0]+COLS)%COLS, (game.snake[0][1]+direction[1]+ROWS)%ROWS];
    const eating=game.food && head[0]===game.food[0] && head[1]===game.food[1];
    const body=eating ? game.snake : game.snake.slice(0,-1);
    if (body.some(p=>p[0]===head[0] && p[1]===head[1])) {game.phase='over'; return;}
    game.snake.unshift(head);
    if (eating) {game.score++; game.food=foodFor(game.snake,random); if (!game.food) game.phase='won';}
    else game.snake.pop();
  }

  export function workChanged(game: Game, working: boolean): void {
    if (working===game.working) return;
    game.working=working;
    game.finished=!working;
  }
}
