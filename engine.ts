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
    auto: boolean;
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
    return {snake,direction:[...direction],turns:[],food:foodFor(snake),phase:'ready',open:false,played:false,working:false,finished:false,score:0,auto:false};
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
    const direction=game.auto ? planDirection(game) : game.turns.shift()||game.direction;game.direction=direction;
    const head: Point=[(game.snake[0][0]+direction[0]+COLS)%COLS, (game.snake[0][1]+direction[1]+ROWS)%ROWS];
    const eating=game.food && head[0]===game.food[0] && head[1]===game.food[1];
    const body=eating ? game.snake : game.snake.slice(0,-1);
    if (body.some(p=>p[0]===head[0] && p[1]===head[1])) {game.phase='over'; game.auto=false; return;}
    game.snake.unshift(head);
    if (eating) {game.score++; game.food=foodFor(game.snake,random); if (!game.food) {game.phase='won';game.auto=false;}}
    else game.snake.pop();
  }

  const ORDER: Point[] = [[0,-1],[1,0],[0,1],[-1,0]];
  const same=(a: Point,b: Point)=>a[0]===b[0]&&a[1]===b[1];
  const cell=(p: Point)=>p[1]*COLS+p[0];
  const advance=(p: Point,d: Point): Point=>[(p[0]+d[0]+COLS)%COLS,(p[1]+d[1]+ROWS)%ROWS];
  const ordered=(direction: Point)=>[direction,...ORDER.filter(d=>!same(d,direction)&&!same(d,[-direction[0],-direction[1]]))];

  // BFS uses the vacating tail as a candidate; simulation checks its timing.
  export function findRoute(snake: Point[],direction: Point,target: Point): Point[] | null {
    const blocked=new Set(snake.slice(1,-1).map(cell));
    const seen=new Set([cell(snake[0])]);
    const queue: {point:Point;direction:Point;path:Point[]}[]=[{point:snake[0],direction,path:[]}];
    for(let i=0;i<queue.length;i++){
      const node=queue[i];
      if(same(node.point,target))return node.path;
      for(const d of ordered(node.direction)){
        const point=advance(node.point,d),id=cell(point);
        if(blocked.has(id)||seen.has(id))continue;
        seen.add(id);queue.push({point,direction:d,path:[...node.path,d]});
      }
    }
    return null;
  }

  export function simulateRoute(snake: Point[],direction: Point,food: Point|null,path: Point[]): Point[] | null {
    const body=snake.map(p=>[...p] as Point);let current=direction,rice=food;
    for(const d of path){
      if(same(d,[-current[0],-current[1]]))return null;
      const head=advance(body[0],d),eating=rice!==null&&same(head,rice);
      if((eating?body:body.slice(0,-1)).some(p=>same(p,head)))return null;
      body.unshift(head);if(eating)rice=null;else body.pop();current=d;
    }
    return body;
  }

  function space(snake: Point[]): number {
    const blocked=new Set(snake.slice(1,-1).map(cell)),seen=new Set([cell(snake[0])]),queue=[snake[0]];
    for(let i=0;i<queue.length;i++)for(const d of ORDER){
      const p=advance(queue[i],d),id=cell(p);
      if(!blocked.has(id)&&!seen.has(id)){seen.add(id);queue.push(p);}
    }
    return seen.size;
  }

  export function planDirection(game: Game): Point {
    const {snake,direction,food}=game;
    const path=food?findRoute(snake,direction,food):null;
    if(path?.length){
      const after=simulateRoute(snake,direction,food,path),last=path[path.length-1];
      if(after&&(after.length===COLS*ROWS||findRoute(after,last,after[after.length-1])!==null))return path[0];
    }
    const tail=findRoute(snake,direction,snake[snake.length-1]);
    if(tail?.length&&simulateRoute(snake,direction,food,tail))return tail[0];
    let best=direction,largest=-1;
    for(const d of ordered(direction)){
      const after=simulateRoute(snake,direction,food,[d]);
      if(!after)continue;
      const area=space(after);if(area>largest){best=d;largest=area;}
    }
    return best;
  }

  export interface InputState {sequence: string[];last: number;exit: Point|null;exitAt: number;}
  const SECRET=['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a','b','a'];
  export const createInput=(): InputState=>({sequence:[],last:0,exit:null,exitAt:0});
  export function resetInput(input: InputState): void {Object.assign(input,createInput());}

  // This state belongs to the focused canvas, not the session or a global listener.
  export function inputKey(game: Game,input: InputState,key: string,repeat=false,now=Date.now()): 'auto'|'manual'|'ignored' {
    if(repeat)return game.auto?'ignored':'manual';
    const normalized=key.length===1?key.toLowerCase():key,d=DIRECTIONS[normalized];
    if(game.auto){
      input.sequence=[];
      if(!d){input.exit=null;return 'ignored';}
      if(input.exit&&same(input.exit,d)&&now-input.exitAt<=600){
        game.auto=false;game.turns=[];resetInput(input);return 'manual';
      }
      input.exit=d;input.exitAt=now;return 'ignored';
    }
    if(now-input.last>1500)input.sequence=[];
    input.last=now;input.sequence.push(normalized);
    while(input.sequence.length&&!input.sequence.every((k,i)=>k===SECRET[i]))input.sequence.shift();
    if(input.sequence.length===SECRET.length){
      resetInput(input);start(game);game.turns=[];game.auto=true;return 'auto';
    }
    return 'manual';
  }

  export function workChanged(game: Game, working: boolean): void {
    if (working===game.working) return;
    game.working=working;
    game.finished=!working;
  }
}
