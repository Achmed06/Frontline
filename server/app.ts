/** Standalone HTTP host for the built client and the existing duel service. */
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
import { DuelService, duelMiddleware } from './duels';
const MIME: Record<string,string> = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2','.woff':'font/woff','.webp':'image/webp'};
export function startDuelClock(service: DuelService): () => void {
 let previous=performance.now();
 const timer=setInterval(()=>{const now=performance.now();service.tick((now-previous)/1000);previous=now;},1000/30);
 timer.unref();return ()=>clearInterval(timer);
}
export async function createFrontlineServer(directory: string) {
 const root=await realpath(directory);
 if(!(await stat(resolve(root,'index.html'))).isFile() || !(await stat(resolve(root,'duel.html'))).isFile()) throw Error('Spielbuild fehlt. Zuerst npm run build ausführen.');
 const service=new DuelService();const api=duelMiddleware(service);
 const clients=new Map<string,{start:number;count:number}>();
 const server=createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Frame-Options','DENY');
  const send=(status:number,message:string)=>{res.statusCode=status;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(message);};
  try {
   const path=new URL(req.url??'/', 'http://localhost').pathname;
   if(path==='/healthz') {if(req.method!=='GET'&&req.method!=='HEAD'){send(405,'Method not allowed');return;}res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','application/json');res.end(req.method==='HEAD'?undefined:JSON.stringify({status:'ok'}));return;}
   if(path==='/api/duel') {
    const now=Date.now(),ip=req.socket.remoteAddress??'unknown';
    let bucket=clients.get(ip);
    if(!bucket || now-bucket.start>=10000){
     if(clients.size>=1000) for(const [key,item] of clients) if(now-item.start>=10000)clients.delete(key);
     if(!clients.has(ip)&&clients.size>=1000){send(503,'Server busy');return;}
     bucket={start:now,count:0};clients.set(ip,bucket);
    }
    if(++bucket.count>300){res.statusCode=429;res.setHeader('Content-Type','application/json');res.setHeader('Retry-After','10');res.end(JSON.stringify({error:'Zu viele Anfragen. Bitte kurz warten.'}));return;}
    await api(req,res,()=>send(404,'Not found'));return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){send(405,'Method not allowed');return;}
   const decoded=decodeURIComponent(path);
   const candidate=resolve(root, '.'+(decoded==='/'?'/index.html':decoded));
   if(candidate!==root&&!candidate.startsWith(root+sep)){send(404,'Not found');return;}
   const file=await realpath(candidate);
   if(!file.startsWith(root+sep)){send(404,'Not found');return;}
   const info=await stat(file);if(!info.isFile()){send(404,'Not found');return;}
   const type=MIME[extname(file)];if(!type){send(404,'Not found');return;}
   res.setHeader('Content-Type',type);res.setHeader('Content-Length',info.size);
   res.setHeader('Cache-Control',path.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache');
   if(req.method==='HEAD'){res.end();return;}
   const stream=createReadStream(file);stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  } catch {if(!res.headersSent)send(404,'Not found');else res.destroy();}
 });
 server.requestTimeout=10000;server.headersTimeout=10000;server.keepAliveTimeout=5000;
 const stop=startDuelClock(service);server.once('close',stop);
 return server;
}
