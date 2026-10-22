import {describe,expect,it,vi} from 'vitest';
import {BoxGeometry,Color,Group,Mesh,MeshBasicMaterial,PerspectiveCamera,Scene,Vector2,type WebGLRenderer} from 'three';
import {CanyonFrameCache} from './CanyonFrameCache';
function fixture(){
 const scene=new Scene();scene.background=new Color(0xabcdef);const root=new Group(),boat=new Group();
 const land=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),hull=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),water=new Mesh(new BoxGeometry(),new MeshBasicMaterial());land.name='land';hull.name='hull';water.name='water';boat.add(hull);root.add(land,boat);scene.add(root,water);
 const camera=new PerspectiveCamera();camera.position.z=8;camera.updateMatrixWorld();
 const records:{phaseTarget:boolean;composite:boolean;name:string;count:number}[]=[];let target:unknown=null,size=new Vector2(1920,1080),clear=new Color(0x123456),alpha=.3,fail=false;
 const renderer={autoClear:true,copyFramebufferToTexture:vi.fn(),getContext:()=>({getContextAttributes:()=>({antialias:false})}),getDrawingBufferSize:(v:Vector2)=>v.copy(size),getRenderTarget:()=>target,getClearAlpha:()=>alpha,getClearColor:(v:Color)=>v.copy(clear),setClearColor:(v:Color|number,a:number)=>{clear=v instanceof Color?v.clone():new Color(v);alpha=a;},setRenderTarget:(v:unknown)=>{target=v;},
 render:(s:Scene,c:PerspectiveCamera)=>{
  // Every color render begins with complete, unmodified shadow casters.
  expect(land.geometry.drawRange.count).toBe(Infinity);expect(hull.geometry.drawRange.count).toBe(Infinity);
  const list:Mesh[]=[];s.traverse(o=>{if(o instanceof Mesh&&o.visible)list.push(o);});list.sort((a,b)=>a.renderOrder-b.renderOrder);
  for(const mesh of list){mesh.onBeforeRender(renderer as unknown as WebGLRenderer,s,c,mesh.geometry,mesh.material as MeshBasicMaterial,new Group());records.push({phaseTarget:!!target,composite:s.getObjectByName('canyon_cached_color_depth')!.visible,name:mesh.name,count:mesh.geometry.drawRange.count});if(fail&&mesh===land&&mesh.geometry.drawRange.count===0)throw new Error('render fixture');mesh.onAfterRender(renderer as unknown as WebGLRenderer,s,c,mesh.geometry,mesh.material as MeshBasicMaterial,new Group());}
 }};
 const reflection=vi.fn(()=>{expect(land.geometry.drawRange.count).toBe(Infinity);expect(scene.getObjectByName('canyon_cached_color_depth')!.visible).toBe(false);});water.onBeforeRender=reflection;
 const original=land.onBeforeRender,cache=new CanyonFrameCache(renderer as unknown as WebGLRenderer,scene,[root],[boat,water],water);
 return {scene,camera,renderer,cache,land,hull,water,records,reflection,original,resize:()=>size.set(1440,900),fail:()=>{fail=true;},target:()=>target};
}
describe('CanyonFrameCache',()=>{
 it('reuses static color but keeps boat, water reflection and all shadow casters live',()=>{
  const f=fixture();f.cache.render(f.camera,'near');f.cache.render(f.camera,'near');expect(f.cache.details()).toMatchObject({misses:1,hits:1,width:1920,height:1080,staticMeshes:1});
  expect(f.records.some(r=>r.phaseTarget&&r.name==='land'&&r.count===Infinity)).toBe(true);expect(f.records.filter(r=>r.composite&&r.name==='land').every(r=>r.count===0)).toBe(true);expect(f.records.filter(r=>r.composite&&r.name==='hull').every(r=>r.count===Infinity)).toBe(true);expect(f.reflection).toHaveBeenCalledTimes(2);f.cache.dispose();
 });
 it('invalidates camera, projection, LOD and drawing-buffer changes',()=>{
  const f=fixture();f.cache.render(f.camera,'a');f.camera.position.x=1;f.cache.render(f.camera,'a');f.camera.fov=30;f.camera.updateProjectionMatrix();f.cache.render(f.camera,'a');f.cache.render(f.camera,'b');f.resize();f.cache.render(f.camera,'b');expect(f.cache.details()).toMatchObject({misses:5,width:1440,height:900});f.cache.dispose();
 });
 it('restores renderer and geometry after an interrupted color draw',()=>{
  const f=fixture();const background=f.scene.background;f.fail();expect(()=>f.cache.render(f.camera,'a')).toThrow('render fixture');expect(f.land.geometry.drawRange.count).toBe(Infinity);expect(f.hull.geometry.drawRange.count).toBe(Infinity);expect(f.scene.background).toBe(background);expect(f.renderer.autoClear).toBe(true);expect(f.target()).toBe(null);expect(f.scene.getObjectByName('canyon_cached_color_depth')!.visible).toBe(false);f.cache.dispose();
 });
 it('supports direct comparison and restores borrowed hooks on idempotent release',()=>{
  const f=fixture();f.cache.setEnabled(false);f.cache.render(f.camera,'a');expect(f.records.find(r=>r.name==='land')!.count).toBe(Infinity);f.cache.setEnabled(true);f.cache.render(f.camera,'a',false);expect(f.cache.details()).toMatchObject({bypassed:true,misses:0});f.cache.dispose();f.cache.dispose();expect(f.land.onBeforeRender).toBe(f.original);expect(f.water.onBeforeRender).toBe(f.reflection);expect(f.scene.getObjectByName('canyon_cached_color_depth')).toBeUndefined();
 });
});
