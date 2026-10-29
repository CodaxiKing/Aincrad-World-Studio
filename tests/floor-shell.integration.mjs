import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {indexRegion,readChunk,decodeSection} from '../dist/anvil.js';
const base=process.env.STUDIO_TEST_URL||'http://127.0.0.1:4174';
async function call(route,method='GET',data){const r=await fetch(base+route,{method,headers:data?{'Content-Type':'application/json'}:{},body:data?JSON.stringify(data):undefined}),v=await r.json();assert.ok(r.ok,JSON.stringify(v));return v;}
const config={name:'QA · Andar circular com margem 1000',width:64,depth:64,height:64,mazeLevels:1,topology:'continental',features:{city:false,dungeon:false,labyrinth:false,arena:false,trees:false}};
const m=await call('/api/worlds','POST',{config}),url='/api/worlds/'+m.id,info=await call(url),g=info.geometry;
assert.equal(g.margin,1000);assert.ok(g.innerRadius-Math.hypot(32,32)>=1000);
const x=Math.floor((g.cx-g.innerRadius-32)/16)*16,z=0,window=await call(url+`/window?x=${x}&z=${z}&size=64`);assert.equal(window.world.h,320);
const gx=Math.floor(g.cx-g.innerRadius-2),gz=32,marker=gx-x+gz*64+200*64*64;assert.notEqual(window.world.palette[window.world.cells[marker]],'minecraft:air');window.world.palette.push('minecraft:gold_block');window.world.cells[marker]=window.world.palette.length-1;
await call(url+'/window','PUT',window);const reloaded=await call(url+`/window?x=${x}&z=${z}&size=64`);assert.equal(reloaded.world.palette[reloaded.world.cells[marker]],'minecraft:gold_block');
const job=await call(url+'/export','POST',{}),jobURL=url+'/jobs/'+job.exportId;let status;
for(let i=0;i<480;i++){status=await call(jobURL);if(status.status!=='generating')break;await new Promise(r=>setTimeout(r,500));}assert.equal(status.status,'ready',status.error);
const dir=`.runtime/worlds/${m.id}/exports/${job.exportId}`;
async function chunkAt(wx,wz){const cx=Math.floor(wx/16),cz=Math.floor(wz/16),name=`r.${Math.floor(cx/32)}.${Math.floor(cz/32)}.mca`,data=await readFile(dir+'/region/'+name),entries=indexRegion(data.subarray(0,8192),data.length,name);return readChunk(new Blob([data]),entries.find(e=>e.x===cx&&e.z===cz));}
const root=await chunkAt(gx,gz),s=decodeSection(root.sections.find(s=>s.Y===12)),idx=((gx%16+16)%16)+((gz%16+16)%16)*16+8*256;assert.equal(s.palette[s.cells[idx]].Name,'minecraft:gold_block');
const pillar=g.pillars[0],border=g.borderPillars[0];
function stateAt(root,x,y,z){const section=decodeSection(root.sections.find(s=>s.Y===Math.floor(y/16))),i=((x%16+16)%16)+((z%16+16)%16)*16+((y%16+16)%16)*256;return section.palette[section.cells[i]].Name;}
const pc=await chunkAt(Math.floor(pillar.x),Math.floor(pillar.z));assert.notEqual(stateAt(pc,Math.floor(pillar.x),159,Math.floor(pillar.z)),'minecraft:air');assert.equal(stateAt(pc,Math.floor(pillar.x),160,Math.floor(pillar.z)),'minecraft:air');const bc=await chunkAt(Math.floor(border.x),Math.floor(border.z));assert.notEqual(stateAt(bc,Math.floor(border.x),319,Math.floor(border.z)),'minecraft:air');
const ox=Math.floor(g.cx-g.innerRadius/2),oz=Math.floor(g.cz),oc=await chunkAt(ox,oz);assert.equal(stateAt(oc,ox,0,oz),'minecraft:bedrock');assert.equal(stateAt(oc,ox,5,oz),'minecraft:sand');assert.equal(stateAt(oc,ox,g.seaLevel,oz),'minecraft:water');
const tx=Math.floor(g.cx+g.outerRadius+g.lateralLength-4),tz=Math.floor(g.cz),tailChunk=await chunkAt(tx,tz);assert.notEqual(stateAt(tailChunk,tx,g.beamY+3,tz),'minecraft:air');assert.equal(stateAt(tailChunk,tx,g.beamY+g.beamHeight+12,tz),'minecraft:air');assert.equal(Math.round(g.cx+g.outerRadius+g.lateralLength-(g.pillars[0].x+g.pillarRadius)),g.tipLength);
const manifest=JSON.parse(await readFile(dir+'/aincrad-project.json'));assert.equal(manifest.geometry.margin,1000);const summary={result:'PASS',id:m.id,exportId:job.exportId,innerDiameter:g.innerRadius*2,margin:1000,height:320,negativeCoordinateEditPreserved:true,borderPillarAtY319:true,endPillarHalfHeight:true,seabedAndWater:true,straightBeamAndOverhang:true,chunks:manifest.chunks};await writeFile('.runtime/shell-qa-result.json',JSON.stringify(summary));console.log(JSON.stringify(summary));
