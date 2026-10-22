import {
  AlwaysDepth, BufferAttribute, BufferGeometry, Color, DepthTexture, DoubleSide, FramebufferTexture, MeshDepthMaterial,
  Mesh, NearestFilter, ShaderMaterial, UnsignedIntType, Vector2, WebGLRenderTarget,
  type Camera, type Object3D, type Scene, type WebGLRenderer,
} from 'three';

type Phase='idle'|'capture'|'depth'|'composite'|'reflection';
/** Native display color/depth; capture retains the original PBR output transform; original shadow and reflection passes remain live. */
export class CanyonFrameCache {
  private readonly target=new WebGLRenderTarget(1,1,{minFilter:NearestFilter,magFilter:NearestFilter,depthBuffer:true});
  private color=new FramebufferTexture(1,1);
  private readonly depthMaterial=new MeshDepthMaterial({colorWrite:false,side:DoubleSide});
  private readonly size=new Vector2();
  private readonly clear=new Color();
  private readonly geometry=new BufferGeometry();
  private readonly material:ShaderMaterial;
  private readonly quad:Mesh;
  private readonly hooks=new Map<Mesh,{before:Mesh['onBeforeRender'];after:Mesh['onAfterRender'];range?:{start:number;count:number}}>();
  private phase:Phase='idle';
  private pose:number[]=[];
  private key='';
  private valid=false;
  private enabled=true;
  private bypassed=false;
  private hits=0;
  private misses=0;
  private staticCount=0;
  private disposed=false;
  constructor(private readonly renderer:WebGLRenderer,private readonly scene:Scene,staticObjects:Object3D[],dynamics:Object3D[],water:Mesh) {
    this.target.depthTexture=new DepthTexture(1,1,UnsignedIntType);
    this.target.samples=renderer.getContext().getContextAttributes()?.antialias?4:0;
    this.geometry.setAttribute('position',new BufferAttribute(new Float32Array([-1,-1,0,3,-1,0,-1,3,0]),3));
    this.material=new ShaderMaterial({depthTest:true,depthWrite:true,depthFunc:AlwaysDepth,toneMapped:false,
      uniforms:{image:{value:this.color},depth:{value:this.target.depthTexture}},
      vertexShader:'varying vec2 vCachedUv;void main(){vCachedUv=position.xy*.5+.5;gl_Position=vec4(position,1.);}',
      fragmentShader:`uniform sampler2D image;uniform sampler2D depth;varying vec2 vCachedUv;
        void main(){float z=texture2D(depth,vCachedUv).r;if(z>=1.)discard;
          gl_FragColor=texture2D(image,vCachedUv);gl_FragDepth=z;
        }`});
    this.quad=new Mesh(this.geometry,this.material);this.quad.name='canyon_cached_color_depth';
    this.quad.frustumCulled=false;this.quad.renderOrder=-1000000;this.quad.visible=false;scene.add(this.quad);
    const dynamic=(o:Object3D)=>{for(let p:Object3D|null=o;p;p=p.parent)if(dynamics.includes(p))return true;return false;};
    const meshes=new Set<Mesh>();
    for(const root of [...staticObjects,...dynamics])root.traverse(o=>{if(o instanceof Mesh)meshes.add(o);});
    for(const mesh of meshes){
      const moving=dynamic(mesh);if(!moving)this.staticCount++;
      const hook={before:mesh.onBeforeRender,after:mesh.onAfterRender,range:undefined as {start:number;count:number}|undefined};this.hooks.set(mesh,hook);
      mesh.onBeforeRender=(...args)=>{
        // WebGLRenderer already built the complete shadow map. Suppress only
        // redundant color draws, after the shadow pass, and restore immediately.
        if((this.phase==='capture'||this.phase==='depth')&&moving||this.phase==='composite'&&!moving){
          hook.range={...mesh.geometry.drawRange};mesh.geometry.setDrawRange(0,0);return;
        }
        if(mesh===water&&this.phase==='composite'){
          this.phase='reflection';this.quad.visible=false;
          try{hook.before.apply(mesh,args);}finally{this.phase='composite';this.quad.visible=true;}
        }else hook.before.apply(mesh,args);
      };
      mesh.onAfterRender=(...args)=>{if(hook.range){mesh.geometry.setDrawRange(hook.range.start,hook.range.count);hook.range=undefined;}else hook.after.apply(mesh,args);};
    }
  }
  setEnabled(value:boolean):void {if(value!==this.enabled)this.valid=false;this.enabled=value;}
  render(camera:Camera,key:string,useCache=true):void {
    if(this.disposed)return;
    const r=this.renderer;
    this.bypassed=!useCache;
    if(!this.enabled||!useCache||r.getRenderTarget()!==null){r.render(this.scene,camera);return;}
    r.getDrawingBufferSize(this.size);
    // Refresh before comparing: the normal renderer would update it after this cache decision.
    camera.updateWorldMatrix(true,false);
    const pose=[...camera.matrixWorld.elements,...camera.projectionMatrix.elements];
    const changed=!this.valid||key!==this.key||pose.some((v,i)=>v!==this.pose[i])||this.target.width!==this.size.x||this.target.height!==this.size.y;
    const background=this.scene.background,override=this.scene.overrideMaterial,autoClear=r.autoClear,target=r.getRenderTarget(),alpha=r.getClearAlpha();r.getClearColor(this.clear);
    try {
      if(changed){
        if(this.target.width!==this.size.x||this.target.height!==this.size.y){
          this.target.setSize(this.size.x,this.size.y);this.color.dispose();this.color=new FramebufferTexture(this.size.x,this.size.y);this.material.uniforms.image.value=this.color;
        }
        // Capture actual display bytes so fog, ACES and sRGB run exactly once.
        this.phase='capture';this.quad.visible=false;r.autoClear=true;r.setRenderTarget(target);r.render(this.scene,camera);r.copyFramebufferToTexture(this.color);
        // A bounded depth-only pass uses the same opaque geometry and sides.
        this.phase='depth';this.scene.background=null;this.scene.overrideMaterial=this.depthMaterial;r.setRenderTarget(this.target);r.render(this.scene,camera);
        this.scene.overrideMaterial=override;
        this.pose=pose;this.key=key;this.valid=true;this.misses++;
      }else this.hits++;
      this.phase='composite';this.quad.visible=true;this.scene.background=background;this.scene.overrideMaterial=override;r.autoClear=autoClear;r.setClearColor(this.clear,alpha);r.setRenderTarget(target);
      r.render(this.scene,camera);
    }finally{
      this.phase='idle';this.quad.visible=false;
      for(const [mesh,hook] of this.hooks)if(hook.range){mesh.geometry.setDrawRange(hook.range.start,hook.range.count);hook.range=undefined;}
      this.scene.background=background;this.scene.overrideMaterial=override;r.autoClear=autoClear;r.setClearColor(this.clear,alpha);r.setRenderTarget(target);
    }
  }
  details(){return {enabled:this.enabled,bypassed:this.bypassed,valid:this.valid,hits:this.hits,misses:this.misses,width:this.target.width,height:this.target.height,staticMeshes:this.staticCount};}
  dispose():void {
    if(this.disposed)return;this.disposed=true;
    for(const [mesh,hook] of this.hooks){if(hook.range)mesh.geometry.setDrawRange(hook.range.start,hook.range.count);mesh.onBeforeRender=hook.before;mesh.onAfterRender=hook.after;}
    this.hooks.clear();this.quad.removeFromParent();this.target.dispose();this.color.dispose();this.depthMaterial.dispose();this.geometry.dispose();this.material.dispose();
  }
}
