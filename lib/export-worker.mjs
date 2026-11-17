import {exportReferenceSchematics} from './schematic-export.mjs';
import {parentPort,workerData,Worker} from 'node:worker_threads';
import {mkdir,writeFile,rename} from 'node:fs/promises';
import {availableParallelism} from 'node:os';
import path from 'node:path';
import {floorChunkEntries,floorGeometry} from '../dist/floor-shell.js';
import {RegionWriter,writeMetadata,zipDirectory} from './world-export.mjs';
import {createSource} from './chunk-source.mjs';
const {dir,config,exportId,snapshot,chunkPaths={}}=workerData;
try{
 if(workerData.kind==='schematics'){const result=await exportReferenceSchematics({dir,config,exportId,onProgress:p=>parentPort.postMessage(p)});parentPort.postMessage({ready:true,...result});}else{
 const {land,effective,full,source}=createSource({dir,config,snapshot,chunkPaths}),out=path.join(dir,'exports',exportId),region=new RegionWriter(path.join(out,'region'));
 const entries=floorChunkEntries(effective,Object.keys(chunkPaths)),total=entries.length;await mkdir(out,{recursive:true});let done=0;
 // Lotes gerados em paralelo por vários núcleos e gravados estritamente em ordem (o RegionWriter exige regiões agrupadas).
 const size=24,batches=[];for(let i=0;i<total;i+=size)batches.push(entries.slice(i,i+size));
 const count=Math.max(1,Math.min(8,availableParallelism()-1,batches.length)),workers=Array.from({length:count},()=>new Worker(new URL('./chunk-worker.mjs',import.meta.url),{workerData:{dir,config,snapshot,chunkPaths}}));
 try{await new Promise((resolve,reject)=>{
   if(!batches.length)return resolve();let next=0,written=0,chain=Promise.resolve();const results=new Map();
   const feed=w=>{if(next<batches.length&&next-written<count*3){const id=next++;w.busy=true;w.postMessage({id,entries:batches[id]});}else w.busy=false;};
   const flush=()=>{chain=chain.then(async()=>{while(results.has(written)){const chunks=results.get(written),list=batches[written];results.delete(written);for(let k=0;k<list.length;k++)await region.appendCompressed(list[k].x,list[k].z,Buffer.from(chunks[k].buffer,chunks[k].byteOffset,chunks[k].length));done+=list.length;written++;parentPort.postMessage({progress:done/total,done,total,workers:count});}
     if(written===batches.length)resolve();else for(const w of workers)if(!w.busy)feed(w);}).catch(reject);};
   for(const w of workers){w.on('message',m=>{if(m.error)return reject(Error(m.error));results.set(m.id,m.chunks);feed(w);flush();});w.on('error',reject);feed(w);}
  });}finally{await Promise.all(workers.map(w=>w.terminate()));await region.close();}
 const [sx,sz]=!full&&land.spawn||[Math.floor((full?.w||effective.width)/2),Math.floor((full?.d||effective.depth)/2)],spawnChunk=await source(Math.floor(sx/16),Math.floor(sz/16)),top=spawnChunk.top(((sx%16)+16)%16,((sz%16)+16)%16);
 if(top<0)throw Error('O centro do mapa não possui chão para o spawn.');
 await writeMetadata(out,effective,[sx,Math.min(318,top+2),sz]);
 await writeFile(path.join(out,'aincrad-project.json'),JSON.stringify({config:effective,geometry:floorGeometry(effective),exportId,chunks:total,generated:new Date().toISOString(),lighting:'Minecraft on load',validation:'NBT/Anvil; game validation pending'}));
 await zipDirectory(out,path.join(dir,'exports',exportId+'.partial'));await rename(path.join(dir,'exports',exportId+'.partial'),path.join(dir,'exports',exportId+'.zip'));parentPort.postMessage({ready:true});
 }
}catch(e){parentPort.postMessage({error:e.message});}
