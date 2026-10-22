import { synthesizeSound, type SoundKind } from './fengqiaoSound';
import { apeCuesAt, synthesizeApe, type ApeSoundKind } from './baidichengSound';

type SceneSoundKind=SoundKind|ApeSoundKind;
type SoundPositions={bell?:number[];crow?:number[];apeLeft?:number[];apeRight?:number[];boat:number[];camera:number[];forward:number[];up:number[]};

/** Owns one scene's context and voices. Unlock runs directly inside the entry gesture. */
export class AudioEngine {
  constructor(private readonly profile:'fengqiao'|'jiangxue'|'baidicheng'='fengqiao') {}
  private context?: AudioContext;
  private master?: GainNode;
  private buses = new Map<'environment'|'effects'|'voice'|'music', GainNode>();
  private buffers = new Map<SceneSoundKind, AudioBuffer>();
  private voices = new Set<AudioBufferSourceNode>();
  private voiceGains = new Map<AudioBufferSourceNode,GainNode>();
  private loops = new Set<AudioBufferSourceNode>();
  private loopPanners = new Map<SceneSoundKind,PannerNode>();
  private loopGains = new Map<SceneSoundKind,GainNode>();
  private apeStarted = new Set<string>();
  private apeVoices = new Map<string,{source:AudioBufferSourceNode;panner:PannerNode}>();
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
        const sounds:SoundKind[]=this.profile==='fengqiao'?['wind','water','crow','bell']:['wind','water'];
        for(const kind of sounds) {const data=synthesizeSound(kind,24000),buffer=context.createBuffer(1,data.length,24000);buffer.getChannelData(0).set(data);this.buffers.set(kind,buffer);}
        if(this.profile==='baidicheng')for(const kind of ['ape-left','ape-right'] as const){const data=synthesizeApe(kind,24000),buffer=context.createBuffer(1,data.length,24000);buffer.getChannelData(0).set(data);this.buffers.set(kind,buffer);}
      }
      if(this.context.state==='suspended')await this.context.resume();
    } catch { /* Audio refusal never blocks the view or navigation. */ }
  }
  setMuted(muted:boolean):void {this.muted=muted;if(this.context&&this.master)this.master.gain.setTargetAtTime(muted||!this.lastPlaying?0:.65,this.context.currentTime,.04);}
  setHidden(hidden:boolean):void {if(hidden)void this.context?.suspend().catch(()=>{});else if(this.context?.state==='suspended')void this.context.resume().catch(()=>{});}
  private sound(kind:SceneSoundKind,volume:number,position:number[],offset=0,loop=false) {
    const context=this.context;if(!context || context.state!=='running' || this.disposed)return;
    const source=context.createBufferSource();source.buffer=this.buffers.get(kind)!;source.loop=loop;
    const gain=context.createGain();gain.gain.value=volume;
    if(kind==='ape-left'||kind==='ape-right'){gain.gain.setValueAtTime(0,context.currentTime);gain.gain.linearRampToValueAtTime(volume,context.currentTime+.025);}
    const panner=context.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=10;panner.rolloffFactor=.12;
    panner.positionX.value=position[0];panner.positionY.value=position[1];panner.positionZ.value=position[2];
    source.connect(gain);gain.connect(panner);panner.connect(this.buses.get(loop?'environment':'effects')!);
    this.voices.add(source);this.voiceGains.set(source,gain);if(loop){this.loops.add(source);this.loopPanners.set(kind,panner);this.loopGains.set(kind,gain);}
    source.onended=()=>{this.voices.delete(source);this.voiceGains.delete(source);this.loops.delete(source);if(this.loopPanners.get(kind)===panner){this.loopPanners.delete(kind);this.loopGains.delete(kind);}for(const [key,voice] of this.apeVoices)if(voice.source===source)this.apeVoices.delete(key);source.disconnect();gain.disconnect();panner.disconnect();};
    source.start(0,Math.max(0,offset)%source.buffer.duration);
    return {source,gain,panner};
  }
  private reset(fade=false):void {
    const now=this.context?.currentTime??0;
    for(const source of this.voices){try{const gain=this.voiceGains.get(source);if(fade&&gain){gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(gain.gain.value,now);gain.gain.linearRampToValueAtTime(0,now+.04);}source.stop(fade?now+.045:0);}catch{/* already ended */}}
    this.voices.clear();this.voiceGains.clear();this.loops.clear();this.loopPanners.clear();this.loopGains.clear();this.apeStarted.clear();this.apeVoices.clear();
  }
  private updateApes(t:number,playing:boolean,positions:SoundPositions):void {
    const cues=playing?apeCuesAt(t):[],active=new Set(cues.map(cue=>cue.key));
    for(const key of this.apeStarted)if(!active.has(key)) {
      const voice=this.apeVoices.get(key);if(voice)try{voice.source.stop();}catch{}
      this.apeStarted.delete(key);this.apeVoices.delete(key);
    }
    for(const cue of cues) {
      const position=cue.kind==='ape-left'?positions.apeLeft:positions.apeRight;
      if(!position)continue;
      const voice=this.apeVoices.get(cue.key);
      if(voice)[voice.panner.positionX,voice.panner.positionY,voice.panner.positionZ].forEach((parameter,index)=>parameter.value=position[index]);
      if(this.muted||this.apeStarted.has(cue.key))continue;
      const sound=this.sound(cue.kind,cue.kind==='ape-left'?.3:.27,position,cue.offset);
      if(sound){this.apeStarted.add(cue.key);this.apeVoices.set(cue.key,sound);this.lastEvent=cue.kind;this.events.push(cue.kind);if(this.events.length>32)this.events.shift();}
    }
  }
  update(t:number,playing:boolean,arrival:number,positions:SoundPositions):void {
    const context=this.context;if(!context || this.disposed)return;
    const jump=t<this.previous || t-this.previous>.35;
    if(jump || playing!==this.lastPlaying)this.reset(true);
    if(playing && !this.loops.size && context.state==='running') {
      this.sound('wind',this.profile==='jiangxue'?.065:.17,positions.crow??positions.boat,t,true);this.sound('water',this.profile==='jiangxue'?.045:.12,positions.boat,t,true);
      // A seek restores a decaying bell tail at the target time, never replays crossed attacks.
      if(this.profile==='fengqiao'&&positions.bell&&t>arrival && t<arrival+10 && (jump || !this.lastPlaying))this.sound('bell',.24,positions.bell,t-arrival);
    }
    if(this.profile==='fengqiao'&&playing && this.lastPlaying && !jump && !this.muted) {
      for(const [time,kind] of [[5.2,'crow'],[7.4,'crow'],[arrival,'bell']] as const) {
        if(this.previous<time && t>=time && positions[kind]) {this.sound(kind,kind==='bell'?.24:.07,positions[kind]!);this.lastEvent=kind;this.events.push(kind);if(this.events.length>32)this.events.shift();}
      }
    }
    if(this.profile==='baidicheng')this.updateApes(t,playing,positions);
    const listener=context.listener;
    const water=this.loopPanners.get('water');if(water)[water.positionX,water.positionY,water.positionZ].forEach((p,i)=>p.value=positions.boat[i]);
    if(this.profile==='jiangxue')for(const [kind,volume] of [['wind',.065],['water',.045]] as const)this.loopGains.get(kind)?.gain.setTargetAtTime(volume*(.38+.62*Math.exp(-t/12)),context.currentTime,.08);
    [listener.positionX,listener.positionY,listener.positionZ].forEach((p,i)=>p.value=positions.camera[i]);
    [listener.forwardX,listener.forwardY,listener.forwardZ].forEach((p,i)=>p.value=positions.forward[i]);
    [listener.upX,listener.upY,listener.upZ].forEach((p,i)=>p.value=positions.up[i]);
    if(this.master && (playing!==this.lastPlaying || jump))this.master.gain.setTargetAtTime(playing && !this.muted ? .65 : 0,context.currentTime,.04);
    this.previous=t;this.lastPlaying=playing;
  }
  details() {return {state:this.context?.state??'locked',muted:this.muted,voices:this.voices.size,loops:this.loops.size,lastEvent:this.lastEvent,events:[...this.events],tracks:[...this.buses.keys()],profile:this.profile,sounds:[...this.buffers.keys()],apeCues:[...this.apeVoices].map(([key,voice])=>({key,position:[voice.panner.positionX.value,voice.panner.positionY.value,voice.panner.positionZ.value]}))};}
  dispose():void {if(this.disposed)return;this.disposed=true;this.reset();for(const gain of this.buses.values())gain.disconnect();this.buses.clear();this.master?.disconnect();this.buffers.clear();void this.context?.close();}
}
