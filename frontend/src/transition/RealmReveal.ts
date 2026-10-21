import { EffectPlane } from '../systems/motion/EffectPlane';
import { MotionLoop } from '../systems/motion/MotionLoop';
import {paperNotice} from '../ui/components/PaperPopup';

export const realmDuration = { fengqiao: 1, jiangxue: 1.2, baidicheng: .9 } as const;
export type RealmId = keyof typeof realmDuration;
/** The first 10% ignite the paper before the opening grows. Keep shader timing in sync. */
function burnProgress(p: number): number { return Math.max(0,Math.min(1,(p-.1)/.9)); }
export function burnRadius(p: number, width: number, height: number): number {
  return (Math.hypot(width,height)/2/Math.min(width,height)+.08)*Math.pow(burnProgress(p),.85)-.04;
}
/** Same contour as presentation.frag.glsl, expressed in viewport pixels for DOM clipping. */
export function burnClip(p: number, width: number, height: number): string {
  const radius=burnRadius(p,width,height), unit=Math.min(width,height), strength=Math.sin(burnProgress(p)*Math.PI);
  const points=Array.from({length:96},(_,i)=>{
    const a=i/96*Math.PI*2;
    const r=radius<=0?0:Math.max(0,radius+(.018*Math.sin(a*7+1.4)+.011*Math.sin(a*13-.7)+.006*Math.sin(a*23+2))*strength);
    return `${width/2+Math.cos(a)*r*unit}px ${height/2+Math.sin(a)*r*unit}px`;
  });
  return `polygon(${points.join(',')})`;
}

