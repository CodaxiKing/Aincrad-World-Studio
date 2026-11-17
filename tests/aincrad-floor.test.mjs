import test from 'node:test';
import assert from 'node:assert/strict';
import {createLandscape,largeConfig,landscapeWindow} from '../dist/advanced-generation.js';
import {floorMiniature} from '../dist/aincrad-floor.js';
import {floorGeometry} from '../dist/floor-shell.js';
import {encodeChunk,validateBlockState} from '../lib/world-export.mjs';

const base={width:512,depth:512,height:128,topology:'aincrad',seed:'andar-1'};
const blockAt=(land,x,y,z)=>{const w=land.chunk(Math.floor(x/16),Math.floor(z/16));return w.palette[w.get(x%16,y,z%16)];};

test('Aincrad disc is circular, deterministic and rejects areas that are too small',()=>{
 assert.throws(()=>largeConfig({...base,width:128,depth:128}),/256/);
 const a=createLandscape(base),b=createLandscape(base),other=createLandscape({...base,seed:'outra'});
 assert.equal(a.column(2,2),null);assert.equal(a.column(509,2),null);assert.ok(a.column(256,256));
 let inside=0,differs=0;for(let z=8;z<512;z+=16)for(let x=8;x<512;x+=16){const c=a.column(x,z);assert.deepEqual(c&&[c.top,c.biome],b.column(x,z)&&[b.column(x,z).top,b.column(x,z).biome]);if(c){inside++;if(c.top!==other.column(x,z)?.top)differs++;}}
 assert.ok(Math.abs(inside/1024-Math.PI/4)<.03,'cobertura próxima de um círculo');assert.ok(differs>50,'a seed altera o relevo');
});

test('starting city in the south has wall, gates and plaza; labyrinth tower in the north reaches the ceiling',()=>{
 const land=createLandscape(base),{city,labyrinth,level}=land.layout;
 assert.ok(city.z>256&&labyrinth.z<256&&city.x===256&&labyrinth.x===256);
 assert.equal(blockAt(land,city.x+city.r-2,level+6,city.z+20),'minecraft:stone_bricks');
 assert.equal(blockAt(land,city.x,level+3,city.z-city.r+2),'minecraft:air','portão norte aberto');
 assert.equal(blockAt(land,city.x+2,level+1,city.z),'minecraft:water[level=0]','fonte da praça');
 assert.equal(blockAt(land,labyrinth.x+labyrinth.r-1,land.config.height-3,labyrinth.z),'minecraft:deepslate_bricks');
 assert.equal(blockAt(land,labyrinth.x,labyrinth.base+3,labyrinth.z+labyrinth.r-1),'minecraft:air','porta sul da torre');
 assert.deepEqual(land.spawn,[city.x,city.z+8]);const spawn=land.column(...land.spawn);assert.equal(spawn.top,level);
 assert.equal(land.modules.length,3);
});

test('lake, river, roads, forests and mountains exist and every generated state is exportable',()=>{
 const land=createLandscape(base),seen={water:0,road:0,forest:0,high:0};
 for(let z=0;z<512;z+=2)for(let x=0;x<512;x+=2){const c=land.column(x,z);if(!c)continue;if(c.water!==undefined){seen.water++;assert.ok(c.top<c.water);}if(c.road)seen.road++;if(c.biome==='forest')seen.forest++;if(c.top>land.layout.level+20)seen.high++;assert.ok(c.top<=land.config.height-30&&c.bottom<c.top);}
 for(const [k,n]of Object.entries(seen))assert.ok(n>100,k+' presente: '+n);
 const {city,labyrinth}=land.layout,states=new Set();
 for(const [x,z]of [[city.x,city.z],[city.x-40,city.z+30],[labyrinth.x,labyrinth.z],[land.modules[0].x,land.modules[0].z],[330,240]]){const cx=Math.floor(x/16),cz=Math.floor(z/16),w=land.chunk(cx,cz);for(const s of w.palette){validateBlockState(s);states.add(s);}assert.ok(encodeChunk(w,cx,cz,land.theme).length>1000);}
 assert.ok(states.has('minecraft:oak_leaves[persistent=true]')||states.has('minecraft:dark_oak_leaves[persistent=true]'),'folhas não decaem no jogo');
});

test('disabling city and tower removes them; window and miniature cover the whole floor',()=>{
 const plain=createLandscape({...base,features:{city:false,labyrinth:false,dungeon:false}});
 assert.equal(plain.layout.city,null);assert.equal(plain.layout.labyrinth,null);assert.equal(plain.modules.length,2);assert.ok(plain.column(...plain.spawn));
 const land=createLandscape(base),w=landscapeWindow(land,224,352,64);assert.equal(w.h,128);assert.ok(w.palette.includes('minecraft:stone_bricks'));
 const mini=floorMiniature(land,floorGeometry(land.config),96);assert.equal(mini.world.w,96);
 for(const s of ['minecraft:deepslate_bricks','minecraft:water[level=0]','minecraft:stone_bricks','minecraft:grass_block'])assert.ok(mini.world.palette.includes(s),s);
 const legacy=createLandscape({...base,topology:'floating',features:{city:false,labyrinth:false,dungeon:false,arena:false}});assert.equal(legacy.layout,null);assert.ok(floorMiniature(legacy,floorGeometry(legacy.config),64).world.palette.length>2);
});
