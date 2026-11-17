import {World,house,tower} from './world.js';

// Andar em disco no estilo de Aincrad: layout procedural próprio (não copia mapas de jogos).
// Norte = Z negativo. Cidade inicial murada ao sul, torre-labirinto ao norte ligando ao "teto",
// montanhas ao norte, lago central com rio até a borda, florestas a leste/oeste, estradas e vilas.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);},lerp=(a,b,t)=>a+(b-a)*t;
function seedOf(s){let n=2166136261;for(const ch of String(s))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}
function segDist(px,pz,a,b){const vx=b[0]-a[0],vz=b[1]-a[1],t=clamp(((px-a[0])*vx+(pz-a[1])*vz)/(vx*vx+vz*vz||1),0,1);return Math.hypot(px-a[0]-vx*t,pz-a[1]-vz*t);}
const lineDist=(px,pz,pts)=>{let best=Infinity;for(let i=1;i<pts.length;i++)best=Math.min(best,segDist(px,pz,pts[i-1],pts[i]));return best;};
const WATER='minecraft:water[level=0]',AIRS='minecraft:air';

export function villageAsset(){
 const a=new World(41,13,41),h=house();
 for(let z=0;z<41;z++)for(let x=0;x<41;x++)a.set(x,0,z,'minecraft:grass_block');
 for(let i=0;i<41;i++)for(let k=-1;k<=1;k++){a.set(i,0,20+k,'minecraft:dirt_path');a.set(20+k,0,i,'minecraft:dirt_path');}
 for(const [ox,oz]of [[3,3],[27,3],[3,27],[27,27]])for(let y=0;y<h.h;y++)for(let z=0;z<h.d;z++)for(let x=0;x<h.w;x++){const id=h.get(x,y,z);if(id)a.set(ox+x,y,oz+z,h.palette[id]);}
 for(let z=18;z<=22;z++)for(let x=18;x<=22;x++){const rim=x===18||x===22||z===18||z===22;a.set(x,0,z,'minecraft:cobblestone');a.set(x,1,z,rim?'minecraft:cobblestone':WATER);}
 for(const [x,z]of [[18,18],[22,18],[18,22],[22,22]])for(let y=2;y<=4;y++)a.set(x,y,z,'minecraft:oak_fence');
 for(let z=18;z<=22;z++)for(let x=18;x<=22;x++)a.set(x,5,z,'minecraft:dark_oak_planks');
 return a;
}

