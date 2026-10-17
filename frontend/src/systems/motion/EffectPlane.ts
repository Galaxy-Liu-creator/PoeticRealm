import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, Vector2, WebGLRenderer } from 'three';
import fragmentShader from '../../shaders/materials/presentation.frag.glsl';

/** One draw call, no textures, bounded resolution. DOM owns content and accessibility. */
export class EffectPlane {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private geometry = new PlaneGeometry(2, 2);
  private material: ShaderMaterial;
  constructor(readonly canvas: HTMLCanvasElement, mode: number) {
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
    this.renderer.setClearColor(0, 0);
    this.material = new ShaderMaterial({
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader, transparent: true, depthTest: false, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uProgress: { value: 0 }, uMode: { value: mode }, uSize: { value: new Vector2(1,1) } },
    });
    this.scene.add(new Mesh(this.geometry, this.material));
  }
  render(t: number, progress = 0): void {
    const width = Math.max(1, this.canvas.clientWidth), height = Math.max(1, this.canvas.clientHeight);
    const size = this.material.uniforms.uSize!.value as Vector2;
    if (size.x !== width || size.y !== height) {
      size.set(width,height);
      const scale=Math.min(1,1920/width,1080/height);
      this.renderer.setSize(Math.round(width*scale),Math.round(height*scale),false);
    }
    this.material.uniforms.uTime!.value = t;
    this.material.uniforms.uProgress!.value = progress;
    this.renderer.render(this.scene,this.camera);
  }
  dispose(): void {
    this.geometry.dispose(); this.material.dispose(); this.renderer.dispose(); this.renderer.forceContextLoss(); this.canvas.remove();
  }
}
