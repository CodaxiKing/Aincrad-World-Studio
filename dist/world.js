import {naturalAdaptation,isTerrain} from './terrain.js';
export const AIR='minecraft:air';
export const isAir=s=>/^minecraft:(air|cave_air|void_air)$/.test(s);
export class World{
 constructor(w=80,h=80,d=80){this.w=w;this.h=h;this.d=d;this.cells=new Uint16Array(w*h*d);this.palette=[AIR];this.revision=0;this.placements=[];}
 index(x,y,z){return x+z*this.w+y*this.w*this.d;}
 inside(x,y,z){return x>=0&&y>=0&&z>=0&&x<this.w&&y<this.h&&z<this.d;}
 get(x,y,z){return this.inside(x,y,z)?this.cells[this.index(x,y,z)]:0;}
 id(s){let n=this.palette.indexOf(s);if(n<0){if(this.palette.length>=65534)throw Error('Limite de materiais.');n=this.palette.push(s)-1;}return n;}
 set(x,y,z,s){if(this.inside(x,y,z))this.cells[this.index(x,y,z)]=typeof s==='number'?s:this.id(s);}
 top(x,z){for(let y=this.h-1;y>=0;y--)if(!isAir(this.palette[this.get(x,y,z)]))return y;return -1;}
 snapshot(){return {w:this.w,h:this.h,d:this.d,cells:this.cells.slice(),palette:[...this.palette],revision:this.revision,placements:structuredClone(this.placements)};}
 static from(s){const w=new World(s.w,s.h,s.d);w.cells=new Uint16Array(s.cells);w.palette=[...s.palette];w.revision=s.revision||0;w.placements=structuredClone(s.placements||[]);return w;}
}
function hash(s){let a=2166136261;for(const c of String(s))a=Math.imul(a^c.charCodeAt(0),16777619);return a>>>0;}
function noise(x,z,seed){return Math.sin(x*.17+seed)*2.2+Math.cos(z*.13-seed)*2+Math.sin((x+z)*.31)*1.1;}
export function generate({size=80,seed='aincrad-001',type='island',relief=7}={}){
 const world=new World(size,80,size),s=hash(seed)%10000,stone=world.id('minecraft:stone'),dirt=world.id('minecraft:dirt'),grass=world.id('minecraft:grass_block');
 for(let z=0;z<size;z++)for(let x=0;x<size;x++){
  const nx=(x-size/2)/(size*.46),nz=(z-size/2)/(size*.46),r=Math.sqrt(nx*nx+nz*nz),edge=1-r+noise(x*2,z*2,s)*.018;
  if(edge<0)continue;
  const top=Math.floor(31+noise(x,z,s)*relief/5+(type==='city'?0:Math.max(0,noise(x*.6,z*.6,s+2))*relief*.5));
  const bottom=type==='exploration'?5:Math.floor(28-Math.pow(Math.max(0,1-r),.8)*23+noise(x,z,s+7));
  for(let y=Math.max(1,bottom);y<=top;y++)world.set(x,y,z,y===top?grass:y>top-3?dirt:stone);
 }
 if(['city','mixed','boss','dungeon','maze'].includes(type)){
  const center=size>>1,y=38,half=type==='city'||type==='mixed'?20:18;
  for(let x=center-half;x<=center+half;x++)for(let z=center-half;z<=center+half;z++)for(let yy=world.top(x,z)+1;yy<=y;yy++)world.set(x,yy,z,'minecraft:stone_bricks');
  for(let x=center-half;x<=center+half;x++)for(let z=center-half;z<=center+half;z++){for(let yy=y+1;yy<world.h;yy++)world.set(x,yy,z,0);world.set(x,y,z,'minecraft:stone_bricks');}
  if(type==='city'||type==='mixed')for(const [dx,dz]of [[-13,-12],[9,-12],[-13,9],[9,9]]){const a=house();pasteDirect(world,a,center+dx,y+1,center+dz);}
  if(type==='maze'||type==='dungeon'){
   // Perfect maze per level; stairs are reserved as an open vertical shaft, not yet a playable solver.
   const n=9;let rng=s||1;const rand=()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/2**32;};
   for(let level=0;level<3;level++){
    const yy=y+1+level*7,visited=new Set(['0,0']),stack=[[0,0]],open=new Set();
    while(stack.length){const [a,b]=stack.at(-1),opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dz])=>a+dx>=0&&b+dz>=0&&a+dx<n&&b+dz<n&&!visited.has(`${a+dx},${b+dz}`));if(!opts.length){stack.pop();continue;}const [dx,dz]=opts[Math.floor(rand()*opts.length)];open.add(`${a*4+dx*2},${b*4+dz*2}`);visited.add(`${a+dx},${b+dz}`);stack.push([a+dx,b+dz]);}
    for(let xx=0;xx<37;xx++)for(let zz=0;zz<37;zz++){
     const wall=xx%4===0||zz%4===0;let passage=false;
     for(const key of open){const [ox,oz]=key.split(',').map(Number);if(Math.abs(xx-(ox+2))<=1&&Math.abs(zz-(oz+2))<=1){passage=true;break;}}
     world.set(center-18+xx,yy,center-18+zz,'minecraft:stone_bricks');
     if(wall&&!passage)for(let k=1;k<5;k++)world.set(center-18+xx,yy+k,center-18+zz,'minecraft:deepslate_bricks');
    }
   }
  }
  if(type==='boss'){for(let a=0;a<360;a+=2){const xx=center+Math.round(Math.cos(a*Math.PI/180)*16),zz=center+Math.round(Math.sin(a*Math.PI/180)*16);for(let k=1;k<7;k++)world.set(xx,y+k,zz,'minecraft:deepslate_bricks');} }
 }
 // Deterministic vegetation kept sparse to bound the preview mesh.
 if(['island','mixed','exploration'].includes(type))for(let i=0;i<20;i++){
  const x=8+(hash(`${seed}-${i}`)%(size-16)),z=8+(hash(`${i}-${seed}`)%(size-16)),y=world.top(x,z);
  if(y<25||y>47||world.palette[world.get(x,y,z)]!=='minecraft:grass_block')continue;
  for(let k=1;k<=4;k++)world.set(x,y+k,z,'minecraft:oak_log');
  for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=6;dy++)if(Math.abs(dx)+Math.abs(dz)+Math.abs(dy-4)<5)world.set(x+dx,y+dy,z+dz,'minecraft:oak_leaves');
 }
 return world;
}
function pasteDirect(w,a,x,y,z){for(let yy=0;yy<a.h;yy++)for(let zz=0;zz<a.d;zz++)for(let xx=0;xx<a.w;xx++){const id=a.get(xx,yy,zz);if(id)w.set(x+xx,y+yy,z+zz,a.palette[id]);}}
export function house(){const w=new World(11,13,11);for(let y=0;y<9;y++)for(let z=0;z<11;z++)for(let x=0;x<11;x++){
 if(y===0)w.set(x,y,z,'minecraft:stone_bricks');
 else if(x===0||x===10||z===0||z===10){if(z===0&&x>=4&&x<=6&&y<5)continue;w.set(x,y,z,(x===0||x===10)&&(z===0||z===10)?'minecraft:oak_log':y===4&&(x%4===2||z%4===2)?'minecraft:glass':'minecraft:oak_planks');}
 }for(let y=9;y<13;y++)for(let x=y-9;x<=10-(y-9);x++)for(let z=0;z<11;z++)w.set(x,y,z,'minecraft:dark_oak_planks');return w;}
