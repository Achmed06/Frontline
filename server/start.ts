import { resolve } from 'node:path';
import { createFrontlineServer } from './app';
const rawPort=process.env.PORT??'8080';
const port=Number(rawPort);
if(!Number.isInteger(port)||port<1||port>65535) throw Error('PORT muss zwischen 1 und 65535 liegen.');
const host=process.env.HOST??'127.0.0.1';
const server=await createFrontlineServer(resolve(process.env.FRONTLINE_DIST??'dist'));
server.on('error',error=>{console.error('Serverstart fehlgeschlagen:',error.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`FRONTLINE läuft auf http://${host}:${port} – Gesundheitsprüfung: /healthz`));
let stopping=false;
const shutdown=()=>{
 if(stopping)return;stopping=true;
 console.log('FRONTLINE wird beendet. Aktive Duelle liegen nur im Arbeitsspeicher.');
 server.close(()=>{process.exitCode=0;});
 setTimeout(()=>server.closeAllConnections(),5000).unref();
};
process.once('SIGINT',shutdown);process.once('SIGTERM',shutdown);
