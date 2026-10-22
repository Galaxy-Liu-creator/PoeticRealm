import { AudioEngine } from '../systems/audio/AudioEngine';

export type LivePoemId = 'fengqiao' | 'jiangxue' | 'baidicheng';
export const isLivePoem = (id: string): id is LivePoemId => id === 'fengqiao' || id === 'jiangxue' || id === 'baidicheng';

/** Product routes and staged entry share the same scene preparation and ownership. */
export async function preparePoemScene(id: LivePoemId, canvas: HTMLCanvasElement,
  options: {signal: AbortSignal; reduced: boolean; audio: AudioEngine}) {
  if (id === 'fengqiao') {
    const { prepareFengqiao } = await import('./FengqiaoScene');
    return { ...await prepareFengqiao(canvas, { ...options, manifestPath: 'scenes/fengqiao.scene-v03.json' }), id };
  }
  if(id==='baidicheng'){
    const {prepareBaidicheng}=await import('./BaidichengScene');
    return {...await prepareBaidicheng(canvas,options.signal,new URLSearchParams(),options),id};
  }
  const { prepareJiangxue } = await import('./JiangxueScene');
  return { ...await prepareJiangxue(canvas, options.signal, new URLSearchParams(), options), id };
}

export type LivePoemScene = Awaited<ReturnType<typeof preparePoemScene>>;
