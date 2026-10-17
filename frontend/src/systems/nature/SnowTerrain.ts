import { Color, Float32BufferAttribute, Mesh, MeshStandardMaterial, PlaneGeometry, type Texture } from 'three';
import type { HeightmapAsset } from '../../engine/Assets';

/** Preserve the authored metres and river corridor; upward slopes retain snow. */
export function snowTerrain(asset: HeightmapAsset, surface?:{rock:Texture;snow:Texture}) {
  const {meta,heightTexture}=asset,heights=heightTexture.image.data as Float32Array,n=meta.resolution;
  const geometry=new PlaneGeometry(...meta.size,144,144);geometry.rotateX(-Math.PI/2);
  const position=geometry.getAttribute('position');
  for(let i=0;i<position.count;i++) {
    const ix=Math.round((position.getX(i)/meta.size[0]+.5)*(n-1));
    const iy=Math.round((.5-position.getZ(i)/meta.size[1])*(n-1));
    position.setY(i,heights[Math.max(0,Math.min(n-1,iy))*n+Math.max(0,Math.min(n-1,ix))]);
  }
  geometry.computeVertexNormals();geometry.computeBoundingSphere();
  const normal=geometry.getAttribute('normal'),colors=[],snow=new Color(0xc6d7d9),rock=new Color(0x455b60);
  for(let i=0;i<position.count;i++) {
    const slope=Math.max(0,Math.min(1,(normal.getY(i)-.48)/.32));
    const color=rock.clone().lerp(snow,slope*slope*(3-2*slope));
    const grain=.94+.06*Math.sin(position.getX(i)*.13+position.getZ(i)*.09);
    colors.push(color.r*grain,color.g*grain,color.b*grain);
  }
  geometry.setAttribute('color',new Float32BufferAttribute(colors,3));
  const material=new MeshStandardMaterial({vertexColors:!surface,roughness:.95,metalness:0,map:surface?.rock??null});
  if(surface) {
    material.customProgramCacheKey=()=> 'jiangxue-snow-terrain-v02';
    material.onBeforeCompile=shader=>{
      shader.uniforms.jxSnowMap={value:surface.snow};
      const vary='varying vec3 vJxPosition; varying vec3 vJxNormal;';
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vary)
        .replace('#include <project_vertex>','vJxPosition=(modelMatrix*vec4(transformed,1.0)).xyz;vJxNormal=normalize(mat3(modelMatrix)*objectNormal);\n#include <project_vertex>');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+vary+`\n
        uniform sampler2D jxSnowMap;
        float jxHash(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
        float jxNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(jxHash(i),jxHash(i+vec2(1,0)),f.x),mix(jxHash(i+vec2(0,1)),jxHash(i+vec2(1,1)),f.x),f.y);}
        vec3 jxSurface(sampler2D tex,vec3 p,vec3 n) {
          vec2 uv=p.xz;
          if(n.x>n.y&&n.x>n.z)uv=p.yz;else if(n.z>n.y)uv=p.xy;
          return texture2D(tex,fract(uv)).rgb;
        }
      `)
        .replace('#include <map_fragment>',`
          vec3 jxN=normalize(vJxNormal);
          vec3 weights=abs(jxN);
          vec2 drift=vJxPosition.xz*.19+vJxPosition.y*.13;
          float grain=(jxNoise(drift)*.7+jxNoise(drift*3.3)*.3-.5)*.42;
          float coverage=smoothstep(.82,.90,jxN.y+grain);
          vec3 rockColor=jxSurface(map,vJxPosition/7.0,weights)*.72;
          vec3 snowColor=jxSurface(jxSnowMap,vJxPosition/2.0,weights);
          diffuseColor.rgb*=mix(rockColor,snowColor,coverage);
        `);
    };
  }
  const mesh=new Mesh(geometry,material);mesh.name='jiangxue_snow_terrain';mesh.receiveShadow=true;
  return {mesh,dispose:()=>{mesh.removeFromParent();geometry.dispose();material.dispose();}};
}
