precision highp float;

uniform sampler2D uHeightMap;
uniform sampler2D uInkMask;
uniform vec2 uTerrainSize;
uniform vec2 uTexel;
uniform float uGrow;
uniform float uMaskChannel;

varying vec2 vUv;
varying vec3 vWorldNormal;
varying float vHeight;
varying float vInk;

#include "../chunks/noise.glsl"
#include "../chunks/paper.glsl"

float grownHeight(vec2 sampleUv) {
  float sourceHeight = texture2D(uHeightMap, sampleUv).r;
  vec4 maskSample = texture2D(uInkMask, sampleUv);
  float mask = mix(maskSample.r, maskSample.b, uMaskChannel);
  float ink = smoothstep(0.08, 0.72, mask);
  return sourceHeight * uGrow * ink * paperEdgeFade(sampleUv);
}

void main() {
  vUv = uv;
  vHeight = texture2D(uHeightMap, uv).r;
  vec4 maskSample = texture2D(uInkMask, uv);
  vInk = mix(maskSample.r, maskSample.b, uMaskChannel);

  float center = grownHeight(uv);
  float left = grownHeight(uv - vec2(uTexel.x, 0.0));
  float right = grownHeight(uv + vec2(uTexel.x, 0.0));
  float down = grownHeight(uv - vec2(0.0, uTexel.y));
  float up = grownHeight(uv + vec2(0.0, uTexel.y));

  vec3 tangentX = vec3(uTexel.x * uTerrainSize.x * 2.0, 0.0, right - left);
  vec3 tangentY = vec3(0.0, uTexel.y * uTerrainSize.y * 2.0, up - down);
  vec3 localNormal = normalize(cross(tangentX, tangentY));

  vec3 transformed = position;
  transformed.z += center;
  vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
}