export function createAincradFloor(c){
 const seed=seedOf(c.seed),cx=c.width/2,cz=c.depth/2,R=Math.min(c.width,c.depth)/2-2,level=Math.round(c.height*.35),relief=c.relief,maxTop=c.height-30;
 const h2=(x,z,s)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(s+seed|0,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 const vnoise=(x,z,s)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=h2(xi,zi,s),b=h2(xi+1,zi,s),d=h2(xi,zi+1,s),e=h2(xi+1,zi+1,s);return a+(b-a)*u+(d-a)*v+(a-b-d+e)*u*v;};
 const fbm=(x,z,s,oct=4)=>{let amp=1,f=1,sum=0,norm=0;for(let i=0;i<oct;i++){sum+=amp*vnoise(x*f,z*f,s+i*31);norm+=amp;amp*=.5;f*=2;}return sum/norm;};
 const L=clamp(R/3,70,420),at=(u,v)=>[cx+u*R,cz+v*R];
 // Cidade inicial (sul) e torre-labirinto (norte)
 const cityOn=c.features.city,towerOn=c.features.labyrinth;
 const cityR=clamp(Math.round(R*.2),40,220),[cityX,cityZ]=at(0,.62).map(Math.round),plazaR=clamp(Math.round(cityR*.2),9,36);
 const towerR=clamp(Math.round(R*.045),10,40),[towerX,towerZ]=at(0,-.68).map(Math.round),towerBase=Math.min(maxTop-12,level+Math.round(relief*.5)),towerTop=c.height-1;
 const palace=cityR>=70?{w:clamp(Math.round(cityR*.42/2)*2+1,29,61),d:clamp(Math.round(cityR*.28/2)*2+1,19,41),h:22}:null;
 if(palace){palace.x0=cityX-(palace.w-1)/2;palace.z0=cityZ-plazaR-6-palace.d;}
 // Hidrografia e estradas (coordenadas de mundo)
 const lake={x:cx+.28*R,z:cz-.05*R,r:.15*R},riverW=clamp(R*.012,3,9),waterY=level-1;
 const river=[at(.34,-.44),at(.25,-.3),at(.3,-.12),[lake.x,lake.z],at(.55,.02),at(.8,.1),at(1.08,.14)];
 const hub=at(-.08,.14),villages=[{name:'Vila do oeste',p:at(-.52,0)},{name:'Vila do leste',p:at(.5,.38)}];
 const roads=[[[cityX,cityZ-cityR],at(-.04,.3),hub,at(-.14,-.12),at(-.1,-.4),[towerX,towerZ+towerR]],[hub,at(-.3,.08),villages[0].p],[at(-.04,.3),at(.22,.34),villages[1].p],[[cityX+cityR,cityZ],at(.42,.55),villages[1].p]];
 const mainRoad=roads[0];
 const house_=house(),tower_=tower();
 const lotCache=new Map(),P=18;
 function lot(ix,iz){const key=ix+','+iz;let v=lotCache.get(key);if(v!==undefined)return v;v=null;const x0=ix*P,z0=iz*P,x1=x0+P-1,z1=z0+P-1,far=Math.max(Math.hypot(x0,z0),Math.hypot(x1,z0),Math.hypot(x0,z1),Math.hypot(x1,z1)),near=Math.hypot(clamp(0,x0,x1),clamp(0,z0,z1));
  const crossesAvenue=(x0<=5&&x1>=-5)||(z0<=5&&z1>=-5),inPalace=palace&&x1>=palace.x0-cityX-4&&x0<=palace.x0-cityX+palace.w+3&&z1>=palace.z0-cityZ-4&&z0<=palace.z0-cityZ+palace.d+3;
  if(far<cityR-11&&near>plazaR+3&&!crossesAvenue&&!inPalace){const n=Math.floor(h2(ix,iz,777)*100);v={kind:n<68?'house':n<80?'tower':'garden',x0,z0};}
  lotCache.set(key,v);return v;}
 function cityCell(px,pz,d){
  if(d>=cityR-3&&d<cityR){const gate=Math.abs(px)<=2||Math.abs(pz)<=2;return {type:'wall',gate,merlon:Math.floor(Math.atan2(pz,px)*cityR/2)%2===0};}
  const ang=Math.atan2(pz,px)/(Math.PI/4)+.5,turret=Math.abs(ang-Math.round(ang))*Math.PI/4*cityR;
  if(d>=cityR-7&&d<cityR+3&&turret<5&&Math.hypot(turret,d-(cityR-2))<5)return {type:'turret'};
  if(d>=cityR)return null;
  if(d<=3.2)return {type:'fountain',core:d<1,rim:d>2.2};
  if(d<plazaR)return {type:'pave',mat:(Math.floor(d/3)+Math.round(ang*2))%2?'polished_andesite':'stone_bricks'};
  if(Math.abs(px)<=3||Math.abs(pz)<=3||d>=cityR-9)return {type:'pave',mat:'stone_bricks',lamp:(Math.abs(px)===3||Math.abs(pz)===3)&&Math.round(d)%14===0};
  if(palace){const lx=px+cityX-palace.x0,lz=pz+cityZ-palace.z0;if(lx>=0&&lz>=0&&lx<palace.w&&lz<palace.d)return {type:'palace',lx,lz};if(lx>=-2&&lz>=-2&&lx<palace.w+2&&lz<palace.d+6)return {type:'pave',mat:'polished_andesite'};}
  const ix=Math.floor(px/P),iz=Math.floor(pz/P),l=lot(ix,iz);if(!l)return {type:'pave',mat:'cobblestone'};
  const lx=px-l.x0,lz=pz-l.z0;if(lx<3||lz<3)return {type:'pave',mat:'cobblestone'};
  if(l.kind==='house'&&lx>=5&&lx<16&&lz>=5&&lz<16)return {type:'asset',asset:house_,dx:lx-5,dz:lz-5};
  if(l.kind==='tower'&&lx>=4&&lx<17&&lz>=4&&lz<17&&tower_.get(lx-4,0,lz-4))return {type:'asset',asset:tower_,dx:lx-4,dz:lz-4};
  return {type:'yard',garden:l.kind==='garden'};
 }
 function column(x,z){
  if(x<0||z<0||x>=c.width||z>=c.depth)return null;
  const dx=x-cx,dz=z-cz,radial=Math.hypot(dx,dz)/R,v=dz/R,u=dx/R;
  if(radial>1+(fbm(x/40,z/40,5,3)-.5)*.05)return null;
  const dRoad=Math.min(...roads.map(r=>lineDist(x,z,r))),dMain=lineDist(x,z,mainRoad),dRiver=lineDist(x,z,river)+(vnoise(x/45,z/45,9)-.5)*10,dLake=Math.hypot(x-lake.x,z-lake.z)-lake.r*(1+(fbm(x/90,z/90,13,3)-.5)*.5);
  const dCity=cityOn?Math.hypot(x-cityX,z-cityZ):Infinity,dTower=towerOn?Math.hypot(x-towerX,z-towerZ):Infinity;
  // Relevo: colinas suaves + cordilheira ao norte, com vale ao longo da estrada principal e do rio
  const hills=(fbm(x/L,z/L,1)-.5)*relief*1.2,mount=smooth(-.34,-.72,v+(fbm(x/(L*1.5),z/(L*1.5),3,3)-.5)*.25)*smooth(8,60,dMain)*smooth(riverW+4,riverW+50,dRiver);
  const ridge=1-Math.abs(fbm(x/(L*.8),z/(L*.8),7)*2-1),peaks=mount*(.12+ridge*ridge*.88)*relief*3.6;
  let top=level+hills+peaks;
  const dWater=Math.min(dRiver-riverW,dLake);let water;
  if(dWater<14)top=lerp(level,top,smooth(0,14,dWater));
  if(dWater<0){water=waterY;top=level-3-Math.min(5,Math.round(-dWater/6));}
  if(dCity<cityR+18)top=lerp(level,top,smooth(cityR+2,cityR+18,dCity));
  if(dTower<towerR+34)top=lerp(towerBase,top,smooth(towerR+8,towerR+34,dTower));
  top=Math.round(clamp(top,12,maxTop));
  const bottom=Math.max(2,Math.round(level-9-Math.max(0,1-radial*radial)*Math.min(40,level-10)));
  const col={top,bottom,biome:c.biome,trees:3};
  const alt=top-level,forest=fbm(x/(L*.9),z/(L*.9),21)+Math.abs(u)*.3-Math.max(0,-v-.2)*.3;
  if(alt>relief*2.6){col.biome='frost';col.trees=1;}
  else if(alt>relief*1.3){col.biome='ruins';col.surface='stone';col.trees=alt>relief*2?0:4;}
  else if(forest>.72){col.biome='forest';col.trees=38;}
  else if(mount>.6&&alt>relief*.4){col.biome='ruins';col.trees=6;}
  if(water!==undefined){col.water=water;col.surface=top<level-5?'gravel':'sand';col.soil='sand';col.trees=0;if(dRoad<2.5)col.build={type:'bridge'};}
  else if(dWater<2.5){col.surface='sand';col.trees=0;}
  if(dRoad<1.8&&water===undefined&&dCity>=cityR&&dTower>towerR){col.surface='dirt_path';col.trees=0;col.road=true;}else if(dRoad<5)col.trees=0;
  if(dCity<cityR+3){const cell=cityCell(x-cityX,z-cityZ,dCity);if(cell){col.build=cell;col.city=true;col.trees=cell.garden?45:0;col.biome=c.biome;col.surface=cell.type==='yard'?undefined:'stone_bricks';delete col.water;delete col.road;}else if(dCity<cityR+8)col.trees=0;}
  if(dTower<=towerR){col.build={type:'labyrinth',d:dTower,px:x-towerX,pz:z-towerZ};col.trees=0;col.surface='deepslate_tiles';delete col.water;delete col.road;}else if(dTower<towerR+6){col.trees=0;col.surface=col.surface==='dirt_path'?col.surface:'stone_bricks';}
  return col;
 }
 // Bloco de estrutura para uma coluna; undefined = manter terreno/ar.
 function buildBlock(col,x,y,z){
  const b=col.build,dy=y-col.top;if(dy<0||dy===0&&b.type!=='fountain')return undefined;
  switch(b.type){
   case 'bridge':return y===col.water+1?'minecraft:oak_planks':undefined;
   case 'wall':if(dy>13)return undefined;if(b.gate&&dy<=5)return AIRS;return dy===13?(b.merlon?'minecraft:stone_bricks':undefined):dy===12?'minecraft:chiseled_stone_bricks':'minecraft:stone_bricks';
   case 'turret':return dy<=19?(dy===19&&(x+z)%2?undefined:dy%9===0?'minecraft:chiseled_stone_bricks':'minecraft:stone_bricks'):undefined;
   case 'fountain':if(dy===0)return 'minecraft:stone_bricks';if(b.core)return dy<=4?(dy===4?'minecraft:sea_lantern':'minecraft:chiseled_stone_bricks'):undefined;if(dy===1)return b.rim?'minecraft:stone_bricks':WATER;return undefined;
   case 'pave':if(b.lamp)return dy<=3?'minecraft:stone_brick_wall':dy===4?'minecraft:glowstone':undefined;return undefined;
   case 'asset':return dy<=b.asset.h?b.asset.palette[b.asset.get(b.dx,dy-1,b.dz)]:undefined;
   case 'palace':{const p=palace,edge=b.lx===0||b.lz===0||b.lx===p.w-1||b.lz===p.d-1,corner=(b.lx<4||b.lx>=p.w-4)&&(b.lz<4||b.lz>=p.d-4),h=corner?p.h+6:p.h;if(dy>h+1)return undefined;
    if(dy===h+1)return (edge||corner)&&(b.lx+b.lz)%2===0?'minecraft:polished_blackstone_bricks':undefined;
    if(dy===1||dy===h)return 'minecraft:polished_blackstone_bricks';
    if(corner&&dy>p.h)return 'minecraft:polished_blackstone_bricks';
    if(!edge)return dy===Math.floor(h/2)&&(b.lx%8===4&&b.lz%8===4)?'minecraft:sea_lantern':AIRS;
    if(b.lz===p.d-1&&Math.abs(b.lx-(p.w-1)/2)<=2&&dy<=6)return AIRS;
    return dy%7===4&&(b.lx+b.lz)%4<2?'minecraft:glass':'minecraft:polished_blackstone_bricks';}
   case 'labyrinth':{if(y>towerTop)return undefined;const shell=b.d>towerR-2.5,rel=y-(towerBase+1);
    if(shell){if(b.pz>0&&Math.abs(b.px)<=2&&rel>=0&&rel<=5)return AIRS;return rel%12===11?'minecraft:chiseled_deepslate':rel%12===5&&Math.floor(Math.atan2(b.pz,b.px)*towerR/3)%3===0?'minecraft:sea_lantern':'minecraft:deepslate_bricks';}
    if(y>=towerTop-1)return 'minecraft:deepslate_tiles';
    if(b.d>towerR-6){const step=Math.floor(((Math.atan2(b.pz,b.px)/(Math.PI*2)+1)%1)*12);return ((rel%12)+12)%12===step?'minecraft:stone_bricks':AIRS;}
    if(b.d<1.5)return 'minecraft:deepslate_bricks';
    return rel>0&&rel%12===0?'minecraft:deepslate_tiles':AIRS;}
  }
  return undefined;
 }
 const spawn=cityOn?[cityX,cityZ+Math.min(plazaR-2,8)]:[Math.round(hub[0]),Math.round(hub[1])];
 const places=[...(cityOn?[{name:'Cidade inicial',x:cityX,z:cityZ,r:cityR}]:[]),...(towerOn?[{name:'Torre-labirinto',x:towerX,z:towerZ,r:towerR}]:[]),...villages.map(v=>({name:v.name,x:Math.round(v.p[0]),z:Math.round(v.p[1]),r:21})),{name:'Lago central',x:Math.round(lake.x),z:Math.round(lake.z),r:Math.round(lake.r)}];
 return {column,buildBlock,spawn,places,villages,level,radius:R,city:cityOn?{x:cityX,z:cityZ,r:cityR}:null,labyrinth:towerOn?{x:towerX,z:towerZ,r:towerR,base:towerBase,top:towerTop}:null};
}

