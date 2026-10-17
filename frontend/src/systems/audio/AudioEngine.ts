import { synthesizeSound, type SoundKind } from './fengqiaoSound';

/** Owns one scene's context and voices. Unlock runs directly inside the entry gesture. */
export class AudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private buses = new Map<'environment'|'effects'|'voice'|'music', GainNode>();
  private buffers = new Map<SoundKind, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private voiceGains = new Map<AudioBufferSourceNode,GainNode>();
  private loops = new Set<AudioBufferSourceNode>();
  private loopPanners = new Map<SoundKind,PannerNode>();
  private previous = 0;
  private lastPlaying = false;
  private muted = false;
  private disposed = false;
  private lastEvent?: string;
  private events: string[]=[];
  async unlock(): Promise<void> {
    if(this.disposed)return;
    try {
      if(!this.context) {
        const context=this.context=new AudioContext();this.master=context.createGain();this.master.gain.value=0;
        this.master.connect(context.destination);
        for(const name of ['environment','effects','voice','music'] as const) {const gain=context.createGain();gain.connect(this.master);this.buses.set(name,gain);}
        for(const kind of ['wind','water','crow','bell'] as const) {const data=synthesizeSound(kind,24000),buffer=context.createBuffer(1,data.length,24000);buffer.getChannelData(0).set(data);this.buffers.set(kind,buffer);}
      }
      if(this.context.state==='suspended')await this.context.resume();
    } catch { /* Audio refusal never blocks the view or navigation. */ }
  }
  setMuted(muted:boolean):void {this.muted=muted;if(this.context&&this.master)this.master.gain.setTargetAtTime(muted||!this.lastPlaying?0:.65,this.context.currentTime,.04);}
  setHidden(hidden:boolean):void {if(hidden)void this.context?.suspend().catch(()=>{});else if(this.context?.state==='suspended')void this.context.resume().catch(()=>{});}
  private sound(kind:SoundKind,volume:number,position:number[],offset=0,loop=false) {
    const context=this.context;if(!context || context.state!=='running' || this.disposed)return;
    const source=context.createBufferSource();source.buffer=this.buffers.get(kind)!;source.loop=loop;
    const gain=context.createGain();gain.gain.value=volume;
    const panner=context.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=10;panner.rolloffFactor=.12;
    panner.positionX.value=position[0];panner.positionY.value=position[1];panner.positionZ.value=position[2];
    source.connect(gain);gain.connect(panner);panner.connect(this.buses.get(loop?'environment':'effects')!);
    this.voices.add(source);this.voiceGains.set(source,gain);if(loop){this.loops.add(source);this.loopPanners.set(kind,panner);}
    source.onended=()=>{this.voices.delete(source);this.voiceGains.delete(source);this.loops.delete(source);if(this.loopPanners.get(kind)===panner)this.loopPanners.delete(kind);source.disconnect();gain.disconnect();panner.disconnect();};
    source.start(0,Math.max(0,offset)%source.buffer.duration);
    return {source,gain,panner};
  }
  private reset(fade=false):void {
    const now=this.context?.currentTime??0;
    for(const source of this.voices){try{const gain=this.voiceGains.get(source);if(fade&&gain){gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+.04);}source.stop(fade?now+.045:0);}catch{/* already ended */}}
    this.voices.clear();this.voiceGains.clear();this.loops.clear();this.loopPanners.clear();
  }
  update(t:number,playing:boolean,arrival:number,positions:{bell:number[];crow:number[];boat:number[];camera:number[];forward:number[];up:number[]}):void {
    const context=this.context;if(!context || this.disposed)return;
    const jump=t<this.previous || t-this.previous>.35;
    if(jump || playing!==this.lastPlaying)this.reset(true);
    if(playing && !this.loops.size && context.state==='running') {
      this.sound('wind',.17,positions.crow,t,true);this.sound('water',.12,positions.boat,t,true);
      // A seek restores a decaying bell tail at the target time, never replays crossed attacks.
      if(t>arrival && t<arrival+10 && (jump || !this.lastPlaying))this.sound('bell',.24,positions.bell,t-arrival);
    }
    if(playing && this.lastPlaying && !jump && !this.muted) {
      for(const [time,kind] of [[5.2,'crow'],[7.4,'crow'],[arrival,'bell']] as const) {
        if(this.previous<time && t>=time) {this.sound(kind,kind==='bell'?.24:.07,positions[kind]);this.lastEvent=kind;this.events.push(kind);if(this.events.length>32)this.events.shift();}
      }
    }
    const listener=context.listener;
    const water=this.loopPanners.get('water');if(water)[water.positionX,water.positionY,water.positionZ].forEach((p,i)=>p.value=positions.boat[i]);
    [listener.positionX,listener.positionY,listener.positionZ].forEach((p,i)=>p.value=positions.camera[i]);
    [listener.forwardX,listener.forwardY,listener.forwardZ].forEach((p,i)=>p.value=positions.forward[i]);
    [listener.upX,listener.upY,listener.upZ].forEach((p,i)=>p.value=positions.up[i]);
    if(this.master && (playing!==this.lastPlaying || jump))this.master.gain.setTargetAtTime(playing && !this.muted ? .65 : 0,context.currentTime,.04);
    this.previous=t;this.lastPlaying=playing;
  }
  details() {return {state:this.context?.state??'locked',muted:this.muted,voices:this.voices.size,loops:this.loops.size,lastEvent:this.lastEvent,events:[...this.events],tracks:[...this.buses.keys()]};}
  dispose():void {if(this.disposed)return;this.disposed=true;this.reset();for(const gain of this.buses.values())gain.disconnect();this.buses.clear();this.master?.disconnect();this.buffers.clear();void this.context?.close();}
}
