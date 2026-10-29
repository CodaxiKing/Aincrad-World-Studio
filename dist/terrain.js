const AIR='minecraft:air';
const air=s=>/^minecraft:(air|cave_air|void_air)$/.test(s);
export const isTerrain=s=>/^minecraft:(stone|dirt|grass_block|coarse_dirt|rooted_dirt|podzol|mycelium|dirt_path|granite|diorite|andesite|deepslate|tuff|calcite|sand|red_sand|gravel|clay|terracotta|mud|packed_mud|snow_block|netherrack|end_stone|moss_block)(\[.*\])?$/.test(s);
export function terrainColumn(world,x,z){
 let top=-1;for(let y=world.h-1;y>=0;y--)if(isTerrain(world.palette[world.get(x,y,z)])){top=y;break;}
 if(top<0)return {top:-1,bottom:-1,surface:null,obstructed:false};
 let bottom=top;while(bottom>0&&isTerrain(world.palette[world.get(x,bottom-1,z)]))bottom--;
 let obstructed=false;for(let y=top+1;y<world.h;y++)if(!air(world.palette[world.get(x,y,z)])){obstructed=true;break;}
 return {top,bottom,surface:world.palette[world.get(x,top,z)],obstructed};
}
// Produces edits without mutating the source; cuts never fill caves under the surface.
export function reshapeColumn(world,x,z,target,{protect=true,minThickness=3,maxChange=24}={}){
 const c=terrainColumn(world,x,z);if(c.top<0)return {changes:[],skipped:'void'};
 if(protect&&c.obstructed)return {changes:[],skipped:'protected'};
 if(!Number.isInteger(target)||target<0||target>=world.h)throw Error('Cota do terreno fora dos limites.');
 if(Math.abs(target-c.top)>maxChange)throw Error(`Corte ou aterro acima de ${maxChange} blocos. Ajuste a altura.`);
 if(target<c.bottom+Math.min(minThickness,c.top-c.bottom+1)-1)return {changes:[],skipped:'thin'};
 const changes=[];const write=(y,state)=>{const before=world.palette[world.get(x,y,z)];if(before===state)return;if(protect&&!air(before)&&!isTerrain(before))throw Error('Adaptação atingiria uma construção protegida.');changes.push({idx:world.index(x,y,z),before,after:state});};
 for(let y=c.top;y>target;y--)write(y,AIR);
 const organic=/^minecraft:(grass_block|dirt|coarse_dirt|rooted_dirt|podzol|mycelium|dirt_path|moss_block)$/.test(c.surface);
 for(let y=c.top+1;y<=target;y++)write(y,organic?(y===target?c.surface:y>=target-2?'minecraft:dirt':'minecraft:stone'):c.surface);
 if(target<c.top&&target>=c.bottom)write(target,c.surface);
 if(target>c.top&&organic)write(c.top,target-c.top<=2?'minecraft:dirt':'minecraft:stone');
 return {changes,skipped:null};
}
export function placementSupports(asset,t){
 const all=[];let minimum=Infinity;
 for(let z=0;z<asset.d;z++)for(let x=0;x<asset.w;x++)for(let y=0;y<asset.h;y++){
  if(air(asset.palette[asset.get(x,y,z)]))continue;
  minimum=Math.min(minimum,y);let xx=t.mirrorX?asset.w-1-x:x,zz=t.mirrorZ?asset.d-1-z:z;
  const a=xx,b=zz;switch(t.rotation){case 90:xx=asset.d-1-b;zz=a;break;case 180:xx=asset.w-1-a;zz=asset.d-1-b;break;case 270:xx=b;zz=asset.w-1-a;break;}
  all.push({x:t.x+xx,z:t.z+zz,localY:y,target:t.y+y-1});break;
 }
 if(!all.length)throw Error('A construção não contém blocos de apoio.');
 return all.filter(p=>p.localY<=minimum+2);
}
export function suggestPlacementHeight(world,asset,t){
 const supports=placementSupports(asset,{...t,y:0}),heights=[];
 for(const p of supports){if(!world.inside(p.x,0,p.z))continue;const c=terrainColumn(world,p.x,p.z);if(c.top>=0)heights.push(c.top+1-p.localY);}
 if(!heights.length)throw Error('Não há solo sob a base da construção.');heights.sort((a,b)=>a-b);
 return Math.max(0,Math.min(world.h-asset.h,heights[Math.floor(heights.length/2)]));
}
export function naturalAdaptation(world,asset,t){
 const radius=t.blendRadius??8,passes=t.blendIterations??2;
 if(!Number.isInteger(radius)||radius<1||radius>16||!Number.isInteger(passes)||passes<0||passes>6)throw Error('Suavização: raio de 1 a 16 e até 6 passagens.');
 const protect=t.protectStructures!==false,supports=placementSupports(asset,t),count=world.w*world.d,owners=new Int32Array(count).fill(-1),dist=new Float64Array(count).fill(Infinity),cols=new Array(count),fixed=new Uint8Array(count);
 const targets=new Float64Array(count).fill(NaN),original=new Float64Array(count).fill(NaN);
 for(let z=0;z<world.d;z++)for(let x=0;x<world.w;x++){const i=x+z*world.w;cols[i]=terrainColumn(world,x,z);original[i]=cols[i].top;}
 supports.forEach((p,owner)=>{const i=p.x+p.z*world.w;owners[i]=owner;dist[i]=0;fixed[i]=1;targets[i]=p.target;
  const c=cols[i];if(c.top<0)throw Error('Parte da base está sobre o vazio. Mova a estrutura ou use outro modo de fundação.');
  if(protect&&c.obstructed)throw Error('A base encontra construção ou vegetação. Mova a estrutura ou autorize sobreposição.');
 });
 // Two forward/backward nearest-seed sweeps; bounded by the destination heightmap.
 function visit(x,z,neighbors){const i=x+z*world.w;if(fixed[i])return;for(const [dx,dz]of neighbors){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=world.w||zz>=world.d)continue;const owner=owners[xx+zz*world.w];if(owner<0)continue;const p=supports[owner],d=(x-p.x)**2+(z-p.z)**2;if(d<dist[i]){dist[i]=d;owners[i]=owner;}}}
 for(let pass=0;pass<2;pass++){
  for(let z=0;z<world.d;z++)for(let x=0;x<world.w;x++)visit(x,z,[[-1,0],[-1,-1],[0,-1],[1,-1]]);
  for(let z=world.d-1;z>=0;z--)for(let x=world.w-1;x>=0;x--)visit(x,z,[[1,0],[1,1],[0,1],[-1,1]]);
 }
 let skipped=0;
 for(let i=0;i<count;i++){if(fixed[i])continue;const c=cols[i];if(owners[i]<0||dist[i]>radius*radius||c.top<0||protect&&c.obstructed){if(c.obstructed&&dist[i]<=radius*radius)skipped++;continue;}
  const f=Math.max(0,1-Math.sqrt(dist[i])/radius),weight=f*f*(3-2*f);targets[i]=c.top+(supports[owners[i]].target-c.top)*weight;
 }
 for(let pass=0;pass<passes;pass++){const next=targets.slice();for(let z=1;z<world.d-1;z++)for(let x=1;x<world.w-1;x++){
  const i=x+z*world.w;if(fixed[i]||!Number.isFinite(targets[i])||dist[i]>=radius*radius)continue;let sum=0,n=0;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const j=i+dx+dz*world.w,v=Number.isFinite(targets[j])?targets[j]:original[j];if(v>=0){sum+=v;n++;}}
  if(n)next[i]=targets[i]*.5+sum/n*.5;
 }targets.set(next);}
 const changes=[];let columns=0;
 for(let z=0;z<world.d;z++)for(let x=0;x<world.w;x++){const i=x+z*world.w;if(!Number.isFinite(targets[i]))continue;const target=Math.round(targets[i]);if(target===cols[i].top)continue;
  let result;try{result=reshapeColumn(world,x,z,target,{protect});}catch(e){if(fixed[i])throw e;skipped++;continue;}
  if(result.skipped){if(fixed[i])throw Error('A adaptação deixaria a ilha sem espessura de apoio. Ajuste a altura.');skipped++;continue;}
  changes.push(...result.changes);columns++;
 }
 return {changes,columns,skipped,supports:supports.length,radius};
}
