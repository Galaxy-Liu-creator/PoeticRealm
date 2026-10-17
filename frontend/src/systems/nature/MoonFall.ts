import { CanvasTexture, Color, DirectionalLight, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Scene, SRGBColorSpace, Vector3 } from 'three';

export const moonState = (t: number, duration = 32) => {
  const progress = Math.max(0, Math.min(1, t / duration));
  const eased = progress * progress * (3 - 2 * progress);
  return { progress, height: 118 - 134 * eased, brightness: 1 - .24 * eased, visible: progress < 1 };
};

/** Original lunar disc, tied to the authored western camera direction. */
export class MoonFall {
  private readonly texture: CanvasTexture;
  readonly disc: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly direction: Vector3;
  private readonly lightCenter: Vector3;
  private readonly lightRadius: number;
  constructor(private scene: Scene, root: Object3D, private light: DirectionalLight, private duration = 32) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.createImageData(128,128);
    for (let y=0;y<128;y++) for (let x=0;x<128;x++) {
      const nx=(x-63.5)/62, ny=(y-63.5)/62, r=Math.hypot(nx,ny), i=(y*128+x)*4;
      const maria=.11*Math.sin(nx*7+ny*3)*Math.sin(ny*8-nx*2)+.045*Math.sin(nx*27+ny*17);
      const value=Math.max(.6,Math.min(1,.91+maria-.10*r));
      pixels.data[i]=value*215;pixels.data[i+1]=value*224;pixels.data[i+2]=value*229;
      pixels.data[i+3]=Math.max(0,Math.min(1,(1-r)*64))*255;
    }
    ctx.putImageData(pixels,0,0);this.texture=new CanvasTexture(canvas);this.texture.colorSpace=SRGBColorSpace;
    this.disc=new Mesh(new PlaneGeometry(15,15),new MeshBasicMaterial({map:this.texture,transparent:true,depthWrite:false,toneMapped:false,fog:false}));
    this.disc.name='night_moon';this.disc.renderOrder=-1;
    const camera=root.getObjectByName('CAM_moonset')!, focus=root.getObjectByName('FOCUS_moonset')!;
    this.direction=focus.getWorldPosition(new Vector3()).sub(camera.getWorldPosition(new Vector3()));this.direction.y=0;this.direction.normalize();
    this.lightCenter=light.target.position.clone();this.lightRadius=light.position.distanceTo(this.lightCenter);
    scene.add(this.disc);
  }
  update(t: number): void {
    const state=moonState(t,this.duration);
    this.disc.position.copy(this.direction).multiplyScalar(600);this.disc.position.y=state.height;
    this.disc.lookAt(0,0,0);this.disc.visible=state.visible;
    this.disc.material.opacity=Math.max(0,Math.min(1,(this.duration-t)/5));
    this.disc.material.color.copy(new Color(0xe5eef5)).multiplyScalar(state.brightness);
    // Keep light above the horizon after the visible moon sets; twilight remains readable.
    const lightDirection=this.disc.position.clone().normalize();lightDirection.y=Math.max(.12,lightDirection.y);lightDirection.normalize();
    this.light.position.copy(this.lightCenter).addScaledVector(lightDirection,this.lightRadius);
    this.light.intensity=1.9*state.brightness;
    this.scene.backgroundIntensity=state.brightness;this.scene.environmentIntensity=.85+.15*state.brightness;
  }
  details(t: number) { return {...moonState(t,this.duration),position:this.disc.position.toArray(),lightDirection:this.light.position.clone().sub(this.light.target.position).normalize().toArray()}; }
  dispose(): void { this.disc.removeFromParent();this.disc.geometry.dispose();this.disc.material.dispose();this.texture.dispose(); }
}
