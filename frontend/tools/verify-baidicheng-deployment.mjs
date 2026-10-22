import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const output=resolve(process.env.DEPLOYMENT_OUTPUT??'output/baidicheng-audio-v01/validation');
const base='http://127.0.0.1:5186';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const select=service=>({service:service.Service,id:service.ID,image:service.Image,health:service.Health,state:service.State,publishers:service.Publishers});
const parse=value=>{
  const services=value.trim().startsWith('[')?JSON.parse(value):value.trim().split('\n').map(line=>JSON.parse(line));
  return services.map(service=>service.Service?select(service):service);
};
const before=parse(await readFile(resolve(output,'deployment-before.json'),'utf8'));
const after=parse(execFileSync('docker',['--context','desktop-linux','compose','--env-file','.env.docker','ps','--format','json'],{encoding:'utf8'}));
for(const name of ['backend','db'])assert.deepEqual(after.find(service=>service.service===name),before.find(service=>service.service===name));
assert.notEqual(after.find(service=>service.service==='frontend').id,before.find(service=>service.service==='frontend').id);
assert(after.every(service=>service.health==='healthy'));
assert(after.find(service=>service.service==='frontend').publishers.some(port=>port.PublishedPort===5186&&port.URL==='127.0.0.1'));
const files=[];
for(const filename of await readdir('frontend/dist/assets'))if(/\.(js|css)$/.test(filename))files.push('assets/'+filename);
files.push('index.html','assets/scenes/baidicheng.scene-v03.json','assets/models/baidicheng/scene_v03.glb','assets/terrain/baidicheng-v03.height.json','assets/terrain/baidicheng-v03.height.png');
const assets=[];
for(const path of files){
  const response=await fetch(base+'/'+path);assert.equal(response.status,200,path);
  if(path.endsWith('.glb'))assert(['model/gltf-binary','application/octet-stream'].includes(response.headers.get('content-type')?.split(';')[0]),path);
  if(path.endsWith('.json'))assert(response.headers.get('content-type')?.includes('application/json'),path);
  const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile(resolve('frontend/dist',path));
  assert.equal(digest(bytes),digest(local),path);assets.push({path,bytes:bytes.length,sha256:digest(bytes)});
}
const health=await fetch(base+'/healthz');assert.equal(health.status,200);assert.equal(await health.text(),'ok');
const csrf=await fetch(base+'/api/v1/auth/csrf');assert.equal(csrf.status,200);
const report={pass:true,base,before,after,health:health.status,csrf:csrf.status,assets};
await writeFile(resolve(output,'deployment.json'),JSON.stringify(report,null,2)+'\n');
await writeFile(resolve(output,'deployment-before.json'),JSON.stringify(before,null,2)+'\n');
console.log(JSON.stringify({pass:true,files:assets.length,frontend:after.find(service=>service.service==='frontend'),backendAndDatabaseUnchanged:true}));
