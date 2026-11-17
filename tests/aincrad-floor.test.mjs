import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandscape,largeConfig,landscapeWindow} from '../dist/advanced-generation.js';
import {floorMiniature,floorTheme,aincradOptions} from '../dist/aincrad-floor.js';
import {houseVariants,churchAsset,villageAsset,farmAsset,campAsset,ruinsAsset} from '../dist/aincrad-assets.js';
import {floorGeometry} from '../dist/floor-shell.js';
import {encodeChunk,validateBlockState} from '../lib/world-export.mjs';

const base={width:512,depth:512,height:128,topology:'aincrad',seed:'andar-1'};
const blockAt=(land,x,y,z)=>{const w=land.chunk(Math.floor(x/16),Math.floor(z/16));return w.palette[w.get(x%16,y,z%16)];};
const scan=(land,step,fn)=>{const c=land.config;for(let z=0;z<c.depth;z+=step)for(let x=0;x<c.width;x+=step){const col=land.column(x,z);if(col)fn(col,x,z);}};

test('Aincrad disc is circular, deterministic and rejects invalid sizes and options',()=>{
 assert.throws(()=>largeConfig({...base,width:128,depth:128}),/256/);assert.throws(()=>largeConfig({...base,floor:101}),/andar/i);assert.throws(()=>aincradOptions({villages:9}));
 const a=createLandscape(base),other=createLandscape({...base,seed:'outra'});
 assert.equal(a.column(2,2),null);assert.equal(a.column(509,2),null);assert.ok(a.column(256,256));
 let inside=0,differs=0;for(let z=8;z<512;z+=16)for(let x=8;x<512;x+=16){const c=a.column(x,z);if(c){inside++;if(c.top!==other.column(x,z)?.top)differs++;}}
 assert.ok(Math.abs(inside/1024-Math.PI/4)<.03,'cobertura próxima de um círculo');assert.ok(differs>50,'a seed altera o relevo');
 const w1=a.chunk(15,20),w2=createLandscape({...base}).chunk(15,20);assert.deepEqual(Array.from(w1.cells),Array.from(w2.cells));assert.deepEqual(w1.palette,w2.palette);
});

test('starting city has wall, gate, fountain, varied houses and a church; spawn is on the plaza',()=>{
 const land=createLandscape(base),{city,labyrinth,level}=land.layout;
 assert.ok(city.z>256&&labyrinth.z<256&&city.x===256&&labyrinth.x===256);
 assert.equal(blockAt(land,city.x+city.r-2,level+6,city.z+20),'minecraft:stone_bricks');
 assert.equal(blockAt(land,city.x,level+3,city.z-city.r+2),'minecraft:air','portão norte aberto');
 assert.equal(blockAt(land,city.x+2,level+1,city.z),'minecraft:water[level=0]','fonte da praça');
 assert.deepEqual(land.spawn,[city.x,city.z+8]);assert.equal(land.column(...land.spawn).top,level);
 const big=createLandscape({...base,width:1024,depth:1024}),assets=new Set();scan(big,1,col=>{if(col.build?.type==='asset')assets.add(col.build.asset);});
 assert.ok(assets.size>=5,'modelos de casa variados: '+assets.size);assert.ok([...assets].some(a=>a.palette.includes('minecraft:gold_block')),'igreja com sino');
 assert.equal(houseVariants().length,24);for(const a of [...houseVariants(),churchAsset(),villageAsset(1),farmAsset(0),farmAsset(1),campAsset(2),ruinsAsset(Math.random)])for(const s of a.palette)validateBlockState(s);
 assert.ok(houseVariants()[1].palette.some(s=>s.startsWith('minecraft:oak_door'))&&houseVariants()[1].palette.some(s=>s.startsWith('minecraft:ladder')));
});

test('labyrinth tower has a door, per-storey mazes, ladder and ramp between storeys and reaches the ceiling',()=>{
 const land=createLandscape({...base,width:1024,depth:1024}),T=land.layout.labyrinth,y1=T.base+2;
 assert.ok(T.maze&&T.storeys>=4);
 assert.equal(blockAt(land,T.x+T.r-1,land.config.height-3,T.z),'minecraft:deepslate_bricks');
 assert.equal(blockAt(land,T.x+T.door[0]*(T.r-1),y1,T.z+T.door[1]*(T.r-1)),'minecraft:air','porta voltada para a cidade');
 assert.equal(blockAt(land,T.x,y1,T.z),'minecraft:deepslate_bricks');assert.match(blockAt(land,T.x,y1,T.z+1),/^minecraft:ladder/);assert.match(blockAt(land,T.x,T.base+12,T.z+1),/^minecraft:ladder/,'escada atravessa o piso');
 assert.equal(blockAt(land,T.x+T.r-8,y1,T.z),'minecraft:air','túnel leste liga o anel ao labirinto');
 let walls=0,open=0;for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++)blockAt(land,T.x+dx,y1,T.z+dz)==='minecraft:air'?open++:walls++;assert.ok(walls>40&&open>100,'labirinto com paredes e corredores');
 const ringY=T.base+1+12,slab=[],full=[];for(let a=0;a<360;a+=5){const x=Math.round(T.x+Math.cos(a*Math.PI/180)*(T.r-4)),z=Math.round(T.z+Math.sin(a*Math.PI/180)*(T.r-4));for(let y=ringY;y<ringY+12;y++){const s=blockAt(land,x,y,z);if(/slab/.test(s))slab.push(y);else if(s==='minecraft:stone_bricks')full.push(y);}}
 assert.ok(slab.length>10&&Math.max(...full)===ringY+11&&Math.min(...slab)===ringY,'rampa sobe um andar inteiro em meios-degraus');
});

