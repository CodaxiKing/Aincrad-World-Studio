import {createLandscape} from './advanced-generation.js';
import {floorGeometry} from './floor-shell.js';

// Read-only overview in actual coordinate proportions. The editable voxel window
// and exported chunks remain the authoritative, full-resolution geometry.
export function drawFloorOverview(canvas,config){
 const land=createLandscape(config),g=floorGeometry(land.config),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
 ctx.fillStyle='#0b141d';ctx.fillRect(0,0,w,h);if(!g.enabled){ctx.fillStyle='#aab9c8';ctx.fillText('Mundo legado sem estrutura circular',20,32);return;}
 const scale=Math.min((w-60)/(g.width*1.12),(h-70)/(g.depth*.48+320)),center=[w/2,h*.55],project=(x,y,z)=>[center[0]+((x-g.cx)-(z-g.cz))*.7071*scale,center[1]+((x-g.cx)+(z-g.cz))*.30*scale-y*scale],parts=[];
 const polygon=(points,fill,stroke)=>{ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=.7;ctx.stroke();}};
 if(g.oceanEnabled){const water=[];for(let i=0;i<112;i++){const a=i/112*Math.PI*2;water.push(project(g.cx+Math.cos(a)*g.innerRadius,g.seaLevel,g.cz+Math.sin(a)*g.innerRadius));}polygon(water,'#286d91','#378bb0');}
 const point=(radius,angle,y)=>project(g.cx+Math.cos(angle)*radius,y,g.cz+Math.sin(angle)*radius);
 for(let i=0;i<112;i++){const a=i/112*Math.PI*2,b=(i+1)/112*Math.PI*2,depth=(Math.cos(a)+Math.sin(a))*g.innerRadius;
  parts.push({depth,draw:()=>{polygon([point(g.innerRadius,a,0),point(g.innerRadius,b,0),point(g.innerRadius,b,g.wallHeight),point(g.innerRadius,a,g.wallHeight)],depth>0?'#56616d':'#3c515f','#6a8393');ctx.strokeStyle='#c6ab72';ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(...point(g.innerRadius,a,g.wallHeight));ctx.lineTo(...point(g.innerRadius,b,g.wallHeight));ctx.stroke();}});
 }
 const colors={beginning:'#68934d',forest:'#3f7249',ruins:'#7b8b73',frost:'#d3e4e8',ember:'#a36a43'},step=Math.max(4,Math.ceil(Math.max(config.width,config.depth)/32));
 for(let z=0;z<config.depth;z+=step)for(let x=0;x<config.width;x+=step){const c=land.column(x+step/2,z+step/2);if(!c)continue;const xx=Math.min(config.width,x+step),zz=Math.min(config.depth,z+step);parts.push({depth:x+z-g.cx-g.cz,draw:()=>polygon([project(x,c.top,z),project(xx,c.top,z),project(xx,c.top,zz),project(x,c.top,zz)],colors[c.biome])});}
 function addPillar(p,height){parts.push({depth:p.x+p.z-g.cx-g.cz,draw:()=>{const r=g.pillarRadius;polygon([project(p.x-r,0,p.z-r),project(p.x+r,0,p.z-r),project(p.x+r,height,p.z-r),project(p.x-r,height,p.z-r)],'#77818a','#9fabb0');polygon([project(p.x+r,0,p.z-r),project(p.x+r,0,p.z+r),project(p.x+r,height,p.z+r),project(p.x+r,height,p.z-r)],'#465563','#91a6b0');ctx.fillStyle='#e2c384';const top=project(p.x,height,p.z);ctx.fillRect(top[0]-1.5,top[1]-1.5,3,3);}});}
 for(const p of g.borderPillars)addPillar(p,g.pillarHeight);
 for(const p of g.pillars){addPillar(p,g.endPillarHeight);parts.push({depth:p.x+p.z-g.cx-g.cz,draw:()=>{const radius=g.outerRadius+g.lateralLength,ex=g.cx+p.ux*radius,ez=g.cz+p.uz*radius,half=g.beamWidth/2,nx=-p.uz*half,nz=p.ux*half,sx=g.cx+p.ux*g.innerRadius,sz=g.cz+p.uz*g.innerRadius;polygon([project(sx+nx,g.beamY+g.beamHeight,sz+nz),project(ex+nx,g.beamY+g.beamHeight,ez+nz),project(ex-nx,g.beamY+g.beamHeight,ez-nz),project(sx-nx,g.beamY+g.beamHeight,sz-nz)],'#6bafc3','#8cd6df');polygon([project(sx-nx,g.beamY,sz-nz),project(ex-nx,g.beamY,ez-nz),project(ex-nx,g.beamY+g.beamHeight,ez-nz),project(sx-nx,g.beamY+g.beamHeight,sz-nz)],'#426675');}});}
 parts.sort((a,b)=>a.depth-b.depth);for(const part of parts)part.draw();
 ctx.font='13px Segoe UI';ctx.fillStyle='#d6c291';ctx.fillText(`Andar circular · Ø interno ${g.innerRadius*2} blocos`,18,24);ctx.font='11px Segoe UI';ctx.fillStyle='#a7b8c7';ctx.fillText(`Terreno ${config.width} × ${config.depth} · margem mínima 1.000 · borda 320 / ponta 160 · ${g.oceanEnabled?`água Y ${g.seaLevel}`:'sem água'}`,18,h-16);
}