// Miniatura voxel do andar inteiro (cada célula representa `step` blocos) para pré-visualização.
export function floorMiniature(land,geometry,cells=176){
 const c=land.config,pad=Math.round(Math.max(c.width,c.depth)*.06),size=Math.max(c.width,c.depth)+pad*2,step=size/cells,ex=clamp(step/5,1,4),x0=c.width/2-size/2,z0=c.depth/2-size/2;
 const sea=geometry?.enabled&&geometry.oceanEnabled?geometry.seaLevel:null,yBase=(sea??Math.round(c.height*.35)-14)-6,toY=y=>Math.max(0,Math.round((y-yBase)*ex/step)),H=Math.min(120,toY(c.height)+2),w=new World(cells,H,cells);
 const blocks={beginning:'grass_block',forest:'podzol',ruins:'moss_block',frost:'snow_block',ember:'red_sand'};
 for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
  const x=Math.floor(x0+(i+.5)*step),z=Math.floor(z0+(j+.5)*step),col=land.column(x,z);
  if(!col){if(sea!==null&&Math.hypot(x-geometry.cx,z-geometry.cz)<geometry.innerRadius){w.set(i,0,j,'minecraft:sand');for(let y=1;y<=toY(sea);y++)w.set(i,y,j,WATER);}continue;}
  let surface='minecraft:'+(col.surface||blocks[col.biome]||'grass_block'),top=toY(col.top),extra=0,mat=null;const b=col.build;
  if(col.referenceRole===2)surface='minecraft:cobblestone';
  if(b){if(b.type==='labyrinth'){extra=toY(land.layout.labyrinth.top)-top;mat='minecraft:deepslate_bricks';}else if(b.type==='wall'||b.type==='turret'){extra=Math.max(1,Math.round(14*ex/step));mat='minecraft:stone_bricks';}else if(b.type==='palace'){extra=Math.max(2,Math.round(24*ex/step));mat='minecraft:polished_blackstone_bricks';}else if(b.type==='asset'){extra=Math.max(1,Math.round(10*ex/step));mat=(i+j)%2?'minecraft:dark_oak_planks':'minecraft:oak_planks';}}
  if(col.referenceRole===3){extra=Math.max(1,Math.round((c.reference?.buildingHeight||12)*ex/step));mat='minecraft:stone_bricks';}
  for(const m of land.modules)if(x>=m.x&&x<m.x+m.asset.w&&z>=m.z&&z<m.z+m.asset.d){extra=Math.max(extra,Math.max(1,Math.round(m.asset.h*ex/step)));mat='minecraft:stone_bricks';}
  for(let y=Math.max(0,toY(col.bottom));y<top;y++)w.set(i,y,j,'minecraft:stone');w.set(i,top,j,surface);
  if(col.water!==undefined)for(let y=top+1;y<=Math.max(top+1,toY(col.water));y++)w.set(i,y,j,WATER);
  for(let y=1;y<=extra;y++)w.set(i,top+y,j,mat);
  if(!extra&&col.water===undefined&&(col.trees||0)>20&&(i*7+j*13)%3===0)w.set(i,top+1,j,'minecraft:dark_oak_leaves');
  if(sea!==null){w.set(i,0,j,'minecraft:sand');for(let y=1;y<Math.min(toY(sea)+1,toY(col.bottom));y++)w.set(i,y,j,WATER);}
 }
 return {world:w,step,origin:[x0,z0]};
}
