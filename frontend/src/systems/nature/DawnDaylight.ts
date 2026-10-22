import { BackSide, Color, DirectionalLight, FogExp2, HemisphereLight, Mesh, ShaderMaterial, SphereGeometry, type Scene, type Vector3 } from 'three';

/** A shared procedural dawn sky. Clouds and illumination read the scene clock. */
export function dawnDaylight(scene:Scene) {
  scene.background=new Color(0xc5c3b2);scene.fog=new FogExp2(0xc5c3b2,.0027);
  const fill=new HemisphereLight(0xf0e5cf,0x344d3b,2.1);
  const sun=new DirectionalLight(0xffdfb1,2.8);sun.position.set(-120,220,-170);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-135,right:135,top:135,bottom:-135,far:600,near:1});sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
  const geometry=new SphereGeometry(1500,32,16);
  const material=new ShaderMaterial({side:BackSide,depthWrite:false,uniforms:{time:{value:0}},
    vertexShader:`varying vec3 direction;void main(){direction=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
    fragmentShader:`precision highp float;varying vec3 direction;uniform float time;
      float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 d=normalize(direction);float h=max(d.y,0.);vec3 horizon=vec3(.89,.64,.46),upper=vec3(.40,.57,.72);vec3 color=mix(horizon,upper,smoothstep(0.,.48,h));
        vec2 uv=d.xz/(.20+abs(d.y))*1.9+vec2(time*.002,0);float n=noise(uv)+.48*noise(uv*2.13)+.22*noise(uv*4.31);
        float clouds=smoothstep(.48,.98,n)*smoothstep(.005,.09,h)*(1.-smoothstep(.5,.81,h));vec3 cloud=mix(vec3(.68,.43,.45),vec3(1.,.78,.58),smoothstep(.7,1.3,n));color=mix(color,cloud,clouds*.88);
        vec3 sun=normalize(vec3(-.12,.13,-1.));float glow=pow(max(dot(d,sun),0.),24.);color+=vec3(.19,.12,.035)*glow;float disk=smoothstep(.99965,.99987,dot(d,sun));color=mix(color,vec3(1.,.92,.68),disk*.85);
        gl_FragColor=vec4(color,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`});
  const sky=new Mesh(geometry,material);sky.frustumCulled=false;sky.name='dawn_sky';scene.add(fill,sun,sun.target,sky);
  return {sun,update:(t:number,camera:Vector3)=>{material.uniforms.time.value=t;sky.position.copy(camera);},dispose:()=>{sky.removeFromParent();fill.removeFromParent();sun.removeFromParent();sun.target.removeFromParent();sun.shadow.dispose();geometry.dispose();material.dispose();}};
}
