import { CatmullRomCurve3, Matrix4, Object3D, Quaternion, Vector3 } from 'three';

export interface BoatNavigation {
  path: [number, number][];
  speed: number;
  brakingDistance: number;
}

export function assertBoatNavigation(value: unknown): asserts value is BoatNavigation {
  const route = value as Partial<BoatNavigation> | null;
  if (!route || !Array.isArray(route.path) || route.path.length < 3 || route.path.length > 64 ||
      route.path.some(p => !Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite)) ||
      route.path.some((p, i) => i > 0 && Math.hypot(p[0] - route.path![i - 1][0], p[1] - route.path![i - 1][1]) < .001) ||
      typeof route.speed !== 'number' || !Number.isFinite(route.speed) || route.speed <= 0 ||
      typeof route.brakingDistance !== 'number' || !Number.isFinite(route.brakingDistance) || route.brakingDistance <= 0) {
    throw new Error('舟航行路径或速度非法');
  }
}

/** Local +X is the bow. Rebuild travel from scene time; never wrap the boat back to its start. */
export class BoatCruise {
  readonly frame = new Matrix4();
  private readonly curve: CatmullRomCurve3;
  private readonly length: number;
  private readonly braking: number;
  private readonly originY: number;
  private readonly point = new Vector3();
  private readonly forward = new Vector3();
  private readonly side = new Vector3();
  private readonly yaw = new Quaternion();
  private readonly tilt = new Quaternion();
  private readonly bow = new Vector3(1, 0, 0);
  private readonly lateral = new Vector3(0, 0, 1);
  private readonly scale = new Vector3(1, 1, 1);
  constructor(private readonly boat: Object3D, private readonly route: BoatNavigation,
    private readonly height: (x: number, z: number, t: number) => number) {
    assertBoatNavigation(route);
    const start = route.path[0];
    if (Math.hypot(boat.position.x - start[0], boat.position.z - start[1]) > .001) {
      throw new Error('舟航行起点与制作位置不一致');
    }
    this.originY = boat.position.y;
    this.curve = new CatmullRomCurve3(route.path.map(([x, z]) => new Vector3(x, this.originY, z)), false, 'centripetal');
    this.curve.arcLengthDivisions = 512;
    this.length = this.curve.getLength();
    this.braking = Math.min(route.brakingDistance, this.length / 2);
  }
  update(time: number, reducedMotion = false): void {
    const t = reducedMotion ? 0 : Math.max(0, time);
    const travel = this.route.speed * t, cruiseEnd = this.length - this.braking;
    const distance = travel <= cruiseEnd ? travel : this.length - this.braking * Math.exp(-(travel - cruiseEnd) / this.braking);
    const u = Math.min(1, distance / this.length);
    this.curve.getPointAt(u, this.point);
    this.curve.getTangentAt(u, this.forward).normalize();
    this.yaw.setFromUnitVectors(this.bow, this.forward);
    // Cameras follow the horizontal course, without inheriting wave roll or pitch.
    this.frame.compose(this.point, this.yaw, this.scale);
    this.boat.position.copy(this.point);
    this.boat.quaternion.copy(this.yaw);
    if (!reducedMotion) {
      const { x, z } = this.point;
      this.side.set(-this.forward.z, 0, this.forward.x);
      const pitch = Math.atan((this.height(x + this.forward.x * 2, z + this.forward.z * 2, t) -
        this.height(x - this.forward.x * 2, z - this.forward.z * 2, t)) / 4);
      const roll = -Math.atan(this.height(x + this.side.x * .5, z + this.side.z * .5, t) -
        this.height(x - this.side.x * .5, z - this.side.z * .5, t));
      this.boat.position.y += this.height(x, z, t);
      this.boat.quaternion.multiply(this.tilt.setFromAxisAngle(this.bow, roll))
        .multiply(this.tilt.setFromAxisAngle(this.lateral, pitch));
    }
  }
  details() {
    return { speed: this.route.speed, length: this.length, forward: this.forward.toArray(),
      position: this.boat.position.toArray(), quaternion: this.boat.quaternion.toArray(), end: this.route.path.at(-1) };
  }
}
