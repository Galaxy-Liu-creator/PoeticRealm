import { Matrix4, Mesh, Vector3, type Object3D } from 'three';
import { BoatCruise, type BoatNavigation } from './BoatCruise';
import { riverHeight } from '../water/NightRiver';

/** Same course/wave as Fengqiao; rebuild the fishing line from its authored vertices. */
export class JiangxueBoat {
  readonly authoredInverse:Matrix4;
  private readonly cruise:BoatCruise;
  private readonly boat:Object3D;
  private readonly line:Mesh;
  private readonly anchor:Object3D;
  private readonly baseAnchor:Vector3;
  private readonly positions:Float32Array;
  private readonly weights:Float32Array;
  private readonly point=new Vector3();
  private readonly local=new Vector3();
  private readonly inverse=new Matrix4();
  private effectiveTime=0;
  constructor(root:Object3D,route:BoatNavigation,private readonly waterLevel:number) {
    this.boat=root.getObjectByName('boat_guest')!;
    this.boat.updateWorldMatrix(true,true);this.authoredInverse=this.boat.matrixWorld.clone().invert();
    this.cruise=new BoatCruise(this.boat,route,riverHeight);
    const line=root.getObjectByName('fishing_line'),anchor=root.getObjectByName('ANCHOR_fishing_water');
    if(!(line instanceof Mesh)||!anchor||line.parent!==this.boat||anchor.parent!==this.boat)throw new Error('浮舟钓线层级错误');
    this.line=line;this.anchor=anchor;this.baseAnchor=anchor.position.clone();
    const tip=root.getObjectByName('ANCHOR_fishing_tip')!;
    const top=tip.getWorldPosition(new Vector3()).applyMatrix4(this.authoredInverse).y;
    const position=line.geometry.getAttribute('position');this.positions=new Float32Array(position.count*3);this.weights=new Float32Array(position.count);
    for(let i=0;i<position.count;i++){
      this.positions.set([position.getX(i),position.getY(i),position.getZ(i)],i*3);
      this.weights[i]=Math.max(0,Math.min(1,(top-position.getY(i)-line.position.y)/(top-this.baseAnchor.y)));
    }
    line.geometry.computeBoundingSphere();line.geometry.boundingSphere!.radius+=.04;
  }
  get frame(){return this.cruise.frame;}
  update(time:number,reduced=false){
    this.effectiveTime=reduced?0:Math.max(0,time);this.cruise.update(time,reduced);
    this.boat.updateWorldMatrix(true,true);this.inverse.copy(this.boat.matrixWorld).invert();
    this.point.copy(this.baseAnchor).applyMatrix4(this.boat.matrixWorld);
    this.point.y=this.waterLevel+riverHeight(this.point.x,this.point.z,this.effectiveTime)-.006;
    this.local.copy(this.point).applyMatrix4(this.inverse);this.anchor.position.copy(this.local);this.local.sub(this.baseAnchor);
    const position=this.line.geometry.getAttribute('position');
    for(let i=0;i<position.count;i++){
      const j=i*3,w=this.weights[i];position.setXYZ(i,this.positions[j]+this.local.x*w,this.positions[j+1]+this.local.y*w,this.positions[j+2]+this.local.z*w);
    }
    position.needsUpdate=true;this.line.geometry.computeVertexNormals();
  }
  details(){
    const point=this.anchor.getWorldPosition(new Vector3());
    const forward=new Vector3(1,0,0).applyQuaternion(this.boat.quaternion);
    return {...this.cruise.details(),effectiveTime:this.effectiveTime,worldForward:forward.toArray(),waterSurface:this.waterLevel+riverHeight(this.boat.position.x,this.boat.position.z,this.effectiveTime),lineEndpoint:point.toArray(),lineWaterGap:point.y-(this.waterLevel+riverHeight(point.x,point.z,this.effectiveTime))};
  }
}
