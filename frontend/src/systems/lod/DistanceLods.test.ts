import { describe, expect, it } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three';
import { assertDistanceLods, assertLodRoots, DistanceLods } from './DistanceLods';

function fixture() {
  const root = new Group(), near = new Group(), far = new Group(); near.name = 'near'; far.name = 'far';
  near.add(new Mesh(new BoxGeometry(2,2,2), new MeshBasicMaterial()));
  far.add(new Mesh(new BoxGeometry(2,2,2), new MeshBasicMaterial())); root.add(near, far);
  const definitions = [{near:'near',far:'far',distance:20}];
  return {root,near,far,definitions,camera:new PerspectiveCamera()};
}
describe('main camera distance levels', () => {
  it('selects exactly one level and recreates it after arbitrary camera jumps', () => {
    const f=fixture(), lods=new DistanceLods(f.root,f.definitions);
    for (const [distance,near] of [[10,true],[80,false],[19.999,true],[20,false],[10,true]] as const) {
      f.camera.position.set(0,0,distance); lods.update(f.camera);
      expect(f.near.visible).toBe(near); expect(f.far.visible).toBe(!near);
    }
  });
  it('keeps selected visibility during reflection/shadow traversal', () => {
    const f=fixture(), lods=new DistanceLods(f.root,f.definitions); f.camera.position.z=40; lods.update(f.camera);
    const mirror=new PerspectiveCamera(); mirror.position.z=2;
    f.root.updateMatrixWorld(true); const names:string[]=[]; f.root.traverseVisible(o=>names.push(o.name));
    expect(names).toContain('far'); expect(names).not.toContain('near');
    expect(f.root.getObjectByProperty('isLOD',true)).toBeUndefined();
  });
  it('restores original visibility on release', () => {
    const f=fixture(); f.far.visible=false; const lods=new DistanceLods(f.root,f.definitions);
    f.camera.position.z=40; lods.update(f.camera); lods.dispose();
    expect(f.near.visible).toBe(true); expect(f.far.visible).toBe(false);
  });
  it('rejects missing, nested or mismatched roots', () => {
    const f=fixture(); f.far.position.x=1; expect(()=>assertLodRoots(f.root,f.definitions)).toThrow();
    f.far.position.x=0; f.near.add(f.far); expect(()=>assertLodRoots(f.root,f.definitions)).toThrow();
  });
  it('rejects invalid distances and overlapping node declarations', () => {
    expect(()=>assertDistanceLods([{near:'near',far:'far',distance:0}],['near','far'])).toThrow();
    expect(()=>assertDistanceLods([{near:'near',far:'far',distance:20},{near:'far',far:'other',distance:20}],['near','far','other'])).toThrow();
  });
});
