import {
  CanvasTexture,
  Color,
  HalfFloatType,
  LinearFilter,
  Mesh,
  NearestFilter,
  NoColorSpace,
  OrthographicCamera,
  PlaneGeometry,
  RGBAFormat,
  Scene,
  ShaderMaterial,
  UnsignedByteType,
  Vector2,
  WebGLRenderTarget,
  type Texture,
  type WebGLRenderer,
} from 'three';
import fullscreenVertex from '../../shaders/postfx/fullscreen.vert.glsl';
import diffuseFragment from '../../shaders/sim/inkDiffuse.frag.glsl';

export const INK_STEP = 1 / 30;
const SOURCE_DURATION = 3.5;
const GUIDE_SEED = 0.075;

export function stepsForTime(time: number): number {
  if (!Number.isFinite(time) || time <= 0) return 0;
  return Math.floor((time + 1e-9) / INK_STEP);
}

function createInkSource(size: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('无法创建临时书法墨源');

  context.fillStyle = '#000';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#fff';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  const fontSize = Math.round(size * 0.075);
  const poeticFont=getComputedStyle(document.documentElement).getPropertyValue('--font-poetic').trim() || '"KaiTi", "STKaiti", serif';
  context.font = `400 ${fontSize}px ${poeticFont}`;
  const chars = [...'月落乌啼霜满天'];
  const x = size * 0.63;
  const startY = size * 0.23;
  const spacing = size * 0.088;
  chars.forEach((char, index) => context.fillText(char, x, startY + index * spacing));

  // 落笔处的一点湿墨，让字迹与山体引导遮罩之间有连续扩散带。
  const gradient = context.createRadialGradient(x, size * 0.48, 0, x, size * 0.48, size * 0.085);
  gradient.addColorStop(0, 'rgba(255,255,255,0.55)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = NoColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.generateMipmaps = false;
  return texture;
}

function renderTarget(size: number, type: typeof HalfFloatType | typeof UnsignedByteType): WebGLRenderTarget {
  return new WebGLRenderTarget(size, size, {
    type,
    format: RGBAFormat,
    minFilter: NearestFilter,
    magFilter: NearestFilter,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
}

export class InkSim {
  readonly precision: 'half' | 'byte';

  private readonly renderer: WebGLRenderer;
  private readonly source: CanvasTexture;
  private readonly material: ShaderMaterial;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly quad: Mesh<PlaneGeometry, ShaderMaterial>;
  private readTarget: WebGLRenderTarget;
  private writeTarget: WebGLRenderTarget;
  private stepIndex = 0;

  constructor(renderer: WebGLRenderer, guideTexture: Texture, size: number) {
    this.renderer = renderer;
    const halfFloat = renderer.capabilities.isWebGL2 && renderer.extensions.has('EXT_color_buffer_float');
    this.precision = halfFloat ? 'half' : 'byte';
    const type = halfFloat ? HalfFloatType : UnsignedByteType;
    this.readTarget = renderTarget(size, type);
    this.writeTarget = renderTarget(size, type);
    this.source = createInkSource(size);
    this.material = new ShaderMaterial({
      vertexShader: fullscreenVertex,
      fragmentShader: diffuseFragment,
      uniforms: {
        uState: { value: this.readTarget.texture },
        uSource: { value: this.source },
        uGuide: { value: guideTexture },
        uTexel: { value: new Vector2(1 / size, 1 / size) },
        uInject: { value: 1 },
        uGuideSeed: { value: GUIDE_SEED },
        uStepIndex: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    this.quad = new Mesh(new PlaneGeometry(2, 2), this.material);
    this.scene.add(this.quad);
    this.reset();
  }

  get texture(): Texture {
    return this.readTarget.texture;
  }

  get time(): number {
    return this.stepIndex * INK_STEP;
  }

  seekTo(time: number): void {
    const targetStep = stepsForTime(time);
    if (targetStep < this.stepIndex) this.reset();
    while (this.stepIndex < targetStep) this.step();
  }

  reset(): void {
    const previousTarget = this.renderer.getRenderTarget();
    const previousColor = this.renderer.getClearColor(new Color()).clone();
    const previousAlpha = this.renderer.getClearAlpha();
    this.renderer.setClearColor(0x000000, 0);
    for (const target of [this.readTarget, this.writeTarget]) {
      this.renderer.setRenderTarget(target);
      this.renderer.clear(true, false, false);
    }
    this.renderer.setRenderTarget(previousTarget);
    this.renderer.setClearColor(previousColor, previousAlpha);
    this.stepIndex = 0;
    this.material.uniforms.uState.value = this.readTarget.texture;
  }

  dispose(): void {
    this.readTarget.dispose();
    this.writeTarget.dispose();
    this.source.dispose();
    this.quad.geometry.dispose();
    this.material.dispose();
  }

  private step(): void {
    this.material.uniforms.uState.value = this.readTarget.texture;
    this.material.uniforms.uInject.value = this.time < SOURCE_DURATION ? 1 : 0;
    this.material.uniforms.uStepIndex.value = this.stepIndex;
    const previousTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.writeTarget);
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(previousTarget);
    [this.readTarget, this.writeTarget] = [this.writeTarget, this.readTarget];
    this.stepIndex += 1;
  }
}
