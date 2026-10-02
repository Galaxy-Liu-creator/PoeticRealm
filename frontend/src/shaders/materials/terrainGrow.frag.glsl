precision highp float;

uniform vec2 uHeightRange;
uniform float uWaterLevel;
uniform float uGrow;
uniform float uColorize;
uniform vec3 uPaperColor;
uniform vec3 uInkColor;
uniform vec3 uLowColor;
uniform vec3 uHighColor;
uniform vec3 uWaterColor;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying float vHeight;
varying float vInk;

#include "../chunks/fbm.glsl"
#include "../chunks/paper.glsl"

void main() {
  float ink = smoothstep(0.04, 0.78, vInk) * paperEdgeFade(vUv);
  float altitude = clamp((vHeight - uHeightRange.x) / (uHeightRange.y - uHeightRange.x), 0.0, 1.0);
  float grain = paperFiber(vUv) * 0.035 + fbm(vUv * 18.0) * 0.018;

  vec3 inkedPaper = mix(uPaperColor, uInkColor, ink * (0.78 + grain));
  vec3 landscape = mix(uLowColor, uHighColor, smoothstep(0.08, 0.9, altitude));
  float water = 1.0 - smoothstep(uWaterLevel, uWaterLevel + 2.5, vHeight);
  landscape = mix(landscape, uWaterColor, water * uGrow);
  vec3 base = mix(inkedPaper, landscape, uColorize * ink * uGrow);

  vec3 lightDirection = normalize(vec3(-0.42, 0.82, 0.38));
  float diffuse = max(dot(normalize(vWorldNormal), lightDirection), 0.0);
  float tonalLight = 0.64 + floor(diffuse * 4.0) / 4.0 * 0.36;
  base *= mix(1.0, tonalLight, uGrow * ink);
  base += (grain - 0.026) * vec3(0.75, 0.68, 0.55);

  gl_FragColor = vec4(base, 1.0);
}
