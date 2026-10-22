import { ACESFilmicToneMapping, Matrix4, Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, Texture, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Assets, type HeightmapAsset } from '../engine/Assets';
import { Engine } from '../engine/Engine';
import { disposeObjectResources } from '../engine/objectResources';
import { applyPbrMaterials } from '../systems/materials/applyMaterials';
import { dawnDaylight } from '../systems/nature/DawnDaylight';
import { canyonTerrain } from '../systems/nature/CanyonTerrain';
import { applyCanyonCover } from '../systems/nature/CanyonCover';
import { NightRiver, riverHeight } from '../systems/water/NightRiver';
import { BoatCruise } from '../systems/boats/BoatCruise';
import { Rower } from '../systems/characters/Rower';
import { assertBaidichengManifest } from './baidicheng/manifest';
import { CanyonFrameCache } from '../systems/nature/CanyonFrameCache';
import { AudioEngine } from '../systems/audio/AudioEngine';
import { DistanceLods } from '../systems/lod/DistanceLods';

export async function prepareBaidicheng(canvas:HTMLCanvasElement,signal:AbortSignal,query=new URLSearchParams(),options:{reduced?:boolean;audio?:AudioEngine}={}) {
  const started=performance.now(),base=import.meta.env.BASE_URL+'assets/';
  let root:Object3D|undefined,height:HeightmapAsset|undefined,terrain:ReturnType<typeof canyonTerrain>|undefined;
  let engine:Engine|undefined,water:NightRiver|undefined,daylight:ReturnType<typeof dawnDaylight>|undefined,rower:Rower|undefined,controls:OrbitControls|undefined,disposed=false,handedOff=false;
  let removeMotionListener=()=>{};const lookups=new Set<{value:unknown}>();
  let lods:DistanceLods|undefined,frameCache:CanyonFrameCache|undefined;
  const release=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',release);removeMotionListener();controls?.dispose();frameCache?.dispose();lods?.dispose();rower?.dispose();water?.removeFromParent();water?.dispose();daylight?.dispose();terrain?.dispose();height?.dispose();if(root)disposeObjectResources(root);for(const u of lookups)if(u.value instanceof Texture)u.value.dispose();lookups.clear();options.audio?.dispose();engine?.dispose();engine?.renderer.forceContextLoss();window.dispatchEvent(new CustomEvent('baidicheng:disposed',{detail:{memory:engine?{...engine.renderer.info.memory}:{geometries:0,textures:0}}}));};
  const check=()=>{if(disposed||!handedOff&&signal.aborted)throw new DOMException('白帝城准备取消','AbortError');};
  signal.addEventListener('abort',release,{once:true});
  try {
    check();const path=query.get('asset')??'scenes/baidicheng.scene-v03.json';
    const revision=path==='scenes/baidicheng.scene-v01.json'?'01':path==='scenes/baidicheng.scene-v02.json'?'02':path==='scenes/baidicheng.scene-v03.json'?'03':undefined;
    if(!revision)throw new Error('白帝城清单路径非法');
    const response=await fetch(base+path,{signal});if(!response.ok)throw new Error('白帝城清单加载失败：'+response.status);
    const manifest:unknown=await response.json();assertBaidichengManifest(manifest);
    if(manifest.model!==`models/baidicheng/scene_v${revision}.glb`)throw new Error('白帝城清单与模型版本不一致');
    const bytes=await fetch(base+manifest.model,{signal});if(!bytes.ok)throw new Error('白帝城模型加载失败：'+bytes.status);
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await bytes.arrayBuffer(),base+'models/baidicheng/');
    if(disposed||signal.aborted){disposeObjectResources(gltf.scene);check();}root=gltf.scene;check();
    for(const name of manifest.requiredNodes)if(!root.getObjectByName(name))throw new Error('白帝城缺少节点：'+name);
    applyPbrMaterials(root);applyCanyonCover(root,revision!=='01');
    if(manifest.distanceLods)lods=new DistanceLods(root,manifest.distanceLods);
    const loaded=await new Assets().loadHeightmap(manifest.terrain);if(disposed||signal.aborted){loaded.dispose();check();}height=loaded;check();
    engine=new Engine(canvas,1);const e=engine;e.renderer.toneMapping=ACESFilmicToneMapping;e.renderer.toneMappingExposure=.96;e.renderer.shadowMap.enabled=true;e.renderer.shadowMap.type=PCFShadowMap;
    e.scene.add(root);root.traverse(o=>{if(o instanceof Mesh){o.castShadow=o.name!=='city_roof_detail';o.receiveShadow=true;}if(o.name==='mask_probe')o.visible=false;});
    let rockSurface:MeshStandardMaterial|undefined;
    root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&m.name==='pbr_rock__bdwall')rockSurface=m;});
    daylight=dawnDaylight(e.scene);terrain=canyonTerrain(height,revision!=='01',rockSurface,revision==='03');if(revision!=='01')applyCanyonCover(terrain.mesh,true);e.scene.add(terrain.mesh);
    e.scene.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial){const original=m.onBeforeCompile;m.onBeforeCompile=(shader,renderer)=>{original.call(m,shader,renderer);if(shader.uniforms.dfgLUT)lookups.add(shader.uniforms.dfgLUT);};}});
    water=new NightRiver(512,1000);water.position.y=manifest.waterLevel;water.material.uniforms.color.value.set(0x315f52);water.material.uniforms.surfaceCalm.value=.48;e.scene.add(water);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');let requestedReduced=options.reduced??false;
    const reduced=()=>requestedReduced||reduce.matches;
    const change=()=>{if(disposed)return;if(reduced())e.clock.pause();e.seek(e.clock.time);};reduce.addEventListener('change',change);removeMotionListener=()=>reduce.removeEventListener('change',change);
    const boat=root.getObjectByName('boat_guest')!,apeLeft=root.getObjectByName('SFX_ape_left')!,apeRight=root.getObjectByName('SFX_ape_right')!;root.updateMatrixWorld(true);
    const authoredInverse=boat.matrixWorld.clone().invert(),authoredFocus=new Map<string,Vector3>();
    root.traverse(o=>{if(o.name.startsWith('FOCUS_'))authoredFocus.set(o.name,o.getWorldPosition(new Vector3()));});
    const cruise=new BoatCruise(boat,manifest.boatNavigation,riverHeight);rower=new Rower(boat);
    const relative=new Matrix4(),pose=new Matrix4(),frameInverse=new Matrix4(),scale=new Vector3(),targetRelative=new Vector3(),boatInverse=new Matrix4();let follow=false,orbiting=false,view='CAM_enter',shadowTime=NaN,shadowLods='';
    const capture=()=>{if(follow&&controls){e.camera.updateMatrix();frameInverse.copy(cruise.frame).invert();relative.multiplyMatrices(frameInverse,e.camera.matrix);targetRelative.copy(controls.target).applyMatrix4(frameInverse);}};
    const setView=(name:string)=>{
      check();const camera=root!.getObjectByName(name);if(!(camera instanceof PerspectiveCamera))throw new Error('未知白帝城机位：'+name);
      controls?.dispose();cruise.update(e.clock.time,reduced());root!.updateMatrixWorld(true);e.camera.position.copy(camera.getWorldPosition(new Vector3()));e.camera.quaternion.copy(camera.getWorldQuaternion(e.camera.quaternion));
      follow=['CAM_follow','CAM_boat','CAM_rower'].includes(name);
      const focus=(authoredFocus.get(name.replace('CAM_','FOCUS_'))??authoredFocus.get('FOCUS_boat')!).clone();
      if(follow){relative.multiplyMatrices(authoredInverse,camera.matrixWorld);pose.multiplyMatrices(cruise.frame,relative).decompose(e.camera.position,e.camera.quaternion,scale);focus.applyMatrix4(authoredInverse).applyMatrix4(cruise.frame);}
      e.camera.fov=camera.fov;e.camera.near=.05;e.camera.far=2200;e.camera.updateProjectionMatrix();view=name;
      const orientation=e.camera.quaternion.clone();controls=new OrbitControls(e.camera,canvas);controls.target.copy(focus);e.camera.quaternion.copy(orientation);controls.enableDamping=false;controls.minDistance=3.5;controls.maxDistance=450;controls.maxPolarAngle=Math.PI/2-.025;
      capture();controls.addEventListener('change',capture);controls.addEventListener('start',()=>{orbiting=true;});controls.addEventListener('end',()=>{orbiting=false;});e.seek(e.clock.time);
    };
    e.onUpdate(t=>{
      const effective=reduced()?0:t;cruise.update(t,reduced());rower!.update(effective);e.scene.updateMatrixWorld(true);
      if(follow){pose.multiplyMatrices(cruise.frame,relative).decompose(e.camera.position,e.camera.quaternion,scale);controls?.target.copy(targetRelative).applyMatrix4(cruise.frame);}
      lods?.update(e.camera);terrain!.update(e.camera);const signature=(lods?.details().map(d=>d.level).join(',')??'')+terrain!.details().level;
      daylight!.update(effective,e.camera.position);if(effective!==shadowTime||signature!==shadowLods){daylight!.sun.shadow.needsUpdate=true;shadowTime=effective;shadowLods=signature;}
      e.scene.updateMatrixWorld(true);boatInverse.copy(boat.matrixWorld).invert();water!.update(effective,boatInverse);
      options.audio?.update(t,e.clock.playing&&!document.hidden,Infinity,{apeLeft:apeLeft.getWorldPosition(new Vector3()).toArray(),apeRight:apeRight.getWorldPosition(new Vector3()).toArray(),boat:boat.getWorldPosition(new Vector3()).toArray(),camera:e.camera.position.toArray(),forward:e.camera.getWorldDirection(new Vector3()).toArray(),up:e.camera.up.toArray()});
    });
    e.clock.pause();setView(query.get('view')??'CAM_enter');e.seek(Number(query.get('t')??0));
    await e.renderer.compileAsync(e.scene,e.camera);check();e.seek(e.clock.time);check();
    if(lods){for(const mode of ['near','far','auto'] as const){lods.setMode(mode);terrain!.setMode(mode);e.seek(e.clock.time);check();}}
    if(revision==='03'){frameCache=new CanyonFrameCache(e.renderer,e.scene,[root,terrain.mesh],[boat,water,e.scene.getObjectByName('dawn_sky')!],water);frameCache.setEnabled(query.get('runtime')!=='direct');e.setRender(()=>frameCache!.render(e.camera,shadowLods,!follow&&!orbiting));e.seek(e.clock.time);}
    const stats=()=>({scene:'baidicheng',revision,view,time:e.clock.time,playing:e.clock.playing,...e.stats,navigation:cruise.details(),lods:lods?.details(),terrainLod:terrain!.details(),renderCache:frameCache?.details(),camera:e.camera.position.toArray(),cameraQuaternion:e.camera.quaternion.toArray(),target:controls?.target.toArray(),followsBoat:follow,memory:{...e.renderer.info.memory},contextLost:e.renderer.getContext().isContextLost(),disposed,reducedMotion:reduced()});
    const snapshot=()=>{e.seek(e.clock.time);return canvas.toDataURL('image/png');};
    const sampleMotion=(times:number[])=>{
      if(times.length>256||times.some(t=>!Number.isFinite(t)||t<0))throw new Error('检查时间非法');
      const rows=times.map(t=>{cruise.update(t,reduced());rower!.update(reduced()?0:t);e.scene.updateMatrixWorld(true);return {t,...rower!.details(),navigation:cruise.details(),worldForward:new Vector3(1,0,0).transformDirection(boat.matrixWorld).toArray()};});
      e.seek(e.clock.time);return rows;
    };
    const details=()=>({...stats(),loadMs:performance.now()-started,model:manifest.model,terrain:manifest.terrain,view:{name:view,camera:e.camera.position.toArray(),target:controls?.target.toArray(),followsBoat:follow},audio:options.audio?.details()});
    handedOff=true;signal.removeEventListener('abort',release);
    return {engine:e,canvas,manifest,audio:options.audio,dispose:release,api:{setView,seek:(t:number)=>e.seek(t),pause:()=>e.clock.pause(),play:()=>{e.clock.play();e.start();},stop:()=>e.stop(),stats,details,rower:()=>rower!.details(),sampleMotion,snapshot,setStaticCache:(enabled:boolean)=>{frameCache?.setEnabled(enabled);e.seek(e.clock.time);},setLods:(mode:'auto'|'near'|'far')=>{lods?.setMode(mode);terrain!.setMode(mode);e.seek(e.clock.time);},setReduced:(enabled:boolean)=>{requestedReduced=enabled;change();},setReflection:(enabled:boolean)=>{water!.reflectionEnabled=enabled;e.seek(e.clock.time);},dispose:()=>{release();return stats();}},
      details,
      enter:()=>{check();if(!reduced()&&!query.has('t'))e.clock.play();e.start();},
      freeze:()=>{const playing=e.clock.playing;const enabled=controls?.enabled??false;e.clock.pause();e.stop();if(controls)controls.enabled=false;const resume=()=>{if(disposed)return;if(controls)controls.enabled=enabled;if(playing)e.clock.play();e.start();};try{return {frame:snapshot(),resume};}catch(error){resume();throw error;}},};
  }catch(error){release();throw error;}
}
