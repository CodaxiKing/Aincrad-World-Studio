import {windowShape,floorGeometry} from '../dist/floor-shell.js';
import {mkdir,readFile,writeFile,readdir,rename,stat} from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {gzipSync,gunzipSync} from 'node:zlib';
import {Worker} from 'node:worker_threads';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {largeConfig,createLandscape,landscapeWindow} from '../dist/advanced-generation.js';
import {World} from '../dist/world.js';
import {validateBlockState} from './world-export.mjs';
const ROOT=fileURLToPath(new URL('../.runtime/worlds/',import.meta.url));
const jobs=new Map(),locks=new Set();let activeExports=0;
const idOK=id=>/^[a-f0-9-]{36}$/.test(id),dirFor=id=>{if(!idOK(id))throw Error('Identificador inválido.');return path.join(ROOT,id);};
const json=(res,obj,status=200)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(obj));};
async function body(req,limit=32*1024*1024){if(!req.headers['content-type']?.startsWith('application/json'))throw Error('Requer JSON.');let size=0;const chunks=[];for await(const c of req){size+=c.length;if(size>limit)throw Error('Requisição excede a quota.');chunks.push(c);}return JSON.parse(Buffer.concat(chunks));}
async function meta(id){return JSON.parse(await readFile(path.join(dirFor(id),'project.json'),'utf8'));}
async function saveMeta(id,value){const dir=dirFor(id),temp=path.join(dir,'project.tmp');await writeFile(temp,JSON.stringify(value));await rename(temp,path.join(dir,'project.json'));}
function validateSnapshot(s){if(!s||![s.w,s.h,s.d].every(Number.isInteger)||s.w<1||s.d<1||s.h<1||s.w>256||s.d>256||s.h>320||s.w*s.h*s.d>2097152||!Array.isArray(s.cells)||s.cells.length!==s.w*s.h*s.d||!Array.isArray(s.palette)||s.palette.length>65534||s.palette[0]!=='minecraft:air'||!s.palette.every(v=>typeof v==='string'&&/^minecraft:[a-z0-9_]+(?:\[[a-z0-9_=,]+\])?$/.test(v)&&!/command_block|structure_block|jigsaw/.test(v))||!s.cells.every(v=>Number.isInteger(v)&&v>=0&&v<s.palette.length))throw Error('Volume ou paleta inválido.');for(const state of s.palette)validateBlockState(state);return World.from({...s,placements:[]});}
async function storedChunk(dir,land,cx,cz,chunkPaths={}){try{return World.from(JSON.parse(gunzipSync(await readFile(path.join(dir,...(chunkPaths[`${cx}.${cz}`]||`chunks/${cx}.${cz}.json.gz`).split('/'))))));}catch(e){if(e.code!=='ENOENT')throw e;return null;}}
export async function localAPI(req,res,url){if(!url.pathname.startsWith('/api/'))return false;
 try{
  // Loopback + exact Origin and Host checks prevent a remote page from writing local projects.
  const host=req.headers.host;if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host||''))return json(res,{error:'Host não permitido.'},403),true;
  if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,{error:'Origem não permitida.'},403),true;
  const parts=url.pathname.split('/').filter(Boolean),id=parts[2],action=parts[3];
  await mkdir(ROOT,{recursive:true});
  if(url.pathname==='/api/worlds'&&req.method==='GET'){const list=[];for(const e of await readdir(ROOT)){if(idOK(e)){try{const m=await meta(e);if(m.kind==='snapshot-export')continue;list.push({id:e,name:m.config.name||'Aincrad',width:m.config.width,depth:m.config.depth,height:m.config.height,revision:m.revision});}catch{}}}json(res,list);return true;}
  if(url.pathname==='/api/worlds'&&req.method==='POST'){const b=await body(req),config=largeConfig(b.config),id=randomUUID(),dir=dirFor(id);createLandscape(config);await mkdir(path.join(dir,'chunks'),{recursive:true});await saveMeta(id,{id,config,kind:b.kind==='snapshot-export'?'snapshot-export':'world',revision:0,created:new Date().toISOString()});json(res,{id,config,revision:0},201);return true;}
  if(parts[1]!=='worlds'||!idOK(id))throw Error('Rota inválida.');const m=await meta(id),dir=dirFor(id);
  if(!action&&req.method==='GET'){json(res,{...m,geometry:floorGeometry(largeConfig(m.config))});return true;}
  if(action==='exports'&&req.method==='GET'){let entries=[];try{entries=await readdir(path.join(dir,'exports'));}catch(e){if(e.code!=='ENOENT')throw e;}json(res,entries.filter(n=>n.endsWith('.zip')&&idOK(n.slice(0,-4))).map(n=>({exportId:n.slice(0,-4),download:`/api/worlds/${id}/jobs/${n.slice(0,-4)}/download`})));return true;}
  if(action==='window'&&req.method==='GET'){const x=Number(url.searchParams.get('x')),z=Number(url.searchParams.get('z')),size=Number(url.searchParams.get('size')||64),land=createLandscape(m.config),w=landscapeWindow(land,x,z,size);for(let cz=z/16;cz<(z+size)/16;cz++)for(let cx=x/16;cx<(x+size)/16;cx++){const a=await storedChunk(dir,land,cx,cz,m.chunkPaths);if(!a)continue;const ids=a.palette.map(s=>w.id(s));for(let y=0;y<w.h;y++)for(let zz=0;zz<16;zz++)for(let xx=0;xx<16;xx++)w.set(cx*16-x+xx,y,cz*16-z+zz,ids[a.get(xx,y,zz)]);}json(res,{id,revision:m.revision,x,z,world:{...w.snapshot(),cells:Array.from(w.cells)}});return true;}
  if(action==='window'&&req.method==='PUT'){if(locks.has(id))throw Error('Mundo ocupado com exportação ou gravação.');locks.add(id);try{const b=await body(req);Object.assign(m,await meta(id));if(b.revision!==m.revision)throw Error('Revisão mudou: recarregue a janela antes de salvar.');const w=validateSnapshot(b.world),x=b.x,z=b.z,config=largeConfig(m.config),expected=windowShape(config,x,z,w.w);if(w.w!==w.d||w.h!==expected.height)throw Error('Dimensões da janela divergentes do andar.');
   const stageName='batch-'+randomUUID(),stage=path.join(dir,stageName);await mkdir(stage);const files=[];for(let cz=0;cz<w.d/16;cz++)for(let cx=0;cx<w.w/16;cx++){const a=new World(16,w.h,16);for(let y=0;y<w.h;y++)for(let zz=0;zz<16;zz++)for(let xx=0;xx<16;xx++)a.set(xx,y,zz,w.palette[w.get(cx*16+xx,y,cz*16+zz)]);const name=`${x/16+cx}.${z/16+cz}.json.gz`;await writeFile(path.join(stage,name),gzipSync(JSON.stringify({...a.snapshot(),cells:Array.from(a.cells)})));files.push(name);}m.chunkPaths={...m.chunkPaths};for(const name of files)m.chunkPaths[name.replace('.json.gz','')]=stageName+'/'+name;m.revision++;await saveMeta(id,m);json(res,{revision:m.revision});
  }finally{locks.delete(id);}return true;}
  if(action==='export'&&req.method==='POST'){const b=await body(req);Object.assign(m,await meta(id));if(locks.has(id)||activeExports>=1)throw Error('Aguarde a exportação atual.');let snapshot;if(b.world){const w=validateSnapshot(b.world);snapshot={...w.snapshot(),cells:Array.from(w.cells)};m.config={...m.config,width:Math.max(64,Math.ceil(w.w/16)*16),depth:Math.max(64,Math.ceil(w.d/16)*16),height:Math.min(192,Math.max(64,Math.ceil(w.h/16)*16)),features:{city:false,dungeon:false,labyrinth:false,arena:false,trees:false},mazeLevels:1};}
   const exportId=randomUUID(),job={worldId:id,exportId,progress:0,status:'generating'};jobs.set(exportId,job);locks.add(id);activeExports++;const worker=new Worker(new URL('./export-worker.mjs',import.meta.url),{workerData:{dir,config:m.config,exportId,snapshot,chunkPaths:m.chunkPaths||{}}});let released=false;const release=()=>{if(released)return;released=true;locks.delete(id);activeExports--;};job.worker=worker;worker.on('message',msg=>{if(msg.ready){job.status='ready';job.progress=1;release();}else if(msg.error){job.status='error';job.error=msg.error;release();}else Object.assign(job,msg);});worker.on('error',e=>{job.status='error';job.error=e.message;release();});worker.on('exit',code=>{if(job.status==='generating'){job.status='error';job.error='Processo de exportação interrompido ('+code+').';}release();});json(res,{exportId,status:job.status},202);return true;
  }
  if(action==='jobs'){const exportId=parts[4];if(!idOK(exportId))throw Error('Job inválido.');const job=jobs.get(exportId);if(job&&job.worldId!==id)throw Error('Job de outro mundo.');if(req.method==='DELETE'&&job){await job.worker.terminate();job.status='cancelled';json(res,{status:'cancelled'});return true;}if(parts[5]==='download'){if(job&&job.status!=='ready')throw Error('Exportação ainda não concluída.');const file=path.join(dir,'exports',exportId+'.zip'),info=await stat(file);res.writeHead(200,{'Content-Type':'application/zip','Content-Length':info.size,'Content-Disposition':'attachment; filename="Aincrad-Minecraft-1.21.11.zip"'});createReadStream(file).pipe(res);return true;}if(!job)throw Error('Job não encontrado.');const {worker,...data}=job;json(res,data);return true;}
  json(res,{error:'Rota não encontrada.'},404);
 }catch(e){json(res,{error:e.message},400);}return true;
}
