// Limited, defensive NBT reader for untrusted Sponge schematics. No executable data.
export const MAX_VOLUME=2097152, MAX_BYTES=64*1024*1024;
export function readNBT(bytes){
 if(bytes.byteLength>MAX_BYTES)throw Error('NBT excede 64 MiB descomprimidos.');
 const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength); let p=0,tags=0;
 function need(n){if(!Number.isSafeInteger(n)||n<0||p+n>view.byteLength)throw Error('NBT truncado ou tamanho inválido.');}
 function num(n,fn){need(n);const v=view[fn](p);p+=n;return v;}
 const u8=()=>num(1,'getUint8'),i32=()=>num(4,'getInt32');
 function string(){const n=num(2,'getUint16');need(n);const s=new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(p,p+n));p+=n;return s;}
 function length(){const n=i32();if(n<0||n>MAX_VOLUME*5)throw Error('Lista NBT excede a quota.');return n;}
 function payload(type,depth=0){
  if(depth>32||++tags>1000000)throw Error('Complexidade NBT excede a quota.');
  switch(type){
   case 1:return num(1,'getInt8');case 2:return num(2,'getInt16');case 3:return i32();
   case 4:return num(8,'getBigInt64');case 5:return num(4,'getFloat32');case 6:return num(8,'getFloat64');
   case 7:{const n=length();need(n);const a=bytes.slice(p,p+n);p+=n;return a;}
   case 8:return string();
   case 9:{const t=u8(),n=length();if(t===0&&n)throw Error('Lista NBT inválida.');return Array.from({length:n},()=>payload(t,depth+1));}
   case 10:{const o=Object.create(null);while(true){const t=u8();if(!t)break;const k=string();if(Object.hasOwn(o,k))throw Error('Tag NBT duplicada.');o[k]=payload(t,depth+1);}return o;}
   case 11:{const n=length();need(n*4);return Array.from({length:n},i32);}
   case 12:{const n=length();need(n*8);return Array.from({length:n},()=>num(8,'getBigInt64'));}
   default:throw Error('Tipo NBT inválido.');
  }
 }
 if(u8()!==10)throw Error('Raiz NBT deve ser Compound.');string();const root=payload(10);if(p!==bytes.length)throw Error('Dados extras após o NBT.');return root;
}
export async function boundedDecompress(bytes){
 if(bytes.byteLength>16*1024*1024)throw Error('Arquivo comprimido excede 16 MiB.');
 if(bytes[0]!==31||bytes[1]!==139)return bytes;
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const parts=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_BYTES)throw Error('Expansão gzip excede 64 MiB.');parts.push(value);}}catch(e){await reader.cancel();throw e;}
 const all=new Uint8Array(size);let n=0;for(const part of parts){all.set(part,n);n+=part.length;}return all;
}
export function decodeSchematic(root){
 const s=root.Schematic||root,version=s.Version;
 if(version!==2&&version!==3)throw Error('Somente Sponge .schem v2 e v3 são aceitos.');
 const w=s.Width,h=s.Height,d=s.Length;
 if(![w,h,d].every(n=>Number.isInteger(n)&&n>0&&n<=512)||w*h*d>MAX_VOLUME)throw Error('Máximo de 2.097.152 posições e 512 blocos por eixo.');
 if(!Number.isInteger(s.DataVersion)||s.DataVersion>4671||s.DataVersion<0)throw Error('DataVersion inválido ou posterior ao alvo 1.21.11.');
 const b=version===3?s.Blocks:s;
 if(!b||!b.Palette)throw Error('Paleta de blocos ausente.');
 if((b.BlockEntities?.length||s.BlockEntities?.length||s.Entities?.length||s.Biomes||s.BiomeData||s.BiomePalette))throw Error('Este MVP não importa entidades, block entities ou biomas. Remova esses dados em uma cópia do arquivo para evitar perda silenciosa.');
 const entries=Object.entries(b.Palette);
 if(!entries.length||entries.length>65534)throw Error('Paleta inválida ou grande demais.');
 const ids=new Set();const palette=[];
 for(const [state,id] of entries){if(!Number.isInteger(id)||id<0||id>65533||ids.has(id)||!/^minecraft:[a-z0-9_]+(?:\[[a-z0-9_=,]+\])?$/.test(state))throw Error('Paleta inválida ou blocos de mods não suportados.');if(/command_block|structure_block|jigsaw/.test(state))throw Error('Blocos de comando e execução são bloqueados.');ids.add(id);palette[id]=state;}
 const data=version===3?b.Data:s.BlockData;if(!(data instanceof Uint8Array))throw Error('Dados voxel ausentes.');
 const cells=new Uint16Array(w*h*d);let p=0;
 for(let i=0;i<cells.length;i++){let id=0,shift=0;while(true){if(p>=data.length||shift>28)throw Error('VarInt de blocos inválido.');const v=data[p++];id+=(v&127)*2**shift;if(!(v&128))break;shift+=7;}if(!ids.has(id))throw Error('Índice fora da paleta.');cells[i]=id;}
 if(p!==data.length)throw Error('Contagem de blocos divergente.');
 const offset=s.Offset||[0,0,0];if(offset.length!==3||!offset.every(Number.isInteger))throw Error('Offset inválido.');
 // Canonical air at index zero makes out-of-bounds queries safe for the voxel engine.
 const canonical=['minecraft:air'],remap=[];
 for(const id of ids){const state=palette[id];let index=canonical.indexOf(state);if(index<0)index=canonical.push(state)-1;remap[id]=index;}
 for(let i=0;i<cells.length;i++)cells[i]=remap[cells[i]];
 return {w,h,d,cells,palette:canonical,offset,dataVersion:s.DataVersion,format:version};
}
export async function importSchematic(bytes){return decodeSchematic(readNBT(await boundedDecompress(bytes)));}
export function encodeSchematic(world){
 const parts=[];const enc=new TextEncoder();
 const raw=a=>parts.push(new Uint8Array(a));
 function number(n,len){const a=new Uint8Array(len),v=new DataView(a.buffer);len===1?v.setUint8(0,n):len===2?v.setInt16(0,n):v.setInt32(0,n);raw(a);}
 function text(s){const b=enc.encode(s);number(b.length,2);raw(b);}
 function tag(type,name,fn){number(type,1);text(name);fn();}
 tag(10,'',()=>{tag(10,'Schematic',()=>{
  tag(3,'Version',()=>number(3,4));tag(3,'DataVersion',()=>number(4671,4));
  for(const [name,val]of [['Width',world.w],['Height',world.h],['Length',world.d]])tag(2,name,()=>number(val,2));
  tag(11,'Offset',()=>{number(3,4);for(const n of world.offset||[0,0,0])number(n,4);});
  tag(10,'Blocks',()=>{tag(10,'Palette',()=>{world.palette.forEach((s,i)=>tag(3,s,()=>number(i,4)));number(0,1);});
   const data=[];for(let n of world.cells){do{let b=n&127;n>>>=7;if(n)b|=128;data.push(b);}while(n);}
   tag(7,'Data',()=>{number(data.length,4);raw(data);});number(0,1);
  });number(0,1);
 });number(0,1);});
 const len=parts.reduce((n,a)=>n+a.length,0),out=new Uint8Array(len);let p=0;for(const a of parts){out.set(a,p);p+=a.length;}return out;
}
export async function gzip(bytes){return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());}
