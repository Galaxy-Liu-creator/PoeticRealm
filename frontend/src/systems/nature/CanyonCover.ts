import {Mesh,MeshStandardMaterial,type Object3D} from 'three';

/** Sparse ground cover on upward rock shoulders, using existing authored normals. */
export function applyCanyonCover(root:Object3D,refined=false) {
  const used=new Set<MeshStandardMaterial>();
  root.traverse(object=>{if(object instanceof Mesh)for(const material of Array.isArray(object.material)?object.material:[object.material]){
    if(!(material instanceof MeshStandardMaterial)||!['pbr_rock__bdwall',...(refined?['pbr_foliage__bdcanopy','pbr_foliage__bdtips']:[])].includes(material.name)||used.has(material))continue;
    used.add(material);const compile=material.onBeforeCompile;
    material.customProgramCacheKey=()=> 'baidicheng-cover-'+(refined?'v02-':'v01-')+material.name;
    material.onBeforeCompile=(shader,renderer)=>{
      compile.call(material,shader,renderer);
      const vary='varying vec3 bdPosition;varying vec3 bdNormal;';
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+vary).replace('#include <project_vertex>','bdPosition=(modelMatrix*vec4(transformed,1.)).xyz;bdNormal=normalize(mat3(modelMatrix)*objectNormal);\n#include <project_vertex>');
      const foliage=material.name.startsWith('pbr_foliage');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+vary).replace('#include <map_fragment>',foliage?`#include <map_fragment>
        float dapple=sin(bdPosition.x*7.3+sin(bdPosition.z*11.))*sin(bdPosition.y*9.1+bdPosition.z*5.8);
        diffuseColor.rgb*=.80+.20*smoothstep(-.3,.65,dapple);
      `:`#include <map_fragment>
        float cover=smoothstep(.57,.87,normalize(bdNormal).y)*smoothstep(1.,5.,bdPosition.y);
        float variation=.80+.20*sin(bdPosition.x*.16)*sin(bdPosition.z*.19);
        diffuseColor.rgb*=mix(vec3(1.),vec3(.38,.92,.31)*variation,cover*.93);
      `);
    };
  }});
}
