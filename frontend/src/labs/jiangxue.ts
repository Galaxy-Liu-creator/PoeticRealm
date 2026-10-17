import { prepareJiangxue } from '../scenes/JiangxueScene';
import '../ui/styles/typography.css';
import './jiangxue.css';
type Ready=Awaited<ReturnType<typeof prepareJiangxue>>;
declare global {interface Window {__JIANGXUE_SAMPLE__?:Ready['api']&{reload():Promise<void>};}}
const app=document.querySelector<HTMLElement>('#app')!,query=new URLSearchParams(location.search);
app.innerHTML=`<main class="jiangxue-lab"><canvas aria-label="江雪三维模型"></canvas><aside class="jx-label">江雪<small>舟 · 蓑笠翁 · 雪岸 · 枯木</small></aside>
<nav class="jx-tools" aria-label="江雪模型检查"><label>版本<select aria-label="模型版本"><option value="03">浮舟版</option><option value="02">精修版</option><option value="01">第一版</option></select></label><button data-view="CAM_enter">全景</button><button data-view="CAM_birds">远山</button><button data-view="CAM_path">雪岸</button><button data-view="CAM_fog">江面</button><button data-view="CAM_boat">孤舟</button><button data-view="CAM_fisherman">蓑笠翁</button><button data-view="CAM_nature">枯木</button><button data-view="CAM_rocks">岩岸</button><button data-action="pause">暂停</button><label>时间<input type="range" min="0" max="32" step=".1" value="0" aria-label="场景时间"></label><label><input type="checkbox" checked data-feature="reflection">倒影</label><label><input type="checkbox" checked data-feature="snow">细雪</label></nav>
<div class="jx-status" role="status"><span>正在加载江雪模型…</span><button data-action="cancel">取消</button><button data-action="retry" hidden>重试</button></div></main>`;
const status=app.querySelector<HTMLElement>('.jx-status')!,message=status.querySelector('span')!,cancel=app.querySelector<HTMLButtonElement>('[data-action=cancel]')!,retry=app.querySelector<HTMLButtonElement>('[data-action=retry]')!,pause=app.querySelector<HTMLButtonElement>('[data-action=pause]')!;
let ready:Ready|undefined,controller=new AbortController(),generation=0;
const revisionSelect=app.querySelector<HTMLSelectElement>('select')!;
revisionSelect.value=/v(01|02|03)/.exec(query.get('asset')??'')?.[1]??'03';
const syncRevision=()=>{app.querySelector<HTMLButtonElement>('[data-view=CAM_rocks]')!.hidden=revisionSelect.value==='01';};
syncRevision();
revisionSelect.addEventListener('change',()=>{query.set('asset',`scenes/jiangxue.scene-v${revisionSelect.value}.json`);query.delete('view');history.replaceState(null,'',`${location.pathname}?${query}`);syncRevision();void load();});
async function load(){
  const current=++generation;controller.abort();ready?.api.dispose();ready=undefined;window.__JIANGXUE_SAMPLE__=undefined;controller=new AbortController();
  const previous=app.querySelector<HTMLCanvasElement>('canvas')!,canvas=previous.cloneNode(false) as HTMLCanvasElement;previous.replaceWith(canvas);
  status.hidden=false;message.textContent='正在加载江雪模型…';cancel.hidden=false;retry.hidden=true;
  try{
    const scene=await prepareJiangxue(canvas,controller.signal,query);
    if(current!==generation){scene.api.dispose();return;}ready=scene;
    window.__JIANGXUE_SAMPLE__={...scene.api,reload:load};
    scene.api.setSnow(app.querySelector<HTMLInputElement>('[data-feature=snow]')!.checked);scene.api.setReflection(app.querySelector<HTMLInputElement>('[data-feature=reflection]')!.checked);
    scene.enter();status.hidden=true;pause.textContent=scene.engine.clock.playing?'暂停':'播放';
  }catch(error){if(current!==generation)return;message.textContent=controller.signal.aborted?'模型加载已取消':'模型加载失败：'+(error instanceof Error?error.message:String(error));cancel.hidden=true;retry.hidden=false;window.__JIANGXUE_SAMPLE__=undefined;}
}
app.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.addEventListener('click',()=>ready?.api.setView(button.dataset.view!)));
pause.addEventListener('click',()=>{if(!ready)return;ready.engine.clock.toggle();pause.textContent=ready.engine.clock.playing?'暂停':'播放';});
app.querySelector<HTMLInputElement>('input[type=range]')!.addEventListener('input',event=>{ready?.api.pause();ready?.api.seek(Number((event.currentTarget as HTMLInputElement).value));pause.textContent='播放';});
app.querySelectorAll<HTMLInputElement>('[data-feature]').forEach(input=>input.addEventListener('change',()=>{if(input.dataset.feature==='snow')ready?.api.setSnow(input.checked);else ready?.api.setReflection(input.checked);}));
cancel.addEventListener('click',()=>controller.abort());retry.addEventListener('click',()=>void load());
window.addEventListener('pagehide',()=>{controller.abort();ready?.api.dispose();window.__JIANGXUE_SAMPLE__=undefined;},{once:true});
await load();
