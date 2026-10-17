import { ACESFilmicToneMapping, Color, DirectionalLight, FogExp2, HemisphereLight, Matrix4, Mesh, MeshStandardMaterial, PCFShadowMap, PerspectiveCamera, Texture, Vector3, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { Assets, type HeightmapAsset } from '../engine/Assets';
import { Engine } from '../engine/Engine';
import { disposeObjectResources } from '../engine/objectResources';
import { applyPbrMaterials } from '../systems/materials/applyMaterials';
import { snowTerrain } from '../systems/nature/SnowTerrain';
import { QuietSnow } from '../systems/nature/QuietSnow';
import { NightRiver } from '../systems/water/NightRiver';
import { winterDaylight } from '../systems/nature/WinterDaylight';
import { JiangxueBoat } from '../systems/boats/JiangxueBoat';

export async function prepareJiangxue(canvas:HTMLCanvasElement,signal:AbortSignal,query:URLSearchParams) {
  const base=import.meta.env.BASE_URL+'assets/';
  let root:Object3D|undefined,height:HeightmapAsset|undefined,terrain:ReturnType<typeof snowTerrain>|undefined;
  let engine:Engine|undefined,water:NightRiver|undefined,snow:QuietSnow|undefined,light:DirectionalLight|undefined,disposed=false;
  let removeMotionListener=()=>{};
  // r186's shared physical lookup outlives renderer.dispose; this isolated lab owns its renderer.
  const lookups=new Set<{value:unknown}>();
  const release=()=>{if(disposed)return;disposed=true;removeMotionListener();water?.removeFromParent();water?.dispose();snow?.dispose();terrain?.dispose();height?.dispose();if(root)disposeObjectResources(root);light?.shadow.dispose();for(const lookup of lookups)if(lookup.value instanceof Texture)lookup.value.dispose();lookups.clear();engine?.dispose();engine?.renderer.forceContextLoss();};
  const check=()=>{if(signal.aborted)throw new DOMException('江雪准备取消','AbortError');};
  try {
    const manifestPath=query.get('asset')??'scenes/jiangxue.scene-v03.json';
    const revision=/^scenes\/jiangxue\.scene-v(01|02|03)\.json$/.exec(manifestPath)?.[1];
    if(!revision)throw new Error('江雪清单路径非法');
    const response=await fetch(base+manifestPath,{signal});if(!response.ok)throw new Error('江雪清单加载失败');
    const manifest=await response.json();
    if(manifest.scene!=='jiangxue'||manifest.contractVersion!=='0.2'||manifest.scope!=='quality-sample'||manifest.model!==`models/jiangxue/scene_v${revision}.glb`||manifest.terrain!==`jiangxue-v${revision==='03'?'02':revision}`||manifest.waterLevel!==0||!Array.isArray(manifest.requiredNodes)||!manifest.requiredNodes.length)throw new Error('江雪资产清单不完整');
    const bytes=await fetch(base+manifest.model,{signal});if(!bytes.ok)throw new Error('江雪模型加载失败：'+bytes.status);
    const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(await bytes.arrayBuffer(),base+'models/jiangxue/');
    root=gltf.scene;check();
    for(const name of manifest.requiredNodes)if(!root.getObjectByName(name))throw new Error('江雪缺少节点：'+name);
    applyPbrMaterials(root);
    height=await new Assets().loadHeightmap(manifest.terrain);check();
    engine=new Engine(canvas,Math.min(devicePixelRatio,2));const e=engine;
    e.renderer.toneMapping=ACESFilmicToneMapping;e.renderer.toneMappingExposure=1;
    e.renderer.shadowMap.enabled=true;e.renderer.shadowMap.type=PCFShadowMap;
    if(revision!=='01')light=winterDaylight(e.scene);
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
    terrain=snowTerrain(height,surface);e.scene.add(terrain.mesh);
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
    const reduce=matchMedia('(prefers-reduced-motion: reduce)');snow.visible=!reduce.matches;
    const change=()=>{if(snow)snow.visible=!reduce.matches;if(reduce.matches)e.clock.pause();e.seek(e.clock.time);};reduce.addEventListener('change',change);
    removeMotionListener=()=>reduce.removeEventListener('change',change);
    const boat=root.getObjectByName('boat_guest')!,inverse=new Matrix4();let view='CAM_enter';
    if(revision==='03'&&!manifest.boatNavigation)throw new Error('江雪浮舟缺少河道路径');
    const cruise=revision==='03'?new JiangxueBoat(root,manifest.boatNavigation,manifest.waterLevel):undefined;
    const cameraRelative=new Matrix4(),cameraPose=new Matrix4(),cameraScale=new Vector3();let follow=false,shadowTime=NaN;
    const setView=(name:string)=>{
      if(disposed)return;const camera=root!.getObjectByName(name);if(!(camera instanceof PerspectiveCamera))throw new Error('未知江雪机位：'+name);
      root!.updateMatrixWorld(true);e.camera.position.copy(camera.getWorldPosition(new Vector3()));e.camera.quaternion.copy(camera.getWorldQuaternion(e.camera.quaternion));
      follow=!!cruise&&(name==='CAM_boat'||name==='CAM_fisherman');
      if(follow)cameraRelative.multiplyMatrices(cruise!.authoredInverse,camera.matrixWorld);
      e.camera.fov=camera.fov;e.camera.near=.05;e.camera.far=1000;e.camera.updateProjectionMatrix();view=name;e.seek(e.clock.time);
    };
    e.onUpdate(t=>{
      const effective=cruise&&reduce.matches?0:t;cruise?.update(t,reduce.matches);e.scene.updateMatrixWorld(true);
      if(follow)cameraPose.multiplyMatrices(cruise!.frame,cameraRelative).decompose(e.camera.position,e.camera.quaternion,cameraScale);
      if(cruise&&effective!==shadowTime){light!.shadow.needsUpdate=true;shadowTime=effective;}
      inverse.copy(boat.matrixWorld).invert();water!.update(effective,inverse);snow!.update(effective);
    });
    setView(query.get('view')??'CAM_enter');e.clock.seek(Number(query.get('t')??0));if(reduce.matches||query.has('t'))e.clock.pause();
    await e.renderer.compileAsync(e.scene,e.camera);check();
    const stats=()=>({revision,view,time:e.clock.time,playing:e.clock.playing,...e.stats,navigation:cruise?.details(),camera:e.camera.position.toArray(),memory:{...e.renderer.info.memory},programs:e.renderer.info.programs?.length??0,contextLost:e.renderer.getContext().isContextLost(),disposed});
    return {engine:e,api:{setView,seek:(t:number)=>e.seek(t),pause:()=>e.clock.pause(),play:()=>e.clock.play(),stats,
      setReflection:(value:boolean)=>{water!.reflectionEnabled=value;},setSnow:(value:boolean)=>{snow!.visible=value&&!reduce.matches;},
      dispose:()=>{release();return stats();}},enter:()=>{e.seek(e.clock.time);e.start();}};
  } catch(error){release();throw error;}
}
