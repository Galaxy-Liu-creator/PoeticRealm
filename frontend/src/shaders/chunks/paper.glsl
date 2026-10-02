float paperEdgeFade(vec2 uv) {
  vec2 distanceToEdge = min(uv, 1.0 - uv);
  return smoothstep(0.0, 0.05, min(distanceToEdge.x, distanceToEdge.y));
}

float paperFiber(vec2 uv) {
  float longFiber = valueNoise(vec2(uv.x * 38.0, uv.y * 320.0));
  float shortFiber = valueNoise(vec2(uv.x * 510.0, uv.y * 92.0));
  return longFiber * 0.65 + shortFiber * 0.35;
}
