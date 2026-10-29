import {World,house,tower,previewPlacement,applyDelta,isAir} from './world.js';
import {placementRecord} from './objects.js';
export const BIOMES={
 beginning:{name:'Planícies do Início',surface:'grass_block',soil:'dirt',rock:'stone',log:'oak_log',leaves:'oak_leaves',trees:18,description:'Campos verdes e bosques claros, inspirados na região inicial de Aincrad.'},
 forest:{name:'Bosque de Aincrad',surface:'grass_block',soil:'podzol',rock:'stone',log:'dark_oak_log',leaves:'dark_oak_leaves',trees:65,description:'Floresta densa, relevo suave e clareiras para exploração.'},
 ruins:{name:'Ruínas da Névoa',surface:'moss_block',soil:'dirt',rock:'andesite',log:'oak_log',leaves:'azalea_leaves',trees:22,description:'Maciços cobertos de musgo e ruínas de pedra.'},
 frost:{name:'Cordilheira de Gelo',surface:'snow_block',soil:'stone',rock:'stone',log:'spruce_log',leaves:'spruce_leaves',trees:25,description:'Montanhas nevadas com pinheiros e rochas expostas.'},
 ember:{name:'Planalto Ígneo',surface:'red_sand',soil:'red_terracotta',rock:'basalt',log:'crimson_stem',leaves:'nether_wart_block',trees:10,description:'Paisagem vulcânica em tons quentes para andares de alta dificuldade.'}
};
export function normalizeGeneration(f={}){const width=Number(f.width??f.size??80),depth=Number(f.depth??f.size??80),height=Number(f.height??80),biome=f.biome||'beginning',topology=f.topology||(f.type==='exploration'?'continental':'floating');
 if(![width,depth].every(n=>Number.isInteger(n)&&n>=32&&n<=256)||!Number.isInteger(height)||height<48||height>192||width*depth*height>2097152)throw Error('Dimensões: X/Z entre 32 e 256, Y entre 48 e 192; máximo de 2.097.152 posições.');
 if(!BIOMES[biome]||!['floating','continental','archipelago'].includes(topology))throw Error('Bioma ou topologia inválidos.');
 const defaults={city:f.type==='city'||f.type==='mixed',dungeon:f.type==='dungeon',labyrinth:f.type==='maze',arena:f.type==='boss',ruins:biome==='ruins',trees:true,lakes:false},features={...defaults,...f.features};
 if(!Object.values(features).every(v=>typeof v==='boolean'))throw Error('Opções de conteúdo inválidas.');
 const levels=Number(f.mazeLevels??3),islandCount=Number(f.islandCount??3);if(!Number.isInteger(levels)||levels<1||levels>4||!Number.isInteger(islandCount)||islandCount<2||islandCount>7)throw Error('Labirinto: 1–4 pisos; arquipélago: 2–7 ilhas.');
 const relief=Number(f.relief??7);if(!Number.isFinite(relief)||relief<0||relief>16)throw Error('Relevo inválido.');
 return {...f,width,depth,height,size:width,biome,topology,features,mazeLevels:levels,islandCount,relief,seed:String(f.seed||'aincrad-001').slice(0,64)};
}
function rng(seed){let n=2166136261;for(const c of seed)n=Math.imul(n^c.charCodeAt(0),16777619);return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function mazeAsset(levels,seed='maze'){const n=5,span=n*3+1,w=span+5,d=span,h=(levels-1)*7+6,a=new World(w,h,d),stone='minecraft:stone_bricks',wall='minecraft:deepslate_bricks',graph=[];
 for(let level=0;level<levels;level++){
  const yy=level*7,random=rng(seed+'-'+level),visited=new Set(['0,0']),stack=[[0,0]],edges=[];
  while(stack.length){const [x,z]=stack.at(-1),options=[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dz])=>x+dx>=0&&x+dx<n&&z+dz>=0&&z+dz<n&&!visited.has(`${x+dx},${z+dz}`));if(!options.length){stack.pop();continue;}const [dx,dz]=options[Math.floor(random()*options.length)];edges.push([[x,z],[x+dx,z+dz]]);visited.add(`${x+dx},${z+dz}`);stack.push([x+dx,z+dz]);}
  graph.push({level,edges});
  for(let x=0;x<w;x++)for(let z=0;z<d;z++){a.set(x,yy,z,stone);if(x<span&&(x%3===0||z%3===0))for(let y=1;y<=4;y++)a.set(x,yy+y,z,wall);}
  for(const [[x,z],[xx,zz]]of edges){const bx=(Math.max(x,xx))*3,bz=Math.max(z,zz)*3;for(let k=1;k<=2;k++)for(let y=1;y<=3;y++)a.set(x!==xx?bx:x*3+k,yy+y,z!==zz?bz:z*3+k,0);}
  // Entry to each floor and a staircase corridor outside the maze walls.
  for(let y=1;y<=3;y++){a.set(1,yy+y,0,0);a.set(2,yy+y,0,0);a.set(span-1,yy+y,1,0);a.set(span-1,yy+y,2,0);}
 }
 for(let level=0;level<levels-1;level++)for(let step=1;step<=7;step++)for(let x=span+1;x<=span+2;x++){
  const z=step+1,y=level*7+step;for(let head=1;head<=3;head++)a.set(x,y+head,z,0);for(let fill=level*7;fill<y;fill++)a.set(x,fill,z,stone);a.set(x,y,z,'minecraft:stone_brick_stairs[facing=south,half=bottom,shape=straight,waterlogged=false]');
 }
 a.mazeGraph=graph;return a;
}
function dungeonAsset(){const a=new World(17,7,17);for(let x=0;x<17;x++)for(let z=0;z<17;z++){a.set(x,0,z,'minecraft:deepslate_tiles');if(x===0||z===0||x===16||z===16||x===8||z===8)for(let y=1;y<6;y++)a.set(x,y,z,'minecraft:cracked_stone_bricks');}for(const [x,z]of [[4,0],[4,8],[8,4],[8,12],[12,8]])for(let dx=0;dx<2;dx++)for(let y=1;y<=3;y++)a.set(x===8?x:x+dx,y,x===8?z+dx:z,0);return a;}
function villageAsset(){const a=new World(27,13,27),h=house();for(const [ox,oz]of [[1,1],[15,1],[1,15],[15,15]])for(let y=0;y<h.h;y++)for(let z=0;z<h.d;z++)for(let x=0;x<h.w;x++){const id=h.get(x,y,z);if(id)a.set(x+ox,y,z+oz,h.palette[id]);}for(let x=0;x<a.w;x++)for(let z=0;z<a.d;z++)if(x>=12&&x<=14||z>=12&&z<=14)a.set(x,0,z,'minecraft:cobblestone');return a;}
function arenaAsset(){const a=new World(19,7,19);for(let x=0;x<19;x++)for(let z=0;z<19;z++){const r=Math.hypot(x-9,z-9);if(r>9)continue;a.set(x,0,z,'minecraft:polished_andesite');if(r>8)for(let y=1;y<6;y++)if(!(x>=8&&x<=10))a.set(x,y,z,'minecraft:deepslate_bricks');}return a;}
export function generateConfigured(input={}){
 const c=normalizeGeneration(input),w=new World(c.width,c.height,c.depth),b=BIOMES[c.biome],random=rng(c.seed),phase=random()*500,level=Math.round(c.height*.39),rock=w.id('minecraft:'+b.rock),soil=w.id('minecraft:'+b.soil),surface=w.id('minecraft:'+b.surface);
 const centers=[{x:c.width*.5,z:c.depth*.5,r:Math.min(c.width,c.depth)*(c.topology==='archipelago'?.29:.48)}];
 if(c.topology==='archipelago')for(let i=1;i<c.islandCount;i++){const angle=(i-1)/(c.islandCount-1)*Math.PI*2;centers.push({x:c.width*(.5+Math.cos(angle)*.34),z:c.depth*(.5+Math.sin(angle)*.34),r:Math.min(c.width,c.depth)*(.12+random()*.035)});}
 const noise=(x,z)=>Math.sin(x*.13+phase)*2+Math.cos(z*.11-phase)*2+Math.sin((x+z)*.17+phase)*1.4;
 for(let z=0;z<c.depth;z++)for(let x=0;x<c.width;x++){
  let radial=0;if(c.topology!=='continental'){radial=Math.min(...centers.map(p=>Math.hypot(x-p.x,z-p.z)/p.r));if(radial>1+noise(x*2,z*2)*.009)continue;}
  const top=Math.max(8,Math.min(c.height-22,Math.round(level+noise(x,z)*c.relief/6+(c.biome==='frost'?Math.abs(noise(x*.4,z*.4))*c.relief/2:0)))),bottom=c.topology==='continental'?0:Math.max(2,Math.round(level-5-(1-Math.min(1,radial))*Math.min(22,c.height*.26)));
  for(let y=bottom;y<=top;y++)w.set(x,y,z,y===top?surface:y>top-3?soil:rock);
 }
 const reserved=[],features=[];if(c.features.city)features.push(['Vila modular de Aincrad · 4 casas',villageAsset()]);if(c.features.dungeon)features.push(['Masmorra modular',dungeonAsset()]);if(c.features.labyrinth)features.push(['Labirinto vertical',mazeAsset(c.mazeLevels,c.seed)]);if(c.features.arena)features.push(['Arena de chefe',arenaAsset()]);if(c.features.ruins)features.push(['Torre em ruínas',tower()]);
 if(features.length>1&&(c.width<64||c.depth<64))throw Error('Para combinar estruturas, use largura e comprimento de pelo menos 64 blocos.');
 if(features.length===5&&(c.width<112||c.depth<112))throw Error('Cinco módulos exigem X e Z de pelo menos 112 blocos para não se sobreporem.');
 const spots=features.length===1?[[.5,.5]]:[[.3,.3],[.7,.3],[.3,.7],[.7,.7],[.5,.5]];
 for(let i=0;i<features.length;i++){
  const [name,a]=features[i],[sx,sz]=spots[i],x=Math.round(c.width*sx-a.w/2),z=Math.round(c.depth*sz-a.d/2),heights=[];
  for(let xx=x;xx<x+a.w;xx++)for(let zz=z;zz<z+a.d;zz++){const top=w.top(xx,zz);if(top>=0)heights.push(top);}if(!heights.length)throw Error('Estrutura sem terreno de apoio. Aumente as ilhas ou use terreno contínuo.');heights.sort((a,b)=>a-b);const y=heights[Math.floor(heights.length/2)]+1;if(y+a.h>c.height)throw Error('A altura escolhida não comporta as estruturas e pisos. Aumente Y ou reduza os pisos.');
  // Build bounded foundations, never pillars descending through the entire void.
  for(let xx=x;xx<x+a.w;xx++)for(let zz=z;zz<z+a.d;zz++){const top=w.top(xx,zz);for(let yy=top<0?Math.max(0,y-8):Math.min(top+1,y);yy<y;yy++)w.set(xx,yy,zz,rock);for(let yy=y;yy<=top;yy++)w.set(xx,yy,zz,0);}
  const t={x,y,z,rotation:0,mirrorX:false,mirrorZ:false,terrain:'none',air:'include',blendRadius:8,blendIterations:2,protectStructures:true},op=previewPlacement(w,a,t);applyDelta(w,op);w.placements.push(placementRecord(w,a,t,op,{name}));reserved.push([x-2,z-2,x+a.w+2,z+a.d+2]);
 }
 if(c.features.trees)for(let i=0;i<Math.round(b.trees*c.width*c.depth/6400);i++){
  const x=3+Math.floor(random()*(c.width-6)),z=3+Math.floor(random()*(c.depth-6));if(reserved.some(([x0,z0,x1,z1])=>x>=x0&&x<=x1&&z>=z0&&z<=z1))continue;const y=w.top(x,z);if(y<0||y+7>=c.height)continue;
  for(let k=1;k<=4;k++)w.set(x,y+k,z,'minecraft:'+b.log);for(let dx=-2;dx<=2;dx++)for(let dz=-2;dz<=2;dz++)for(let dy=3;dy<=6;dy++)if(Math.abs(dx)+Math.abs(dz)+Math.abs(dy-4)<5)w.set(x+dx,y+dy,z+dz,'minecraft:'+b.leaves);
 }
 if(c.features.lakes){const x=Math.round(c.width*.5),z=Math.round(c.depth*.65);if(!reserved.some(([x0,z0,x1,z1])=>x+5>=x0&&x-5<=x1&&z+5>=z0&&z-5<=z1)){const y=w.top(x,z)-1;for(let dx=-4;dx<=4;dx++)for(let dz=-4;dz<=4;dz++)if(dx*dx+dz*dz<=16&&w.top(x+dx,z+dz)>=y){w.set(x+dx,y,z+dz,'minecraft:water[level=0]');for(let yy=y+1;yy<=w.top(x+dx,z+dz);yy++)w.set(x+dx,yy,z+dz,0);}}}
 w.revision=0;w.generationConfig=c;return w;
}
