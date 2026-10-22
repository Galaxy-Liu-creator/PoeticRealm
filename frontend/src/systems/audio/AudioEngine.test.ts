import {afterEach,describe,expect,it,vi} from 'vitest';
import {AudioEngine} from './AudioEngine';

class AudioParameter {
  value=0;
  setTargetAtTime(value:number){this.value=value;}
  setValueAtTime(value:number){this.value=value;}
  linearRampToValueAtTime(value:number){this.value=value;}
  cancelScheduledValues(){}
}
class AudioNodeStub {
  disconnected=false;
  connect(){}
  disconnect(){this.disconnected=true;}
}
class SourceStub extends AudioNodeStub {
  buffer?:{duration:number};
  loop=false;
  stopped=false;
  offset=0;
  onended?:()=>void;
  start(_when:number,offset:number){this.offset=offset;}
  stop(){this.stopped=true;this.onended?.();}
}
class AudioContextStub {
  static instances:AudioContextStub[]=[];
  currentTime=0;
  state='running';
  destination=new AudioNodeStub();
  sources:SourceStub[]=[];
  listener={positionX:new AudioParameter(),positionY:new AudioParameter(),positionZ:new AudioParameter(),forwardX:new AudioParameter(),forwardY:new AudioParameter(),forwardZ:new AudioParameter(),upX:new AudioParameter(),upY:new AudioParameter(),upZ:new AudioParameter()};
  constructor(){AudioContextStub.instances.push(this);}
  createGain(){return Object.assign(new AudioNodeStub(),{gain:new AudioParameter()});}
  createPanner(){return Object.assign(new AudioNodeStub(),{positionX:new AudioParameter(),positionY:new AudioParameter(),positionZ:new AudioParameter()});}
  createBuffer(_channels:number,length:number,rate:number){return {duration:length/rate,getChannelData:()=>new Float32Array(length)};}
  createBufferSource(){const source=new SourceStub();this.sources.push(source);return source;}
  async resume(){this.state='running';}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';}
}
const positions={boat:[0,0,0],camera:[0,3,10],forward:[0,0,-1],up:[0,1,0],apeLeft:[-50,20,-10],apeRight:[50,25,-20]};
afterEach(()=>{vi.unstubAllGlobals();AudioContextStub.instances=[];});

describe('scene audio lifecycle',()=>{
  it('restores target bank phases without repeating attacks on unchanged frames',async()=>{
    vi.stubGlobal('AudioContext',AudioContextStub);
    const audio=new AudioEngine('baidicheng');await audio.unlock();
    const context=AudioContextStub.instances[0];
    audio.update(3,true,Infinity,positions);
    expect(audio.details().sounds).toEqual(['wind','water','ape-left','ape-right']);
    expect(audio.details().events).toEqual(['ape-left']);
    expect(context.sources.at(-1)?.offset).toBeCloseTo(1.6);
    expect(audio.details().apeCues[0].position).toEqual(positions.apeLeft);
    context.sources.at(-1)?.stop();audio.update(3.1,true,Infinity,positions);
    expect(audio.details().events).toEqual(['ape-left']);
    audio.update(8,true,Infinity,positions);
    expect(context.sources.at(-1)?.offset).toBeCloseTo(1.7);
    expect(audio.details().apeCues[0].position).toEqual(positions.apeRight);
    expect(audio.details().events).toEqual(['ape-left','ape-right']);
    audio.update(8,false,Infinity,positions);expect(audio.details().voices).toBe(0);
    audio.update(8,true,Infinity,positions);expect(audio.details().voices).toBe(3);
    audio.update(0,true,Infinity,positions);expect(audio.details().voices).toBe(2);
    expect(audio.details().apeCues).toEqual([]);
    audio.dispose();expect(context.sources.every(source=>source.stopped&&source.disconnected)).toBe(true);
    expect(audio.details().state).toBe('closed');expect(audio.details().voices).toBe(0);
  });
  it('resumes an active tail after unmuting and suspends in the background',async()=>{
    vi.stubGlobal('AudioContext',AudioContextStub);
    const audio=new AudioEngine('baidicheng');audio.setMuted(true);await audio.unlock();
    audio.update(3,true,Infinity,positions);expect(audio.details().events).toEqual([]);
    audio.setMuted(false);audio.update(3.1,true,Infinity,positions);
    expect(audio.details().events).toEqual(['ape-left']);
    expect(AudioContextStub.instances[0].sources.at(-1)?.offset).toBeCloseTo(1.7);
    audio.setHidden(true);expect(audio.details().state).toBe('suspended');
    audio.setHidden(false);expect(audio.details().state).toBe('running');audio.dispose();
  });
  it('keeps the other scene profiles and audio refusal usable',async()=>{
    vi.stubGlobal('AudioContext',AudioContextStub);
    for(const profile of ['fengqiao','jiangxue'] as const) {
      const audio=new AudioEngine(profile);await audio.unlock();audio.update(3,true,Infinity,positions);
      expect(audio.details().sounds).toEqual(profile==='fengqiao'?['wind','water','crow','bell']:['wind','water']);
      expect(audio.details().events).toEqual([]);audio.dispose();
    }
    vi.stubGlobal('AudioContext',class {constructor(){throw new Error('Audio refused');}});
    const refused=new AudioEngine('baidicheng');await expect(refused.unlock()).resolves.toBeUndefined();
    expect(()=>refused.update(3,true,Infinity,positions)).not.toThrow();refused.dispose();
  });
});
