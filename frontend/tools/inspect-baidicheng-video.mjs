import {chromium} from 'playwright';
import {readFile,writeFile} from 'node:fs/promises';
const revision=process.argv.find(a=>a.startsWith('--revision='))?.slice(11)??'03';
if(!['01','02','03'].includes(revision))throw new Error('Invalid revision');
const evidence=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11)??'baidicheng-model-v'+revision;
if(!/^baidicheng-(model|runtime)-v[0-9]+$/.test(evidence))throw new Error('Invalid evidence root');
const folder=new URL('../../output/'+evidence+'/validation/accepted/',import.meta.url).pathname;
const input=await readFile(folder+'inspection.webm');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage();await page.goto('about:blank');
 const result=await page.evaluate(async base64=>{
  const raw=atob(base64),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0)),blob=new Blob([bytes],{type:'video/webm'});
  const url=URL.createObjectURL(blob),video=document.createElement('video');video.muted=true;video.preload='auto';
  const wait=event=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(event+' timeout')),20000);video.addEventListener(event,()=>{clearTimeout(timer);resolve();},{once:true});});
  const metadata=wait('loadedmetadata');video.src=url;await metadata;
  if(!Number.isFinite(video.duration)){const seek=wait('seeked');video.currentTime=1e10;await seek;}
  const duration=video.duration;if(!Number.isFinite(duration)||duration<10)throw new Error('Invalid recorded duration');
  const canvas=document.createElement('canvas');canvas.width=720;canvas.height=450;const context=canvas.getContext('2d',{willReadFrequently:true}),frames=[];
  for(const t of [.5,duration*.5,duration-.3]){const seek=wait('seeked');video.currentTime=t;await seek;context.drawImage(video,0,0,canvas.width,canvas.height);const pixels=context.getImageData(0,0,canvas.width,canvas.height).data;let mean=0;for(let i=0;i<pixels.length;i+=4)mean+=pixels[i]+pixels[i+1]+pixels[i+2];mean/=canvas.width*canvas.height*3;if(mean<5)throw new Error('Black recorded frame');frames.push({time:video.currentTime,meanRGB:mean,png:canvas.toDataURL('image/png')});}
  URL.revokeObjectURL(url);return {durationSeconds:duration,width:video.videoWidth,height:video.videoHeight,frames};
 },input.toString('base64'));
 for(let i=0;i<result.frames.length;i++){await writeFile(folder+'video-frame-'+(i+1)+'.png',Buffer.from(result.frames[i].png.split(',')[1],'base64'));delete result.frames[i].png;}
 await writeFile(folder+'video-decoding.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await browser.close();}
