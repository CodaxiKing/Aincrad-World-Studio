import {World} from './world.js';

export const ROLES={0:{name:'Fora do terreno / vazio',color:'#163246'},1:{name:'Terreno',color:'#84ad58'},2:{name:'Rua / caminho',color:'#d8c99d'},3:{name:'Construção',color:'#dc795c'},4:{name:'Floresta',color:'#39724a'},5:{name:'Água',color:'#3d91c9'}};
export function validateReference(input){
 if(!input||input.version!==1||!Number.isInteger(input.width)||!Number.isInteger(input.height)||input.width<1||input.height<1||input.width>1024||input.height>1024||!Array.isArray(input.roles)||input.roles.length!==input.width*input.height||!input.roles.every(n=>Number.isInteger(n)&&n>=0&&n<=5))throw Error('Referência inválida: máximo de 1024 × 1024 pixels classificados.');
 const r={...input,name:String(input.name||'Referência').slice(0,160),buildingHeight:Number(input.buildingHeight??16),noiseBlend:Number(input.noiseBlend??0),style:input.style||'aincrad'};
 if(!Number.isInteger(r.buildingHeight)||r.buildingHeight<4||r.buildingHeight>96||!Number.isFinite(r.noiseBlend)||r.noiseBlend<0||r.noiseBlend>1||!['aincrad','modern','wood'].includes(r.style))throw Error('Altura, relevo ou estilo da referência inválido.');
 if(r.preview&&(typeof r.preview!=='string'||r.preview.length>1000000||!/^data:image\/(?:jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(r.preview)))throw Error('Prévia de referência inválida.');
 return r;
}
export function referenceRole(r,x,z,width,depth){if(x<0||z<0||x>=width||z>=depth)return 0;const px=Math.min(r.width-1,Math.floor((x+.5)/width*r.width)),pz=Math.min(r.height-1,Math.floor((z+.5)/depth*r.height));return r.roles[px+pz*r.width];}
export function classifyRaster(rgba,width,height,preset='map'){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>1024||height>1024||rgba.length!==width*height*4||!['map','city','facade'].includes(preset))throw Error('Imagem ou preset inválido.');
 const roles=[];for(let i=0;i<rgba.length;i+=4){const [r,g,b,a]=rgba.subarray(i,i+4),max=Math.max(r,g,b),min=Math.min(r,g,b),sat=max?1-min/max:0;let role=1;
  if(a<32)role=0;
  else if(preset==='map')role=sat>.25&&g>r*1.2&&b>r*1.2&&max>95?1:0;
  else if(preset==='city'){if(r>g*1.3&&r>b*1.3)role=3;else if(b>r*1.15&&b>g*1.1)role=5;else if(g>r*1.2&&g>b*1.05)role=4;else if(max<70)role=3;else if(max-min<35&&max<225)role=2;}
  roles.push(role);
 }return roles;
}
export function replaceSimilarColor(roles,rgba,index,role,tolerance=48){if(!Number.isInteger(index)||index<0||index>=roles.length||!Number.isInteger(role)||role<0||role>5||!Number.isFinite(tolerance)||tolerance<0||tolerance>255)throw Error('Seleção de cor inválida.');const target=rgba.subarray(index*4,index*4+3),limit=tolerance*tolerance;let count=0;for(let i=0;i<roles.length;i++){if(rgba[i*4+3]<32)continue;let d=0;for(let k=0;k<3;k++)d+=(rgba[i*4+k]-target[k])**2;if(d<=limit){roles[i]=role;count++;}}return count;}
const STYLES={aincrad:{wall:'minecraft:stone_bricks',roof:'minecraft:dark_oak_planks',floor:'minecraft:oak_planks'},modern:{wall:'minecraft:white_concrete',roof:'minecraft:gray_concrete',floor:'minecraft:smooth_stone'},wood:{wall:'minecraft:oak_planks',roof:'minecraft:spruce_planks',floor:'minecraft:oak_planks'}};
export function referenceBuildingBlock(r,x,y,z,width,depth,baseY){
 if(referenceRole(r,x,z,width,depth)!==3||y<baseY||y>=baseY+r.buildingHeight)return undefined;
 const dy=y-baseY,materials=STYLES[r.style],edge=referenceRole(r,x-1,z,width,depth)!==3||referenceRole(r,x+1,z,width,depth)!==3||referenceRole(r,x,z-1,width,depth)!==3||referenceRole(r,x,z+1,width,depth)!==3;
 if(dy===0)return materials.floor;if(dy===r.buildingHeight-1)return materials.roof;
 if(!edge)return 'minecraft:air';
 if(dy<=3&&(x%12===4||x%12===5||z%12===4||z%12===5))return 'minecraft:air';
 return dy%4===2&&(x+z)%4!==0?'minecraft:glass':materials.wall;
}
export function buildPlanSchematic(reference,{width=128,depth=128}={}){
 return buildPlanTile(reference,{width,depth,worldWidth:width,worldDepth:depth});
}
export function buildPlanTile(reference,{width=128,depth=128,worldWidth=width,worldDepth=depth,originX=0,originZ=0}={}){
 const r=validateReference(reference),height=r.buildingHeight+2;if(![width,depth].every(n=>Number.isInteger(n)&&n>0&&n<=512)||width*depth*height>2097152||![worldWidth,worldDepth].every(n=>Number.isInteger(n)&&n>=1&&n<=8192)||![originX,originZ].every(n=>Number.isInteger(n)&&n>=0)||originX+width>worldWidth||originZ+depth>worldDepth)throw Error('Uma peça .schem deve ter até 2.097.152 posições e 512 blocos por eixo. Para cidades grandes, use exportação em peças.');
 const w=new World(width,height,depth);for(let z=0;z<depth;z++)for(let x=0;x<width;x++){const gx=x+originX,gz=z+originZ,role=referenceRole(r,gx,gz,worldWidth,worldDepth);if(!role)continue;w.set(x,0,z,role===5?'minecraft:water[level=0]':role===2?'minecraft:cobblestone':'minecraft:grass_block');if(role===3)for(let y=1;y<=r.buildingHeight;y++)w.set(x,y,z,referenceBuildingBlock(r,gx,y,gz,worldWidth,worldDepth,1));}
 w.offset=[originX,0,originZ];
 return w;
}
export const COLOR_BLOCKS=[['white_concrete',207,213,214],['light_gray_concrete',125,125,115],['gray_concrete',54,57,61],['black_concrete',8,10,15],['brown_concrete',96,59,31],['red_concrete',142,32,32],['orange_concrete',224,97,0],['yellow_concrete',241,175,21],['lime_concrete',94,168,24],['green_concrete',73,91,36],['cyan_concrete',21,119,136],['light_blue_concrete',36,137,199],['blue_concrete',44,46,143],['purple_concrete',100,31,156],['magenta_concrete',169,48,159],['pink_concrete',214,101,143],['stone_bricks',122,121,122],['oak_planks',162,130,79],['dark_oak_planks',67,43,20],['sandstone',216,203,155]];
export function buildFacadeSchematic(rgba,imageWidth,imageHeight,{width=128,height=128,depth=4,mask=null}={}){
 if(!Number.isInteger(imageWidth)||!Number.isInteger(imageHeight)||imageWidth<1||imageHeight<1||imageWidth>1024||imageHeight>1024||rgba.length!==imageWidth*imageHeight*4||![width,height,depth].every(n=>Number.isInteger(n)&&n>0&&n<=512)||width*height*depth>2097152||mask&&mask.length!==imageWidth*imageHeight)throw Error('Dimensões da fachada inválidas ou acima de 2.097.152 posições.');
 const w=new World(width,height,depth),cache=new Map(),ids=COLOR_BLOCKS.map(([name])=>w.id('minecraft:'+name));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const sx=Math.min(imageWidth-1,Math.floor((x+.5)/width*imageWidth)),sy=Math.min(imageHeight-1,Math.floor((y+.5)/height*imageHeight)),i=sx+sy*imageWidth;if(rgba[i*4+3]<32||mask&&mask[i]===0)continue;const rgb=[rgba[i*4],rgba[i*4+1],rgba[i*4+2]],key=rgb.join(',');let best=cache.get(key);if(best===undefined){let error=Infinity;for(let j=0;j<COLOR_BLOCKS.length;j++){const c=COLOR_BLOCKS[j],e=rgb.reduce((n,v,k)=>n+(v-c[k+1])**2,0);if(e<error){best=j;error=e;}}cache.set(key,best);}for(let z=0;z<depth;z++)w.set(x,height-1-y,z,ids[best]);}
 return w;
}
