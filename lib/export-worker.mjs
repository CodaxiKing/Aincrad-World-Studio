import {exportReferenceSchematics} from './schematic-export.mjs';
import {parentPort,workerData} from 'node:worker_threads';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {World} from '../dist/world.js';
import {createLandscape} from '../dist/advanced-generation.js';
import {floorChunkEntries,floorGeometry,floorChunk,coreIntersects} from '../dist/floor-shell.js';
import {RegionWriter,encodeChunk,writeMetadata,zipDirectory} from './world-export.mjs';
const {dir,config,exportId,snapshot,chunkPaths={}}=workerData;
try{
 if(workerData.kind==='schematics'){const result=await exportReferenceSchematics({dir,config,exportId,onProgress:p=>parentPort.postMessage(p)});parentPort.postMessage({ready:true,...result});}else{
 const land=createLandscape(config),effective=land.config,full=snapshot?World.from(snapshot):null,out=path.join(dir,'exports',exportId),region=new RegionWriter(path.join(out,'region'));
 const entries=floorChunkEntries(effective,Object.keys(chunkPaths)),total=entries.length;await mkdir(out,{recursive:true});let done=0;
 async function source(cx,cz){
  if(full){let base=null;if(coreIntersects(effective,cx,cz)){base=new World(16,full.h,16);for(let y=0;y<base.h;y++)for(let z=0;z<16;z++)for(let x=0;x<16;x++)base.set(x,y,z,full.palette[full.get(cx*16+x,y,cz*16+z)]);}return floorChunk(effective,cx,cz,base);}
  try{return World.from(JSON.parse(gunzipSync(await readFile(path.join(dir,...(chunkPaths[`${cx}.${cz}`]||`chunks/${cx}.${cz}.json.gz`).split('/'))))));}catch(e){if(e.code!=='ENOENT')throw e;return land.chunk(cx,cz);}
 }
 try{for(const {x:cx,z:cz}of entries){const w=await source(cx,cz);await region.append(cx,cz,encodeChunk(w,cx,cz,land.theme));done++;if(done%4===0||done===total)parentPort.postMessage({progress:done/total,done,total});}}finally{await region.close();}
 const sx=Math.floor((full?.w||effective.width)/2),sz=Math.floor((full?.d||effective.depth)/2),spawnChunk=await source(Math.floor(sx/16),Math.floor(sz/16)),top=spawnChunk.top(sx%16,sz%16);
 if(top<0)throw Error('O centro do mapa não possui chão para o spawn.');
 await writeMetadata(out,effective,[sx,Math.min(318,top+2),sz]);
 await writeFile(path.join(out,'aincrad-project.json'),JSON.stringify({config:effective,geometry:floorGeometry(effective),exportId,chunks:total,generated:new Date().toISOString(),lighting:'Minecraft on load',validation:'NBT/Anvil; game validation pending'}));
 await zipDirectory(out,path.join(dir,'exports',exportId+'.partial'));await rename(path.join(dir,'exports',exportId+'.partial'),path.join(dir,'exports',exportId+'.zip'));parentPort.postMessage({ready:true});
 }
}catch(e){parentPort.postMessage({error:e.message});}
