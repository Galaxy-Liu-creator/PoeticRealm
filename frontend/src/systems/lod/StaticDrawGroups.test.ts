import {describe,expect,it} from 'vitest';
import {Box3,BoxGeometry,Group,Mesh,MeshBasicMaterial} from 'three';
import {StaticDrawGroups} from './StaticDrawGroups';

function fixture() {
  const root=new Group(),near=new Group(),far=new Group();near.name='temple_main';far.name='temple_far';
  near.position.set(10,0,-20);far.position.copy(near.position);far.visible=false;
  const material=new MeshBasicMaterial();
  for(const parent of [near,far])for(const x of [-2,2]){
    const mesh=new Mesh(new BoxGeometry(),material);mesh.position.x=x;mesh.userData.static=true;mesh.castShadow=true;parent.add(mesh);
  }
  root.add(near,far);return {root,near,far,material,definitions:[{near:near.name,far:far.name,distance:20}]};
}
describe('static draw ownership',()=>{
  it('keeps authored world bounds and material while reducing same-material draws',()=>{
    const f=fixture(),before=new Box3().setFromObject(f.near),draws=new StaticDrawGroups(f.root,f.definitions);
    const after=new Box3().setFromObject(draws.children[0]);expect(after.min.toArray()).toEqual(before.min.toArray());expect(after.max.toArray()).toEqual(before.max.toArray());
    const mesh=draws.children[0].children[0] as Mesh;expect(mesh.material).toBe(f.material);expect(mesh.castShadow).toBe(true);
    expect(draws.children[0].children).toHaveLength(1);expect(f.near.children[0].visible).toBe(false);draws.dispose();
  });
  it('selects the same prepared level as the main-camera controller',()=>{
    const f=fixture(),draws=new StaticDrawGroups(f.root,f.definitions);f.near.visible=false;f.far.visible=true;draws.update();
    expect(draws.children[0].visible).toBe(false);expect(draws.children[1].visible).toBe(true);
    draws.setEnabled(false);expect(draws.visible).toBe(false);expect(f.far.children[0].visible).toBe(true);draws.dispose();
  });
  it('releases its geometries and restores source nodes without disposing shared assets',()=>{
    const f=fixture(),draws=new StaticDrawGroups(f.root,f.definitions);f.far.visible=true;draws.update();let geometries=0,materials=0,source=0;
    for(const variant of draws.children)for(const mesh of variant.children as Mesh[])mesh.geometry.addEventListener('dispose',()=>geometries++);
    f.material.addEventListener('dispose',()=>materials++);(f.near.children[0] as Mesh).geometry.addEventListener('dispose',()=>source++);
    draws.dispose();draws.dispose();expect(geometries).toBe(2);expect(materials).toBe(0);expect(source).toBe(0);expect(f.near.children[0].visible).toBe(true);
  });
  it('prepares only requested combinations, reuses them and inherits warmed depth materials',()=>{
    const f=fixture(),draws=new StaticDrawGroups(f.root,f.definitions);
    expect(draws.details().preparedVariants).toBe(1);expect(draws.children[1].children).toHaveLength(0);
    const depth=new MeshBasicMaterial();for(const mesh of f.far.children as Mesh[])mesh.customDepthMaterial=depth;
    f.far.visible=true;draws.update();const farMesh=draws.children[1].children[0] as Mesh;
    expect(farMesh.customDepthMaterial).toBe(depth);
    for(let i=0;i<10;i++){f.far.visible=!f.far.visible;draws.update();}
    expect(draws.details().preparedVariants).toBe(2);expect(draws.details().geometries).toBe(2);draws.dispose();depth.dispose();
  });
});
