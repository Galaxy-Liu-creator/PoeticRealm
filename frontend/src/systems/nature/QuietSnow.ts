import { BufferGeometry, Float32BufferAttribute, Points, PointsMaterial } from 'three';
/** Sparse fixed-seed snowfall evaluated directly from the global clock, including seeks. */
export class QuietSnow extends Points<BufferGeometry,PointsMaterial> {
  private readonly seeds: number[][]=[];
  constructor(seed=31027) {
    const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(new Float32Array(420*3),3));
    super(geometry,new PointsMaterial({color:0xdce9e9,size:.035,transparent:true,opacity:.55,depthWrite:false}));
    let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    for(let i=0;i<420;i++)this.seeds.push([random()*85-35,random()*70-38,random()*16,.35+random()*.35,random()*6.28]);
    this.name='jiangxue_quiet_snow';this.frustumCulled=false;this.update(0);
  }
  update(t:number) {
    const p=this.geometry.getAttribute('position');
    this.seeds.forEach(([x,z,y,s,phase],i)=>p.setXYZ(i,x+.35*Math.sin(t*.3+phase),((y-t*s)%16+16)%16,z+.18*Math.sin(t*.2+phase)));
    p.needsUpdate=true;
  }
  override dispose(){this.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
