import {describe,it,expect} from 'vitest';
import {PlaneGeometry} from 'three';
import {riverGeometry} from './NightRiver';
describe('river horizon extension',()=>{
  it('keeps the near hull grid and triangle budget while extending the distant surface',()=>{
    const original=new PlaneGeometry(160,160,40,40),extended=riverGeometry(1500);
    const a=original.getAttribute('position'),b=extended.getAttribute('position');
    expect(b.count).toBe(a.count);expect([...extended.index!.array]).toEqual([...original.index!.array]);
    for(let i=0;i<a.count;i++)if(Math.abs(a.getX(i))<=64&&Math.abs(a.getY(i))<=64){
      expect([b.getX(i),b.getY(i),b.getZ(i)]).toEqual([a.getX(i),a.getY(i),a.getZ(i)]);
    }
    expect(extended.boundingBox!.min.toArray()).toEqual([-750,-750,0]);
    expect(extended.boundingBox!.max.toArray()).toEqual([750,750,0]);
    expect(extended.index!.count/3).toBe(3200);original.dispose();extended.dispose();
  });
  it('preserves the original sample extent',()=>{
    const original=new PlaneGeometry(160,160,40,40),sample=riverGeometry(160);
    expect([...sample.getAttribute('position').array]).toEqual([...original.getAttribute('position').array]);
    original.dispose();sample.dispose();
  });
});
