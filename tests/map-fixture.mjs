import {deflateSync,gzipSync} from 'node:zlib';
// Independently constructed minimal modern Anvil/NBT fixture; no user world data.
const enc=new TextEncoder();
function int(n,bytes){const a=new Uint8Array(bytes),v=new DataView(a.buffer);bytes===1?v.setInt8(0,n):bytes===2?v.setUint16(0,n):bytes===4?v.setInt32(0,n):v.setBigInt64(0,BigInt.asIntN(64,n));return a;}
const join=parts=>{const a=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let off=0;for(const p of parts){a.set(p,off);off+=p.length;}return a;};
const str=s=>join([int(enc.encode(s).length,2),enc.encode(s)]);
function payload(type,v){if(type===1)return int(v,1);if(type===3)return int(v,4);if(type===8)return str(v);if(type===12)return join([int(v.length,4),...v.map(n=>int(n,8))]);if(type===9)return join([int(v.type,1),int(v.values.length,4),...v.values.map(x=>payload(v.type,x))]);if(type===10)return join([...v.map(([t,k,value])=>join([int(t,1),str(k),payload(t,value)])),int(0,1)]);throw Error('fixture tag');}
export function chunkNBT(cx,cz,{entities=[],dataVersion=4671,sectionY=4,solid=false}={}){
 const values=Array(256).fill(0n);for(let y=0;y<7;y++)for(let z=3;z<=7;z++)for(let x=0;x<16;x++){
  const wx=cx*16+x;if(wx<14||wx>18)continue;
  const state=y===0||x===14||wx===18||z===3||z===7?1:0;
  const index=x+z*16+y*256;values[Math.floor(index/16)]|=BigInt(state)<<BigInt(index%16*4);
 }
 const section=[[1,'Y',sectionY],[10,'block_states',solid?[[9,'palette',{type:10,values:[[[8,'Name','minecraft:stone_bricks']]]}]]:[[9,'palette',{type:10,values:[[[8,'Name','minecraft:air']],[[8,'Name','minecraft:stone_bricks']]]}],[12,'data',values]]]];
 const root=[[3,'DataVersion',dataVersion],[3,'xPos',cx],[3,'zPos',cz],[8,'Status','minecraft:full'],[9,'sections',{type:10,values:[section]}],[9,'block_entities',{type:10,values:entities.map(b=>[[3,'x',b.x],[3,'y',b.y],[3,'z',b.z],[8,'id','minecraft:chest']])}]];
 return join([int(10,1),str(''),payload(10,root)]);
}
export function regionBytes(entries=[{x:0,z:0},{x:1,z:0}],format=2){
 const chunks=entries.map(e=>{const raw=chunkNBT(e.x,e.z,e.options),bytes=format===1?gzipSync(raw):format===2?deflateSync(raw):raw;const data=join([int(bytes.length+1,4),int(format,1),bytes]);return {...e,data,count:Math.ceil(data.length/4096)};});
 const out=new Uint8Array((2+chunks.reduce((n,c)=>n+c.count,0))*4096),header=new DataView(out.buffer);let sector=2;
 for(const c of chunks){const local=((c.x%32+32)%32)+((c.z%32+32)%32)*32;header.setUint32(local*4,(sector<<8)|c.count);out.set(c.data,sector*4096);sector+=c.count;}return out;
}
