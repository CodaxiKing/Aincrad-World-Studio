import {readNBT,MAX_VOLUME} from './nbt.js';
import {World,isAir} from './world.js';
export const REGION_LIMIT=256*1024*1024;
export function regionName(name){const m=name.match(/^r\.(-?\d+)\.(-?\d+)\.mca$/i);if(!m)throw Error('Nome de região inválido. Use r.X.Z.mca.');const [x,z]=m.slice(1).map(Number);if(![x,z].every(n=>Number.isSafeInteger(n)&&Math.abs(n)<=2000000))throw Error('Coordenada de região inválida.');return {x,z};}
export function indexRegion(header,size,name){
 if(header.length<8192||size<8192||size>REGION_LIMIT)throw Error('Região truncada ou maior que 256 MiB.');
 const {x,z}=regionName(name),chunks=[],v=new DataView(header.buffer,header.byteOffset,header.byteLength),ranges=[];
 for(let i=0;i<1024;i++){const location=v.getUint32(i*4),sector=location>>>8,count=location&255;if(!sector&&!count)continue;if(sector<2||!count||sector*4096+count*4096>size)throw Error('Tabela de setores da região está corrompida.');ranges.push([sector,sector+count]);chunks.push({x:x*32+i%32,z:z*32+Math.floor(i/32),sector,count});}
 ranges.sort((a,b)=>a[0]-b[0]);for(let i=1;i<ranges.length;i++)if(ranges[i][0]<ranges[i-1][1])throw Error('Setores de chunks sobrepostos.');return chunks;
}
export async function expandChunk(bytes,format){
 if(![1,2,3].includes(format))throw Error(format&128?'Chunk externo .mcc não suportado.':'Compressão de chunk não suportada. Aceitos gzip, zlib e sem compressão.');
 if(format===3){if(bytes.length>8*1024*1024)throw Error('Chunk excede 8 MiB.');return bytes;}
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream(format===1?'gzip':'deflate')).getReader();const chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8*1024*1024)throw Error('Chunk expandido excede 8 MiB.');chunks.push(value);}}catch(e){await reader.cancel();throw e;}
 const out=new Uint8Array(size);let n=0;for(const c of chunks){out.set(c,n);n+=c.length;}return out;
}
export async function readChunk(file,entry){
 const head=new Uint8Array(await file.slice(entry.sector*4096,entry.sector*4096+5).arrayBuffer());if(head.length!==5)throw Error('Cabeçalho de chunk incompleto.');const len=new DataView(head.buffer).getUint32(0);
 if(len<2||len+4>entry.count*4096)throw Error('Comprimento de chunk inválido.');
 const bytes=new Uint8Array(await file.slice(entry.sector*4096+5,entry.sector*4096+4+len).arrayBuffer());
 const root=readNBT(await expandChunk(bytes,head[4]));
 if(!Number.isInteger(root.DataVersion)||root.DataVersion<2860||root.DataVersion>4671)throw Error('Aceitos chunks modernos de Java 1.18 até 1.21.11, sem conversão automática.');
 if(root.xPos!==entry.x||root.zPos!==entry.z)throw Error('Coordenadas NBT não coincidem com o índice da região.');
 if(!Array.isArray(root.sections)||root.sections.length>256||!root.sections.every(s=>s&&Number.isInteger(s.Y)&&s.Y>=-128&&s.Y<=127))throw Error('Chunk sem sections modernas válidas.');
 return root;
}
export function stateName(entry){
 if(!entry||typeof entry.Name!=='string'||!/^minecraft:[a-z0-9_]+$/.test(entry.Name)||/command_block|structure_block|jigsaw/.test(entry.Name))throw Error('Material de mod, inválido ou executável na seleção.');
 if(!entry.Properties)return entry.Name;
 const props=Object.entries(entry.Properties).sort(([a],[b])=>a.localeCompare(b));if(!props.every(([k,v])=>/^[a-z0-9_]+$/.test(k)&&typeof v==='string'&&/^[a-z0-9_]+$/.test(v)))throw Error('Propriedades de bloco inválidas.');
 return entry.Name+(props.length?'['+props.map(([k,v])=>`${k}=${v}`).join(',')+']':'');
}
export function decodeSection(section){
 if(!Number.isInteger(section.Y)||section.Y<-128||section.Y>127)throw Error('Altura de seção inválida.');
 if(!section.block_states)return null;const {palette,data}=section.block_states;
 if(!Array.isArray(palette)||!palette.length||palette.length>4096)throw Error('Paleta de seção inválida.');
 // Keep raw states: reject unsupported materials only if they occur in the actual crop.
 const cells=new Uint16Array(4096);
 if(palette.length>1){const bits=Math.max(4,Math.ceil(Math.log2(palette.length))),perLong=Math.floor(64/bits),expected=Math.ceil(4096/perLong),mask=(1n<<BigInt(bits))-1n;
  if(!Array.isArray(data)||data.length!==expected||data.some(n=>typeof n!=='bigint'))throw Error('Long array de block_states inválido.');
  for(let i=0;i<4096;i++){const id=Number((BigInt.asUintN(64,data[Math.floor(i/perLong)])>>BigInt(i%perLong*bits))&mask);if(id>=palette.length)throw Error('Estado fora da paleta da seção.');cells[i]=id;}
 }else if(data&&(!Array.isArray(data)||data.length!==0))throw Error('Seção uniforme possui dados inesperados.');
 return {y:section.Y,palette,cells};
}
export function validateBox(box){
 for(const k of ['minX','maxX','minY','maxY','minZ','maxZ'])if(!Number.isSafeInteger(box[k])||Math.abs(box[k])>30000000)throw Error('Seleção precisa de coordenadas inteiras válidas.');
 const w=box.maxX-box.minX+1,h=box.maxY-box.minY+1,d=box.maxZ-box.minZ+1;
 if(![w,h,d].every(n=>n>0&&n<=512)||w*h*d>MAX_VOLUME)throw Error('Seleção invertida ou maior que 2.097.152 blocos / 512 por eixo.');
 if(box.minY<-64||box.maxY>319)throw Error('Neste importador, Y deve ficar entre -64 e 319.');
 const chunks=(Math.floor(box.maxX/16)-Math.floor(box.minX/16)+1)*(Math.floor(box.maxZ/16)-Math.floor(box.minZ/16)+1);if(chunks>256)throw Error('Selecione no máximo 256 chunks por cópia.');
 return {w,h,d};
}
export function copyChunks(chunks,box,{allowBlockEntityLoss=false}={}){
 const {w,h,d}=validateBox(box),out=new World(w,h,d),found=new Set();let dropped=0,entities=0,maxVersion=0,solid=0;
 const paletteMap=new Map([['minecraft:air',0]]);
 for(const root of chunks){
  const cx=root.xPos,cz=root.zPos,key=`${cx},${cz}`;if(found.has(key))throw Error('Chunk duplicado.');found.add(key);maxVersion=Math.max(maxVersion,root.DataVersion);
  for(const b of root.block_entities||[]){if(![b.x,b.y,b.z].every(Number.isInteger))throw Error('Block entity com posição inválida.');if(b.x>=box.minX&&b.x<=box.maxX&&b.y>=box.minY&&b.y<=box.maxY&&b.z>=box.minZ&&b.z<=box.maxZ){if(!allowBlockEntityLoss)throw Error('A seleção contém baús, placas ou outros blocos com dados especiais. Ative a cópia somente de blocos para ignorar esses dados conscientemente, ou ajuste a seleção.');dropped++;}}
  entities+=(root.entities||[]).length;
  const seen=new Set();for(const section of root.sections){if(section.Y*16>box.maxY||section.Y*16+15<box.minY)continue;if(seen.has(section.Y))throw Error('Seção duplicada no chunk.');seen.add(section.Y);const s=decodeSection(section);if(!s)continue;const ids=new Map();
   for(let y=Math.max(box.minY,s.y*16);y<=Math.min(box.maxY,s.y*16+15);y++)for(let z=Math.max(box.minZ,cz*16);z<=Math.min(box.maxZ,cz*16+15);z++)for(let x=Math.max(box.minX,cx*16);x<=Math.min(box.maxX,cx*16+15);x++){
    const id=s.cells[(x-cx*16)+(z-cz*16)*16+(y-s.y*16)*256];let canonical=ids.get(id);
    if(canonical===undefined){const state=stateName(s.palette[id]);canonical=paletteMap.get(state);if(canonical===undefined){canonical=out.id(state);paletteMap.set(state,canonical);}ids.set(id,canonical);}
    out.set(x-box.minX,y-box.minY,z-box.minZ,canonical);if(!isAir(out.palette[canonical]))solid++;
   }
  }
 }
 for(let cz=Math.floor(box.minZ/16);cz<=Math.floor(box.maxZ/16);cz++)for(let cx=Math.floor(box.minX/16);cx<=Math.floor(box.maxX/16);cx++)if(!found.has(`${cx},${cz}`))throw Error(`Chunk ${cx}, ${cz} ausente. Não é seguro substituir uma área desconhecida por ar.`);
 if(!solid)throw Error('A seleção contém apenas ar. Ajuste as coordenadas.');
 return {...out.snapshot(),sourceBox:{...box},offset:[box.minX,box.minY,box.minZ],dataVersion:maxVersion,sourceKind:'map',droppedBlockEntities:dropped,ignoredEntities:entities,solid};
}
export async function listChunks(file){return indexRegion(new Uint8Array(await file.slice(0,8192).arrayBuffer()),file.size,file.name);}
export async function extractMap(files,box,options={}){
 validateBox(box);const map=new Map();for(const f of files){const pos=regionName(f.name),key=`${pos.x},${pos.z}`;if(map.has(key))throw Error('Região duplicada. Escolha apenas uma dimensão do mapa.');map.set(key,f);}
 const loaded=[],indices=new Map();
 for(let cz=Math.floor(box.minZ/16);cz<=Math.floor(box.maxZ/16);cz++)for(let cx=Math.floor(box.minX/16);cx<=Math.floor(box.maxX/16);cx++){
  const key=`${Math.floor(cx/32)},${Math.floor(cz/32)}`,file=map.get(key);if(!file)throw Error(`Região r.${key.replace(',','.')}.mca não fornecida.`);
  if(!indices.has(key))indices.set(key,await listChunks(file));const entry=indices.get(key).find(e=>e.x===cx&&e.z===cz);if(!entry)throw Error(`Chunk ${cx}, ${cz} não gerado no mapa original.`);
  const root=await readChunk(file,entry);
  // Retain only selected vertical sections; unrelated NBT is discarded between chunk reads.
  loaded.push({DataVersion:root.DataVersion,xPos:root.xPos,zPos:root.zPos,sections:root.sections.filter(s=>s.Y*16<=box.maxY&&s.Y*16+15>=box.minY),block_entities:root.block_entities||[]});
 }
 return copyChunks(loaded,box,options);
}
