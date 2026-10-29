import {isAir,AIR} from './world.js';
import {terrainColumn,reshapeColumn,isTerrain} from './terrain.js';
const modes=new Set(['add','remove','paint','raise','lower','flatten','smooth','erode']);
const stateOK=s=>typeof s==='string'&&/^minecraft:[a-z0-9_]+(?:\[[a-z0-9_=,]+\])?$/.test(s)&&!/command_block|structure_block|jigsaw/.test(s);
export function brushOperation(world,point,options={}){
 const o={mode:'smooth',shape:'sphere',radius:4,strength:2,iterations:2,material:'minecraft:stone',mask:'terrain',depth:1,...options};
 if(!modes.has(o.mode)||!['sphere','cube','cylinder','hollow'].includes(o.shape)||!['terrain','all','air','solid'].includes(o.mask)||!stateOK(o.material))throw Error('Configuração de pincel inválida.');
 if(!Number.isInteger(o.radius)||o.radius<0||o.radius>12||!Number.isInteger(o.strength)||o.strength<1||o.strength>6||!Number.isInteger(o.iterations)||o.iterations<1||o.iterations>6||!Number.isInteger(o.depth)||o.depth<1||o.depth>6||!Array.isArray(point)||point.length!==3||!point.every(Number.isInteger)||!world.inside(...point))throw Error('Pincel fora dos limites. Raio 0–12; força, profundidade e passagens 1–6.');
 const [cx,cy,cz]=point,r=o.radius,changes=new Map();let skipped=0;
 const mask=(before,allowAir=false)=>o.mask==='all'||o.mask==='air'&&isAir(before)||o.mask==='solid'&&!isAir(before)||o.mask==='terrain'&&(isTerrain(before)||allowAir&&isAir(before));
 const write=(x,y,z,state,allowAir=false)=>{if(!world.inside(x,y,z))return;const idx=world.index(x,y,z),before=world.palette[world.cells[idx]];if(before!==state&&mask(before,allowAir))changes.set(idx,{idx,before,after:state});};
 const flatDistance=(dx,dz)=>o.shape==='cube'?Math.max(Math.abs(dx),Math.abs(dz)):Math.hypot(dx,dz);
 if(['add','remove'].includes(o.mode)){
  for(let z=Math.max(0,cz-r);z<=Math.min(world.d-1,cz+r);z++)for(let y=Math.max(0,cy-r);y<=Math.min(world.h-1,cy+r);y++)for(let x=Math.max(0,cx-r);x<=Math.min(world.w-1,cx+r);x++){
   const dx=x-cx,dy=y-cy,dz=z-cz,d=o.shape==='cube'?Math.max(Math.abs(dx),Math.abs(dy),Math.abs(dz)):o.shape==='cylinder'?Math.hypot(dx,dz):Math.hypot(dx,dy,dz);
   if(d>r||o.shape==='hollow'&&d<r-1)continue;write(x,y,z,o.mode==='remove'?AIR:o.material,o.mode==='add');
  }
 }else if(o.mode==='paint'){
  for(let z=Math.max(0,cz-r);z<=Math.min(world.d-1,cz+r);z++)for(let x=Math.max(0,cx-r);x<=Math.min(world.w-1,cx+r);x++){
   if(flatDistance(x-cx,z-cz)>r)continue;const top=o.mask==='terrain'?terrainColumn(world,x,z).top:world.top(x,z);if(top<0)continue;
   for(let y=top;y>=Math.max(0,top-o.depth+1);y--)write(x,y,z,o.material);
  }
 }else{
  if(o.mask!=='terrain'&&o.mask!=='all')throw Error('Pincéis de relevo usam máscara de terreno ou todos os blocos.');
  if(o.mode==='flatten'&&(!Number.isInteger(o.levelY??cy)||(o.levelY??cy)<0||(o.levelY??cy)>=world.h))throw Error('Cota de nivelamento inválida.');
  const columns=new Map(),heights=new Map(),keys=[];
  for(let z=Math.max(0,cz-r-1);z<=Math.min(world.d-1,cz+r+1);z++)for(let x=Math.max(0,cx-r-1);x<=Math.min(world.w-1,cx+r+1);x++){
   const key=x+z*world.w,c=terrainColumn(world,x,z);columns.set(key,c);heights.set(key,c.top);if(flatDistance(x-cx,z-cz)<=r)keys.push([key,x,z]);
  }
  for(let pass=0;pass<(['smooth','erode'].includes(o.mode)?o.iterations:1);pass++){
   const next=new Map(heights);
   for(const [key,x,z]of keys){const c=columns.get(key);if(c.top<0||o.mask==='terrain'&&c.obstructed)continue;const top=heights.get(key),f=Math.max(0,1-flatDistance(x-cx,z-cz)/(r+1)),weight=f*f*(3-2*f);let target=top;
    if(o.mode==='raise'||o.mode==='lower')target=top+(o.mode==='raise'?1:-1)*Math.max(1,Math.round(o.strength*weight));
    if(o.mode==='flatten')target=top+((o.levelY??cy)-top)*weight;
    if(['smooth','erode'].includes(o.mode)){let sum=0,n=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,zz=z+dz;if(xx<0||zz<0||xx>=world.w||zz>=world.d)continue;const value=heights.get(xx+zz*world.w);if(value>=0){sum+=value;n++;}}if(n)target=top+(sum/n-top)*weight*(o.strength/6);if(o.mode==='erode')target=Math.min(top,target);}
    next.set(key,Math.max(0,Math.min(world.h-1,target)));
   }heights.clear();for(const [key,val]of next)heights.set(key,val);
  }
  for(const [key,x,z]of keys){const c=columns.get(key),target=Math.round(heights.get(key));if(c.top<0||target===c.top)continue;
   const result=reshapeColumn(world,x,z,target,{protect:o.mask==='terrain',maxChange:24});if(result.skipped){skipped++;continue;}for(const change of result.changes)changes.set(change.idx,change);
  }
 }
 return {baseRevision:world.revision,delta:[...changes.values()],label:`Pincel ${o.mode}`,skipped,point:[...point],radius:r};
}
export function mergeStroke(base,operations){
 const changes=new Map();for(const op of operations)for(const c of op.delta){if(!changes.has(c.idx))changes.set(c.idx,{idx:c.idx,before:base.palette[base.cells[c.idx]],after:c.after});else changes.get(c.idx).after=c.after;}
 const delta=[...changes.values()].filter(c=>c.before!==c.after);if(delta.length>200000)throw Error('Traço excede 200 mil posições. Divida em traços menores.');
 return {baseRevision:base.revision,delta,label:'Traço de pincel'};
}
