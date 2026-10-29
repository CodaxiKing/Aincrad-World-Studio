const directions=['east','west','up','down','south','north'];
export class MinecraftModels{
 constructor(lib,definitions,models,registry,atlas,width,height){Object.assign(this,{lib,definitions,models,registry,atlas,width,height});this.modelCache=new Map();this.definitionCache=new Map();this.cache=new Map();this.solids=new Map();this.unsupported=new Set();}
 model(id){const name=id.toString().replace('minecraft:','');if(this.modelCache.has(name))return this.modelCache.get(name);const data=this.models[name];if(!data)return null;const model=this.lib.BlockModel.fromJson(data.parent?.includes('builtin/')?{...data,parent:undefined}:data);this.modelCache.set(name,model);model.flatten({getBlockModel:id=>this.model(id)});return model;}
 state(state){const match=state.match(/^minecraft:([^\[]+)(?:\[(.*)\])?$/);if(!match)return null;const name=match[1],props={...(this.registry[name]?.[1]||{})};for(const pair of (match[2]||'').split(',')){if(!pair)continue;const [key,value]=pair.split('=');props[key]=value;}return {name,props};}
 bake(state,mask=0){const key=state+'|'+mask;if(this.cache.has(key))return this.cache.get(key);const parsed=this.state(state),lib=this.lib;let quads=[];
  try{if(!parsed)throw Error('Estado inválido');const {name,props}=parsed;let def=this.definitionCache.get(name);if(!def){if(!this.definitions[name])throw Error('Sem definição');def=lib.BlockDefinition.fromJson(this.definitions[name]);this.definitionCache.set(name,def);}
   const cull=Object.fromEntries(directions.map((d,i)=>[d,!!(mask&(1<<i))]));
   const atlas={getTextureUV:id=>{const p=this.atlas[id.toString().replace('minecraft:','')];if(!p)return [0,0,16/this.width,16/this.height];const [x,y,w,h]=p;return [x/this.width,y/this.height,(x+w)/this.width,(y+Math.min(w,h))/this.height];}};
   quads=def.getMesh(lib.Identifier.parse('minecraft:'+name),props,atlas,{getBlockModel:id=>this.model(id)},cull).quads;
   if(!quads.length&&mask===0&&!['air','cave_air','void_air','water','lava'].includes(name))throw Error('Modelo especial');
  }catch{this.unsupported.add(state);}
  const out=[];for(const quad of quads){const normal=quad.normal().components(),light=normal[1]>.5?1:normal[1]<-.5?.5:Math.abs(normal[0])>.5?.75:.88,vertices=quad.vertices();for(const k of [0,1,2,0,2,3]){const v=vertices[k];out.push(...v.pos.components(),...(v.color||[1,1,1]).map(c=>c*light),...(v.texture||[0,0]));}}
  if(!out.length&&mask!==63&&!/^minecraft:(air|cave_air|void_air)/.test(state)&&!quads.length){const name=parsed?.name;
   if(name==='water'||name==='lava'){const p=this.atlas[`block/${name}_still`];if(p)out.push(...this.cube(p,mask,name==='water'?[.3,.6,1]:[1,1,1]));}
   else if(this.unsupported.has(state))out.push(...this.cube([0,0,16,16],mask,[1,.1,1]));
  }
  const data=new Float32Array(out);this.cache.set(key,data);return data;
 }
 cube(p,mask,tint){const [x,y,w,h]=p,u0=x/this.width,v0=y/this.height,u1=(x+w)/this.width,v1=(y+Math.min(w,h))/this.height,coords=[[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]],uv=[[u0,v1],[u0,v0],[u1,v0],[u1,v1]],out=[];coords.forEach((c,i)=>{if(mask&(1<<i))return;for(const k of [0,1,2,0,2,3])out.push(...c[k],...tint,...uv[k]);});return out;}
 solid(state){if(this.solids.has(state))return this.solids.get(state);const d=this.bake(state),p=this.state(state),excluded=/glass|leaves|water|lava|ice|slime|honey/.test(p?.name||'');let full=!excluded&&d.length>=288;
  if(full){const planes=new Set();for(let i=0;i<d.length;i+=48){const ps=Array.from({length:6},(_,k)=>[d[i+k*8],d[i+k*8+1],d[i+k*8+2]]);const axis=[0,1,2].find(a=>ps.every(v=>v[a]===ps[0][a])&&(ps[0][a]===0||ps[0][a]===1));if(axis===undefined){full=false;break;}planes.add(axis+':'+ps[0][axis]);}full=full&&planes.size===6;}
  this.solids.set(state,full);return full;
 }
}
let resources=null,loading=null;
export const minecraftResources=()=>resources;
export async function loadMinecraftResources(){if(resources)return resources;if(loading)return loading;loading=(async()=>{
 const lib=globalThis.deepslate;if(!lib)throw Error('Biblioteca Deepslate não carregada.');
 const names=['blockstates','models','registry','atlas'],data=await Promise.all(names.map(async n=>{const r=await fetch(`./assets/minecraft/${n}.json`);if(!r.ok)throw Error('Dados Minecraft não encontrados.');return r.json();}));
 const image=new Image();image.src='./assets/minecraft/atlas.png';await image.decode();resources=new MinecraftModels(lib,...data,image.width,image.height);resources.image=image;return resources;
 })();return loading;}
export function texturedMesh(world,cut=Infinity,models=resources){if(!models)return null;const parts=[];let length=0,faces=0;const air=world.palette.map(s=>/^minecraft:(air|cave_air|void_air)$/.test(s)),solid=world.palette.map(s=>!/^minecraft:(air|cave_air|void_air)$/.test(s)&&models.solid(s)),fluid=world.palette.map(s=>s.match(/^minecraft:(water|lava)(?:\[|$)/)?.[1]),neighbors=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 for(let y=0;y<Math.min(cut,world.h);y++)for(let z=0;z<world.d;z++)for(let x=0;x<world.w;x++){const id=world.get(x,y,z);if(air[id])continue;let mask=0;for(let i=0;i<6;i++){const [dx,dy,dz]=neighbors[i];const other=world.get(x+dx,y+dy,z+dz);if(y+dy<cut&&(solid[other]||fluid[id]&&fluid[id]===fluid[other]))mask|=1<<i;}if(mask===63&&(solid[id]||fluid[id]))continue;const data=models.bake(world.palette[id],mask);faces+=data.length/48;if(faces>250000)throw Error('Cena texturizada excede 250 mil faces. Reduza o tamanho.');if(data.length){parts.push({x,y,z,data});length+=data.length;}}
 const out=new Float32Array(length);let p=0;for(const {x,y,z,data}of parts)for(let i=0;i<data.length;i+=8){out[p++]=data[i]+x;out[p++]=data[i+1]+y;out[p++]=data[i+2]+z;for(let k=3;k<8;k++)out[p++]=data[i+k];}return out;
}
