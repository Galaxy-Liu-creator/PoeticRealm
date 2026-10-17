import { Bone, CylinderGeometry, Mesh, Object3D, Quaternion, SkinnedMesh, Vector3 } from 'three';

const strokePeriodSeconds = 4;

interface Arm {
  upper: Bone; fore: Bone; hand: Bone; grip: Object3D;
  upperTip: Vector3; foreTip: Vector3; bend: Vector3;
  handBind: Quaternion;
  palm?: Object3D; palmTip?: Vector3;
}
/** 桨先运动，双臂跟随桨柄。全部由 t 重建，不累计姿态或使用独立时钟。 */
export class Rower {
  private readonly rig: Object3D;
  private readonly oar: Object3D;
  private readonly blade: Object3D;
  private readonly spine: Bone;
  private readonly head: Bone;
  private readonly rests = new Map<Bone, Quaternion>();
  private readonly arms: Arm[];
  private readonly oarRest: Quaternion;
  private readonly oarBindInverse: Quaternion;
  private readonly up = new Vector3(0, 1, 0);
  private readonly dipAxis = new Vector3(.676, 0, -.737).normalize();
  private readonly standing: boolean;
  private readonly closedHull: boolean;
  private readonly pelvis?: Bone;
  private readonly pelvisPosition?: Vector3;
  private readonly legs: Arm[] = [];
  private readonly rigBindInverse: Quaternion;
  private readonly rope?: Mesh;
  private readonly tether?: Object3D;
  private readonly tie?: Object3D;
  private readonly tetherTip?: Vector3;
  private readonly tiePosition?: Vector3;
  private readonly tetherRestLength?: number;
  constructor(private readonly root: Object3D) {
    const node = (name: string): Object3D => {
      const value = root.getObjectByName(name);
      if (!value) throw new Error('划桨资产缺少节点：' + name);
      return value;
    };
    const bone = (name: string): Bone => {
      const value = node(name);
      if (!(value instanceof Bone)) throw new Error('划桨节点不是骨骼：' + name);
      this.rests.set(value, value.quaternion.clone());
      return value;
    };
    this.rig = node('rower_rig'); this.oar = node('oar_pivot'); this.blade = node('ANCHOR_oar_blade');
    this.standing = !!root.getObjectByName('ANCHOR_rower_foot_left');
    this.closedHull = !!root.getObjectByName('boat_hull_closed');
    this.spine = bone('rower_spine'); this.head = bone('rower_head');
    root.updateMatrixWorld(true);
    this.oarRest = this.oar.quaternion.clone();
    this.oarBindInverse = this.oar.getWorldQuaternion(new Quaternion()).invert();
    this.rigBindInverse = this.rig.getWorldQuaternion(new Quaternion()).invert();
    const rigInverse = this.rig.matrixWorld.clone().invert();
    this.arms = ['left', 'right'].map(side => {
      const upper = bone('rower_upper_' + side), fore = bone('rower_fore_' + side), hand = bone('rower_hand_' + side);
      const shoulder = upper.getWorldPosition(new Vector3()), elbow = fore.getWorldPosition(new Vector3());
      const palm = root.getObjectByName('ANCHOR_rower_palm_' + side);
      return { upper, fore, hand, grip: node('ANCHOR_oar_hand_' + side), palm,
        palmTip: palm ? hand.worldToLocal(palm.getWorldPosition(new Vector3())) : undefined,
        upperTip: fore.position.clone(), foreTip: hand.position.clone(),
        bend: elbow.sub(shoulder).transformDirection(rigInverse), handBind: hand.getWorldQuaternion(new Quaternion()) };
    });
    if (this.standing) {
      this.pelvis = bone('rower_root'); this.pelvisPosition = this.pelvis.position.clone();
      for (const side of ['left', 'right']) {
        const upper = bone('rower_thigh_' + side), fore = bone('rower_shin_' + side), hand = bone('rower_foot_' + side);
        this.legs.push({ upper, fore, hand, grip: node('ANCHOR_rower_foot_' + side),
          upperTip: fore.position.clone(), foreTip: hand.position.clone(),
          bend: new Vector3(1, -.3, 0), handBind: hand.getWorldQuaternion(new Quaternion()) });
      }
      this.tether = node('ANCHOR_oar_tether'); this.tie = node('ANCHOR_boat_tether');
      this.tetherTip = this.tether.position.clone(); this.tiePosition = this.tie.position.clone();
      this.tetherRestLength = this.tetherTip.clone().applyQuaternion(this.oarRest).add(this.oar.position).distanceTo(this.tiePosition);
      const reed = node('rower_reed') as Mesh;
      this.rope = new Mesh(new CylinderGeometry(.009, .009, 1, 10), reed.material);
      this.rope.name = 'rowing_oar_tether'; this.rope.castShadow = true; this.rope.receiveShadow = true;
      root.add(this.rope);
    }
    // Character skin batches are always included; avoid stale bind-pose culling in reflected views.
    this.rig.traverse(o => { if (o instanceof SkinnedMesh) o.frustumCulled = false; });
  }
  update(t: number): void {
    for (const [bone, rest] of this.rests) bone.quaternion.copy(rest);
    if (this.pelvis) this.pelvis.position.copy(this.pelvisPosition!);
    this.root.updateMatrixWorld(true);
    const phase = t * Math.PI * 2 / strokePeriodSeconds;
    if (this.standing) {
      // glTF maps Blender (x,y,z) to (x,z,-y); all runtime axes are in this converted boat frame.
      const sweep = Math.sin(phase) * (this.closedHull ? .14 : .18);
      const feather = Math.cos(phase) * (this.closedHull ? .22 : .46);
      const axis = this.blade.position.clone().normalize();
      const sweepRotation = this.oarRest.clone()
        .multiply(new Quaternion().setFromAxisAngle(this.up, sweep))
        .multiply(new Quaternion().setFromAxisAngle(axis, feather));
      const tiltAxis = new Vector3(0, 0, -1);
      const ropeLength = (angle: number): number => this.tetherTip!.clone()
        .applyQuaternion(sweepRotation.clone().multiply(new Quaternion().setFromAxisAngle(tiltAxis, angle)))
        .add(this.oar.position).distanceTo(this.tiePosition!);
      let tilt = 0;
      for (let i = 0; i < 6; i++) {
        const length = ropeLength(tilt), slope = (ropeLength(tilt + .0001) - length) / .0001;
        if (Math.abs(slope) < .00001) break;
        tilt = Math.max(-.38, Math.min(.38, tilt - (length - this.tetherRestLength!) / slope));
      }
      this.oar.quaternion.copy(sweepRotation).multiply(new Quaternion().setFromAxisAngle(tiltAxis, tilt));
      const shift = new Vector3(Math.sin(phase) * .055, -Math.abs(Math.sin(phase)) * .009, 0)
        .applyQuaternion(this.rig.getWorldQuaternion(new Quaternion()))
        .applyQuaternion(this.pelvis!.parent!.getWorldQuaternion(new Quaternion()).invert());
      this.pelvis!.position.copy(this.pelvisPosition!).add(shift);
      const lean = new Quaternion().setFromAxisAngle(new Vector3(0, 0, -1), Math.sin(phase) * .095);
      const worldLean = this.rig.getWorldQuaternion(new Quaternion()).multiply(lean).multiply(this.rig.getWorldQuaternion(new Quaternion()).invert());
      const spineWorld = worldLean.multiply(this.spine.getWorldQuaternion(new Quaternion()));
      this.spine.quaternion.copy(this.spine.parent!.getWorldQuaternion(new Quaternion()).invert()).multiply(spineWorld);
    } else {
      this.oar.quaternion.copy(this.oarRest)
        .multiply(new Quaternion().setFromAxisAngle(this.up, Math.sin(phase) * .16))
        .multiply(new Quaternion().setFromAxisAngle(this.dipAxis, Math.cos(phase) * .085));
      this.spine.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.sin(phase) * .024));
    }
    this.head.quaternion.multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.sin(phase + .25) * .022));
    this.root.updateMatrixWorld(true);
    for (const arm of [...this.legs, ...this.arms]) {
      const foot = this.legs.includes(arm);
      const handWorld = (foot ? this.rig.getWorldQuaternion(new Quaternion()).multiply(this.rigBindInverse) :
        this.oar.getWorldQuaternion(new Quaternion()).multiply(this.oarBindInverse)).multiply(arm.handBind);
      const a = arm.upper.getWorldPosition(new Vector3()), target = arm.grip.getWorldPosition(new Vector3());
      if (arm.palmTip) target.sub(arm.palmTip.clone().applyQuaternion(handWorld));
      const direction = target.clone().sub(a), distance = direction.length(); direction.normalize();
      const l1 = arm.upperTip.length(), l2 = arm.foreTip.length();
      const d = Math.min(l1 + l2 - 1e-5, Math.max(Math.abs(l1 - l2) + 1e-5, distance));
      const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
      const bend = arm.bend.clone().transformDirection(this.rig.matrixWorld);
      bend.addScaledVector(direction, -bend.dot(direction)).normalize();
      const elbow = a.clone().addScaledVector(direction, along).addScaledVector(bend, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
      this.aim(arm.upper, arm.upperTip, elbow);
      this.aim(arm.fore, arm.foreTip, target);
      arm.hand.quaternion.copy(arm.hand.parent!.getWorldQuaternion(new Quaternion()).invert()).multiply(handWorld);
      arm.hand.updateWorldMatrix(false, true);
    }
    if (this.rope) {
      const a = this.root.worldToLocal(this.tie!.getWorldPosition(new Vector3()));
      const b = this.root.worldToLocal(this.tether!.getWorldPosition(new Vector3()));
      this.rope.position.copy(a).add(b).multiplyScalar(.5);
      this.rope.scale.y = a.distanceTo(b);
      this.rope.quaternion.setFromUnitVectors(this.up, b.sub(a).normalize());
      this.rope.updateMatrixWorld(true);
    }
  }
  dispose(): void { this.rope?.removeFromParent(); this.rope?.geometry.dispose(); }
  private aim(bone: Bone, tip: Vector3, target: Vector3): void {
    const world = bone.getWorldQuaternion(new Quaternion());
    const axis = tip.clone().normalize().applyQuaternion(world);
    const direction = target.clone().sub(bone.getWorldPosition(new Vector3())).normalize();
    world.premultiply(new Quaternion().setFromUnitVectors(axis, direction));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new Quaternion()).invert()).multiply(world);
    bone.updateWorldMatrix(false, true);
  }
  details() {
    return {
      strokePeriodSeconds,
      skinnedMeshes: (() => { let n = 0; this.rig.traverse(o => { if (o instanceof SkinnedMesh) n++; }); return n; })(),
      style: this.closedHull ? 'side-yuloh' : this.standing ? 'stern-yuloh' : 'seated-oar',
      gripErrors: this.arms.map(arm => (arm.palm ?? arm.hand).getWorldPosition(new Vector3()).distanceTo(arm.grip.getWorldPosition(new Vector3()))),
      footErrors: this.legs.map(leg => leg.hand.getWorldPosition(new Vector3()).distanceTo(leg.grip.getWorldPosition(new Vector3()))),
      skinHandErrors: this.arms.map(arm => {
        const center = new Vector3(), point = new Vector3(); let count = 0;
        this.rig.traverse(o => {
          if (!(o instanceof SkinnedMesh)) return;
          const joint = o.skeleton.bones.indexOf(arm.hand);
          const indices = o.geometry.getAttribute('skinIndex'), weights = o.geometry.getAttribute('skinWeight');
          for (let i = 0; i < indices.count; i++) {
            if (indices.getX(i) !== joint || weights.getX(i) < .99) continue;
            o.getVertexPosition(i, point).applyMatrix4(o.matrixWorld); center.add(point); count++;
          }
        });
        // Only the fully hand-weighted palm patch is counted; articulated fingers have their own joints.
        return count ? center.divideScalar(count).distanceTo(arm.grip.getWorldPosition(new Vector3())) : Infinity;
      }),
      oarRotation: this.oar.quaternion.toArray(),
      oarPosition: this.oar.position.toArray(),
      blade: this.blade.getWorldPosition(new Vector3()).toArray(),
      pivot: this.oar.getWorldPosition(new Vector3()).toArray(),
      tetherLength: this.rope?.scale.y,
      tetherError: this.rope ? Math.abs(this.rope.scale.y - this.tetherRestLength!) : undefined,
    };
  }
}