test('terrain has beaches, slope cliffs, varied biomes, downhill rivers, routed roads with bridges and points of interest',()=>{
 const land=createLandscape({...base,width:1024,depth:1024}),L=land.layout,subs={},seen={bridge:0,road:0,cane:0,sandBank:0};
 scan(land,3,col=>{subs[col.sub]=(subs[col.sub]||0)+1;if(col.build?.type==='bridge')seen.bridge++;if(col.road)seen.road++;if(col.cane)seen.cane++;if(col.sub==='beach'&&!col.road){assert.equal(col.surface,'sand');seen.sandBank++;}if(col.water!==undefined)assert.ok(col.top<col.water);assert.ok(col.top<=land.config.height-30&&col.bottom<col.top);});
 for(const k of ['water','beach','cliff','snow','highland','forest','meadow','plains','city','tower'])assert.ok(subs[k]>5,k+': '+subs[k]);
 assert.ok(seen.road>100&&seen.bridge>0&&seen.cane>0);
 assert.ok(L.rivers.length>=2&&L.roads.length>=3);
 for(const r of L.rivers)for(let i=1;i<r.wl.length;i++)assert.ok(r.wl[i]<=r.wl[i-1],'o rio nunca sobe');
 assert.ok(L.rivers.some(r=>r.wl[0]>=r.wl.at(-1)+4),'nascente acima da foz');
 const main=L.roads[0],end=main.at(-1);assert.ok(Math.hypot(end[0]-L.labyrinth.x,end[1]-L.labyrinth.z)<L.labyrinth.r+4,'estrada chega à torre');
 const names=land.modules.map(m=>m.name).join('|');for(const n of ['Vila','Fazenda','Ruínas','Acampamento','Torre de vigia','Masmorra'])assert.ok(names.includes(n),n);
 let rimBeach=0;if(L.sea!==null)scan(land,4,col=>{if(col.sub==='beach'&&col.top<=L.sea+3)rimBeach++;});assert.ok(rimBeach>20,'praias na borda com o oceano');
});

test('every theme and several floors generate exportable chunks with plants, persistent leaves and no invalid states',()=>{
 const states=new Set();
 for(const biome of ['beginning','forest','ruins','frost','ember']){const land=createLandscape({...base,biome,seed:'t-'+biome}),{city,labyrinth}=land.layout;
  for(const [x,z]of [[city.x,city.z],[city.x-40,city.z+30],[labyrinth.x,labyrinth.z],[land.modules[0].x,land.modules[0].z],[330,240],[150,300],[400,200]]){const cx=Math.floor(x/16),cz=Math.floor(z/16),w=land.chunk(cx,cz);for(const s of w.palette){validateBlockState(s);states.add(s);}assert.ok(encodeChunk(w,cx,cz,land.theme).length>500);}
  for(let z=0;z<512;z+=32)for(let x=0;x<512;x+=32)assert.ok(['beginning','forest','ruins','frost','ember'].includes(land.theme(x,z)));}
 for(const s of ['minecraft:oak_leaves[persistent=true]','minecraft:short_grass','minecraft:ice','minecraft:polished_diorite','minecraft:crimson_stem','minecraft:lantern[hanging=false,waterlogged=false]'])assert.ok(states.has(s),s);
 const t1=floorTheme(1),t50=floorTheme(50),t100=floorTheme(100);assert.equal(t1.biome,'beginning');assert.equal(t1.scale,1);assert.ok(t100.scale<t50.scale&&t50.scale<1);assert.throws(()=>floorTheme(0));
 const upper=createLandscape({...base,floor:37,seed:t50.seed,biome:floorTheme(37).biome,aincrad:floorTheme(37).aincrad});assert.notEqual(upper.layout.theta,0);assert.ok(upper.column(...upper.spawn));
 for(const s of upper.chunk(Math.floor(upper.layout.city.x/16),Math.floor(upper.layout.city.z/16)).palette)validateBlockState(s);
});

test('options disable content; window and miniature cover the whole floor; legacy topologies are untouched',()=>{
 const plain=createLandscape({...base,features:{city:false,labyrinth:false,dungeon:false},aincrad:{villages:0,water:0,pois:0}});
 assert.equal(plain.layout.city,null);assert.equal(plain.layout.labyrinth,null);assert.equal(plain.modules.length,0);assert.equal(plain.layout.rivers.length,0);assert.ok(plain.column(...plain.spawn));
 const land=createLandscape(base),w=landscapeWindow(land,224,352,64);assert.equal(w.h,128);assert.ok(w.palette.includes('minecraft:stone_bricks'));
 const mini=floorMiniature(land,floorGeometry(land.config),96);assert.equal(mini.world.w,96);
 for(const s of ['minecraft:deepslate_bricks','minecraft:water[level=0]','minecraft:stone_bricks','minecraft:grass_block','minecraft:sand'])assert.ok(mini.world.palette.includes(s),s);
 const big=createLandscape({...base,aincrad:{city:2}}),small=createLandscape({...base,aincrad:{city:.5}});assert.ok(big.layout.city.r>small.layout.city.r);
 const legacy=createLandscape({...base,topology:'floating',features:{city:false,labyrinth:false,dungeon:false,arena:false}});assert.equal(legacy.layout,null);assert.ok(floorMiniature(legacy,floorGeometry(legacy.config),64).world.palette.length>2);
});
