import { Color, DirectionalLight, FogExp2, HemisphereLight, type Scene } from 'three';
/** Static overcast winter light for the modeling candidate, separate from scene assembly. */
export function winterDaylight(scene:Scene, distantValley=false) {
  const air=distantValley?0x9baeb5:0x799199;
  scene.background=new Color(air);scene.fog=new FogExp2(air,distantValley ? .0048 : .0029);
  const sky=new HemisphereLight(0xd0dce3,0x344b55,1.85);
  const sun=new DirectionalLight(0xd2e1e6,1.7);sun.position.set(-18,38,12);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-64,right:64,top:64,bottom:-64,far:160});
  sun.shadow.bias=-.00015;sun.shadow.normalBias=.018;
  sun.shadow.autoUpdate=false;sun.shadow.needsUpdate=true;
  scene.add(sky,sun,sun.target);return sun;
}
