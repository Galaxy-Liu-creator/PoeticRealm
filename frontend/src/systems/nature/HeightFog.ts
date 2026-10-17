import { Color, DoubleSide, Material, Mesh, MeshStandardMaterial, Object3D, PlaneGeometry, Scene, ShaderMaterial, Vector3 } from 'three';

/** Height-weighted optical depth, shared by the main view, reflected objects and water. */
export class HeightFog {
  private readonly materials = new Set<Material>();
  private readonly restores: (()=>void)[]=[];
  private readonly geometry = new PlaneGeometry(1,1);
  private readonly mist: ShaderMaterial;
  private readonly cards: Mesh[]=[];
  private readonly enabled={value:1};
  constructor(scene: Scene, root: Object3D, water: Material) {
    this.mist=new ShaderMaterial({transparent:true,depthWrite:false,side:DoubleSide,forceSinglePass:true,uniforms:{time:{value:0},color:{value:new Color(0x738b99)}},
      vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:`varying vec2 vUv;uniform float time;uniform vec3 color;
        void main(){vec2 p=vUv*2.-1.;float edge=pow(max(0.,1.-dot(p,p)),2.);if(edge==0.)discard;
          float folds=.55+.2*sin(p.x*9.+time*.13+sin(p.y*5.))+.15*sin(p.x*17.-p.y*7.-time*.09);
          gl_FragColor=vec4(color,edge*folds*.13);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`});
    const centers=[root.getObjectByName('FOCUS_riverbank')!,root.getObjectByName('FOCUS_bridge')!,root.getObjectByName('EMIT_bell')!];
    for(let i=0;i<centers.length;i++) {
      const card=new Mesh(this.geometry,this.mist);card.name='low_mist_'+i;
      card.position.copy(centers[i].getWorldPosition(new Vector3()));
      card.position.y=1.1+i*.28;card.scale.set(42,24,1);card.rotation.x=-Math.PI/2;card.renderOrder=2;scene.add(card);this.cards.push(card);
    }
    root.traverse(object=>{if(object instanceof Mesh) for(const material of Array.isArray(object.material)?object.material:[object.material]) if(material instanceof MeshStandardMaterial)this.attach(material);});
    this.attach(water);
  }
  attach(material: Material): void {
    if(this.materials.has(material))return;this.materials.add(material);
    const compile=material.onBeforeCompile,key=material.customProgramCacheKey;
    material.onBeforeCompile=(shader,renderer)=>{
      compile.call(material,shader,renderer);shader.uniforms.nightFogEnabled=this.enabled;
      const world=material instanceof ShaderMaterial ? 'vNightWorld=vWorld;' : `
        vec4 nightPosition=vec4(transformed,1.);
        #ifdef USE_INSTANCING
          nightPosition=instanceMatrix*nightPosition;
        #endif
        vNightWorld=(modelMatrix*nightPosition).xyz;`;
      // Height density varies smoothly across the authored geometry. Evaluate it
      // at vertices; retain per-pixel distance attenuation, including on the river.
      shader.vertexShader='varying vec3 vNightWorld;varying float vNightFogDensity;\n'+shader.vertexShader.replace('#include <fog_vertex>','#include <fog_vertex>\n'+world+'\nvNightFogDensity=.0025+.028*exp(-max(0.,(vNightWorld.y+abs(cameraPosition.y))*.5)/4.5);');
      shader.fragmentShader='varying vec3 vNightWorld;varying float vNightFogDensity;uniform float nightFogEnabled;\n'+shader.fragmentShader.replace('#include <fog_fragment>',`
        #ifdef USE_FOG
          float nightDistance=length(vNightWorld-cameraPosition);
          float nightDepth=nightDistance*vNightFogDensity;
          float nightFog=(1.-exp(-nightDepth))*nightFogEnabled;
          gl_FragColor.rgb=mix(gl_FragColor.rgb,fogColor,nightFog);
        #endif`);
    };
    material.customProgramCacheKey=()=>key.call(material)+'-night-height-fog-v2';material.needsUpdate=true;
    this.restores.push(()=>{material.onBeforeCompile=compile;material.customProgramCacheKey=key;});
  }
  update(t:number):void { this.mist.uniforms.time.value=t; }
  setEnabled(enabled:boolean):void { this.enabled.value=Number(enabled);for(const card of this.cards)card.visible=enabled; }
  details() {return {enabled:!!this.enabled.value,cards:this.cards.length,materials:this.materials.size,time:this.mist.uniforms.time.value};}
  dispose():void {for(const restore of this.restores)restore();for(const card of this.cards)card.removeFromParent();this.geometry.dispose();this.mist.dispose();}
}
