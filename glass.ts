// Adapted from Shu Ding's MIT-licensed SVG displacement technique.
// https://github.com/shuding/liquid-glass/tree/a2d2e847f793430e3409a52927af815a23f4d372
namespace LiquidGlass {
  export const WIDTH=272, RADIUS=16, EDGE=12, SCALE=12;

  function roundedRect(x: number,y: number,width: number,height: number,radius: number): number {
    const qx=Math.abs(x-width/2)-width/2+radius;
    const qy=Math.abs(y-height/2)-height/2+radius;
    return Math.min(Math.max(qx,qy),0)+Math.hypot(Math.max(qx,0),Math.max(qy,0))-radius;
  }

  // R/G encode the background's edge refraction; the center stays neutral.
  export function displacement(width: number,height: number): Uint8ClampedArray<ArrayBuffer> {
    const data=new Uint8ClampedArray(width*height*4),radius=Math.min(RADIUS,width/2,height/2);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const px=x+.5,py=y+.5,distance=-roundedRect(px,py,width,height,radius);
      let dx=0,dy=0;
      if(distance>0&&distance<EDGE){
        const nx=roundedRect(px+.5,py,width,height,radius)-roundedRect(px-.5,py,width,height,radius);
        const ny=roundedRect(px,py+.5,width,height,radius)-roundedRect(px,py-.5,width,height,radius);
        const length=Math.hypot(nx,ny)||1,strength=Math.sin(Math.PI*distance/EDGE)*6;
        dx=-nx/length*strength;dy=-ny/length*strength;
      }
      const i=(y*width+x)*4;
      data[i]=128+dx*127/6;data[i+1]=128+dy*127/6;data[i+2]=128;data[i+3]=255;
    }
    return data;
  }

  export type Map = {width:number;height:number;url:string};

  export function observe(panel: HTMLElement,filterId: string,onMap: (map: Map|null)=>void): ()=>void {
    if(!CSS.supports('backdrop-filter',`url(#${filterId}) blur(1.5px)`)||!/Chrome\//.test(navigator.userAgent)){
      onMap(null);return ()=>{};
    }
    const canvas=document.createElement('canvas');let lastWidth=0,lastHeight=0;
    const update=()=>{
      const width=Math.round(panel.clientWidth),height=Math.round(panel.clientHeight);
      if(!width||!height||(width===lastWidth&&height===lastHeight))return;
      lastWidth=width;lastHeight=height;
      try{
        canvas.width=width;canvas.height=height;
        const context=canvas.getContext('2d');if(!context){onMap(null);return;}
        context.putImageData(new ImageData(displacement(width,height),width,height),0,0);
        onMap({width,height,url:canvas.toDataURL()});
      }catch{onMap(null);}
    };
    update();const resize=new ResizeObserver(update);resize.observe(panel);
    return ()=>{resize.disconnect();canvas.width=0;canvas.height=0;};
  }
}
