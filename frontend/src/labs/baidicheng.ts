import { prepareBaidicheng } from '../scenes/BaidichengScene';
import '../ui/styles/typography.css';
import './jiangxue.css';
type Ready=Awaited<ReturnType<typeof prepareBaidicheng>>;
declare global {interface Window {__BAIDICHENG_SAMPLE__?:Ready['api']&{reload():Promise<void>};}}
const app=document.querySelector<HTMLElement>('#app')!,query=new URLSearchParams(location.search);
app.innerHTML=`<main class="jiangxue-lab"><canvas aria-label="早发白帝城三维模型"></canvas><aside class="jx-label">早发白帝城<small>晨峡 · 城影 · 行江轻舟</small></aside>
<nav class="jx-tools" aria-label="白帝城模型检查"><button data-view="CAM_enter">全景</button><button data-view="CAM_city">白帝城</button><button data-view="CAM_follow">行舟</button><button data-view="CAM_gorge">峡谷</button><button data-view="CAM_exit">出峡</button><button data-view="CAM_boat">轻舟</button><button data-view="CAM_rower">船夫</button><button data-action="pause">播放</button><label>时间<input type="range" min="0" max="100" step=".1" value="0" aria-label="场景时间"></label><label><input type="checkbox" checked data-feature="reflection">倒影</label></nav>
<div class="jx-status" role="status"><span>正在加载白帝城模型…</span><button data-action="cancel">取消</button><button data-action="retry" hidden>重试</button></div></main>`;
const status=app.querySelector<HTMLElement>('.jx-status')!,message=status.querySelector('span')!,cancel=app.querySelector<HTMLButtonElement>('[data-action=cancel]')!,retry=app.querySelector<HTMLButtonElement>('[data-action=retry]')!,pause=app.querySelector<HTMLButtonElement>('[data-action=pause]')!;
let ready:Ready|undefined,controller=new AbortController(),generation=0;
async function load(){
  const current=++generation;controller.abort();ready?.dispose();ready=undefined;window.__BAIDICHENG_SAMPLE__=undefined;controller=new AbortController();
  const previous=app.querySelector<HTMLCanvasElement>('canvas')!,canvas=previous.cloneNode(false) as HTMLCanvasElement;previous.replaceWith(canvas);
  status.hidden=false;message.textContent='正在加载白帝城模型…';cancel.hidden=false;retry.hidden=true;
  try{const scene=await prepareBaidicheng(canvas,controller.signal,query);if(current!==generation){scene.dispose();return;}ready=scene;window.__BAIDICHENG_SAMPLE__={...scene.api,reload:load};scene.enter();status.hidden=true;pause.textContent=scene.engine.clock.playing?'暂停':'播放';}
  catch(error){if(current!==generation)return;message.textContent=controller.signal.aborted?'模型加载已取消':'模型加载失败：'+(error instanceof Error?error.message:String(error));cancel.hidden=true;retry.hidden=false;}
}
app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.addEventListener('click',()=>ready?.api.setView(button.dataset.view!)));
pause.addEventListener('click',()=>{if(!ready)return;ready.engine.clock.toggle();pause.textContent=ready.engine.clock.playing?'暂停':'播放';});
app.querySelector<HTMLInputElement>('input[type=range]')!.addEventListener('input',event=>{ready?.api.pause();ready?.api.seek(Number((event.currentTarget as HTMLInputElement).value));pause.textContent='播放';});
app.querySelector<HTMLInputElement>('[data-feature=reflection]')!.addEventListener('change',event=>ready?.api.setReflection((event.currentTarget as HTMLInputElement).checked));
cancel.addEventListener('click',()=>controller.abort());retry.addEventListener('click',()=>void load());
window.addEventListener('pagehide',()=>{controller.abort();ready?.dispose();window.__BAIDICHENG_SAMPLE__=undefined;},{once:true});
await load();
