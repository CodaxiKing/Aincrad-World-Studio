import {World,isAir,applyDelta,previewPlacement,transformPoint} from './world.js';
import {isTerrain} from './terrain.js';
export function solidIndices(world,asset,t){const out=[];for(let y=0;y<asset.h;y++)for(let z=0;z<asset.d;z++)for(let x=0;x<asset.w;x++){if(isAir(asset.palette[asset.get(x,y,z)]))continue;const [xx,yy,zz]=transformPoint(x,y,z,asset,t);out.push(world.index(t.x+xx,t.y+yy,t.z+zz));}return out;}
export function placementRecord(world,asset,t,op,{id,name}={}){return {id:id||crypto.randomUUID(),name:name||'Construção',asset:asset.snapshot(),transform:{...t},delta:op.delta.map(c=>({...c})),solidIndices:solidIndices(world,asset,t),bounds:[...op.bounds]};}
export function pickObject(world,point){const index=world.index(...point);return [...(world.placements||[])].reverse().find(p=>p.solidIndices.includes(index))||null;}
export function removeObjectPreview(world,id){const records=world.placements||[],position=records.findIndex(p=>p.id===id),record=records[position];if(!record)throw Error('Construção não encontrada.');
 const next=World.from(world.snapshot()),owned=new Set(record.solidIndices),later=new Set(records.slice(position+1).flatMap(p=>p.delta.map(c=>c.idx)));let preserved=0;
 for(const c of record.delta){const state=world.palette[world.cells[c.idx]];if(later.has(c.idx)){if(owned.has(c.idx))throw Error('Uma construção mais recente sobrepõe este objeto. Mova-a primeiro.');preserved++;continue;}if(state!==c.after){if(owned.has(c.idx))throw Error('Os blocos desta construção foram editados. Registre novamente a área antes de movê-la.');preserved++;continue;}next.cells[c.idx]=next.id(c.before);}
 next.placements=records.filter(p=>p.id!==id).map(p=>structuredClone(p));return {world:next,record,preserved};
}
export function moveObjectPreview(world,id,t){const {world:base,record,preserved}=removeObjectPreview(world,id),asset=World.from(record.asset),placement=previewPlacement(base,asset,t),candidate=World.from(base.snapshot());applyDelta(candidate,placement);
 const newRecord=placementRecord(base,asset,t,placement,{id:record.id,name:record.name}),delta=[];let added=0,removed=0;
 for(let idx=0;idx<world.cells.length;idx++){const before=world.palette[world.cells[idx]],after=candidate.palette[candidate.cells[idx]];if(before!==after){delta.push({idx,before,after});if(!isAir(before))removed++;if(!isAir(after))added++;}}
 const placementsAfter=[...base.placements,newRecord];candidate.placements=placementsAfter;
 return {...placement,baseRevision:world.revision,delta,added,removed,placementsBefore:structuredClone(world.placements),placementsAfter,candidate,sourceRemoved:true,preserved};
}
export function detectObject(world,point,{limit=50000}={}){const start=world.get(...point),state=world.palette[start];const allowed=s=>!isAir(s)&&!isTerrain(s)&&!/(leaves|water|lava|snow|flower|grass|vine|fern)/.test(s);
 if(!allowed(state))return null;const queue=[point],seen=new Set(),points=[];let min=[...point],max=[...point];
 for(let i=0;i<queue.length;i++){const p=queue[i];if(!world.inside(...p))continue;const index=world.index(...p);if(seen.has(index))continue;seen.add(index);if(!allowed(world.palette[world.cells[index]]))continue;points.push(p);if(points.length>limit)throw Error('Grupo detectado grande demais. Use uma seleção menor.');for(let axis=0;axis<3;axis++){min[axis]=Math.min(min[axis],p[axis]);max[axis]=Math.max(max[axis],p[axis]);if(max[axis]-min[axis]>=128)throw Error('Grupo detectado excede 128 blocos por eixo.');}for(const [x,y,z]of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]])queue.push([p[0]+x,p[1]+y,p[2]+z]);}
 if(!points.length)return null;const asset=new World(max[0]-min[0]+1,max[1]-min[1]+1,max[2]-min[2]+1),delta=[],indices=[];
 for(const p of points){const idx=world.index(...p),s=world.palette[world.cells[idx]];asset.set(p[0]-min[0],p[1]-min[1],p[2]-min[2],s);indices.push(idx);delta.push({idx,before:'minecraft:air',after:s});}
 const t={x:min[0],y:min[1],z:min[2],rotation:0,mirrorX:false,mirrorZ:false,terrain:'none',air:'ignore',protectStructures:true,blendRadius:8,blendIterations:2};
 return {id:crypto.randomUUID(),name:'Grupo de construção detectado',asset:asset.snapshot(),transform:t,delta,solidIndices:indices,bounds:[...min,asset.w,asset.h,asset.d],detected:true};
}
