import { prepareFengqiao, type SampleControls } from '../scenes/FengqiaoScene';
import type { PoeticHandle } from '../engine/Debug';
import './fengqiao.css';
declare global { interface Window { __FENGQIAO_SAMPLE__?: SampleControls; __POETIC__?: PoeticHandle; __FENGQIAO_ENVIRONMENT_BAKE__?: () => {width:number;height:number;base64:string}; } }
const query=new URLSearchParams(location.search),app=document.querySelector<HTMLElement>('#app')!;
app.innerHTML=`<main class="sample"><canvas aria-label="枫桥三维场景"></canvas>
  <aside class="sample-label"><span>枫桥夜泊</span><small>局部材质小样 · 尚未完成整场景验收</small></aside>
  <nav class="sample-tools" aria-label="小样检查">
    <button data-view="CAM_enter">整体</button><button data-view="CAM_riverbank">湿石岸</button><button data-view="CAM_boat">木舟</button><button data-view="CAM_rower">船夫</button>
    <button data-action="pause">暂停</button><label>时间<input type="range" min="0" max="32" step=".1" value="0" aria-label="场景时间"></label>
    <label><input type="checkbox" checked data-feature="reflection">倒影</label><label><input type="checkbox" checked data-feature="shadows">阴影</label><label><input type="checkbox" checked data-feature="fire">渔火</label>
  </nav><p class="sample-status" role="status">正在加载模型和材质…</p></main>`;
const canvas=app.querySelector<HTMLCanvasElement>('canvas')!,status=app.querySelector<HTMLElement>('.sample-status')!;
try {
  const scene=await prepareFengqiao(canvas,{query});
  window.__FENGQIAO_SAMPLE__=scene.api;
  window.__POETIC__={ready:true,seek:t=>scene.engine.seek(t),step:dt=>scene.engine.step(dt),pause:()=>scene.engine.clock.pause(),play:()=>scene.engine.clock.play(),state:()=>({t:scene.engine.clock.time,playing:scene.engine.clock.playing,...scene.engine.stats,scene:'fengqiao-sample'})};
  if(scene.manifest.requiredNodes.includes('temple_main')) {
    app.querySelector('.sample-label small')!.textContent=scene.manifest.scope==='full-scene'?'月落 · 江雾 · 桥寺与河岸':'桥寺与河岸组件预览 · 尚未完成整场景验收';
    for(const [name,label] of [['CAM_moonset','月落'],['CAM_temple','寺院'],['CAM_bridge','石桥'],['CAM_bell','钟楼'],['CAM_nature','河岸']]) {
      const button=document.createElement('button');button.dataset.view=name;button.textContent=label;app.querySelector('[data-action=pause]')!.before(button);
    }
    app.querySelector('.sample-tools')!.insertAdjacentHTML('beforeend','<label><input type="checkbox" checked data-feature="wind">风摆</label>');
    if(scene.manifest.scope==='full-scene')app.querySelector('.sample-tools')!.insertAdjacentHTML('beforeend','<label><input type="checkbox" checked data-feature="fog">薄雾</label>');
  }
  app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.addEventListener('click',()=>scene.api.setView(button.dataset.view!)));
  const pause=app.querySelector<HTMLButtonElement>('[data-action=pause]')!;
  pause.addEventListener('click',()=>{scene.engine.clock.toggle();pause.textContent=scene.engine.clock.playing?'暂停':'播放';});
  app.querySelector<HTMLInputElement>('input[type=range]')!.addEventListener('input',event=>{scene.engine.clock.pause();pause.textContent='播放';scene.engine.seek(Number((event.currentTarget as HTMLInputElement).value));});
  app.querySelectorAll<HTMLInputElement>('[data-feature]').forEach(input=>input.addEventListener('change',()=>{
    const methods={reflection:scene.api.setReflection,shadows:scene.api.setShadows,fire:scene.api.setFire,wind:scene.api.setWind,fog:scene.api.setFog};methods[input.dataset.feature as keyof typeof methods](input.checked);
  }));
  const key=(event:KeyboardEvent)=>{if(event.code==='Space'&&!(event.target instanceof HTMLInputElement)&&!(event.target instanceof HTMLButtonElement)){event.preventDefault();scene.engine.clock.toggle();}};
  window.addEventListener('keydown',key);
  window.addEventListener('fengqiao:disposed',()=>{window.removeEventListener('keydown',key);window.__POETIC__=undefined;window.__FENGQIAO_SAMPLE__=undefined;window.__FENGQIAO_ENVIRONMENT_BAKE__=undefined;},{once:true});
  scene.enter();status.textContent='';
} catch(error) {status.textContent='小样加载失败：'+(error instanceof Error?error.message:String(error));}
