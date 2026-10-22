import {describe,expect,it} from 'vitest';
import {apeCuesAt,apeDurations,synthesizeApe} from './baidichengSound';

describe('Baidicheng bank calls',()=>{
  it('reproduces distinct voiced banks with finite samples and quiet edges',()=>{
    for(const sampleRate of [24000,48000]) {
      const left=synthesizeApe('ape-left',sampleRate),right=synthesizeApe('ape-right',sampleRate);
      for(const [kind,samples] of [['ape-left',left],['ape-right',right]] as const) {
        expect(samples.length).toBe(Math.ceil(apeDurations[kind]*sampleRate));
        expect(samples.every(Number.isFinite)).toBe(true);
        const repeated=synthesizeApe(kind,sampleRate);
        expect(samples.every((sample,index)=>sample===repeated[index])).toBe(true);
        let peak=0,power=0;
        for(const sample of samples){peak=Math.max(peak,Math.abs(sample));power+=sample*sample;}
        expect(peak).toBeLessThan(1);expect(power/samples.length).toBeGreaterThan(.005);
        expect(samples[0]).toBe(0);expect(samples.at(-1)).toBe(0);
        const tail=samples.subarray(Math.floor(3.65*sampleRate));
        const tailPower=tail.reduce((sum,sample)=>sum+sample*sample,0)/tail.length;
        expect(tailPower).toBeLessThan(power/samples.length*.02);
      }
      expect(left.slice(0,2000)).not.toEqual(right.slice(0,2000));
    }
  });
  it('restores only calls audible at the target time, including cross-cycle tails',()=>{
    expect(apeCuesAt(0)).toEqual([]);
    expect(apeCuesAt(3)).toEqual([{key:'0:1.4',kind:'ape-left',start:1.4,offset:1.6}]);
    expect(apeCuesAt(6)).toEqual([]);
    expect(apeCuesAt(8)[0]).toMatchObject({kind:'ape-right',start:6.3});
    expect(apeCuesAt(18)).toHaveLength(1);expect(apeCuesAt(18)[0]).toMatchObject({kind:'ape-right',start:15.7});
    expect(apeCuesAt(19.5).map(cue=>cue.kind)).toEqual(['ape-right','ape-left']);
    expect(apeCuesAt(39)).toEqual([{key:'2:1.4',kind:'ape-left',start:37.4,offset:39-37.4}]);
    for(const time of [-1,Infinity,NaN])expect(apeCuesAt(time)).toEqual([]);
  });
});
