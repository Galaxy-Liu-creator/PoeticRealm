import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MotionLoop } from './MotionLoop';
describe('presentation scheduler',()=>{
  let documentStub: EventTarget & { hidden:boolean };
  let frames: Map<number,FrameRequestCallback>;
  let id:number;
  beforeEach(()=>{
    frames=new Map();id=0;documentStub=Object.assign(new EventTarget(),{hidden:false});
    vi.stubGlobal('document',documentStub);
    vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++id,fn);return id;});
    vi.stubGlobal('cancelAnimationFrame',(n:number)=>frames.delete(n));
  });
  afterEach(()=>vi.unstubAllGlobals());
  function frame(now:number):void { const [key,callback]=[...frames][0]!;frames.delete(key);callback(now); }
  it('has no pending RAF offscreen and does not catch up on re-entry',()=>{
    const loop=new MotionLoop();let active=true;const update=vi.fn();
    const stop=loop.subscribe(()=>active,update);
    frame(0);frame(50);expect(loop.clock.time).toBe(.05);
    active=false;loop.refresh();expect(frames.size).toBe(0);
    active=true;loop.refresh();frame(5000);expect(loop.clock.time).toBe(.05);
    stop();expect(frames.size).toBe(0);loop.dispose();
  });
  it('cancels hidden-page work and samples a seek without starting RAF',()=>{
    const loop=new MotionLoop();const update=vi.fn();loop.subscribe(()=>true,update);
    documentStub.hidden=true;documentStub.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);loop.pause();loop.seek(8);
    expect(update).toHaveBeenLastCalledWith(8);expect(frames.size).toBe(0);
    loop.seek(-1);expect(update).toHaveBeenLastCalledWith(0);
    loop.dispose();documentStub.hidden=false;documentStub.dispatchEvent(new Event('visibilitychange'));
    expect(frames.size).toBe(0);
  });
});
