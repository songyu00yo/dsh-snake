interface Window {
  __ModuleLoader__: {
    load(options: {id: string; factory: (require: (name: string) => any) => unknown}): void;
  };
}

type SessionId = string | number;
type Portal = {sessionId: SessionId; target: HTMLElement};
type DockProps = {
  sessionId: SessionId;
  useSession: <T>(selector: (snapshot: {running?: boolean}) => T) => T;
};
type KeyEventLike = KeyboardEvent & {nativeEvent: KeyboardEvent};
type PointerEventLike = {target: Element; currentTarget: HTMLElement; pointerId: number; clientX: number; clientY: number; preventDefault(): void; stopPropagation(): void};

window.__ModuleLoader__.load({id:'dsh-snake', factory(require) {
  const React=require('react'), ReactDOM=require('react-dom');
  const {COLS,ROWS,STEP_MS,DIRECTIONS,clampPosition,aboveInput,createGame,start,pause,turn,step,workChanged}=SnakeEngine;
  const avatarSrc: string=/* AVATAR */ null as unknown as string;
  const games=new Map<SessionId,SnakeEngine.Game>(), h=React.createElement;
  function SnakeDock({sessionId, useSession}: DockProps) {
    const working=useSession(snapshot=>Boolean(snapshot.running));
    if (!games.has(sessionId)) games.set(sessionId,createGame());
    const game=games.get(sessionId)!, [,refresh]=React.useReducer((n: number)=>n+1,0);
    const [portal,setPortal]=React.useState(null) as [Portal|null,(value: Portal|null|((current: Portal|null)=>Portal|null))=>void];
    const canvasRef=React.useRef(null) as {current: HTMLCanvasElement|null};
    const imageRef=React.useRef(null) as {current: HTMLImageElement|null};
    const panelRef=React.useRef(null) as {current: HTMLElement|null};
    const filterId='dsh-snake-'+React.useId().replace(/[^a-zA-Z0-9_-]/g,'');
    const [glassMap,setGlassMap]=React.useState(null) as [LiquidGlass.Map|null,(value:LiquidGlass.Map|null)=>void];
    const [focused,setFocused]=React.useState(false);
    const [entranceActive,setEntranceActive]=React.useState(false);
    const [opening,setOpening]=React.useState(false);
    const [tap,setTap]=React.useState(null) as [{x:number;y:number;key:number}|null,(value:{x:number;y:number;key:number}|null)=>void];
    const reducedMotion=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    React.useEffect(()=>{setOpening(false);setTap(null);setFocused(false);setEntranceActive(false);},[game]);
    React.useEffect(()=>{workChanged(game,working);refresh();},[game,working]);
    React.useEffect(()=>{
      const img=new Image();imageRef.current=img;img.onload=refresh;img.onerror=refresh;img.src=avatarSrc;
      return ()=>{img.onload=null;img.onerror=null;imageRef.current=null;pause(game);};
    },[game]);
    React.useEffect(()=>{
      const hide=()=>{if(document.hidden){pause(game);refresh();}};
      const blur=()=>{pause(game);refresh();};
      document.addEventListener('visibilitychange',hide);window.addEventListener('blur',blur);
      return ()=>{document.removeEventListener('visibilitychange',hide);window.removeEventListener('blur',blur);};
    },[game]);
    React.useEffect(()=>{
      const find=()=>Array.from(document.querySelectorAll<HTMLElement>('[data-conversation-content]')).find(el=>el.getAttribute('data-conversation-session')===String(sessionId))||null;
      const update=()=>{const target=find();setPortal(current=>current?.sessionId===sessionId&&current.target===target?current:target?{sessionId,target}:null);};
      update();const observer=new MutationObserver(update);observer.observe(document.documentElement,{childList:true,subtree:true});
      return ()=>observer.disconnect();
    },[sessionId]);
    React.useEffect(()=>{
      const panel=panelRef.current;if(!game.open||!panel)return;
      return LiquidGlass.observe(panel,filterId,setGlassMap);
    },[game,game.open,portal,filterId]);
    React.useEffect(()=>{
      const canvas=canvasRef.current;if(!canvas)return;
      const paint=()=>{
        const width=canvas.getBoundingClientRect().width;if(!width)return;
        const cell=width/COLS,height=cell*ROWS,ratio=window.devicePixelRatio||1,w=Math.round(width*ratio),hh=Math.round(height*ratio);
        if(canvas.width!==w||canvas.height!==hh){canvas.width=w;canvas.height=hh;}
        const c=canvas.getContext('2d');if(!c)return;c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,width,height);
        c.fillStyle=getComputedStyle(canvas).color;c.globalAlpha=.14;
        for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){c.beginPath();c.arc((x+.5)*cell,(y+.5)*cell,Math.max(.6,cell*.045),0,Math.PI*2);c.fill();}
        c.globalAlpha=1;
        game.snake.slice(1).forEach(p=>{c.fillStyle='#4b9297';c.beginPath();c.arc((p[0]+.5)*cell,(p[1]+.5)*cell,cell*.31,0,Math.PI*2);c.fill();});
        c.globalAlpha=1;
        if(game.food){c.font=`${cell*.9}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('🍚',(game.food[0]+.5)*cell,(game.food[1]+.5)*cell);}
        const [x,y]=game.snake[0],img=imageRef.current;
        if(img?.complete&&img.naturalWidth){c.save();c.beginPath();c.arc((x+.5)*cell,(y+.5)*cell,cell*.48,0,Math.PI*2);c.clip();c.drawImage(img,275,125,440,440,(x+.5)*cell-cell*.48,(y+.5)*cell-cell*.48,cell*.96,cell*.96);c.restore();}
        else{c.fillStyle='#4b9297';c.beginPath();c.arc((x+.5)*cell,(y+.5)*cell,cell*.38,0,Math.PI*2);c.fill();}
      };
      paint();const timer=game.phase==='playing'?setInterval(()=>{step(game);paint();refresh();},STEP_MS):null;
      const resize=new ResizeObserver(paint);resize.observe(canvas);
      const theme=new MutationObserver(paint);theme.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
      const img=imageRef.current;if(img)img.onload=paint;
      return ()=>{if(timer)clearInterval(timer);resize.disconnect();theme.disconnect();if(img)img.onload=null;};
    },[game,game.open,game.phase,portal]);
    React.useEffect(()=>{
      const target=portal?.target;if(!target)return;
      const resize=new ResizeObserver(()=>{
        const input=target.querySelector('[data-composer-card]');
        if(game.position&&input)game.position=aboveInput(target.getBoundingClientRect(),input.getBoundingClientRect(),game.position).position;
        refresh();
      });
      resize.observe(target);if(panelRef.current)resize.observe(panelRef.current);
      const composer=target.querySelector('[data-composer-card]');if(composer)resize.observe(composer);
      const scroll=()=>refresh();target.addEventListener('scroll',scroll,true);
      return ()=>{resize.disconnect();target.removeEventListener('scroll',scroll,true);};
    },[game,game.open,portal]);
    const close=()=>{pause(game);game.open=false;refresh();};
    const open=()=>{setOpening(!reducedMotion());setEntranceActive(false);game.open=true;refresh();};
    const play=(e: MouseEvent & {currentTarget: HTMLCanvasElement})=>{
      start(game);refresh();
      if(!reducedMotion()){const rect=e.currentTarget.getBoundingClientRect();setTap({x:e.clientX-rect.left,y:e.clientY-rect.top,key:Date.now()});}
    };
    const keyDown=(e: KeyEventLike)=>{
      if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing)return;
      if(!DIRECTIONS[e.key.length===1?e.key.toLowerCase():e.key]&&![' ','Escape'].includes(e.key))return;
      e.preventDefault();e.stopPropagation();e.nativeEvent.stopImmediatePropagation();
      if(e.key==='Escape'){pause(game);canvasRef.current?.blur();}
      else if(e.key===' '){if(!e.repeat){if(game.phase==='playing')pause(game);else start(game);}}
      else{if(game.phase==='over'||game.phase==='won')start(game,DIRECTIONS[e.key.length===1?e.key.toLowerCase():e.key]);else if(game.phase==='ready'||game.phase==='paused')start(game);turn(game,e.key);}
      refresh();
    };
    const dragStart=(e: PointerEventLike)=>{
      if(e.target.closest('button'))return;
      e.preventDefault();e.stopPropagation();pause(game);
      const el=e.currentTarget,panel=panelRef.current;if(!panel)return;el?.setPointerCapture(e.pointerId);
      game.drag={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:panel.offsetLeft,top:panel.offsetTop};refresh();
    };
    const dragMove=(e: PointerEventLike)=>{
      if(game.drag?.pointer!==e.pointerId)return;
      const target=portal?.target,el=panelRef.current;if(!target||!el)return;
      const input=target.querySelector('[data-composer-card]');if(!input)return;
      const layout=aboveInput(target.getBoundingClientRect(),input.getBoundingClientRect());
      game.position=clampPosition({x:game.drag.left+e.clientX-game.drag.x,y:game.drag.top+e.clientY-game.drag.y},target.clientWidth,layout.bottom,el.offsetWidth,el.offsetHeight);
      refresh();
    };
    const dragEnd=(e: PointerEventLike)=>{if(game.drag?.pointer===e.pointerId){game.drag=undefined;refresh();}};
    const subtle={border:0,background:'transparent',color:'inherit',font:'inherit',padding:'2px 0',cursor:'pointer',opacity:.72};
    const content=portal?.sessionId===sessionId&&portal.target.isConnected?portal.target:null;
    if(!content)return null;
    const composer=content.querySelector<HTMLElement>('[data-composer-card]');if(!composer)return null;
    const {width:panelWidth,height:panelHeight,position,entry}=aboveInput(content.getBoundingClientRect(),composer.getBoundingClientRect(),game.position,LiquidGlass.WIDTH);
    if(panelWidth<64)return null;
    const panelStyle={position:'absolute',left:position.x,top:position.y,width:panelWidth,height:panelHeight,color:'inherit',font:'inherit',borderRadius:LiquidGlass.RADIUS,overflow:'hidden',pointerEvents:'auto',isolation:'isolate'};
    const backdrop=glassMap?`url(#${filterId}) blur(1.5px) saturate(1.08)`:'blur(1.5px) saturate(1.08)';
    const motionCSS=`
      @keyframes dsh-snake-reveal{from{clip-path:inset(100% 0 0 0 round 16px)}to{clip-path:inset(0 round 16px)}}
      @keyframes dsh-snake-hop{0%,100%{transform:translateY(0)}45%{transform:translateY(-4px)}}
      @keyframes dsh-snake-leave{from{opacity:.72}to{opacity:0}}
      @keyframes dsh-snake-tap{from{transform:scale(.5);opacity:.45}to{transform:scale(4);opacity:0}}
      .dsh-snake-board{animation:dsh-snake-reveal 180ms cubic-bezier(.2,.8,.2,1)}
      .dsh-snake-entry:focus-visible{box-shadow:0 0 0 1px #4b929766}
      .dsh-snake-entry .dsh-snake-rice{transition:transform 130ms ease-out}
      .dsh-snake-entry:hover .dsh-snake-rice,.dsh-snake-entry:focus-visible .dsh-snake-rice{transform:translateY(-2px)}
      .dsh-snake-entry-opening{animation:dsh-snake-leave 180ms ease-out}
      .dsh-snake-entry-opening .dsh-snake-rice{animation:dsh-snake-hop 180ms ease-out}
      .dsh-snake-tap{animation:dsh-snake-tap 180ms ease-out}
      @media(prefers-reduced-motion:reduce){.dsh-snake-board,.dsh-snake-entry,.dsh-snake-entry .dsh-snake-rice,.dsh-snake-tap{animation:none!important;transition:none!important}}
    `;
    const floating=h('div',{style:{position:'absolute',inset:0,pointerEvents:'none',zIndex:6},'aria-label':'贪吃蛇悬浮层'},h('style',null,motionCSS),game.open?
      h('section',{ref:panelRef,className:'dsh-snake-board',style:panelStyle,onBlur:(e: FocusEvent & {currentTarget: HTMLElement})=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null)){pause(game);refresh();}}},
        glassMap&&h('svg',{width:0,height:0,'aria-hidden':true,style:{position:'absolute',pointerEvents:'none'}},
          h('defs',null,h('filter',{id:filterId,filterUnits:'userSpaceOnUse',x:0,y:0,width:glassMap.width,height:glassMap.height,colorInterpolationFilters:'sRGB'},
            h('feImage',{href:glassMap.url,width:glassMap.width,height:glassMap.height,preserveAspectRatio:'none',result:'map'}),
            h('feComponentTransfer',{in:'map',result:'neutral-map'},
              h('feFuncR',{type:'linear',slope:1,intercept:-.5/255}),h('feFuncG',{type:'linear',slope:1,intercept:-.5/255})),
            h('feDisplacementMap',{in:'SourceGraphic',in2:'neutral-map',scale:LiquidGlass.SCALE,xChannelSelector:'R',yChannelSelector:'G'})))),
        h('div',{'aria-hidden':true,style:{position:'absolute',inset:0,pointerEvents:'none',background:'color-mix(in srgb, var(--dsw-alias-bg-base, #fff) 8%, transparent)',backdropFilter:backdrop,WebkitBackdropFilter:backdrop,boxShadow:'inset 0 1px 0 #ffffff52, inset 0 -1px 0 #0000000a',borderRadius:'inherit'}}),
        h('canvas',{ref:canvasRef,'data-snake-phase':game.phase,tabIndex:0,onClick:play,onKeyDown:keyDown,onFocus:()=>setFocused(true),onBlur:()=>setFocused(false),'aria-label':'贪吃蛇棋盘，点击开始，方向键或 WASD 转向，空格暂停，Esc 退出',style:{position:'relative',display:'block',width:'100%',height:'100%',cursor:'pointer',outline:'none',border:0,boxShadow:'none'}}),
        tap&&h('span',{key:tap.key,className:'dsh-snake-tap','aria-hidden':true,onAnimationEnd:()=>setTap(null),style:{position:'absolute',left:tap.x-6,top:tap.y-6,width:12,height:12,borderRadius:'50%',background:'#4b92971a',boxShadow:'inset 0 0 0 1px #4b929740',pointerEvents:'none'}}),
        h('div',{'aria-hidden':true,style:{position:'absolute',inset:0,pointerEvents:'none',borderRadius:'inherit',boxShadow:focused?'inset 0 0 0 1px #4b929759':'none'}}),
        h('div',{onPointerDown:dragStart,onPointerMove:dragMove,onPointerUp:dragEnd,onPointerCancel:dragEnd,style:{position:'absolute',left:0,right:28,top:0,height:18,cursor:'grab',touchAction:'none',userSelect:'none'}}),
        h('button',{style:{...subtle,position:'absolute',right:3,top:2,width:24,height:24,padding:0,fontSize:16,lineHeight:'24px',opacity:.55},onClick:close,'aria-label':'收起贪吃蛇',title:'收起'},'−')):null,
      (!game.open||opening)&&h('button',{className:opening?'dsh-snake-entry dsh-snake-entry-opening':'dsh-snake-entry',tabIndex:opening?-1:0,onAnimationEnd:(e: AnimationEvent & {currentTarget:HTMLElement})=>{if(e.target===e.currentTarget)setOpening(false);},style:{...subtle,position:'absolute',left:entry.x,top:entry.y,width:48,height:32,padding:0,pointerEvents:opening?'none':'auto',opacity:entranceActive?1:.72,outline:'none',borderRadius:10},onClick:open,onPointerEnter:()=>setEntranceActive(true),onPointerLeave:()=>setEntranceActive(false),onFocus:()=>setEntranceActive(true),onBlur:()=>setEntranceActive(false),'aria-label':'给吃白饭的大肥鱼开饭，打开贪吃蛇',title:'给大肥鱼开饭，点击玩贪吃蛇'},
        h('span',{'aria-hidden':true,style:{position:'absolute',left:0,top:0,width:24,height:24,borderRadius:'50%',backgroundImage:`url(${avatarSrc})`,backgroundSize:'55.85px 55.85px',backgroundPosition:'-15px -6.82px'}}),
        h('span',{className:'dsh-snake-rice','aria-hidden':true,style:{position:'absolute',right:0,bottom:0,fontSize:22,lineHeight:'24px'}},'🍚'),
        entranceActive&&h('span',{'aria-hidden':true,style:{position:'absolute',right:52,top:9,fontSize:11,whiteSpace:'nowrap'}},'开饭啦')));
    return ReactDOM.createPortal(floating,content);
  }
  return {name:'dsh-snake',inject:['slots'],apply(ctx: any){
    ctx.slots.inject('conversation.input.dock',()=>ctx.slots.register({name:'conversation.input.dock',id:'dsh-snake',order:20},SnakeDock));
    ctx.effect(()=>()=>games.clear());
  }};
}});
