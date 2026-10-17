export type SoundKind = 'wind' | 'water' | 'crow' | 'bell';
const bellPartials=[[146.83,1,4.2],[294.8,.4,3.8],[397.7,.29,2.8],[617.4,.14,2],[863.2,.08,1.3]];
/** Original modal bell and stylised field sounds. No samples or external recordings. */
export function synthesizeSound(kind: SoundKind, sampleRate: number): Float32Array {
  const duration=kind==='bell'?10:kind==='crow'?.7:4;
  const samples=new Float32Array(Math.ceil(duration*sampleRate));
  let seed=kind==='wind'?1427:kind==='water'?851:74,low=0,phase=0;
  for(let i=0;i<samples.length;i++) {
    const t=i/sampleRate;seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/4294967296*2-1;
    let value=0;
    if(kind==='bell') {
      for(const [frequency,weight,decay] of bellPartials)value+=weight*Math.sin(2*Math.PI*frequency*t)*Math.exp(-t/decay);
      value=(value/1.91+noise*.08*Math.exp(-t*35))*(1-Math.exp(-t*300));
    } else if(kind==='crow') {
      phase+=2*Math.PI*(410-100*t/.7+24*Math.sin(t*65))/sampleRate;
      const envelope=Math.sin(Math.PI*Math.min(1,t/.7))**2;
      value=(.55*Math.sin(phase)+.2*Math.sin(phase*2.03)+noise*.25)*envelope;
    } else {
      low+=(noise-low)*(kind==='wind'?.025:.11);
      value=low*(.7+.3*Math.sin(t*(kind==='wind'?1.57:6.28)));
      const fade=Math.min(1,t/.015,(duration-t)/.015);
      value*=Math.max(0,fade);
    }
    samples[i]=value;
  }
  return samples;
}

export const bellArrival = (emit: [number,number,number], boat: [number,number,number], emitTime=24, speed=340) => emitTime+Math.hypot(emit[0]-boat[0],emit[2]-boat[2])/speed;
