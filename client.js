window.__ModuleLoader__.load({id:'dsh-snake', factory(require) {
  const React=require('react');
  /* ENGINE */
  const avatarSrc=/* AVATAR */ null;
  // ponytail: per-session memory lasts only until this client module unloads.
  const games=new Map();
  const h=React.createElement;
  function SnakeDock({sessionId, useSession}) {
    const working=useSession(snapshot=>Boolean(snapshot.running));
    if (!games.has(sessionId)) games.set(sessionId,createGame());
    const game=games.get(sessionId);
    const [,refresh]=React.useReducer(n=>n+1,0);
    const canvasRef=React.useRef(null), imageRef=React.useRef(null);
    React.useEffect(()=>{workChanged(game,working); refresh();},[game,working]);
    React.useEffect(()=>{
      const img=new Image(); imageRef.current=img; img.onload=refresh; img.onerror=refresh; img.src=avatarSrc;
      return ()=>{img.onload=null; img.onerror=null; imageRef.current=null; pause(game);};
    },[game]);
    React.useEffect(()=>{
      const hide=()=>{if(document.hidden){pause(game); refresh();}};
      const blur=()=>{pause(game); refresh();};
      document.addEventListener('visibilitychange',hide); window.addEventListener('blur',blur);
      return ()=>{document.removeEventListener('visibilitychange',hide); window.removeEventListener('blur',blur);};
    },[game]);
    React.useEffect(()=>{
      const canvas=canvasRef.current; if(!canvas) return;
      let frameId=0, lastTick=performance.now(), movedAt=lastTick-STEP_MS;
      let previous=game.snake.map(p=>[...p]);
      const paint=(now=performance.now())=>{
        const width=canvas.getBoundingClientRect().width; if(!width) return;
        const cell=width/COLS, height=cell*ROWS, ratio=window.devicePixelRatio||1;
        const w=Math.round(width*ratio), h=Math.round(height*ratio);
        if(canvas.width!==w || canvas.height!==h){canvas.width=w;canvas.height=h;}
        const c=canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,width,height);
        const color=getComputedStyle(canvas).color;
        c.fillStyle=color; c.globalAlpha=.13;
        for(let y=0;y<ROWS;y++) for(let x=0;x<COLS;x++){c.beginPath();c.arc((x+.5)*cell,(y+.5)*cell,1.3,0,Math.PI*2);c.fill();}
        const progress=game.phase==='playing'?Math.min(1,(now-movedAt)/STEP_MS):1;
        const position=(p,i)=>{const from=previous[Math.min(i,previous.length-1)] || p;const delta=(a,b,size)=>Math.abs(b-a)>1?b-a-Math.sign(b-a)*size:b-a;return [((from[0]+delta(from[0],p[0],COLS)*progress+COLS)%COLS+.5)*cell,((from[1]+delta(from[1],p[1],ROWS)*progress+ROWS)%ROWS+.5)*cell];};
        const copies=(x,y,draw)=>{draw(x,y);if(x>width-cell)draw(x-width,y);if(x<cell)draw(x+width,y);if(y>height-cell)draw(x,y-height);if(y<cell)draw(x,y+height);};
        game.snake.slice(1).forEach((p,i)=>{const [x,y]=position(p,i+1);c.fillStyle='#4b9297';c.globalAlpha=Math.max(.4,1-i*.08);copies(x,y,(a,b)=>{c.beginPath();c.arc(a,b,cell*.32,0,Math.PI*2);c.fill();});});
        c.globalAlpha=1;
        if(game.food){c.font=`${cell*.9}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;c.textAlign='center';c.textBaseline='middle';c.fillText('🍚',(game.food[0]+.5)*cell,(game.food[1]+.5)*cell);}
        const [cx,cy]=position(game.snake[0],0), img=imageRef.current;
        copies(cx,cy,(cx,cy)=>{if(img?.complete && img.naturalWidth){
          c.save();c.beginPath();c.arc(cx,cy,cell*.53,0,Math.PI*2);c.clip();
          c.drawImage(img,210,125,570,440,cx-cell*.62,cy-cell*.53,cell*1.24,cell*1.06);c.restore();
        } else {c.fillStyle='#4b9297';c.beginPath();c.arc(cx,cy,cell*.38,0,Math.PI*2);c.fill();c.fillStyle='#15383c';c.beginPath();c.arc(cx-cell*.12,cy,1,0,7);c.arc(cx+cell*.12,cy,1,0,7);c.fill();}});
      };
      const frame=now=>{
        if(game.phase==='playing' && now-lastTick>=STEP_MS){
          previous=game.snake.map(p=>[...p]);const score=game.score;step(game);lastTick=now;movedAt=now;
          if(game.score!==score || game.phase!=='playing')refresh();
        }
        paint(now);if(game.phase==='playing')frameId=requestAnimationFrame(frame);
      };
      const repaint=()=>paint();
      paint();if(game.phase==='playing')frameId=requestAnimationFrame(frame);
      const observer=new ResizeObserver(repaint);observer.observe(canvas);
      const mutation=new MutationObserver(repaint);mutation.observe(document.documentElement,{attributes:true,attributeFilter:['class','style','data-theme']});
      const img=imageRef.current;if(img)img.onload=repaint;
      return ()=>{cancelAnimationFrame(frameId);observer.disconnect();mutation.disconnect();if(img)img.onload=null;};
    },[game,game.open,game.phase]);
    const act=()=>{start(game);refresh();canvasRef.current?.focus({preventScroll:true});};
    const keyDown=e=>{
      if(e.metaKey||e.ctrlKey||e.altKey||e.isComposing) return;
      if(!DIRECTIONS[e.key.length===1?e.key.toLowerCase():e.key] && ![' ','Escape'].includes(e.key)) return;
      e.preventDefault();e.stopPropagation();e.nativeEvent.stopImmediatePropagation();
      if(e.key==='Escape'){pause(game);canvasRef.current?.blur();}
      else if(e.key===' '){if(!e.repeat){if(game.phase==='playing')pause(game);else start(game);}}
      else {if(game.phase==='ready'||game.phase==='paused')start(game); turn(game,e.key);}
      refresh();
    };
    const close=()=>{pause(game);game.open=false;refresh();};
    const subtle={border:0,background:'transparent',color:'inherit',font:'inherit',padding:'2px 0',cursor:'pointer',opacity:.65};
    if(!game.open) return h('button',{style:{...subtle,fontSize:12},onClick:()=>{game.open=true;refresh();},'aria-label':'展开贪吃蛇'},'摸鱼');
    const instruction=game.phase==='over'?'撞到了 · 点击重来':game.phase==='won'?'吃饱了 · 点击再玩':game.phase==='playing'?`🍚 ${game.score}`:game.phase==='paused'?'已暂停 · 点击继续':'点击开始 · 方向键 / WASD';
    return h('section',{'aria-label':'贪吃蛇',style:{width:'100%',maxWidth:360,margin:'0 auto',fontFamily:'inherit',color:'inherit',padding:'8px 0 2px'},onBlur:e=>{if(!e.currentTarget.contains(e.relatedTarget)){pause(game);refresh();}}},
      h('div',{style:{display:'flex',alignItems:'center',gap:12,fontSize:12,lineHeight:'20px',opacity:.65}},
        h('span',null,game.working?'正在工作':game.finished?'本轮工作已结束':'摸鱼一会儿'),
        h('span',{'aria-live':'polite'},instruction),
        h('button',{style:{...subtle,marginLeft:'auto'},onClick:close,'aria-label':'收起贪吃蛇'},'收起')),
      h('canvas',{ref:canvasRef,tabIndex:0,onClick:act,onKeyDown:keyDown,'aria-label':'贪吃蛇棋盘，点击开始，方向键或 WASD 转向，空格暂停，Esc 退出',style:{display:'block',width:'100%',aspectRatio:`${COLS}/${ROWS}`,cursor:'pointer',borderRadius:4,outlineOffset:2}}));
  }
  return {name:'dsh-snake',inject:['slots'],apply(ctx){
    ctx.slots.inject('conversation.input.dock',()=>ctx.slots.register({name:'conversation.input.dock',id:'dsh-snake',order:20},SnakeDock));
    ctx.effect(()=>()=>games.clear());
  }};
}});
