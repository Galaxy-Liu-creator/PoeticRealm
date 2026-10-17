import { describe, expect, it } from 'vitest';
import { Object3D, Vector3 } from 'three';
import { BoatCruise, assertBoatNavigation, type BoatNavigation } from './BoatCruise';

const route: BoatNavigation = {
  path: [[3.85, .45], [3.5, -1.5], [2.8, -4], [1.48, -6.4], [-.55, -9]],
  speed: .22, brakingDistance: 2,
};
function fixture(height = (_x: number, _z: number, _t: number) => 0) {
  const boat = new Object3D(); boat.position.set(3.85, -.3, .45);
  return { boat, cruise: new BoatCruise(boat, route, height) };
}
describe('boat river course', () => {
  it('keeps the bow pointed along forward travel through the bend', () => {
    const { boat, cruise } = fixture();
    let previous = .45;
    for (const t of [0, 4, 8, 16, 24, 32, 48]) {
      cruise.update(t);
      expect(boat.position.z).toBeLessThanOrEqual(previous);
      previous = boat.position.z;
      const start = boat.position.clone(), bow = new Vector3(1, 0, 0).applyQuaternion(boat.quaternion);
      cruise.update(t + .001);
      const direction = boat.position.clone().sub(start).normalize();
      expect(bow.dot(direction)).toBeGreaterThan(.9999);
    }
    cruise.update(32);
    expect(boat.position.distanceTo(new Vector3(3.85, -.3, .45))).toBeGreaterThan(6);
  });
  it('reconstructs the same pose after seeking backwards or advancing in steps', () => {
    const a = fixture(), b = fixture();
    a.cruise.update(16); const position = a.boat.position.clone(), rotation = a.boat.quaternion.clone();
    a.cruise.update(100); a.cruise.update(16);
    for (let i = 0; i <= 320; i++) b.cruise.update(i / 20);
    expect(a.boat.position.toArray()).toEqual(position.toArray());
    expect(a.boat.quaternion.toArray()).toEqual(rotation.toArray());
    expect(b.boat.position.toArray()).toEqual(position.toArray());
    expect(b.boat.quaternion.toArray()).toEqual(rotation.toArray());
  });
  it('slows forward into a berth without wrapping or reversing on long playback', () => {
    const { boat, cruise } = fixture();
    cruise.update(45); const a = boat.position.clone();
    cruise.update(46); const b = boat.position.clone();
    cruise.update(100); const c = boat.position.clone();
    cruise.update(101); const d = boat.position.clone();
    expect(d.distanceTo(c)).toBeLessThan(b.distanceTo(a));
    expect(d.z).toBeLessThan(c.z);
    cruise.update(10000);
    expect(boat.position.distanceTo(new Vector3(-.55, -.3, -9))).toBeLessThan(.00001);
    expect(boat.position.toArray().every(Number.isFinite)).toBe(true);
  });
  it('samples waves at the moving position and freezes the whole boat in reduced motion', () => {
    const { boat, cruise } = fixture((x, z, t) => .003 * x + .002 * z + .001 * t);
    cruise.update(16);
    expect(boat.position.y).toBeCloseTo(-.3 + .003 * boat.position.x + .002 * boat.position.z + .016, 10);
    cruise.update(0, true); const frozen = boat.position.toArray(), orientation = boat.quaternion.toArray();
    cruise.update(32, true);
    expect(boat.position.toArray()).toEqual(frozen);
    expect(boat.quaternion.toArray()).toEqual(orientation);
    expect(boat.position.y).toBe(-.3);
  });
  it('rejects broken paths and a route that starts away from the authored boat', () => {
    for (const bad of [null, {...route, speed: -1}, {...route, brakingDistance: NaN},
      {...route, path: [[0, 0], [0, 0], [0, -1]]}, {...route, path: [[0, 0], [1, Infinity], [2, -1]]}]) {
      expect(() => assertBoatNavigation(bad)).toThrow();
    }
    expect(() => new BoatCruise(new Object3D(), route, () => 0)).toThrow('起点');
  });
});
