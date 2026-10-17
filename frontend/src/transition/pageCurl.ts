/** A cylindrical sheet curling from its left edge towards the right-hand spine. */
export function pageCurl(x: number, width: number, progress: number): { x: number; z: number; angle: number } {
  const p = Math.max(0, Math.min(1, progress));
  if (p === 0) return { x, z: 0, angle: 0 };
  if (p === 1) return { x: 2 * width - x, z: 0, angle: Math.PI };
  const eased = .5 - .5 * Math.cos(p * Math.PI);
  const crease = width * eased;
  if (x >= crease) return { x, z: 0, angle: 0 };
  const radius = width * .16 * Math.sin(p * Math.PI);
  const distance = Math.max(0, crease - x);
  const angle = Math.min(Math.PI, distance / radius);
  return {
    x: crease - radius * Math.sin(angle) + Math.max(0, distance - Math.PI * radius),
    z: radius * (1 - Math.cos(angle)),
    angle,
  };
}
