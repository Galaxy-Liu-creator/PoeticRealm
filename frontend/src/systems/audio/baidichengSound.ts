export type ApeSoundKind = 'ape-left' | 'ape-right';
export const apeDurations: Record<ApeSoundKind, number> = {'ape-left':4.2,'ape-right':4.6};
const period=18;
const phrases:readonly [number,ApeSoundKind][]=[[1.4,'ape-left'],[6.3,'ape-right'],[11,'ape-left'],[15.7,'ape-right']];

export function apeCuesAt(time:number) {
  if(!Number.isFinite(time)||time<0)return [];
  const cycle=Math.floor(time/period),cues:{key:string;kind:ApeSoundKind;start:number;offset:number}[]=[];
  for(const turn of [cycle-1,cycle]) {
    if(turn<0)continue;
    for(const [onset,kind] of phrases) {
      const start=turn*period+onset,offset=time-start;
      if(offset>=0&&offset<apeDurations[kind])cues.push({key:`${turn}:${onset}`,kind,start,offset});
    }
  }
  return cues;
}

export function synthesizeApe(kind:ApeSoundKind,sampleRate:number):Float32Array {
  const right=kind==='ape-right',duration=apeDurations[kind];
  const dry=new Float32Array(Math.ceil(duration*sampleRate));
  const notes=right?[[.08,.62,570],[.87,.77,640],[1.85,1.65,525]]:[[0,.55,425],[.73,.7,490],[1.63,1.5,405]];
  let seed=right?9187:4409;
  for(const [start,length,pitch] of notes) {
    let phase=0,breath=0;
    for(let index=0;index<Math.ceil(length*sampleRate);index++) {
      const local=index/sampleRate,progress=local/length;
      seed=(Math.imul(seed,1664525)+1013904223)>>>0;
      breath+=(seed/4294967296*2-1-breath)*.15;
      const rise=Math.sin(Math.PI*progress)**.7;
      const frequency=pitch*(.9+.62*rise-.16*progress)*(1+.009*Math.sin(2*Math.PI*5.3*local));
      phase+=2*Math.PI*frequency/sampleRate;
      let voiced=0;
      for(let harmonic=1;harmonic<=9;harmonic++) {
        const frequencyHz=frequency*harmonic;
        const formants=.65*Math.exp(-(((frequencyHz-900)/420)**2))+.24*Math.exp(-(((frequencyHz-1850)/650)**2));
        voiced+=Math.sin(phase*harmonic)*(.48/harmonic**1.65+formants*.22/harmonic);
      }
      const envelope=(1-Math.exp(-local/.035))*Math.sin(Math.PI*progress)**.85*(.94+.06*Math.sin(2*Math.PI*7.1*local));
      const target=Math.round(start*sampleRate)+index;
      if(target<dry.length)dry[target]+=(voiced+breath*.055)*envelope*.72;
    }
  }
  const samples=new Float32Array(dry.length),first=Math.round(.23*sampleRate),second=Math.round(.51*sampleRate);
  for(let index=0;index<samples.length;index++)samples[index]=(dry[index]+(dry[index-first]??0)*.18+(dry[index-second]??0)*.065)*Math.min(1,(samples.length-1-index)/(.08*sampleRate));
  return samples;
}
