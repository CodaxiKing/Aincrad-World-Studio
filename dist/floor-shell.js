import {World,isAir} from './world.js';

// Terrain dimensions remain independent from the enclosing Aincrad floor.
// Coordinates are never translated: existing edits and schematics keep their origin.
export function shellConfig(input={}){
 const s={enabled:true,margin:1000,wallHeight:256,wallThickness:8,pillarCount:16,pillarRadius:18,lateralLength:512,tipLength:16,beamWidth:32,beamHeight:24,oceanEnabled:true,seaLevel:null,...input};
 if(typeof s.enabled!=='boolean'||s.margin!==1000)throw Error('A margem do andar deve ser de 1.000 blocos.');
 for(const [key,min,max]of [['wallHeight',128,300],['wallThickness',4,24],['pillarCount',8,32],['pillarRadius',6,64],['lateralLength',32,2048],['tipLength',8,64],['beamWidth',8,128],['beamHeight',4,64]])if(!Number.isInteger(s[key])||s[key]<min||s[key]>max)throw Error('Configuração inválida da estrutura externa: '+key);
 if(s.beamWidth%2)throw Error('A largura da viga deve ser um número par de blocos.');
 if(typeof s.oceanEnabled!=='boolean'||s.seaLevel!==null&&(!Number.isInteger(s.seaLevel)||s.seaLevel<6||s.seaLevel>190))throw Error('Nível da água inválido. Use automático ou Y entre 6 e 190.');
 if(s.lateralLength<4*s.pillarRadius+s.tipLength+4)throw Error('Aumente o suporte lateral para comportar a coluna e a ponta da viga.');
 return s;
}
export function floorGeometry(config){
 const shell=shellConfig(config.shell),cx=config.width/2,cz=config.depth/2;
 const terrainRadius=Math.hypot(config.width/2,config.depth/2),innerRadius=Math.ceil(terrainRadius)+shell.margin,outerRadius=innerRadius+shell.wallThickness,walkRadius=innerRadius;
 const extent=Math.ceil((outerRadius+shell.lateralLength+Math.max(shell.pillarRadius,shell.beamWidth/2)+16)/16)*16;
 const minX=Math.floor((cx-extent)/16)*16,minZ=Math.floor((cz-extent)/16)*16,maxX=Math.ceil((cx+extent)/16)*16,maxZ=Math.ceil((cz+extent)/16)*16;
 const terrainHeight=config.height??128,beamY=Math.round(terrainHeight*.35),pillarDistance=outerRadius+shell.lateralLength-shell.pillarRadius-shell.tipLength;
 const pillars=Array.from({length:shell.pillarCount},(_,i)=>{const angle=i/shell.pillarCount*Math.PI*2,ux=Math.cos(angle),uz=Math.sin(angle);return {x:cx+ux*pillarDistance,z:cz+uz*pillarDistance,ux,uz,angle};});
 const borderPillars=pillars.map(p=>({...p,x:cx+p.ux*(outerRadius+shell.pillarRadius),z:cz+p.uz*(outerRadius+shell.pillarRadius)}));
 const seaLevel=shell.seaLevel??Math.max(9,Math.floor(beamY-(config.relief??12)*(1+(config.heightmap?(config.imageStrength??.65):0))-2));
 if(shell.oceanEnabled&&(seaLevel>=terrainHeight-1||seaLevel>=shell.wallHeight))throw Error('O nível da água precisa ficar abaixo da altura do mapa e da muralha.');
 return {...shell,cx,cz,terrainRadius,innerRadius,outerRadius,walkRadius,beamY,pillarDistance,pillarHeight:320,endPillarHeight:160,seaLevel,seabedThickness:6,extent,minX,minZ,maxX,maxZ,width:maxX-minX,depth:maxZ-minZ,pillars,borderPillars};
}
export function coreIntersects(config,cx,cz){return cx*16<config.width&&cx*16+16>0&&cz*16<config.depth&&cz*16+16>0;}
export function oceanIntersects(g,cx,cz){return g.enabled&&g.oceanEnabled&&Math.hypot(cx*16+8-g.cx,cz*16+8-g.cz)-Math.SQRT2*8<g.innerRadius;}
export function shellIntersects(g,cx,cz){
 if(!g.enabled)return false;const x=cx*16+8-g.cx,z=cz*16+8-g.cz,r=Math.hypot(x,z),pad=Math.SQRT2*8;
 if(r+pad>=g.walkRadius&&r-pad<=g.outerRadius+24)return true;
 return g.pillars.some(p=>{const along=x*p.ux+z*p.uz,across=Math.abs(-x*p.uz+z*p.ux);return across<=Math.max(g.pillarRadius,g.beamWidth/2)+pad&&along+pad>=g.innerRadius&&along-pad<=g.outerRadius+g.lateralLength+g.pillarRadius;});
}
export function floorChunk(config,cx,cz,base=null){
 const g=floorGeometry(config),touches=shellIntersects(g,cx,cz),ocean=oceanIntersects(g,cx,cz);if(!touches&&!ocean)return base||new World(16,config.height,16);
 const w=new World(16,Math.max(base?.h||0,touches?320:config.height),16);if(base){w.palette=[...base.palette];w.cells.set(base.cells);}
 const stone=w.id('minecraft:stone_bricks'),dark=w.id('minecraft:polished_deepslate'),trim=w.id('minecraft:chiseled_stone_bricks'),light=w.id('minecraft:sea_lantern');
 const bedrock=w.id('minecraft:bedrock'),bedStone=w.id('minecraft:stone'),sand=w.id('minecraft:sand'),water=w.id('minecraft:water[level=0]'),airIds=new Set(w.palette.map((s,i)=>isAir(s)?i:-1));
 for(let z=0;z<16;z++)for(let x=0;x<16;x++){
  const dx=cx*16+x+.5-g.cx,dz=cz*16+z+.5-g.cz,r=Math.hypot(dx,dz),wall=r>=g.innerRadius&&r<g.outerRadius,walk=r>=g.walkRadius&&r<g.outerRadius+24;
  if(ocean&&r<g.innerRadius)for(let y=0;y<=g.seaLevel;y++){const idx=x+z*16+y*256;if(airIds.has(w.cells[idx]))w.cells[idx]=y===0?bedrock:y<g.seabedThickness-1?bedStone:y===g.seabedThickness-1?sand:water;}
  if(!touches)continue;
  if(walk)for(let y=0;y<12;y++)w.set(x,y,z,y===11?trim:dark);
  if(wall)for(let y=12;y<g.wallHeight;y++)w.set(x,y,z,y%32<3?dark:stone);
  if(wall&&Math.floor(Math.atan2(dz,dx)*g.innerRadius/6)%2===0)for(let y=g.wallHeight;y<Math.min(319,g.wallHeight+5);y++)w.set(x,y,z,trim);
  for(let i=0;i<g.pillars.length;i++){const p=g.pillars[i],border=g.borderPillars[i],along=dx*p.ux+dz*p.uz,across=Math.abs(-dx*p.uz+dz*p.ux),pd=Math.hypot(dx-(p.x-g.cx),dz-(p.z-g.cz)),bd=Math.hypot(dx-(border.x-g.cx),dz-(border.z-g.cz));
   if(bd<=g.pillarRadius)for(let y=0;y<g.pillarHeight;y++)w.set(x,y,z,y%48<4?trim:dark);
   if(pd<=g.pillarRadius)for(let y=0;y<g.endPillarHeight;y++)w.set(x,y,z,y%48<4?trim:dark);
   if(along>=g.innerRadius&&along<=g.outerRadius+g.lateralLength&&across<=g.beamWidth/2)for(let y=g.beamY;y<g.beamY+g.beamHeight;y++)w.set(x,y,z,dark);
   if(wall&&across<2)for(const yy of [32,96,160,224])if(yy<g.wallHeight)w.set(x,yy,z,light);
  }
 }
 return w;
}
export function floorBounds(config){const g=floorGeometry(config);return g.enabled?{minX:g.minX,minZ:g.minZ,maxX:g.maxX,maxZ:g.maxZ}:{minX:0,minZ:0,maxX:config.width,maxZ:config.depth};}
export function windowShape(config,x,z,size){const b=floorBounds(config),g=floorGeometry(config);if(![x,z,size].every(Number.isInteger)||x%16||z%16||size%16||size<16||size>96||x<b.minX||z<b.minZ||x+size>b.maxX||z+size>b.maxZ)throw Error('Janela fora dos limites do andar. Use origem múltipla de 16.');let height=config.height;for(let cz=z/16;cz<(z+size)/16;cz++)for(let cx=x/16;cx<(x+size)/16;cx++)if(shellIntersects(g,cx,cz))height=320;if(size*size*height>2097152)throw Error('Junto às muralhas e pilares, use janela de 32 ou 64 blocos para visualizar os 320 blocos de altura.');return {height,...b};}
export function floorChunkEntries(config,extraKeys=[]){const g=floorGeometry(config),b=floorBounds(config),extra=new Set(extraKeys),entries=[];for(let cz=b.minZ/16;cz<b.maxZ/16;cz++)for(let cx=b.minX/16;cx<b.maxX/16;cx++)if(coreIntersects(config,cx,cz)||shellIntersects(g,cx,cz)||oceanIntersects(g,cx,cz)||extra.has(`${cx}.${cz}`))entries.push({x:cx,z:cz});entries.sort((a,b)=>Math.floor(a.z/32)-Math.floor(b.z/32)||Math.floor(a.x/32)-Math.floor(b.x/32)||a.z-b.z||a.x-b.x);return entries;}
