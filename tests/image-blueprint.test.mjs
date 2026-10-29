import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {buildPlanSchematic,buildPlanTile,buildFacadeSchematic,classifyRaster,replaceSimilarColor,referenceRole} from '../dist/image-blueprint.js';
import {largeConfig,createLandscape} from '../dist/advanced-generation.js';
import {importSchematic} from '../dist/nbt.js';
import {exportReferenceSchematics} from '../lib/schematic-export.mjs';
const ref={version:1,name:'Plano teste',width:2,height:2,roles:[3,2,0,4],buildingHeight:8,style:'aincrad',noiseBlend:0};
const config={width:64,depth:64,height:128,reference:ref,features:{city:false,dungeon:false,labyrinth:false,arena:false,trees:false},bridges:false,caves:false};
test('central references scale to 4048 and 8192 without dense full-world allocation',()=>{for(const size of [4048,4096,8192]){assert.equal(largeConfig({...config,width:size,depth:size}).width,size);const l=createLandscape({...config,width:size,depth:size});assert.equal(l.column(0,size-1),null);assert.equal(l.column(0,0).referenceRole,3);assert.equal(referenceRole(ref,size-1,0,size,size),2);}assert.throws(()=>largeConfig({...config,width:8208}));});
test('city tracing and color selection classify actual pixels with alpha masking',()=>{const p=new Uint8ClampedArray([200,0,0,255,0,100,220,255,0,0,0,0]);const r=classifyRaster(p,3,1,'city');assert.deepEqual(Array.from(r),[3,5,0]);replaceSimilarColor(r,p,0,2);assert.equal(r[0],2);});
test('plan tiles exactly match global construction geometry and retain offsets',()=>{const full=buildPlanSchematic(ref,{width:32,depth:32}),tile=buildPlanTile(ref,{width:16,depth:32,worldWidth:32,worldDepth:32,originX:16});assert.deepEqual(tile.offset,[16,0,0]);for(let y=0;y<full.h;y++)for(let z=0;z<32;z++)for(let x=0;x<16;x++)assert.equal(tile.palette[tile.get(x,y,z)],full.palette[full.get(x+16,y,z)]);assert.equal(full.get(0,0,31),0);});
test('perspective facade preserves vertical orientation, transparency and extrusion',()=>{const w=buildFacadeSchematic(new Uint8ClampedArray([142,32,32,255,0,0,0,0]),1,2,{width:1,height:2,depth:3});assert.equal(w.palette[w.get(0,1,2)],'minecraft:red_concrete');assert.equal(w.get(0,0,0),0);});
test('city export writes decodable Sponge pieces with a common origin',async()=>{const dir=await mkdtemp(path.resolve('.runtime/aincrad-schem-'));await exportReferenceSchematics({dir,config:{...config,width:144,depth:64},exportId:'test'});const m=JSON.parse(await readFile(path.join(dir,'exports/test/manifest.json'),'utf8'));assert.equal(m.tiles.length,2);for(const t of m.tiles){const w=await importSchematic(await readFile(path.join(dir,'exports/test',t.file)));assert.deepEqual(w.offset,t.offset);assert.equal(w.w,t.width);}});

