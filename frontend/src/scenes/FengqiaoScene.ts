import {
  ACESFilmicToneMapping, CanvasTexture, DirectionalLight, EquirectangularReflectionMapping,
  BackSide, Box3, DoubleSide, FogExp2, FrontSide, Group, HemisphereLight, Matrix4, Mesh, MeshDepthMaterial, MeshStandardMaterial, PerspectiveCamera,
  PMREMGenerator, PointLight, Quaternion, SkinnedMesh, SRGBColorSpace, Texture, Vector2, Vector3,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Material } from 'three';
import { Assets, type HeightmapAsset } from '../engine/Assets';
import { Engine } from '../engine/Engine';
import { NightRiver, riverHeight } from '../systems/water/NightRiver';
import { Rower } from '../systems/characters/Rower';
import { PlantWind } from '../systems/nature/PlantWind';
import { BoatCruise } from '../systems/boats/BoatCruise';
import { DistanceLods } from '../systems/lod/DistanceLods';
import { StaticDrawGroups } from '../systems/lod/StaticDrawGroups';
import { loadNightEnvironment } from '../systems/materials/NightEnvironment';
import { MoonFall } from '../systems/nature/MoonFall';
import { HeightFog } from '../systems/nature/HeightFog';
import { distantTerrain } from '../systems/nature/DistantTerrain';
import { AudioEngine } from '../systems/audio/AudioEngine';
import { bellArrival } from '../systems/audio/fengqiaoSound';
import { fengqiaoTimeline } from './fengqiao/timeline';

