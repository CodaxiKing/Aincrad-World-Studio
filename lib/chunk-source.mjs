import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {World} from '../dist/world.js';
import {createLandscape} from '../dist/advanced-generation.js';
import {floorChunk,coreIntersects} from '../dist/floor-shell.js';

// Fonte única de chunks para exportação: snapshot do editor, chunk editado em disco ou geração procedural.
export function createSource({dir,config,snapshot,chunkPaths={}}){
 const land=createLandscape(config),effective=land.config,full=snapshot?World.from(snapshot):null;
 async function source(cx,cz){
  if(full){let base=null;if(coreIntersects(effective,cx,cz)){base=new World(16,full.h,16);for(let y=0;y<base.h;y++)for(let z=0;z<16;z++)for(let x=0;x<16;x++)base.set(x,y,z,full.palette[full.get(cx*16+x,y,cz*16+z)]);}return floorChunk(effective,cx,cz,base);}
  try{return World.from(JSON.parse(gunzipSync(await readFile(path.join(dir,...(chunkPaths[`${cx}.${cz}`]||`chunks/${cx}.${cz}.json.gz`).split('/'))))));}catch(e){if(e.code!=='ENOENT')throw e;return land.chunk(cx,cz);}
 }
 return {land,effective,full,source};
}
