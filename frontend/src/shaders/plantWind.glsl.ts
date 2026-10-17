/** One displacement function is injected into both surface and depth programs. */
export const plantWindHeader = /* glsl */`
attribute vec4 behaviorMask;
uniform float plantWindTime;
uniform float plantWindAmp;
uniform float plantWindFreq;
uniform float plantWindPhase;
uniform float plantWindHeight;
vec2 poeticPlantWind(vec3 point, vec4 mask) {
  if (plantWindAmp == 0.0 || mask.r == 0.0) return vec2(0.0);
  vec3 world = (modelMatrix * vec4(point, 1.0)).xyz;
  float phase = dot(world.xz, vec2(0.13, 0.09)) + plantWindPhase + mask.g * 3.13;
  float wave = sin(plantWindTime * plantWindFreq + phase)
             + 0.25 * sin(plantWindTime * plantWindFreq * 2.17 + phase * 1.43);
  float amount = plantWindAmp * wave;
  return vec2(amount * mask.r, 2.0 * amount * sqrt(max(mask.r, 0.0)) / plantWindHeight);
}
`;
export const plantWindPosition = /* glsl */`
#include <begin_vertex>
transformed.x += plantWindBend.x;
transformed.z += plantWindBend.x * 0.37;
`;
export const plantWindNormal = /* glsl */`
#include <beginnormal_vertex>
vec2 plantWindBend = poeticPlantWind(position, behaviorMask);
objectNormal.y -= plantWindBend.y * (objectNormal.x + objectNormal.z * 0.37);
`;