export interface SampleControls {
  setView(name: string): void;
  setReflection(enabled: boolean): void;
  setReflectionCrop(enabled: boolean): void;
  setShadows(enabled: boolean): void;
  setFire(enabled: boolean): void;
  setWind(enabled: boolean): void;
  setLods(mode: 'auto' | 'near' | 'far'): void;
  setStaticMerge(enabled: boolean): void;
  setMatrixReuse(enabled: boolean): void;
  setHullBounds(enabled: boolean): void;
  setFog(enabled: boolean): void;
  setReduced(enabled: boolean): void;
  setCamera(position: [number, number, number], target: [number, number, number]): void;
  snapshot(): string;
  details(): unknown;
  dispose(): void;
}
export async function prepareFengqiao(canvas: HTMLCanvasElement, options: {manifestPath?: string; query?: URLSearchParams; reduced?: boolean; signal?: AbortSignal; audio?: AudioEngine} = {}) {
if(options.signal?.aborted)throw new DOMException('准备取消','AbortError');
const query = options.query ?? new URLSearchParams();
const loadStarted = performance.now();
let loadMs = 0;
const loadPhases: Record<string, number> = {};
const engine = new Engine(canvas, 1);
const controller = new AbortController();
let destroyed = false;
const releases: (() => void)[] = [];
const dispose = (): void => {
  if (destroyed) return;
  destroyed = true;
  controller.abort();
  window.removeEventListener('pagehide',onPageHide);
  const stages = [];
  for (const release of releases.reverse()) {
    release();
    stages.push({ owner: release.toString(), ...engine.renderer.info.memory });
  }
  engine.dispose();
  // Include renderer-owned background/cache objects in the disposal measurement.
  window.dispatchEvent(new CustomEvent('fengqiao:disposed', { detail: { memory: { ...engine.renderer.info.memory }, stages } }));
  engine.renderer.forceContextLoss();
  options.signal?.removeEventListener('abort',dispose);
  options.audio?.dispose();
};
options.signal?.addEventListener('abort',dispose,{once:true});
const onPageHide=(event:PageTransitionEvent):void=>{if(!event.persisted)dispose();};
window.addEventListener('pagehide',onPageHide);
let reduced = options.reduced ?? matchMedia('(prefers-reduced-motion: reduce)').matches;
try {
  const assets = new Assets();
  let pendingHeightmap: Promise<HeightmapAsset> | undefined;
  let pendingEnvironment: Promise<Texture> | undefined;
  const pendingAsset = assets.loadFengqiaoSample(controller.signal, options.manifestPath ?? query.get('asset') ?? undefined, manifest => {
    // Decode the backdrop and fetch the baked environment while the GLB is loading.
    if (manifest.scope === 'full-scene') {
      pendingHeightmap = assets.loadHeightmap(manifest.terrain!).then(heightmap => {
        if (destroyed) {heightmap.dispose();throw new DOMException('高度图准备取消','AbortError');}
        releases.push(()=>heightmap.dispose());return heightmap;
      });
      void pendingHeightmap.catch(()=>{});
    }
    if (manifest.environment && !query.has('bake-environment')) {
      pendingEnvironment = loadNightEnvironment(manifest.environment,controller.signal).then(texture => {
        if(destroyed){texture.dispose();throw new DOMException('环境准备取消','AbortError');}
        releases.push(()=>texture.dispose());return texture;
      });
      void pendingEnvironment.catch(()=>{});
    }
  }).then(asset => {
    if (destroyed) { asset.dispose(); throw new DOMException('页面已退出', 'AbortError'); }
    return asset;
  });
  // A context failure during environment setup must still consume a rejected/late asset promise.
  void pendingAsset.catch(() => {});
  // The visible sky remains the authored gradient; its PBR filtering is baked separately.
  engine.renderer.toneMapping = ACESFilmicToneMapping;
  engine.renderer.toneMappingExposure = .92;
  const skyCanvas = document.createElement('canvas');
  skyCanvas.width = 512; skyCanvas.height = 256;
  const ctx = skyCanvas.getContext('2d')!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#080f1e'); gradient.addColorStop(.46, '#182c43');
  gradient.addColorStop(.56, '#253b4b'); gradient.addColorStop(1, '#070d13');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 512, 256);
  const sky = new CanvasTexture(skyCanvas);
  releases.push(() => sky.dispose());
  sky.colorSpace = SRGBColorSpace; sky.mapping = EquirectangularReflectionMapping;
  engine.scene.background = sky;
  const asset = await pendingAsset;
  loadPhases.asset = performance.now() - loadStarted;
  if (destroyed) { asset.dispose(); throw new DOMException('页面已退出', 'AbortError'); }
  releases.push(() => asset.dispose());
  let environment: {texture: Texture; dispose(): void};
  const environmentStarted = performance.now();
  const bakedEnvironment = !!asset.manifest.environment && !query.has('bake-environment');
  if (bakedEnvironment) {
    const texture = await pendingEnvironment!;
    if (destroyed) { texture.dispose(); throw new DOMException('环境准备取消', 'AbortError'); }
    environment = {texture, dispose: () => texture.dispose()};
  } else {
    const pmrem = new PMREMGenerator(engine.renderer);
    try {
      const generated = pmrem.fromEquirectangular(sky); environment = generated;
      if (query.has('bake-environment')) window.__FENGQIAO_ENVIRONMENT_BAKE__ = () => {
        const pixels = new Uint16Array(generated.width * generated.height * 4);
        engine.renderer.readRenderTargetPixels(generated, 0, 0, generated.width, generated.height, pixels);
        const bytes = new Uint8Array(pixels.buffer); let text = '';
        for (let i = 0; i < bytes.length; i += 16384) text += String.fromCharCode(...bytes.subarray(i, i + 16384));
        return {width: generated.width, height: generated.height, base64: btoa(text)};
      };
    } finally { pmrem.dispose(); }
  }
  loadPhases.environment = performance.now() - environmentStarted;
  const initializationMemory = { ...engine.renderer.info.memory };
  if (!bakedEnvironment) releases.push(() => environment.dispose());
  if (bakedEnvironment) engine.renderer.initTexture(environment.texture);
  engine.scene.environment = environment.texture;
  const root = asset.gltf.scene;
  const wind = new PlantWind(root);
  releases.push(() => wind.dispose());
  const lods = asset.manifest.distanceLods ? new DistanceLods(root, asset.manifest.distanceLods) : undefined;
  releases.push(() => lods?.dispose());
  const hasArchitecture = !!root.getObjectByName('temple_main');
  // r186 retains a shared BRDF lookup texture beyond renderer.dispose().
  // This standalone page owns its only PBR renderer; capture the actual lookup through the public hook.
  const physicalLookups = new Set<{ value: unknown }>();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!(material instanceof MeshStandardMaterial)) continue;
      const compile = material.onBeforeCompile;
      material.onBeforeCompile = (shader, renderer) => {
        compile.call(material, shader, renderer);
        if (shader.uniforms.dfgLUT) physicalLookups.add(shader.uniforms.dfgLUT);
      };
    }
  });
  releases.push(() => {
    const textures = new Set<Texture>();
    for (const lookup of physicalLookups) if (lookup.value instanceof Texture) textures.add(lookup.value);
    for (const texture of textures) texture.dispose();
    physicalLookups.clear();
  });
  engine.scene.add(root);
  engine.renderer.toneMapping = ACESFilmicToneMapping;
  engine.renderer.toneMappingExposure = .92;
  engine.renderer.shadowMap.enabled = true;
  engine.scene.fog = new FogExp2(0x152433, hasArchitecture ? .0065 : .012);
  engine.scene.add(new HemisphereLight(0x8aaccf, 0x17212a, 1.15));
  const fill = new DirectionalLight(0x8ba6c2, 1.8);
  fill.position.set(-4,1.5,9);
  engine.scene.add(fill);
  const moon = new DirectionalLight(0xb9d6ff, 1.9);
  moon.position.set(2, 9, 5); moon.castShadow = true;
  moon.shadow.mapSize.set(query.get('q') === 'low' ? 1024 : 2048, query.get('q') === 'low' ? 1024 : 2048);
  Object.assign(moon.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: .1, far: 35 });
  if (hasArchitecture) {
    const bounds = new Box3();
    for (const name of ['temple_main','bell_tower','bridge_main','boat_guest']) bounds.union(new Box3().setFromObject(root.getObjectByName(name)!));
    const center = bounds.getCenter(new Vector3()), size = bounds.getSize(new Vector3());
    const radius = size.length() / 2 + 3;
    moon.target.position.copy(center); moon.position.copy(center).add(new Vector3(2,9,5).normalize().multiplyScalar(radius * 2));
    Object.assign(moon.shadow.camera, {left:-radius,right:radius,top:radius,bottom:-radius,far:radius*4});
    engine.scene.add(moon.target);
  }
  moon.shadow.bias = -.00015; moon.shadow.normalBias = .025;
  engine.scene.add(moon);
  releases.push(() => moon.shadow.dispose());
  const boat = root.getObjectByName('boat_guest')!;
  const boatOrigin = boat.position.clone();
  const boatRotation = boat.rotation.clone();
  boat.updateWorldMatrix(true, false);
  const authoredBoatInverse = boat.matrixWorld.clone().invert();
  const cruise = asset.manifest.boatNavigation ? new BoatCruise(boat, asset.manifest.boatNavigation, riverHeight) : undefined;
  cruise?.update(0, reduced);
  root.updateMatrixWorld(true);
  const lamp = root.getObjectByName('LIGHT_fishfire_01')!;
  const fire = new PointLight(lamp.userData.color, lamp.userData.intensity, lamp.userData.range, 2);
  lamp.add(fire);
  const flame = root.getObjectByName('fishfire_flame') as Mesh;
  const flameOrigin = flame.scale.clone();
  const flameMaterial = flame.material as MeshStandardMaterial;
  const river = new NightRiver(query.get('q') === 'low' ? 512 : 1024, asset.manifest.scope === 'full-scene' ? 1500 : 160);
  releases.push(() => river.dispose());
  river.position.y = asset.manifest.waterLevel;
  engine.scene.add(river);
  const full = asset.manifest.scope === 'full-scene';
  let moonFall: MoonFall | undefined, fog: HeightFog | undefined;
  if(full) {
    const heightmap=await pendingHeightmap!;
    if(destroyed){heightmap.dispose();throw new DOMException('高度图准备取消','AbortError');}
    const distant=distantTerrain(heightmap);engine.scene.add(distant.mesh);releases.push(()=>distant.dispose());
    moonFall=new MoonFall(engine.scene,root,moon,fengqiaoTimeline.moonsetDuration);releases.push(()=>moonFall?.dispose());
    fog=new HeightFog(engine.scene,root,river.material);fog.attach(distant.mesh.material);releases.push(()=>fog?.dispose());
  }
  let controls: OrbitControls | undefined;
  let followBoat = false;
  const cameraInBoatFrame = new Matrix4(), cameraPose = new Matrix4();
  const frameInverse = new Matrix4(), courseDelta = new Matrix4();
  const courseRotation = new Quaternion(), cameraScale = new Vector3();
  const targetInBoatFrame = new Vector3();
  const belongsToBoat = (object: import('three').Object3D): boolean => {
    for (let parent: import('three').Object3D | null = object; parent; parent = parent.parent) if (parent === boat) return true;
    return false;
  };
  const captureCameraFrame = (): void => {
    if (!cruise || !followBoat || !controls) return;
    engine.camera.updateMatrix();
    frameInverse.copy(cruise.frame).invert();
    cameraInBoatFrame.multiplyMatrices(frameInverse, engine.camera.matrix);
    targetInBoatFrame.copy(controls.target).applyMatrix4(frameInverse);
  };
  releases.push(() => controls?.dispose());
  let viewName='';
  const setView = (name: string, draw = true): void => {
    const source = root.getObjectByName(name);
    if (!(source instanceof PerspectiveCamera)) throw new Error('缺少相机：' + name);
    viewName=name;
    controls?.dispose();
    engine.scene.updateMatrixWorld(true);
    const camera = source.clone();
    camera.position.copy(source.getWorldPosition(new Vector3()));
    camera.quaternion.copy(source.getWorldQuaternion(new Quaternion()));
    followBoat = !!cruise && (name === 'CAM_boat' || name === 'CAM_rower');
    if (followBoat) {
      courseDelta.multiplyMatrices(cruise!.frame, authoredBoatInverse);
      courseDelta.decompose(new Vector3(), courseRotation, cameraScale);
      if (!belongsToBoat(source)) {
        camera.position.applyMatrix4(courseDelta);
        camera.quaternion.premultiply(courseRotation);
      }
    }
    const authoredCameraRotation = camera.quaternion.clone();
    const viewport=engine.renderer.getSize(new Vector2());camera.aspect = viewport.x / viewport.y;
    if(full) camera.far=2000;
    camera.updateProjectionMatrix();
    engine.camera = camera;
    controls = new OrbitControls(camera, canvas);
    const focus = root.getObjectByName(name.replace('CAM_','FOCUS_')) ?? root.getObjectByName('FOCUS_boat')!;
    controls.target.copy(focus.getWorldPosition(new Vector3()));
    if (followBoat && !belongsToBoat(focus)) controls.target.applyMatrix4(courseDelta);
    // OrbitControls updates the camera once in its constructor; restore the authored orientation after creating it.
    camera.quaternion.copy(authoredCameraRotation);
    controls.enableDamping = false; controls.minDistance = 3.5; controls.maxDistance = hasArchitecture ? 100 : 26;
    controls.maxPolarAngle = Math.PI / 2 - .06;
    captureCameraFrame();
    controls.addEventListener('change', captureCameraFrame);
    // Keep the authored Blender view until the user deliberately drags.
    if (draw) engine.seek(engine.clock.time);
  };
  const inverse = new Matrix4();
  const rower = root.getObjectByName('rower_rig') ? new Rower(root) : undefined;
  releases.push(() => rower?.dispose());
  let fireEnabled = true;
  setView(full ? 'CAM_boat' : 'CAM_enter', false);
  lods?.update(engine.camera);
  const staticDraws = asset.manifest.distanceLods ? new StaticDrawGroups(root, asset.manifest.distanceLods) : undefined;
  if (staticDraws) engine.scene.add(staticDraws);
  releases.push(() => staticDraws?.dispose());
  engine.onUpdate(t => {
    if (cruise) {
      cruise.update(t, reduced);
    } else if (!reduced) {
      const x = boatOrigin.x, z = boatOrigin.z;
      boat.position.y = boatOrigin.y + riverHeight(x, z, t);
      boat.rotation.x = boatRotation.x - Math.atan((riverHeight(x, z + .5, t) - riverHeight(x, z - .5, t)));
      boat.rotation.z = boatRotation.z + Math.atan((riverHeight(x + 2, z, t) - riverHeight(x - 2, z, t)) / 4);
    }
    const flicker = 1 + .10 * Math.sin(t * 8.3 + 1.9) + .04 * Math.sin(t * 17.2 + .8);
    fire.intensity = fireEnabled ? lamp.userData.intensity * flicker : 0;
    flame.visible = fireEnabled;
    flameMaterial.emissiveIntensity = 3.5 * flicker;
    flame.scale.copy(flameOrigin); flame.scale.y *= reduced ? 1 : flicker;
    rower?.update(reduced ? 0 : t);
    wind.update(reduced ? 0 : t);
    moonFall?.update(reduced ? fengqiaoTimeline.moonsetDuration : t);
    fog?.update(reduced ? 0 : t);
    if(moonFall)river.setMoonDirection(moon.position.clone().sub(moon.target.position).normalize());
    engine.scene.updateMatrixWorld(true);
    if (cruise && followBoat && controls) {
      cameraPose.multiplyMatrices(cruise.frame, cameraInBoatFrame);
      cameraPose.decompose(engine.camera.position, engine.camera.quaternion, cameraScale);
      controls.target.copy(targetInBoatFrame).applyMatrix4(cruise.frame);
    }
    lods?.update(engine.camera);
    staticDraws?.update();
    inverse.copy(boat.matrixWorld).invert();
    river.update(t, inverse);
    if(options.audio) {
      const position=(name:string)=>root.getObjectByName(name)!.getWorldPosition(new Vector3()).toArray();
      const arrival=bellArrival(position('EMIT_bell') as [number,number,number],position('boat_guest') as [number,number,number],fengqiaoTimeline.bellEmitTime,fengqiaoTimeline.soundSpeed);
      options.audio.update(t,engine.clock.playing&&!document.hidden,arrival,{bell:position('SFX_bell'),crow:position('SFX_crow'),boat:position('SFX_boat'),camera:engine.camera.position.toArray(),forward:engine.camera.getWorldDirection(new Vector3()).toArray(),up:engine.camera.up.toArray()});
    }
  });
  // onUpdate refreshes all world matrices once, after animation. Reflection and
  // screen passes consume the same frame; repeating scene traversal adds no data.
  engine.scene.updateMatrixWorld(true);
  engine.scene.matrixWorldAutoUpdate = false;
  loadPhases.assembly = performance.now() - loadStarted - loadPhases.asset - loadPhases.environment;
  const compileStarted = performance.now();
  // Compile reflection and screen programs together. Separate temporary materials keep
  // r186 compileAsync's currentProgram polling attached to the correct program variant.
  const reflectionRoot = new Group(), reflectionMaterials = new Map<Material, Material>();
  const releaseReflectionPrograms = (): void => {
    for (const material of reflectionMaterials.values()) material.dispose();
    reflectionMaterials.clear(); reflectionRoot.clear();
  };
  releases.push(releaseReflectionPrograms);
  engine.scene.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const materials = (Array.isArray(object.material) ? object.material : [object.material]).map(surface => {
      const existing = reflectionMaterials.get(surface);
      if (existing) return existing;
      const temporary: Material = surface.clone();
      temporary.onBeforeCompile = surface.onBeforeCompile;
      temporary.customProgramCacheKey = surface.customProgramCacheKey;
      reflectionMaterials.set(surface, temporary);
      return temporary;
    });
    const proxy = object instanceof SkinnedMesh ? object.clone(false) : new Mesh(object.geometry);
    proxy.material = Array.isArray(object.material) ? materials : materials[0];
    reflectionRoot.add(proxy);
  });
  engine.renderer.setRenderTarget(river.getRenderTarget());
  const reflectedPrograms = engine.renderer.compileAsync(reflectionRoot, engine.camera, engine.scene);
  engine.renderer.setRenderTarget(null);
  // These opaque sample meshes can share depth programs, including a skin variant.
  const depthRoot = new Group(), depthMaterials = new Map<string, MeshDepthMaterial>();
  engine.scene.traverse(object => {
    if (!(object instanceof Mesh) || !object.castShadow) return;
    const surface = (Array.isArray(object.material) ? object.material[0] : object.material) as MeshStandardMaterial;
    const side = surface.shadowSide ?? (surface.side === FrontSide ? BackSide : surface.side === BackSide ? FrontSide : DoubleSide);
    const key = `${object instanceof SkinnedMesh ? 'skin' : 'static'}-${side}-${!!surface.map}-${wind.key(object)}`;
    let depth = depthMaterials.get(key);
    if (!depth) { depth = new MeshDepthMaterial({ side, map: surface.map }); depthMaterials.set(key, depth); }
    object.customDepthMaterial = depth;
    wind.attachDepth(object,depth);
    const proxy = object.clone(false); proxy.material = depth; depthRoot.add(proxy);
  });
  // Shadow programs also render offscreen (linear, without screen tone mapping).
  engine.renderer.setRenderTarget(river.getRenderTarget());
  const depthPrograms = engine.renderer.compileAsync(depthRoot, moon.shadow.camera, engine.scene);
  engine.renderer.setRenderTarget(null);
  const programs = Promise.all([
    reflectedPrograms,
    depthPrograms,
    engine.renderer.compileAsync(engine.scene, engine.camera),
  ]);
  const uploadsStarted = performance.now();
  const uploads = new Set<Texture>();
  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      for (const value of Object.values(material)) if (value instanceof Texture) uploads.add(value);
    }
  });
  for (const texture of uploads) engine.renderer.initTexture(texture);
  loadPhases.textureUpload = performance.now() - uploadsStarted;
  await programs;
  if (destroyed) throw new DOMException('页面已退出', 'AbortError');
  loadPhases.compile = performance.now() - compileStarted;
  const api: SampleControls = {
    setView,
    setReflection: enabled => { river.reflectionEnabled = enabled; engine.seek(engine.clock.time); },
    setReflectionCrop: enabled => { river.reflectionCropEnabled = enabled; engine.seek(engine.clock.time); },
    setShadows: enabled => { engine.renderer.shadowMap.enabled = enabled; engine.seek(engine.clock.time); },
    setFire: enabled => { fireEnabled = enabled; engine.seek(engine.clock.time); },
    setWind: enabled => { wind.setEnabled(enabled); engine.seek(engine.clock.time); },
    setLods: mode => { lods?.setMode(mode); engine.seek(engine.clock.time); },
    setStaticMerge: enabled => { staticDraws?.setEnabled(enabled); engine.seek(engine.clock.time); },
    setMatrixReuse: enabled => { engine.scene.matrixWorldAutoUpdate = !enabled; engine.seek(engine.clock.time); },
    setHullBounds: enabled => { river.hullBoundsEnabled = enabled; engine.seek(engine.clock.time); },
    setFog: enabled => { fog?.setEnabled(enabled); engine.seek(engine.clock.time); },
    setReduced: enabled => { if(reduced===enabled)return;reduced=enabled;if(enabled)engine.clock.pause();engine.seek(engine.clock.time); },
    setCamera: (position, target) => {
      if (![position, target].every(point => point.length === 3 && point.every(Number.isFinite))) throw new Error('检查相机坐标非法');
      followBoat = false; engine.camera.position.fromArray(position); controls!.target.fromArray(target);
      engine.camera.lookAt(controls!.target); engine.seek(engine.clock.time);
    },
    snapshot: () => { engine.seek(engine.clock.time); return canvas.toDataURL('image/png'); },
    details: () => ({
      contractVersion: asset.manifest.contractVersion, scope: asset.manifest.scope, reducedMotion: reduced,
      initializationMemory,
      loadMs,
      environmentSource: bakedEnvironment ? 'baked-rgba16f' : 'procedural-pmrem',
      loadPhases: { ...loadPhases },
      memory: { ...engine.renderer.info.memory }, reflectionResolution: river.getRenderTarget().width,
      reflectionScissor: river.getRenderTarget().scissor.toArray(),
      shadowResolution: moon.shadow.mapSize.x, drawingBuffer: engine.renderer.getDrawingBufferSize(new Vector2()).toArray(),
      materials: (() => {
        const names = new Set<string>();
        root.traverse(o => { if (o instanceof Mesh) for (const material of Array.isArray(o.material) ? o.material : [o.material]) names.add(material.name); });
        return [...names];
      })(),
      maskProbe: (() => {
        const weights = (root.getObjectByName('mask_probe') as Mesh).geometry.getAttribute('behaviorMask');
        return Array.from({ length: weights.count }, (_,i) => weights.getX(i));
      })(),
      boat: boat.position.toArray(),
      navigation: cruise?.details(),
      view: { name:viewName, camera: engine.camera.position.toArray(), target: controls?.target.toArray(), followsBoat: followBoat },
      waterExtent:river.geometry.boundingBox!.getSize(new Vector3()).toArray().slice(0,2),
      rower: rower?.details(),
      wind: wind.details(),
      lods: lods?.details(),
      staticDraws: staticDraws?.details(),
      moon: moonFall?.details(reduced ? fengqiaoTimeline.moonsetDuration : engine.clock.time),fog:fog?.details(),audio:options.audio?.details(),
      bell:full?(()=>{const emit=root.getObjectByName('EMIT_bell')!.getWorldPosition(new Vector3()).toArray() as [number,number,number],position=boat.getWorldPosition(new Vector3()).toArray() as [number,number,number];return {emit,boat:position,arrival:bellArrival(emit,position,fengqiaoTimeline.bellEmitTime,fengqiaoTimeline.soundSpeed)};})():undefined,
    }),
    dispose,
  };
  const firstDrawStarted = performance.now();
  engine.seek(Number(query.get('t') ?? 0));
  releaseReflectionPrograms();
  loadPhases.firstDraw = performance.now() - firstDrawStarted;
  loadMs = performance.now() - loadStarted;
  engine.clock.pause();
  options.signal?.removeEventListener('abort',dispose);
  return {engine,api,canvas,manifest:asset.manifest,audio:options.audio,dispose,
    enter:()=>{if(!destroyed){if(!reduced&&!query.has('t'))engine.clock.play();engine.start();}},
    freeze:()=>{const playing=engine.clock.playing;const resume=()=>{if(playing)engine.clock.play();engine.start();};engine.clock.pause();engine.stop();try{return {frame:api.snapshot(),resume};}catch(error){resume();throw error;}},
  };
} catch (error) {
  dispose();throw error;
}
}

export type FengqiaoScene = Awaited<ReturnType<typeof prepareFengqiao>>;
