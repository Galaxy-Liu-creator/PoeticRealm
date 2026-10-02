#include "./noise.glsl"

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
  for (int octave = 0; octave < 5; octave += 1) {
    value += amplitude * valueNoise(p);
    p = rotation * p * 2.03 + 13.7;
    amplitude *= 0.5;
  }
  return value;
}
