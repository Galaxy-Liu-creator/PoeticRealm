varying vec2 vUv;
uniform vec2 uSize;
uniform float uTime;
uniform float uProgress;
uniform float uMode;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float mist(vec2 p){return .56*noise(p)+.28*noise(p*2.1)+.16*noise(p*4.3);}
float outline(float a){return .018*sin(a*7.+1.4)+.011*sin(a*13.-.7)+.006*sin(a*23.+2.);}
// Arithmetic hash avoids repeated transcendental work in the dense flame turbulence.
float fireHash(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float fireNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(fireHash(i),fireHash(i+vec2(1,0)),f.x),mix(fireHash(i+vec2(0,1)),fireHash(i+vec2(1,1)),f.x),f.y);}
float fireMist(vec2 p){return .56*fireNoise(p)+.28*fireNoise(p*2.1)+.16*fireNoise(p*4.3);}
float flameTongue(vec2 p,float width,float height,float phase){
  float rise=-p.y, h=clamp(rise/height,0.,1.);
  float sway=(.016*(fireNoise(vec2(h*5.-uTime*3.,phase))-.5)+.003*sin(h*11.-uTime*13.+phase))*h;
  float fuel=fireMist(vec2((p.x-sway)*105.+phase,p.y*72.+uTime*11.));
  float taper=width*pow(1.-h,.65)*(.62+.55*fuel);
  return (1.-smoothstep(taper*.45,taper+.003,abs(p.x-sway)))
    *smoothstep(-.012,.004,rise)*(1.-smoothstep(height*.8,height,rise))
    *smoothstep(.12+h*.30,.4+h*.23,fuel);
}
vec3 fireColor(float heat){
  vec3 flame=mix(vec3(.65,.035,.001),vec3(1.,.19,.002),smoothstep(.05,.65,heat));
  flame=mix(flame,vec3(1.,.55,.035),smoothstep(.65,.95,heat));
  return mix(flame,vec3(1.,.95,.75),smoothstep(.97,1.,heat));
}
float flakes(vec2 p,float scale,float travel){
  vec2 q=p*scale+vec2(travel,-travel*.78),cell=floor(q);
  vec2 center=vec2(.15)+.7*vec2(hash(cell),hash(cell+vec2(19.,3.)));
  float size=mix(.035,.15,hash(cell+7.));
  return (1.-smoothstep(size*.2,size,length(fract(q)-center)))*step(.54,hash(cell+2.));
}
void main(){
  vec2 uv=vec2(vUv.x,1.-vUv.y);
  float aspect=uSize.x/uSize.y;
  vec2 pos=vec2(uv.x*aspect,uv.y);
  vec3 color=vec3(.25,.36,.37); float alpha=0.;
  if(uMode<.5){
    // Two slow depth layers; calm water gleams remain below the title.
    float near=mist(pos*vec2(2.8,5.)+vec2(uTime*.016,-uTime*.004));
    float far=mist(pos*vec2(1.4,3.)+vec2(-uTime*.007,.8));
    float bank=exp(-pow((uv.y-.64)*5.,2.));
    alpha=(smoothstep(.36,.8,near)*.13+smoothstep(.43,.78,far)*.08)*bank;
    float wave=sin(uv.y*190.+sin(pos.x*6.+uTime*.16)*2.+uTime*.22);
    float glint=smoothstep(.985,1.,wave)*smoothstep(.72,.96,uv.y)*pow(max(0.,1.-abs(uv.x-.78)*3.),2.);
    alpha+=glint*.075; color=vec3(.36,.48,.46);
  } else if(uMode<1.5){
    vec2 d=(uv-.5)*uSize/min(uSize.x,uSize.y);
    float angle=atan(d.y,d.x);
    float maxR=length(uSize*.5)/min(uSize.x,uSize.y);
    // Match burnProgress/burnClip: flame is already alive while the paper remains closed.
    float opening=clamp((uProgress-.1)/.9,0.,1.);
    float contour=sin(opening*3.14159265);
    float radius=(maxR+.08)*pow(opening,.85)-.04;
    float r=radius+outline(angle)*contour;
    float edge=length(d)-r;
    // Turbulence is expensive: most pixels are clear and need no flame evaluation.
    bool nearIgnition=uProgress<.27 && abs(d.x)<.06 && d.y>-.14 && d.y<.025;
    if(uProgress<=0. || uProgress>=1. || ((radius<=0. || abs(edge)>.16) && !nearIgnition)) discard;
    float born=smoothstep(0.,.009,radius);
    float fuel=fireMist(d*vec2(24.,18.)+vec2(uTime*.8,uTime*4.5));
    float lift=.025+.095*pow(fuel,1.3);
    vec2 swept=d+vec2(.014*(fireNoise(d*35.+vec2(-uTime*2.,uTime*6.))-.5),lift);
    float sweptEdge=length(swept)-radius-outline(atan(swept.y,swept.x))*contour;
    // Advect the burning contour upward, making tongues on both sides of the hole.
    float tongue=abs(smoothstep(-.004,.004,edge)-smoothstep(-.006,.006,sweptEdge));
    float heat=1.-smoothstep(0.,lift*1.1,abs(edge));
    vec2 flameUv=d*vec2(72.,58.)+vec2(-uTime*.8,uTime*11.);
    vec2 curl=vec2(fireNoise(flameUv*.45),fireNoise(flameUv*.45+9.))-.5;
    float density=fireMist(flameUv+curl*2.4);
    tongue*=smoothstep(.58-.3*heat,.76-.35*heat,density)
      *mix(.38,.93,smoothstep(.25,.7,density))*born;
    float coal=exp(-abs(edge)*420.)*(.55+.45*fuel)*born;
    float charred=exp(-abs(edge)*190.)*born;
    float glow=exp(-abs(edge)*40.)*.08*born;

    float ignition=0., ignitionHeat=0.;
    if(nearIgnition){
      ignition=max(flameTongue(d,.018,.11,0.),max(
        flameTongue(d+vec2(.022,-.004),.012,.073,2.),
        flameTongue(d-vec2(.018,.003),.011,.087,5.)));
      ignition*=1.-smoothstep(.16,.27,uProgress);
      ignitionHeat=(.65+.35*exp(-pow(d.x/.010,2.)))
        *(1.-smoothstep(0.,.11,max(0.,-d.y)));
    }
    float fire=max(tongue*.96,max(coal*.9,ignition*.97));
    float temperature=ignition>tongue?ignitionHeat:
      heat*(.65+.25*density+.10*fireNoise(flameUv*2.6));

    vec2 ashSpace=d*vec2(54.,38.)+vec2(-uTime*.6,uTime*8.);
    vec2 cell=floor(ashSpace), center=.2+.6*vec2(hash(cell),hash(cell+19.));
    float spark=(1.-smoothstep(.015,.07,length(fract(ashSpace)-center)))
      *step(.94,hash(cell+7.))*exp(-abs(sweptEdge-.015)*40.)*born;
    fire=max(fire,spark*.8);
    color=mix(vec3(.012,.008,.003),fireColor(temperature),smoothstep(.015,.55,fire));
    alpha=clamp(max(charred*.95,fire)+glow*(1.-fire),0.,1.)
      *smoothstep(0.,.018,uProgress)*(1.-smoothstep(.9,1.,uProgress));
  } else {
    // Full opacity around the handover, with variation in colour, never a white flash.
    float cover=smoothstep(0.,.46,uProgress)*(1.-smoothstep(.54,1.,uProgress));
    float flow=1.;
    float field=mist(pos*vec2(2.,4.)+vec2(uProgress*flow*2.,-uProgress*.8));
    alpha=clamp(cover*1.65-(1.-field)*.54,0.,1.);
    if(uMode>2.5) alpha*=smoothstep(-.45,.15,uv.x-(1.35-uProgress*4.6)+field*.22);
    color=mix(vec3(.38,.49,.50),vec3(.71,.76,.73),field);
    if(uMode<2.5){
      float flake=max(flakes(pos,62.,uProgress*23.)*.45,max(flakes(pos+3.,34.,uProgress*16.)*.75,flakes(pos+7.,15.,uProgress*11.)));
      float depth=sin(uProgress*3.14159265);
      color=mix(color,vec3(.86,.89,.87),flake*.75*depth);
      alpha=max(alpha,flake*.8*depth);
    }
    alpha*=smoothstep(0.,.03,uProgress)*(1.-smoothstep(.97,1.,uProgress));
  }
  gl_FragColor=vec4(color,alpha);
  #include <colorspace_fragment>
}
