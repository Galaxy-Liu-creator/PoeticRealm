import {describe,it,expect} from 'vitest';
import {bellArrival,synthesizeSound} from './fengqiaoSound';

describe('original Fengqiao sound buffers',()=>{
  it('has finite, unclipped samples and silent loop edges at browser sample rates',()=>{
    for(const sampleRate of [24000,48000])for(const kind of ['wind','water','crow','bell'] as const){
      const data=synthesizeSound(kind,sampleRate);let peak=0,power=0;
      expect(data.every(Number.isFinite)).toBe(true);
      for(const value of data){peak=Math.max(peak,Math.abs(value));power+=value*value;}
      expect(peak).toBeLessThan(1);expect(power/data.length).toBeGreaterThan(.0001);
      if(kind==='wind'||kind==='water'){expect(data[0]).toBe(0);expect(Math.abs(data.at(-1)!)).toBeLessThan(.002);}
    }
  });
  it('reproduces seeded buffers and lets the bell decay after its attack',()=>{
    const bell=synthesizeSound('bell',24000),repeat=synthesizeSound('bell',24000);expect(bell.every((n,i)=>n===repeat[i])).toBe(true);
    const rms=(start:number,end:number)=>Math.sqrt(bell.subarray(start*24000,end*24000).reduce((sum,n)=>sum+n*n,0)/((end-start)*24000));
    expect(rms(8,9)).toBeLessThan(rms(1,2)*.25);
    const water=synthesizeSound('water',24000),waterRepeat=synthesizeSound('water',24000);expect(water.every((n,i)=>n===waterRepeat[i])).toBe(true);
  });
  it('delays the bell by distance and ignores vertical scene coordinates',()=>{
    expect(bellArrival([0,10,0],[340,-.3,0])).toBe(25);
    expect(bellArrival([0,0,0],[0,0,0])).toBe(24);
    expect(bellArrival([0,100,0],[340,100,0])).toBe(25);
  });
});
