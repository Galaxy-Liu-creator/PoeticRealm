import { ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, HemisphereLight, Matrix4, Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, Texture, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Assets, type HeightmapAsset } from '../engine/Assets';
import { Engine } from '../engine/Engine';
import { disposeObjectResources } from '../engine/objectResources';
import { applyPbrMaterials } from '../systems/materials/applyMaterials';
import { snowTerrain } from '../systems/nature/SnowTerrain';
import { QuietSnow } from '../systems/nature/QuietSnow';
import { NightRiver } from '../systems/water/NightRiver';
import { winterDaylight } from '../systems/nature/WinterDaylight';
import { JiangxueBoat } from '../systems/boats/JiangxueBoat';
import type { AudioEngine } from '../systems/audio/AudioEngine';

export async function prepareJiangxue(canvas:HTMLCanvasElement,signal:AbortSignal,query:URLSearchParams,
  options:{reduced?:boolean;audio?:AudioEngine}={}) {
  const started=performance.now();
  const base=import.meta.env.BASE_URL+'assets/';
  let root:Object3D|undefined,height:HeightmapAsset|undefined,terrain:ReturnType<typeof snowTerrain>|undefined;
  let engine:Engine|undefined,water:NightRiver|undefined,snow:QuietSnow|undefined,light:DirectionalLight|undefined,disposed=false;
  let controls:OrbitControls|undefined;
  let removeMotionListener=()=>{};
  // r186's shared physical lookup outlives renderer.dispose; this isolated lab owns its renderer.
  const lookups=new Set<{value:unknown}>();
  const release=()=>{if(disposed)return;disposed=true;signal.removeEventListener('abort',release);removeMotionListener();controls?.dispose();water?.removeFromParent();water?.dispose();snow?.dispose();terrain?.dispose();height?.dispose();if(root)disposeObjectResources(root);light?.shadow.dispose();for(const lookup of lookups)if(lookup.value instanceof Texture)lookup.value.dispose();lookups.clear();options.audio?.dispose();engine?.dispose();engine?.renderer.forceContextLoss();window.dispatchEvent(new CustomEvent('jiangxue:disposed',{detail:{memory:engine?{...engine.renderer.info.memory}:{geometries:0,textures:0}}}));};
  const check=()=>{if(signal.aborted||disposed)throw new DOMException('江雪准备取消','AbortError');};
  signal.addEventListener('abort',release,{once:true});
  try {
    check();
    const manifestPath=query.get('asset')??'scenes/jiangxue.scene-v06.json';
    const revision=/^scenes\/jiangxue\.scene-v(01|02|03|04|05|06)\.json$/.exec(manifestPath)?.[1];
    if(!revision)throw new Error('江雪清单路径非法');
    const response=await fetch(base+manifestPath,{signal});if(!response.ok)throw new Error('江雪清单加载失败');
    const manifest=await response.json();
    if(manifest.scene!=='jiangxue'||manifest.contractVersion!=='0.2'||manifest.scope!=='quality-sample'||manifest.model!==`models/jiangxue/scene_v${revision}.glb`||manifest.terrain!==`jiangxue-v${['03','04','05'].includes(revision)?'02':revision}`||manifest.waterLevel!==0||!Array.isArray(manifest.requiredNodes)||!manifest.requiredNodes.length)throw new Error('江雪资产清单不完整');
    const bytes=await fetch(base+manifest.model,{signal});if(!bytes.ok)throw new Error('江雪模型加载失败：'+bytes.status);
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await bytes.arrayBuffer(),base+'models/jiangxue/');
    if(signal.aborted||disposed){disposeObjectResources(gltf.scene);check();}
    root=gltf.scene;check();
    for(const name of manifest.requiredNodes)if(!root.getObjectByName(name))throw new Error('江雪缺少节点：'+name);
    applyPbrMaterials(root);
    const loadedHeight=await new Assets().loadHeightmap(manifest.terrain);
    if(signal.aborted||disposed){loadedHeight.dispose();check();}
    height=loadedHeight;check();
    engine=new Engine(canvas,Math.min(devicePixelRatio,2));const e=engine;
    e.renderer.toneMapping=ACESFilmicToneMapping;e.renderer.toneMappingExposure=1;
    e.renderer.shadowMap.enabled=true;e.renderer.shadowMap.type=PCFShadowMap;
    if(revision!=='01')light=winterDaylight(e.scene,revision==='06');
    else {
    e.scene.background=new Color(0xaabec0);e.scene.fog=new FogExp2(0xaabec0,.006);
    e.scene.add(new HemisphereLight(0xe3f0f2,0x516066,2.4));
    light=new DirectionalLight(0xe3edef,2);light.position.set(-18,38,12);light.castShadow=true;
    light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-38;light.shadow.camera.right=38;light.shadow.camera.top=38;light.shadow.camera.bottom=-38;light.shadow.camera.far=120;light.shadow.bias=-.0002;light.shadow.normalBias=.025;
    // Geometry and daylight are fixed in this modeling lab; snowfall casts no shadow.
    light.shadow.autoUpdate=false;light.shadow.needsUpdate=true;
    e.scene.add(light,light.target);
    }
    e.scene.add(root);
    root.traverse(o=>{if(o instanceof Mesh){o.castShadow=true;o.receiveShadow=true;o.frustumCulled=true;}if(o.name==='mask_probe'||o.name.startsWith('PLACE_'))o.visible=false;});
    let surface:{rock:Texture;snow:Texture}|undefined;
    if(revision!=='01'){
      root.traverse(o=>{if(o instanceof Mesh)for(const material of Array.isArray(o.material)?o.material:[o.material])if(material instanceof MeshStandardMaterial&&material.map){
        if(material.name==='pbr_rock__jxbank')surface={rock:material.map,snow:surface?.snow??material.map};
      }});
      let snowMap:Texture|undefined;
      root.traverse(o=>{if(o instanceof Mesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m instanceof MeshStandardMaterial&&m.name==='pbr_snow__driftv02')snowMap=m.map??undefined;});
      if(!surface||!snowMap)throw new Error('精修版缺少岩石/雪表面贴图');surface.snow=snowMap;
    }
    terrain=snowTerrain(height,surface,revision==='06');e.scene.add(terrain.mesh);
    e.scene.traverse(object=>{
      if(!(object instanceof Mesh))return;
      for(const material of Array.isArray(object.material)?object.material:[object.material]){
        if(!(material instanceof MeshStandardMaterial))continue;
        const compile=material.onBeforeCompile;
        material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);if(shader.uniforms.dfgLUT)lookups.add(shader.uniforms.dfgLUT);};
      }
    });
    water=new NightRiver(512,700);water.position.y=manifest.waterLevel;water.material.uniforms.color.value.set(revision!=='01'?0x24464b:0x37575b);if(revision!=='01')water.material.uniforms.surfaceCalm.value=.23;e.scene.add(water);
    snow=new QuietSnow();e.scene.add(snow);
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');let requestedReduced=options.reduced??false,snowEnabled=true;
    const reduced=()=>requestedReduced||reduce.matches;
    snow.visible=!reduced();
    const change=()=>{if(disposed)return;if(snow)snow.visible=snowEnabled&&!reduced();if(reduced())e.clock.pause();e.seek(e.clock.time);};reduce.addEventListener('change',change);
    removeMotionListener=()=>reduce.removeEventListener('change',change);
    const boat=root.getObjectByName('boat_guest')!,inverse=new Matrix4();let view='CAM_enter';
    if(['03','04','05','06'].includes(revision)&&!manifest.boatNavigation)throw new Error('江雪浮舟缺少河道路径');
    const cruise=['03','04','05','06'].includes(revision)?new JiangxueBoat(root,manifest.boatNavigation,manifest.waterLevel):undefined;
    const cameraRelative=new Matrix4(),cameraPose=new Matrix4(),cameraScale=new Vector3(),frameInverse=new Matrix4();
    const targetRelative=new Vector3();let follow=false,shadowTime=NaN;
    const captureCameraFrame=()=>{
      if(!cruise||!follow||!controls)return;
      e.camera.updateMatrix();frameInverse.copy(cruise.frame).invert();
      cameraRelative.multiplyMatrices(frameInverse,e.camera.matrix);
      targetRelative.copy(controls.target).applyMatrix4(frameInverse);
    };
    const setView=(name:string)=>{
      if(disposed)return;const camera=root!.getObjectByName(name);if(!(camera instanceof PerspectiveCamera))throw new Error('未知江雪机位：'+name);
      controls?.dispose();cruise?.update(e.clock.time,reduced());
      root!.updateMatrixWorld(true);e.camera.position.copy(camera.getWorldPosition(new Vector3()));e.camera.quaternion.copy(camera.getWorldQuaternion(e.camera.quaternion));
      follow=!!cruise&&(name==='CAM_boat'||name==='CAM_fisherman');
      if(follow){
        cameraRelative.multiplyMatrices(cruise!.authoredInverse,camera.matrixWorld);
        cameraPose.multiplyMatrices(cruise!.frame,cameraRelative).decompose(e.camera.position,e.camera.quaternion,cameraScale);
      }
      e.camera.fov=camera.fov;e.camera.near=.05;e.camera.far=1000;e.camera.updateProjectionMatrix();view=name;e.seek(e.clock.time);
      const orientation=e.camera.quaternion.clone();
      controls=new OrbitControls(e.camera,canvas);
      const focus=root!.getObjectByName(name.replace('CAM_','FOCUS_'));
      if(focus)controls.target.copy(focus.getWorldPosition(new Vector3()));
      else {
        // Environment views have no FOCUS marker: use the boat's focus distance
        // along the authored camera ray so the first drag keeps its framing.
        const distance=e.camera.position.distanceTo(root!.getObjectByName('FOCUS_boat')!.getWorldPosition(new Vector3()));
        controls.target.set(0,0,-1).applyQuaternion(orientation).multiplyScalar(distance).add(e.camera.position);
      }
      e.camera.quaternion.copy(orientation);
      controls.enableDamping=false;controls.minDistance=3.5;controls.maxDistance=100;
      controls.maxPolarAngle=Math.PI/2-.06;
      captureCameraFrame();controls.addEventListener('change',captureCameraFrame);
    };
    e.onUpdate(t=>{
      const effective=cruise&&reduced()?0:t;cruise?.update(t,reduced());e.scene.updateMatrixWorld(true);
      if(follow){
        cameraPose.multiplyMatrices(cruise!.frame,cameraRelative).decompose(e.camera.position,e.camera.quaternion,cameraScale);
        controls?.target.copy(targetRelative).applyMatrix4(cruise!.frame);
      }
      if(cruise&&effective!==shadowTime){light!.shadow.needsUpdate=true;shadowTime=effective;}
      inverse.copy(boat.matrixWorld).invert();water!.update(effective,inverse);snow!.update(effective);
      options.audio?.update(t,e.clock.playing&&!document.hidden,Infinity,{boat:boat.getWorldPosition(new Vector3()).toArray(),camera:e.camera.position.toArray(),forward:e.camera.getWorldDirection(new Vector3()).toArray(),up:e.camera.up.toArray()});
    });
    e.clock.pause();setView(query.get('view')??'CAM_enter');e.clock.seek(Number(query.get('t')??0));
    await e.renderer.compileAsync(e.scene,e.camera);check();
    e.seek(e.clock.time);check();
    const stats=()=>({revision,view,time:e.clock.time,playing:e.clock.playing,...e.stats,navigation:cruise?.details(),camera:e.camera.position.toArray(),cameraQuaternion:e.camera.quaternion.toArray(),memory:{...e.renderer.info.memory},programs:e.renderer.info.programs?.length??0,contextLost:e.renderer.getContext().isContextLost(),disposed});
    const snapshot=()=>{e.seek(e.clock.time);return canvas.toDataURL('image/png');};
    const loadMs=performance.now()-started;
    signal.removeEventListener('abort',release);
    const details=()=>({...stats(),scene:'jiangxue',model:manifest.model,terrain:manifest.terrain,loadMs,reducedMotion:reduced(),view:{name:view,camera:e.camera.position.toArray(),target:controls?.target.toArray(),followsBoat:follow},audio:options.audio?.details()});
    return {engine:e,canvas,manifest,audio:options.audio,dispose:release,api:{setView,seek:(t:number)=>e.seek(t),pause:()=>e.clock.pause(),play:()=>e.clock.play(),stats,details,snapshot,
      setReduced:(enabled:boolean)=>{if(requestedReduced===enabled)return;requestedReduced=enabled;change();},
      setReflection:(value:boolean)=>{water!.reflectionEnabled=value;},setSnow:(value:boolean)=>{snowEnabled=value;snow!.visible=value&&!reduced();},
      dispose:()=>{release();return stats();}},enter:()=>{if(disposed)return;if(!reduced()&&!query.has('t'))e.clock.play();e.start();},
      freeze:()=>{const playing=e.clock.playing,enabled=controls?.enabled??false;const resume=()=>{if(disposed)return;if(controls)controls.enabled=enabled;if(playing)e.clock.play();e.start();};e.clock.pause();e.stop();if(controls)controls.enabled=false;try{return {frame:snapshot(),resume};}catch(error){resume();throw error;}},};
  } catch(error){release();throw error;}
}

export type JiangxueScene=Awaited<ReturnType<typeof prepareJiangxue>>;
