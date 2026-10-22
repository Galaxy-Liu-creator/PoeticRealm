/** Keep the Vite connection alive while excluding unrelated hot edits from a verification run. */
export async function isolateViteUpdates(context){
 await context.routeWebSocket('ws://127.0.0.1:5187/**',socket=>{
  const server=socket.connectToServer();
  server.onMessage(message=>{
   let type;try{type=JSON.parse(message.toString()).type;}catch{}
   if(!['update','full-reload','prune'].includes(type))socket.send(message);
  });
 });
}