export function tower(){const w=new World(13,23,13);for(let y=0;y<23;y++)for(let x=0;x<13;x++)for(let z=0;z<13;z++){const r=Math.hypot(x-6,z-6);if(r>6)continue;if(y===0||y===18||r>4.5){if(z<=1&&x>=5&&x<=7&&y>0&&y<5)continue;if(y>19&&(x+z)%2===0)continue;w.set(x,y,z,y===18?'minecraft:oak_planks':'minecraft:stone_bricks');}}return w;}
export function transformPoint(x,y,z,a,t){if(t.mirrorX)x=a.w-1-x;if(t.mirrorZ)z=a.d-1-z;switch(t.rotation){case 90:return [a.d-1-z,y,x];case 180:return [a.w-1-x,y,a.d-1-z];case 270:return [z,y,a.w-1-x];default:return [x,y,z];}}
export function transformState(state,t){
 const match=state.match(/^(.*?)\[(.*)\]$/);if(!match)return state;
 const props=Object.fromEntries(match[2].split(',').map(v=>v.split('=')));
 const dirs=['north','east','south','west'];
 const turn=dir=>{let n=dirs.indexOf(dir);if(n<0)return dir;if(t.mirrorX&&n%2)n=(4-n)%4;if(t.mirrorZ&&n%2===0)n=2-n;return dirs[(n+t.rotation/90)%4];};
 if(props.facing)props.facing=turn(props.facing);
 for(const key of dirs)if(Object.hasOwn(props,key)){const temp={};for(const d of dirs)if(Object.hasOwn(props,d))temp[turn(d)]=props[d];for(const d of dirs)delete props[d];Object.assign(props,temp);break;}
 if(props.axis&&t.rotation%180&&props.axis!=='y')props.axis=props.axis==='x'?'z':'x';
 if(props.rotation){let n=Number(props.rotation);if(t.mirrorX)n=-n;if(t.mirrorZ)n=8-n;props.rotation=String(((n+t.rotation/90*4)%16+16)%16);}
 if(t.mirrorX!==t.mirrorZ){if(props.hinge)props.hinge=props.hinge==='left'?'right':'left';if(props.type==='left'||props.type==='right')props.type=props.type==='left'?'right':'left';if(props.shape?.includes('left'))props.shape=props.shape.replace('left','right');else if(props.shape?.includes('right'))props.shape=props.shape.replace('right','left');}
 if(props.shape&&/^(north_south|east_west|ascending_|north_east|north_west|south_east|south_west)/.test(props.shape)){
  if(props.shape.startsWith('ascending_'))props.shape='ascending_'+turn(props.shape.slice(10));
  else{const ds=props.shape.split('_').map(turn);const set=new Set(ds);props.shape=set.has('north')&&set.has('south')?'north_south':set.has('east')&&set.has('west')?'east_west':(set.has('north')?'north':'south')+'_'+(set.has('east')?'east':'west');}
 }
 return match[1]+'['+Object.entries(props).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${k}=${v}`).join(',')+']';
}
export function previewPlacement(world,asset,t){
 if(![t.x,t.y,t.z].every(Number.isInteger)||![0,90,180,270].includes(t.rotation))throw Error('Transformação fora da grade.');
 const width=t.rotation%180?asset.d:asset.w,depth=t.rotation%180?asset.w:asset.d;
 if(t.x<0||t.y<0||t.z<0||t.x+width>world.w||t.y+asset.h>world.h||t.z+depth>world.d)throw Error('A estrutura ultrapassa os limites do andar.');
 const changes=new Map();let collisions=0,removed=0,added=0,adaptation=null;
 const write=(x,y,z,state)=>{if(!world.inside(x,y,z))throw Error('Adaptação ultrapassa o limite vertical.');changes.set(world.index(x,y,z),state);};
 if(t.terrain==='natural'){adaptation=naturalAdaptation(world,asset,t);for(const c of adaptation.changes)changes.set(c.idx,c.after);}
 if(t.terrain!=='none'&&t.terrain!=='natural')for(let x=t.x;x<t.x+width;x++)for(let z=t.z;z<t.z+depth;z++){
  const top=world.top(x,z);if(t.terrain==='flatten'||t.terrain==='adapt'){
   if(Math.abs(top-(t.y-1))>24)throw Error('Corte ou aterro acima de 24 blocos. Ajuste a altura.');
   for(let y=t.y;y<=top;y++)write(x,y,z,AIR);
   for(let y=Math.max(0,top+1);y<t.y;y++)write(x,y,z,'minecraft:stone');
  }
  if(t.terrain==='excavate')for(let y=t.y;y<t.y+asset.h;y++)write(x,y,z,AIR);
  if(t.terrain==='foundation'){if(top<0||t.y-1-top>24)throw Error('Fundação sem apoio em até 24 blocos.');for(let y=top+1;y<t.y;y++)write(x,y,z,'minecraft:stone_bricks');}
 }
 // Blend only a bounded outer band, keeping its far edge fixed.
 if(t.terrain==='adapt')for(let x=t.x-4;x<t.x+width+4;x++)for(let z=t.z-4;z<t.z+depth+4;z++){
  if(!world.inside(x,0,z)||x>=t.x&&x<t.x+width&&z>=t.z&&z<t.z+depth)continue;
  const distance=Math.max(t.x-x,x-(t.x+width-1),t.z-z,z-(t.z+depth-1)),top=world.top(x,z);
  if(top<0)continue;const target=Math.round(top+(t.y-1-top)*(1-distance/5));if(Math.abs(target-top)>24)continue;
  for(let y=top;y>target;y--)write(x,y,z,AIR);for(let y=top+1;y<=target;y++)write(x,y,z,'minecraft:dirt');
 }
 const transformed=asset.palette.map(s=>transformState(s,t));
 for(let y=0;y<asset.h;y++)for(let z=0;z<asset.d;z++)for(let x=0;x<asset.w;x++){
  const s=transformed[asset.cells[x+z*asset.w+y*asset.w*asset.d]];if(t.air==='ignore'&&isAir(s))continue;
  const [xx,yy,zz]=transformPoint(x,y,z,asset,t),dx=t.x+xx,dy=t.y+yy,dz=t.z+zz,idx=world.index(dx,dy,dz),existing=changes.get(idx)??world.palette[world.cells[idx]];
  if(!isAir(s)&&!isAir(existing)&&!/^minecraft:(stone|dirt|grass_block)$/.test(existing))collisions++;
  write(dx,dy,dz,s);
 }
 collisions=0;
 const delta=[];for(const [idx,state]of changes){const before=world.palette[world.cells[idx]];if(before===state)continue;if(!isAir(before)){removed++;if(!isTerrain(before))collisions++;}if(!isAir(state))added++;delta.push({idx,before,after:state});}
 return {baseRevision:world.revision,delta,collisions,removed,added,bounds:[t.x,t.y,t.z,width,asset.h,depth],adaptation:adaptation?{columns:adaptation.columns,skipped:adaptation.skipped,supports:adaptation.supports,radius:adaptation.radius}:null};
}
export function applyDelta(world,op,direction='after'){
 if(direction==='after'&&op.baseRevision!==world.revision)throw Error('Prévia obsoleta. Calcule novamente.');
 const states=new Set(op.delta.map(c=>c[direction]));
 const missing=[...states].filter(s=>!world.palette.includes(s));
 if(world.palette.length+missing.length>65534)throw Error('Limite de materiais excedido.');
 for(const s of missing)world.id(s);
 const ids=new Map([...states].map(s=>[s,world.palette.indexOf(s)]));
 for(const c of op.delta)world.cells[c.idx]=ids.get(c[direction]);const objects=direction==='after'?op.placementsAfter:op.placementsBefore;if(objects)world.placements=structuredClone(objects);world.revision++;return world;
}
export function color(state){
 const s=state||AIR;
 if(/grass/.test(s))return [.30,.49,.26];if(/leaves/.test(s))return [.21,.40,.24];if(/dirt/.test(s))return [.40,.29,.20];if(/dark_oak|deepslate/.test(s))return [.20,.25,.29];if(/log/.test(s))return [.32,.23,.17];if(/planks/.test(s))return [.61,.47,.30];if(/glass/.test(s))return [.43,.73,.78];if(/water/.test(s))return [.23,.48,.69];if(/bricks/.test(s))return [.54,.56,.55];if(/sand/.test(s))return [.76,.70,.49];return [.43,.47,.49];
}
