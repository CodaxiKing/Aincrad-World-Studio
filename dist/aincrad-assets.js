import {World} from './world.js';

// Modelos de construções do andar de Aincrad. Porta sempre na face norte (z = 0), voltada para a rua.
const M=s=>'minecraft:'+s;
const stair=(mat,facing)=>M(`${mat}_stairs[facing=${facing},half=bottom,shape=straight,waterlogged=false]`);
const DOOR=half=>M(`oak_door[facing=south,half=${half},hinge=left,open=false,powered=false]`);
const WOOL=['red_wool','yellow_wool','blue_wool','white_wool'];
export const STYLES=[
 {wall:'oak_planks',frame:'oak_log',base:'cobblestone',roof:'dark_oak',floor:'oak_planks'},
 {wall:'white_terracotta',frame:'dark_oak_log',base:'stone_bricks',roof:'spruce',floor:'spruce_planks'},
 {wall:'spruce_planks',frame:'spruce_log',base:'cobblestone',roof:'brick',floor:'oak_planks'},
 {wall:'bricks',frame:'oak_log',base:'stone_bricks',roof:'dark_oak',floor:'oak_planks'}
];
const ROOF_FILL={dark_oak:'dark_oak_planks',spruce:'spruce_planks',brick:'bricks',stone_brick:'stone_bricks',oak:'oak_planks'};

