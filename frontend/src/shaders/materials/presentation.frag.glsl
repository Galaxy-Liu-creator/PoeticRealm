varying vec2 vUv;
uniform vec2 uSize;
uniform float uTime;
uniform float uProgress;
uniform float uMode;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float mist(vec2 p){return .56*noise(p)+.28*noise(p*2.1)+.16*noise(p*4.3);}
float outline(float a){return .018*sin(a*7.+1.4)+.011*sin(a*13.-.7)+.006*sin(a*23.+2.);}
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
    float r=(maxR+.08)*pow(uProgress,.85)-.04+outline(angle)*sin(uProgress*3.14159265);
    float edge=length(d)-r;
    float charred=exp(-abs(edge)*190.);
    float ember=exp(-abs(edge+.004)*360.)*(.25+.75*pow(.5+.5*sin(angle*31.+uProgress*9.),3.));
    float fade=smoothstep(0.,.07,uProgress)*(1.-smoothstep(.88,1.,uProgress));
    color=mix(vec3(.008,.011,.009),vec3(.32,.064,.007),ember);
    alpha=max(charred*.98,ember*.85)*fade;
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
