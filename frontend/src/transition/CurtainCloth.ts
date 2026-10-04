import {
  DoubleSide, LinearFilter, Mesh, OrthographicCamera, PlaneGeometry,
  Scene, ShaderMaterial, SRGBColorSpace, Texture, WebGLRenderer,
} from 'three';
import { CURTAIN_COMPACT_HEIGHT, CURTAIN_COMPACT_WIDTH, CURTAIN_CORNER_HEIGHT, CURTAIN_CORNER_TEXTURE_WIDTH, CURTAIN_CORNER_WIDTH, CURTAIN_FABRIC_HEIGHT } from './CurtainDrape';

// The bottom leads a diagonal sideward gather; the top follows into the hanging corners.
// The two halves share a texture and timing, so the original closed image stays continuous.
const vertexShader = `
  uniform float uTime;
  uniform float uSide;
  uniform float uWidth;
  uniform float uHeight;
  varying vec2 vTexture;
  varying float vFold;
  varying float vGather;
  varying vec2 vCloth;
  varying float vOpening;
  void main() {
    float along = uv.x;
    float height = uv.y;
    float lag = 0.32 * height;
    float pull = smoothstep(0.0, 1.0, clamp((uTime - lag) / (1.0 - lag), 0.0, 1.0));
    float tension = sin(pull * 3.14159265);
    float phase = along * 50.26548246 + 0.4 * sin(height * 4.0 + pull * 5.0) * tension;
    float fold = sin(phase);
    float depth = 0.032 * tension * sin(along * 3.14159265);
    float ripple = 0.006 * tension * fold * sin(along * 3.14159265);
    float width = mix(1.0, uWidth, pull);
    float x = uSide * (1.0 - along * width - ripple);
    float length = mix(1.0, uHeight, pull);
    float sag = 0.045 * tension * sin(along * 3.14159265) * pow(1.0 - height, 3.0);
    float y = 1.0 - 2.0 * (1.0 - height) * length - sag;
    float textureY = ${1 - CURTAIN_FABRIC_HEIGHT} + height * ${CURTAIN_FABRIC_HEIGHT};
    gl_Position = projectionMatrix * modelViewMatrix * vec4(x, y, fold * depth, 1.0);
    float textureAlong = along * 0.5 * mix(1.0, ${CURTAIN_CORNER_TEXTURE_WIDTH}, smoothstep(0.65, 1.0, uTime));
    vTexture = vec2(uSide < 0.0 ? textureAlong : 1.0 - textureAlong, textureY);
    vFold = cos(phase);
    vGather = tension;
    vCloth = vec2(along, height);
    vOpening = smoothstep(0.0, 1.0, uTime);
  }
`;
const fragmentShader = `
  uniform sampler2D uTexture;
  varying vec2 vTexture;
  varying float vFold;
  varying float vGather;
  varying vec2 vCloth;
  varying float vOpening;
  void main() {
    float edge = mix(1.0, 0.05 + 0.95 * vCloth.y * vCloth.y, smoothstep(0.55, 1.0, vOpening));
    if (vCloth.x > edge) discard;
    vec4 fabric = texture2D(uTexture, vTexture);
    // Restrained directional light on compressed pleats, without changing the closed artwork.
    float light = mix(1.0, 0.87 + 0.13 * vFold, vGather);
    gl_FragColor = vec4(fabric.rgb * light, fabric.a);
    #include <colorspace_fragment>
  }
`;

export class CurtainCloth {
  private renderer: WebGLRenderer;
  private scene = new Scene();
  private camera = new OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  private geometry = new PlaneGeometry(2, 2, 64, 28);
  private texture: Texture;
  private materials: ShaderMaterial[] = [];
  private resizeObserver: ResizeObserver;
  private disposed = false;

  constructor(private host: HTMLElement, image: HTMLImageElement) {
    this.renderer = new WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.domElement.className = 'curtain-cloth';
    this.camera.position.z = 3;
    this.texture = new Texture(image);
    this.texture.colorSpace = SRGBColorSpace;
    this.texture.minFilter = LinearFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    for (const side of [-1, 1]) {
      const material = new ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uSide: { value: side }, uWidth: { value: CURTAIN_CORNER_WIDTH }, uHeight: { value: CURTAIN_CORNER_HEIGHT }, uTexture: { value: this.texture } },
        vertexShader, fragmentShader, side: DoubleSide, transparent: true, forceSinglePass: true,
      });
      this.materials.push(material);
      const mesh = new Mesh(this.geometry, material);
      mesh.frustumCulled = false;
      this.scene.add(mesh);
    }
    this.resize();
    this.render(0);
    this.host.append(this.renderer.domElement);
    this.resizeObserver = new ResizeObserver(() => { this.resize(); this.render(this.materials[0]!.uniforms.uTime!.value); });
    this.resizeObserver.observe(this.host);
  }
  private resize(): void {
    const compact = this.host.clientWidth <= 759;
    this.materials.forEach((material) => {
      material.uniforms.uWidth!.value = compact ? CURTAIN_COMPACT_WIDTH : CURTAIN_CORNER_WIDTH;
      material.uniforms.uHeight!.value = compact ? CURTAIN_COMPACT_HEIGHT : CURTAIN_CORNER_HEIGHT;
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25, 1600 / this.host.clientWidth, 1000 / this.host.clientHeight));
    this.renderer.setSize(this.host.clientWidth, this.host.clientHeight, false);
  }
  render(progress: number): void {
    if (this.disposed) return;
    this.materials.forEach((material) => { material.uniforms.uTime!.value = progress; });
    this.renderer.render(this.scene, this.camera);
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.resizeObserver.disconnect();
    this.geometry.dispose();
    this.materials.forEach((material) => material.dispose());
    this.texture.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
