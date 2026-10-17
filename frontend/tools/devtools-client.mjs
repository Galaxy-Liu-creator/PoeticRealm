import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
export async function connectDevTools(workspace, port=9227) {
  const entry=process.env.DEVTOOLS_MCP_ENTRY ?? 'C:/Users/Lenovo/.codex/npm-cache-motion/_npx/15c61037b1978c83/node_modules/chrome-devtools-mcp/build/src/bin/chrome-devtools-mcp.js';
  const child=spawn(process.execPath,[entry,'--browserUrl','http://127.0.0.1:'+port,'--no-usage-statistics','--no-performance-crux','--workspace',workspace],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  let buffer='',id=0;const pending=new Map();
  const send=message=>child.stdin.write(JSON.stringify(message)+'\n');
  child.stdout.on('data',data=>{
    buffer+=data;
    while(buffer.includes('\n')) {
      const end=buffer.indexOf('\n'),line=buffer.slice(0,end);buffer=buffer.slice(end+1);
      let m;try{m=JSON.parse(line);}catch{continue;}
      if(m.method==='roots/list'){send({jsonrpc:'2.0',id:m.id,result:{roots:[{uri:pathToFileURL(workspace).href,name:'fengqiao-evidence'}]}});continue;}
      const p=pending.get(m.id);if(p){pending.delete(m.id);clearTimeout(p.timer);m.error?p.reject(new Error(JSON.stringify(m.error))):p.resolve(m.result);}
    }
  });
  child.stderr.on('data',()=>{});
  const rpc=(method,params={})=>new Promise((resolve,reject)=>{
    const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(Error('MCP timeout: '+method));},60000);
    pending.set(current,{resolve,reject,timer});send({jsonrpc:'2.0',id:current,method,params});
  });
  const server=await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{roots:{listChanged:false}},clientInfo:{name:'fengqiao-native-qa',version:'1'}});
  send({jsonrpc:'2.0',method:'notifications/initialized'});
  const text=result=>(result.content??[]).filter(c=>c.type==='text').map(c=>c.text).join('\n');
  const call=async(name,args={})=>{const r=await rpc('tools/call',{name,arguments:args});assert(!r.isError,text(r));return r;};
  return {server:server.serverInfo,call,text,close:()=>{child.stdin.end();setTimeout(()=>child.kill(),500).unref();}};
}
