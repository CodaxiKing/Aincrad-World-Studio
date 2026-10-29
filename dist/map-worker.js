import {extractMap,listChunks,readChunk} from './anvil.js';
self.onmessage=async({data})=>{try{
 if(data.action==='index'){
  const chunks=await listChunks(data.file);let suggested=null;
  if(chunks.length){const root=await readChunk(data.file,chunks[0]);const ys=root.sections.filter(s=>s.block_states?.palette?.some(p=>p.Name&&!['minecraft:air','minecraft:cave_air','minecraft:void_air'].includes(p.Name))).map(s=>s.Y);const top=ys.length?Math.min(319,Math.max(...ys)*16+15):79;suggested={minY:Math.max(-64,top-79),maxY:top};}
  self.postMessage({result:{chunks,suggested}});
 }else{const result=await extractMap(data.files,data.box,data.options);self.postMessage({result},[result.cells.buffer]);}
}catch(e){self.postMessage({error:e.message});}};
