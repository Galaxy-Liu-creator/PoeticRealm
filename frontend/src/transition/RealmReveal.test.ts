import { describe, expect, it } from 'vitest';
import { burnClip, burnRadius, realmDuration } from './RealmReveal';
describe('paper reveal coverage',()=>{
  it.each([[1920,1080],[1440,900],[900,1440]])('keeps endpoints complete at %i×%i',(w,h)=>{
    expect(burnRadius(0,w,h)).toBeLessThan(0);
    expect(burnRadius(1,w,h)).toBeGreaterThan(Math.hypot(w,h)/2/Math.min(w,h));
    const points=burnClip(.5,w,h).match(/-?[\d.]+px/g)!.map(x=>Number.parseFloat(x));
    expect(Math.min(...points.filter((_,i)=>i%2===0))).toBeLessThan(w/2);
    expect(Math.max(...points.filter((_,i)=>i%2===0))).toBeGreaterThan(w/2);
  });
  it('does not briefly expose a backwards hole before the burn starts',()=>{
    const coordinates=burnClip(.005,1920,1080).match(/-?[\d.]+px/g)!.map(x=>Number.parseFloat(x));
    for(let i=0;i<coordinates.length;i+=2) expect(Math.hypot(coordinates[i]!-960,coordinates[i+1]!-540)).toBeLessThan(.01);
  });
  it('keeps the selected cinematic timings',()=>{expect(realmDuration).toEqual({fengqiao:1.6,jiangxue:2.1,baidicheng:1.5});});
});