export function building({w,d,floors=1,style=STYLES[0],shop=false,chimney=false,open=false,glass='glass'}){
 const fh=4,wallTop=floors*fh,roofH=Math.ceil((w+2)/2),oz=shop?1:0,a=new World(w+2,wallTop+roofH+2,d+oz),ox=1,x1=ox+w-1,z0=oz,z1=oz+d-1,mid=ox+(w>>1);
 for(let z=z0;z<=z1;z++)for(let x=ox;x<=x1;x++){
  const edgeX=x===ox||x===x1,edgeZ=z===z0||z===z1,edge=edgeX||edgeZ,corner=edgeX&&edgeZ;
  a.set(x,0,z,M(edge?style.base:style.floor));
  for(let y=1;y<=wallTop;y++){
   if(edge){const ly=(y-1)%fh,along=edgeX?z-z0:x-ox,window=!corner&&ly>=1&&ly<=2&&along%3===2&&along>0&&along<(edgeX?d:w)-1;
    a.set(x,y,z,corner?M(style.frame):window?M(glass):M(y<=fh&&floors>1?style.base:style.wall));}
   else if(!open&&y%fh===0&&y<wallTop)a.set(x,y,z,M(style.floor));
  }
 }
 // Porta (dois blocos) ou balcão de loja
 a.set(mid,1,z0,DOOR('lower'));a.set(mid,2,z0,DOOR('upper'));
 if(shop){for(let x=ox+1;x<x1;x++)if(x!==mid&&Math.abs(x-mid)>1){a.set(x,2,z0,M('air'));a.set(x,3,z0,M('air'));}for(let x=ox;x<=x1;x++)a.set(x,4,0,M(WOOL[(x&1)*3]));}
 // Telhado de duas águas com cumeeira ao longo de Z
 for(let k=0;;k++){const xw=ox-1+k,xe=x1+1-k,y=wallTop+1+k;if(xw>xe)break;
  for(let z=z0;z<=z1;z++){if(xw===xe)a.set(xw,y,z,M(ROOF_FILL[style.roof]));else{a.set(xw,y,z,stair(style.roof,'east'));a.set(xe,y,z,stair(style.roof,'west'));}}
  for(const z of [z0,z1])for(let x=xw+1;x<xe;x++)a.set(x,y,z,M(style.wall));
 }
 // Interior
 if(!open){const zi=z0+1;a.set(ox+1,1,zi,M('crafting_table'));a.set(ox+1,2,zi,M('lantern[hanging=false,waterlogged=false]'));a.set(x1-1,1,zi,M('bookshelf'));a.set(x1-1,2,zi,M('bookshelf'));
  a.set(x1-1,1,z1-1,stair('oak','north'));for(let z=z0+2;z<=z1-2;z++)for(let x=mid-1;x<=mid+1;x++)a.set(x,1,z,M('white_carpet'));
  for(let f=1;f<floors;f++){for(let y=1;y<=f*fh;y++)a.set(ox+1,y,z1-1,M('ladder[facing=east,waterlogged=false]'));a.set(x1-1,f*fh+1,z1-1,M('bookshelf'));a.set(mid,f*fh+1,z0+2,M('lantern[hanging=false,waterlogged=false]'));}
 }
 if(chimney)for(let y=1;y<=wallTop+roofH;y++)a.set(x1-1,y,z1-1,M(y>wallTop?'bricks':'cobblestone'));
 return a;
}
let variants=null;
export function houseVariants(){
 if(variants)return variants;variants=[];
 for(let s=0;s<STYLES.length;s++){const style=STYLES[s];
  variants.push(building({w:7,d:7,style,chimney:s%2===0}));
  variants.push(building({w:9,d:9,floors:2,style}));
  variants.push(building({w:11,d:8,style,chimney:true}));
  variants.push(building({w:9,d:7,style,shop:true}));
  variants.push(building({w:7,d:9,floors:3,style}));
  variants.push(building({w:11,d:11,floors:2,style,chimney:s%2===1}));
 }
 return variants;
}
export function churchAsset(){
 const style={wall:'stone_bricks',frame:'stone_bricks',base:'stone_bricks',roof:'dark_oak',floor:'polished_andesite'},nave=building({w:9,d:13,floors:2,style,open:true,glass:'light_blue_stained_glass'}),a=new World(nave.w,30,nave.d),mid=nave.w>>1;
 for(let y=0;y<nave.h;y++)for(let z=0;z<nave.d;z++)for(let x=0;x<nave.w;x++){const id=nave.get(x,y,z);if(id)a.set(x,y,z,nave.palette[id]);}
 // Torre do sino sobre a entrada
 for(let y=1;y<=22;y++)for(let z=0;z<5;z++)for(let x=mid-2;x<=mid+2;x++){const edge=x===mid-2||x===mid+2||z===0||z===4;if(y<=8&&z>0)continue;if(edge){if(x===mid&&z===0&&y<=2)continue;a.set(x,y,z,M(y>=18&&y<=20&&(x===mid||z===2)?'air':'stone_bricks'));}else if(y===17)a.set(x,y,z,M('stone_bricks'));else if(y>8)a.set(x,y,z,M('air'));}
 a.set(mid,19,2,M('gold_block'));a.set(mid,1,0,DOOR('lower'));a.set(mid,2,0,DOOR('upper'));
 for(let k=0;k<3;k++)for(let z=k;z<5-k;z++)for(let x=mid-2+k;x<=mid+2-k;x++)a.set(x,23+k,z,M(k===2?'gold_block':'dark_oak_planks'));
 for(let z=6;z<=9;z+=1)for(const x of [mid-3,mid-2,mid+2,mid+3])if(z%2===0)a.set(x,1,z,stair('oak','south'));
 a.set(mid,1,11,M('quartz_block'));a.set(mid,2,11,M('lantern[hanging=false,waterlogged=false]'));a.set(mid-1,1,11,M('quartz_block'));a.set(mid+1,1,11,M('quartz_block'));
 return a;
}
const paste=(a,b,ox,oy,oz)=>{for(let y=0;y<b.h;y++)for(let z=0;z<b.d;z++)for(let x=0;x<b.w;x++){const id=b.get(x,y,z);if(id)a.set(ox+x,oy+y,oz+z,b.palette[id]);}};
const lamp=(a,x,z)=>{for(let y=1;y<=3;y++)a.set(x,y,z,M('cobblestone_wall'));a.set(x,4,z,M('lantern[hanging=false,waterlogged=false]'));};
export function villageAsset(index=0){
 const v=houseVariants(),size=47,a=new World(size,26,size),c=size>>1,pick=k=>v[(index*7+k*5+k*k)%v.length];
 for(let z=0;z<size;z++)for(let x=0;x<size;x++)a.set(x,0,z,M(Math.abs(x-c)<=1||Math.abs(z-c)<=1||Math.hypot(x-c,z-c)<6?'dirt_path':'grass_block'));
 const spots=[[4,27],[30,27],[4,4],[30,4]];
 spots.forEach(([x,z],k)=>{const h=pick(k);if(z<c){/* casas ao norte ficam de costas: mantém a porta para o norte */}paste(a,h,x+Math.floor((13-h.w)/2),0,z);});
 for(let z=c-2;z<=c+2;z++)for(let x=c-2;x<=c+2;x++){const rim=Math.abs(x-c)===2||Math.abs(z-c)===2;a.set(x,0,z,M('cobblestone'));a.set(x,1,z,rim?M('cobblestone'):M('water[level=0]'));}
 for(const [x,z]of [[c-2,c-2],[c+2,c-2],[c-2,c+2],[c+2,c+2]])for(let y=2;y<=4;y++)a.set(x,y,z,M('oak_fence'));
 for(let z=c-2;z<=c+2;z++)for(let x=c-2;x<=c+2;x++)a.set(x,5,z,M('dark_oak_slab[type=bottom,waterlogged=false]'));
 for(const [x,z]of [[c-4,c-4],[c+4,c-4],[c-4,c+4],[c+4,c+4]])lamp(a,x,z);
 a.set(c+5,1,c+3,M('hay_block'));a.set(c+6,1,c+3,M('hay_block'));a.set(c+5,2,c+3,M('hay_block'));
 return a;
}
export function farmAsset(index=0){
 const w=17,d=13,a=new World(w,4,d),crop=index%2?'carrots[age=7]':'wheat[age=7]';
 for(let z=0;z<d;z++)for(let x=0;x<w;x++){const edge=x===0||z===0||x===w-1||z===d-1,channel=x%5===3;
  a.set(x,0,z,M(edge?'coarse_dirt':channel?'water[level=0]':'farmland[moisture=7]'));
  if(edge){if(!(z===0&&Math.abs(x-(w>>1))<=1))a.set(x,1,z,M('oak_fence'));}else if(!channel)a.set(x,1,z,M(crop));}
 a.set(1,1,1,M('hay_block'));a.set(1,2,1,M('pumpkin'));a.set(1,0,1,M('coarse_dirt'));
 return a;
}
export function campAsset(index=0){
 const s=13,a=new World(s,6,s),c=s>>1;
 for(let z=0;z<s;z++)for(let x=0;x<s;x++)if(Math.hypot(x-c,z-c)<=6.3)a.set(x,0,z,M(Math.hypot(x-c,z-c)<2.5?'coarse_dirt':'grass_block'));
 for(const [x,z]of [[c-1,c-1],[c+1,c-1],[c-1,c+1],[c+1,c+1],[c,c-1],[c,c+1],[c-1,c],[c+1,c]])a.set(x,1,z,M('cobblestone_slab[type=bottom,waterlogged=false]'));
 a.set(c,0,c,M('cobblestone'));a.set(c,1,c,M('torch'));
 const tent=(x0,z0,color)=>{for(let z=0;z<4;z++){a.set(x0,1,z0+z,M(color));a.set(x0+2,1,z0+z,M(color));a.set(x0+1,2,z0+z,M(color));if(z===3)a.set(x0+1,1,z0+z,M(color));}a.set(x0+1,1,z0+1,M('white_carpet'));};
 tent(1,2,WOOL[index%4]);tent(s-4,s-6,WOOL[(index+1)%4]);
 a.set(c-3,1,c+3,M('oak_log[axis=x]'));a.set(c-2,1,c+3,M('oak_log[axis=x]'));a.set(c+3,1,c-3,M('hay_block'));a.set(c+3,1,c-2,M('crafting_table'));
 return a;
}
export function ruinsAsset(rnd){
 const s=17,a=new World(s,9,s),mats=['stone_bricks','mossy_stone_bricks','cracked_stone_bricks','mossy_cobblestone'],pick=()=>M(mats[Math.floor(rnd()*mats.length)]);
 for(let z=0;z<s;z++)for(let x=0;x<s;x++){const edge=x===1||z===1||x===s-2||z===s-2,inside=x>=1&&z>=1&&x<=s-2&&z<=s-2;
  a.set(x,0,z,inside?(rnd()<.55?pick():M('coarse_dirt')):M('grass_block'));
  if(edge&&inside&&!(z===1&&Math.abs(x-(s>>1))<=1)){const h=Math.floor(rnd()*rnd()*7);for(let y=1;y<=h;y++)a.set(x,y,z,pick());}}
 for(const [x,z]of [[5,5],[11,5],[5,11],[11,11]]){const h=2+Math.floor(rnd()*5);for(let y=1;y<=h;y++)a.set(x,y,z,M(y===h?'chiseled_stone_bricks':'stone_bricks'));}
 a.set(s>>1,1,s>>1,M('chiseled_stone_bricks'));a.set(s>>1,2,s>>1,M('sea_lantern'));
 return a;
}
