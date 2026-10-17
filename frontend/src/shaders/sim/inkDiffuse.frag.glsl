precision highp float;

uniform sampler2D uState;
uniform sampler2D uSource;
uniform sampler2D uGuide;
uniform vec2 uTexel;
uniform float uInject;
uniform float uGuideSeed;
uniform float uStepIndex;

varying vec2 vUv;

#include "../chunks/noise.glsl"

void main() {
  vec4 state = texture2D(uState, vUv);
  vec4 left = texture2D(uState, vUv - vec2(uTexel.x, 0.0));
  vec4 right = texture2D(uState, vUv + vec2(uTexel.x, 0.0));
  vec4 down = texture2D(uState, vUv - vec2(0.0, uTexel.y));
  vec4 up = texture2D(uState, vUv + vec2(0.0, uTexel.y));
  vec4 neighbors = (left + right + down + up) * 0.25;

  float guide = texture2D(uGuide, vUv).r;
  float fibers = 0.58 + valueNoise(vUv * vec2(92.0, 630.0) + uStepIndex * 0.0007) * 0.42;
  float permeability = mix(0.22, 1.0, guide) * fibers;

  float water = mix(state.r, neighbors.r, 0.19 * permeability);
  float mobileInk = mix(state.g, neighbors.g, 0.14 * permeability);
  float depositedInk = state.b;

  float calligraphy = texture2D(uSource, vUv).r * uInject;
  float guidedSeed = guide * uGuideSeed;
  float freshInk = max(calligraphy, guidedSeed);
  water = max(water, freshInk);
  mobileInk = max(mobileInk, freshInk * 0.92);

  float wetEdge = clamp(abs(water - neighbors.r) * 5.5, 0.0, 1.0);
  float settling = 0.012 + wetEdge * 0.055 + (1.0 - water) * 0.018;
  float settled = min(mobileInk, mobileInk * settling);
  mobileInk -= settled;
  depositedInk = min(1.0, depositedInk + settled * (0.8 + wetEdge * 0.7));
  water *= 0.994;

  gl_FragColor = vec4(
    clamp(water, 0.0, 1.0),
    clamp(mobileInk, 0.0, 1.0),
    clamp(depositedInk, 0.0, 1.0),
    1.0
  );
}