/** Transaction owns a real DOM target; source stays mounted until successful completion. */
export class RealmReveal {
  private transaction?: {
    overlay: HTMLElement; target: HTMLElement; veil: HTMLElement; panel: HTMLElement;
    plane?: EffectPlane; stop: () => void; resolve: (complete: boolean) => void;
    scene: RealmId; start: number; state: 'loading'|'failed'|'playing';
    root: HTMLElement; focus?: HTMLElement; inert: boolean; abort: AbortController; frame: number;
    prepareScene?: (target: HTMLElement, signal: AbortSignal) => Promise<void>;
    prepareAbort?: AbortController;
    prepareTimeoutMs: number;
  };
  private reduced=false;
  private escape=(event:KeyboardEvent):void=>{if(event.key==='Escape') {event.preventDefault();this.cancel();}};
  constructor(private loop: MotionLoop) {}
  get active(): boolean { return !!this.transaction; }
  setReduced(value:boolean):void { this.reduced=value;if(value && this.transaction?.state==='playing') this.finish(true); }
  play(root:HTMLElement,scene:RealmId,markup:string,url:string,reduced:boolean,prepareScene?: (target: HTMLElement, signal: AbortSignal) => Promise<void>,prepareTimeoutMs=10000):Promise<boolean> {
    if(this.active) return Promise.resolve(false);
    this.reduced=reduced;
    const overlay=document.createElement('div');overlay.className=`realm-transition realm-${scene}`;
    overlay.dataset.state='loading';
    overlay.innerHTML=`<div class="realm-target" inert></div><div class="realm-veil" aria-hidden="true"><canvas></canvas></div><div class="realm-loading paper-popup" role="status">${paperNotice('正在准备画卷…','<button type="button" data-retry hidden>重试</button><button type="button" data-cancel>取消入境</button>',true)}</div>`;
    const target=overlay.querySelector<HTMLElement>('.realm-target')!;target.innerHTML=markup;
    // Inert staging must not duplicate live IDs (notes, main, form controls).
    target.querySelectorAll('[id]').forEach(e=>e.removeAttribute('id'));
    document.body.append(overlay);
    const promise=new Promise<boolean>(resolve=>{
      const state=this.transaction={overlay,target,veil:overlay.querySelector<HTMLElement>('.realm-veil')!,panel:overlay.querySelector<HTMLElement>('.realm-loading')!,plane:undefined as EffectPlane|undefined,stop:()=>{},resolve,scene,start:0,state:'loading' as 'loading'|'failed'|'playing',root,focus:document.activeElement instanceof HTMLElement?document.activeElement:undefined,inert:root.inert,abort:new AbortController(),frame:0,prepareScene,prepareTimeoutMs};
      root.inert=true;
      overlay.querySelector('[data-cancel]')!.addEventListener('click',()=>this.cancel());
      overlay.querySelector('[data-retry]')!.addEventListener('click',()=>void this.prepare(url));
      document.addEventListener('keydown',this.escape);
      state.stop=this.loop.subscribe(()=>state.state==='playing',t=>this.sample((t-state.start)/realmDuration[scene]));
    });
    void this.prepare(url);
    return promise;
  }
  private async prepare(url:string):Promise<void> {
    const state=this.transaction;if(!state) return;
    state.prepareAbort?.abort();state.prepareAbort=new AbortController();
    state.state='loading';state.overlay.dataset.state='loading';
    delete state.overlay.dataset.failure;
    state.panel.querySelector('span')!.textContent='正在准备画卷…';state.panel.querySelector<HTMLElement>('[data-retry]')!.hidden=true;
    let timer:ReturnType<typeof setTimeout>|undefined;
    let abortLoad:()=>void=()=>{};
    try {
      const image=new Image();image.src=url;
      await Promise.race([
        Promise.all([image.decode(),document.fonts.ready,state.prepareScene?.(state.target,state.prepareAbort.signal)]),
        new Promise((_,reject)=>{timer=setTimeout(()=>{image.removeAttribute('src');reject(new Error('画卷加载超时'));},state.prepareTimeoutMs);}),
        new Promise((_,reject)=>{abortLoad=()=>{image.removeAttribute('src');reject(new Error('入境已取消'));};state.abort.signal.addEventListener('abort',abortLoad,{once:true});}),
      ]);
      if(this.transaction!==state) return;
      // Layout and the first complete target paint are prepared behind the source.
      state.target.getBoundingClientRect();
      const canvas=state.veil.querySelector<HTMLCanvasElement>('canvas')!;
      try { state.plane=new EffectPlane(canvas,({fengqiao:1,jiangxue:2,baidicheng:3})[state.scene]);state.plane.render(0,0); }
      catch { canvas.remove();state.overlay.dataset.renderer='css'; }
      state.abort.signal.removeEventListener('abort',abortLoad);
      await Promise.race([
        new Promise<void>(resolve=>{state.frame=requestAnimationFrame(()=>resolve());}),
        new Promise((_,reject)=>{abortLoad=()=>reject(new Error('入境已取消'));state.abort.signal.addEventListener('abort',abortLoad,{once:true});}),
      ]);
      if(this.transaction!==state) return;
      state.state='playing';state.overlay.dataset.state='playing';state.panel.hidden=true;
      state.start=this.loop.clock.time;
      this.sample(0);
      if(this.reduced) this.finish(true);else this.loop.refresh();
    } catch(error) {
      if(this.transaction!==state) return;
      state.overlay.dataset.failure=error instanceof Error?error.message:String(error);
      state.prepareAbort.abort();
      state.state='failed';state.overlay.dataset.state='failed';
      state.panel.querySelector('span')!.textContent='画卷加载失败，原页面已保留。';
      state.panel.querySelector<HTMLElement>('[data-retry]')!.hidden=false;
      state.panel.querySelector<HTMLButtonElement>('[data-retry]')!.focus();
    } finally { clearTimeout(timer);state.abort.signal.removeEventListener('abort',abortLoad); }
  }
  /** Deterministic progress for five-frame checks; independent of frame rate. */
  seek(p:number):void {
    const state=this.transaction;if(!state || state.state!=='playing') return;
    const progress=Math.max(0,Math.min(1,p));state.start=this.loop.clock.time-progress*realmDuration[state.scene];this.sample(progress);
  }
  private sample(p:number):void {
    const state=this.transaction;if(!state || state.state!=='playing') return;
    p=Math.max(0,Math.min(1,p));
    state.overlay.dataset.progress=p.toFixed(4);
    if(state.scene==='fengqiao') {
      state.target.style.visibility=p===0?'hidden':'visible';
      state.target.style.clipPath=p===1?'none':burnClip(p,innerWidth,innerHeight);
    } else state.target.style.visibility=p<.5?'hidden':'visible';
    if(state.plane) state.plane.render(p*realmDuration[state.scene],p);
    else if(state.scene!=='fengqiao') {
      state.veil.style.background='#a9b9b5';state.veil.style.opacity=String(Math.min(1,Math.sin(p*Math.PI)*1.3));
    }
    if(p===1) this.finish(true);
  }
  cancel():void { this.finish(false); }
  private finish(complete:boolean):void {
    const state=this.transaction;if(!state) return;
    this.transaction=undefined;state.abort.abort();state.prepareAbort?.abort();cancelAnimationFrame(state.frame);
    state.stop();state.plane?.dispose();state.overlay.remove();state.root.inert=state.inert;
    document.removeEventListener('keydown',this.escape);
    if(!complete && state.focus?.isConnected) state.focus.focus({preventScroll:true});
    state.resolve(complete);
  }
}
