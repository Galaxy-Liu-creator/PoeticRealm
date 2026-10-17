import { Color, Matrix4, PlaneGeometry, ShaderMaterial, UniformsLib, UniformsUtils, Vector3, Vector4, type Camera } from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

// CPU boat samples and the vertex shader share this wave, with metres/seconds as units.
const amplitude = .006, waveX = .8, waveZ = .55, speed = .85;
export const riverHeight = (x: number, z: number, time: number): number => amplitude * Math.sin(x * waveX + z * waveZ + time * speed);

/** Preserve the original 4m near-water grid; extend only its outer four rows to the horizon. */
export function riverGeometry(extent: number): PlaneGeometry {
  const geometry=new PlaneGeometry(160,160,40,40);
  const positions=geometry.getAttribute('position');
  const half=Math.max(80,extent/2);
  const stretch=(v:number):number=>Math.abs(v)<=64?v:Math.sign(v)*(64+(Math.abs(v)-64)/16*(half-64));
  for(let i=0;i<positions.count;i++)positions.setXY(i,stretch(positions.getX(i)),stretch(positions.getY(i)));
  positions.needsUpdate=true;geometry.computeBoundingBox();geometry.computeBoundingSphere();
  return geometry;
}

/** 平面反射 + 小振幅解析波。反射 RT 明确拥有并由 Reflector.dispose 释放。 */
export class NightRiver extends Reflector {
  declare material: ShaderMaterial;
  reflectionEnabled = true;
  reflectionCropEnabled = true;
  hullBoundsEnabled = true;
  private readonly clipMatrix = new Matrix4();
  private readonly halfExtent: number;
  constructor(resolution = 512, extent = 160) {
    super(riverGeometry(extent), {
      textureWidth: resolution, textureHeight: resolution, multisample: 0, clipBias: .002,
      color: 0x132b36,
      shader: {
        name: 'FengqiaoNightRiver',
        uniforms: UniformsUtils.merge([UniformsLib.fog, {
          tDiffuse: { value: null }, color: { value: new Color() }, textureMatrix: { value: new Matrix4() },
          time: { value: 0 }, reflectionEnabled: { value: 1 }, hullBoundsEnabled: { value: 1 },
          boatInverse: { value: new Matrix4() },
          moonDirection: { value: new Vector3(.35,1,.45) }, surfaceCalm: { value: 1 },
        }]),
        vertexShader: `
          uniform mat4 textureMatrix;
          uniform float time;
          varying vec4 vMirror;
          varying vec3 vWorld;
          #include <common>
          #include <fog_pars_vertex>
          void main() {
            vMirror=textureMatrix*vec4(position,1.0);
            vec4 world=modelMatrix*vec4(position,1.0);
            world.y+=${amplitude}*sin(world.x*${waveX}+world.z*${waveZ}+time*${speed});
            vWorld=world.xyz;
            vec4 mvPosition=viewMatrix*world;
            gl_Position=projectionMatrix*mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec3 color;
          uniform float time;
          uniform float reflectionEnabled;
          uniform float hullBoundsEnabled;
          uniform mat4 boatInverse;
          uniform vec3 moonDirection;
          uniform float surfaceCalm;
          varying vec4 vMirror;
          varying vec3 vWorld;
          #include <common>
          #include <fog_pars_fragment>
          void main() {
            // Remove the river surface inside the watertight hull footprint.
            vec3 local=(boatInverse*vec4(vWorld,1.0)).xyz;
            // width*hull never exceeds .91 m. Outside this exact bound no
            // fragment can be discarded, so avoid the expensive hull powers.
            if(hullBoundsEnabled<.5 || (local.x> -3.22 && local.x<3.33 && abs(local.z)<.91)) {
              float width=.91*pow(max(.04,1.-pow(local.x/3.50,2.)),.48);
              float height=local.y-.25*pow(abs(local.x)/3.4,3.);
              float hull=height<.08 ? mix(0.,.35,clamp((height-.03)/.05,0.,1.))
                        : height<.28 ? mix(.35,.68,(height-.08)/.20)
                        : height<.70 ? mix(.68,.92,(height-.28)/.42)
                        : mix(.92,1.,clamp((height-.70)/.32,0.,1.));
              if(height>.03 && local.x> -3.22 && local.x<3.33 && abs(local.z)<width*hull) discard;
            }
            float sx=.022*cos(vWorld.x*2.8+vWorld.z*1.6+time*1.15)
                    +.008*cos(vWorld.x*8.-vWorld.z*4.+time*1.9);
            float sz=.020*cos(vWorld.x*2.8+vWorld.z*1.6+time*1.15)
                    -.007*cos(vWorld.x*8.-vWorld.z*4.+time*1.9);
            sx*=surfaceCalm;sz*=surfaceCalm;
            vec3 normal=normalize(vec3(-sx,1.,-sz));
            vec3 eye=normalize(cameraPosition-vWorld);
            float fresnel=.10+.73*pow(1.-max(dot(normal,eye),0.),4.);
            vec2 uv=vMirror.xy/vMirror.w+vec2(sx,sz)*.09;
            vec3 reflected=texture2D(tDiffuse,uv).rgb;
            float ripple=.5+.5*sin(vWorld.x*5.7+vWorld.z*3.8+time*.9);
            vec3 base=color*(.86+.08*ripple*surfaceCalm);
            vec3 outgoing=mix(base,reflected,fresnel*reflectionEnabled);
            float sheen=pow(max(dot(reflect(normalize(-moonDirection),normal),eye),0.),140.);
            outgoing+=vec3(.14,.21,.29)*sheen;
            gl_FragColor=vec4(outgoing,1.);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            #include <fog_fragment>
          }`,
      },
    });
    this.halfExtent=Math.max(80,extent/2);
    this.rotation.x = -Math.PI / 2;
    this.material.fog = true;
    const reflect = this.onBeforeRender.bind(this);
    this.onBeforeRender = (...args) => {
      if (!this.reflectionEnabled) return;
      this.cropReflection(args[2]);
      reflect(...args);
    };
    const releaseReflection = this.dispose.bind(this);
    this.dispose = () => { releaseReflection(); this.geometry.dispose(); };
  }
  private cropReflection(camera: Camera): void {
    const target = this.getRenderTarget();
    target.scissorTest = this.reflectionCropEnabled;
    if (!this.reflectionCropEnabled) return;
    // On the mirror plane the reflected camera preserves projected y and
    // reverses x. Keep the full texture projection and resolution;
    // discard only fragments that cannot be sampled by the water surface.
    this.clipMatrix.copy(camera.projectionMatrix).multiply(camera.matrixWorldInverse).multiply(this.matrixWorld);
    const h=this.halfExtent;
    let polygon = [[-h,-h],[h,-h],[h,h],[-h,h]].map(([x,y])=>new Vector4(x,y,0,1).applyMatrix4(this.clipMatrix));
    // Homogeneous clipping is essential when the plane crosses the camera.
    for (let plane=0;plane<6 && polygon.length;plane++) {
      const distance=(v:Vector4):number=>plane===0?v.w+v.x:plane===1?v.w-v.x:plane===2?v.w+v.y:plane===3?v.w-v.y:plane===4?v.w+v.z:v.w-v.z;
      const clipped: Vector4[] = [];
      let previous=polygon.at(-1)!,a=distance(previous);
      for (const current of polygon) {
        const b=distance(current);
        if ((a>=0)!==(b>=0)) clipped.push(previous.clone().lerp(current,a/(a-b)));
        if (b>=0) clipped.push(current);
        previous=current;a=b;
      }
      polygon=clipped;
    }
    if (polygon.length<3) {target.scissor.set(0,0,1,1);return;}
    let left=1,right=0,bottom=1,top=0;
    for (const v of polygon) {
      const x=.5-v.x/v.w*.5,y=v.y/v.w*.5+.5;
      left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);
    }
    // Distortion reaches <0.003 UV in either axis. Eight texels also cover
    // bilinear filtering and numerical rounding at every supported resolution.
    const pad=Math.max(8,Math.ceil(Math.max(target.width,target.height)*.004));
    const x=Math.max(0,Math.floor(left*target.width)-pad),y=Math.max(0,Math.floor(bottom*target.height)-pad);
    const farX=Math.min(target.width,Math.ceil(right*target.width)+pad),farY=Math.min(target.height,Math.ceil(top*target.height)+pad);
    target.scissor.set(x,y,Math.max(1,farX-x),Math.max(1,farY-y));
  }
  update(time: number, boatInverse: Matrix4): void {
    this.material.uniforms.time.value = time;
    this.material.uniforms.reflectionEnabled.value = this.reflectionEnabled ? 1 : 0;
    this.material.uniforms.hullBoundsEnabled.value = this.hullBoundsEnabled ? 1 : 0;
    this.material.uniforms.boatInverse.value.copy(boatInverse);
  }
  setMoonDirection(direction: Vector3): void { this.material.uniforms.moonDirection.value.copy(direction); }
}
