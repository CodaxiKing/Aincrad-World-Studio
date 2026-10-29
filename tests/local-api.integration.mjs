// Run explicitly against an isolated local server: node tests/local-api.integration.mjs
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {indexRegion,readChunk,decodeSection} from '../dist/anvil.js';
import {gunzipSync} from 'node:zlib';
import {readNBT} from '../dist/nbt.js';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:4174';
async function call(route,method='GET',data,origin){const r=await fetch(base+route,{method,headers:{...(data?{'Content-Type':'application/json'}:{}),...(origin?{Origin:origin}:{})},body:data?JSON.stringify(data):undefined});return {r,value:await r.json()};}
const config={shell:{enabled:false},width:528,depth:64,height:64,topology:'continental',mazeLevels:1,name:'QA · fronteira entre regiões',features:{city:false,dungeon:false,labyrinth:false,arena:false,trees:false}};
assert.equal((await call('/api/worlds','POST',{config},'https://example.com')).r.status,403);
const created=await call('/api/worlds','POST',{config});assert.equal(created.r.status,201);const id=created.value.id,url='/api/worlds/'+id;
let {value:window}=await call(url+'/window?x=496&z=0&size=32');assert.equal(window.world.w,32);window.world.palette.push('minecraft:gold_block');const marker=17+5*32+50*32*32;window.world.cells[marker]=window.world.palette.length-1;
const saved=await call(url+'/window','PUT',window);assert.equal(saved.value.revision,1);assert.equal((await call(url+'/window','PUT',window)).r.status,400);
const reloaded=await call(url+'/window?x=512&z=0&size=16');const s=reloaded.value.world;assert.equal(s.palette[s.cells[1+5*16+50*16*16]],'minecraft:gold_block');
const job=await call(url+'/export','POST',{});assert.equal(job.r.status,202);const jobURL=url+'/jobs/'+job.value.exportId;let result;
for(let i=0;i<120;i++){result=(await call(jobURL)).value;if(result.status!=='generating')break;assert.equal((await fetch(base+'/')).status,200);await new Promise(r=>setTimeout(r,500));}
assert.equal(result.status,'ready',result.error);const download=await fetch(base+jobURL+'/download');assert.equal(download.status,200);const zip=new Uint8Array(await download.arrayBuffer());assert.ok(zip.length>8192);await writeFile(`.runtime/qa-${id}.zip`,zip);
const dir=`.runtime/worlds/${id}/exports/${job.value.exportId}`;const region=await readFile(dir+'/region/r.1.0.mca'),entries=indexRegion(region.subarray(0,8192),region.length,'r.1.0.mca'),chunk=await readChunk(new Blob([region]),entries.find(c=>c.x===32&&c.z===0)),section=decodeSection(chunk.sections.find(s=>s.Y===3));assert.equal(section.palette[section.cells[1+5*16+2*256]].Name,'minecraft:gold_block');
assert.ok((await readFile(dir+'/region/r.0.0.mca')).length>8192);const level=readNBT(gunzipSync(await readFile(dir+'/level.dat')));assert.equal(level.Data.LevelName,config.name);assert.ok(level.Data.spawn.pos[1]>=1);
console.log(JSON.stringify({result:'PASS',chunks:132,regions:2,editedMarkerPreserved:true,originProtection:true,revisionGuard:true,bytes:zip.length,zip:`.runtime/qa-${id}.zip`}));

// A regular small editor snapshot is exported literally, not regenerated from its seed.
const tiny={w:32,h:48,d:32,palette:['minecraft:air','minecraft:diamond_block'],cells:Array(32*48*32).fill(0)};tiny.cells[16+16*32+9*32*32]=1;
const snapshotProject=await call('/api/worlds','POST',{config:{shell:{enabled:false},width:64,depth:64,height:64,mazeLevels:1,features:config.features},kind:'snapshot-export'}),snapshotURL='/api/worlds/'+snapshotProject.value.id;
const sj=await call(snapshotURL+'/export','POST',{world:tiny});assert.equal(sj.r.status,202);let sr;for(let i=0;i<80;i++){sr=(await call(snapshotURL+'/jobs/'+sj.value.exportId)).value;if(sr.status!=='generating')break;await new Promise(r=>setTimeout(r,200));}assert.equal(sr.status,'ready',sr.error);
const sf=`.runtime/worlds/${snapshotProject.value.id}/exports/${sj.value.exportId}`,sb=await readFile(sf+'/region/r.0.0.mca'),se=indexRegion(sb.subarray(0,8192),sb.length,'r.0.0.mca'),sc=await readChunk(new Blob([sb]),se.find(e=>e.x===1&&e.z===1)),ss=decodeSection(sc.sections.find(s=>s.Y===0));assert.equal(ss.palette[ss.cells[9*256]].Name,'minecraft:diamond_block');assert.ok(!(await call('/api/worlds')).value.some(p=>p.id===snapshotProject.value.id));
const cancel=await call(url+'/export','POST',{});assert.equal(cancel.r.status,202);const cancelURL=url+'/jobs/'+cancel.value.exportId;assert.equal((await call(cancelURL,'DELETE')).value.status,'cancelled');assert.equal((await fetch(base+cancelURL+'/download')).status,400);
console.log(JSON.stringify({smallSnapshot:'PASS',paddedSize:64,originalHeight:48,cancellation:'PASS'}));
