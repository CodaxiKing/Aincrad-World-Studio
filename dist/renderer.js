import {isAir,color} from './world.js';
import {minecraftResources,texturedMesh} from './minecraft-models.js';
const normalize=a=>{const n=Math.hypot(...a);return a.map(v=>v/n);};
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a,b)=>a.reduce((n,x,i)=>n+x*b[i],0);
function multiply(a,b){const out=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)out[c*4+r]+=a[k*4+r]*b[c*4+k];return out;}
const faces=[
 [[1,0,0],[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],.78],
 [[-1,0,0],[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],.62],
 [[0,1,0],[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],1.13],
 [[0,-1,0],[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],.48],
 [[0,0,1],[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],.88],
 [[0,0,-1],[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],.68]
];
export function mesh(world,tint=null,cut=Infinity){
 const values=[];let count=0;
 const colors=world.palette.map(s=>color(s)),air=world.palette.map(isAir);
 for(let y=0;y<Math.min(world.h,cut);y++)for(let z=0;z<world.d;z++)for(let x=0;x<world.w;x++){
  const id=world.get(x,y,z);if(air[id])continue;const col=tint||colors[id];
  for(const [n,corners,light]of faces){if(y+n[1]<cut&&!air[world.get(x+n[0],y+n[1],z+n[2])])continue;
   if(++count>250000)throw Error('Cena excede 250 mil faces. Reduza a dimensão ou use outra construção.');
   const variation=.96+((x*7+z*13+y*3)%9)*.009;
   for(const k of [0,1,2,0,2,3])values.push(x+corners[k][0],y+corners[k][1],z+corners[k][2],...col.map(v=>v*light*variation));
  }
 }return new Float32Array(values);
}
export class Renderer{
 constructor(canvas,onPick){
  this.canvas=canvas;this.gl=canvas.getContext('webgl',{antialias:true,alpha:false});if(!this.gl)throw Error('WebGL indisponível neste navegador.');
  this.theta=.78;this.phi=.70;this.distance=130;this.target=[40,28,40];this.onPick=onPick;this.ghost=null;
  const gl=this.gl,vs=`attribute vec3 aPosition;attribute vec3 aColor;attribute vec2 aUV;uniform mat4 uMatrix;uniform vec3 uOffset;varying vec3 vColor;varying vec2 vUV;varying float vDepth;void main(){gl_Position=uMatrix*vec4(aPosition+uOffset,1.0);vColor=aColor;vUV=aUV;vDepth=gl_Position.w;}`;
  const fs=`precision mediump float;varying vec3 vColor;varying vec2 vUV;varying float vDepth;uniform sampler2D uAtlas;uniform float uTextured;void main(){vec4 tex=vec4(1.0);if(uTextured>.5){tex=texture2D(uAtlas,vUV);if(tex.a<.1)discard;}float fog=smoothstep(190.0,650.0,vDepth)*.76;gl_FragColor=vec4(mix(vColor*tex.rgb,vec3(.055,.085,.11),fog),1.0);}`;
  function shader(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  this.program=gl.createProgram();gl.attachShader(this.program,shader(gl.VERTEX_SHADER,vs));gl.attachShader(this.program,shader(gl.FRAGMENT_SHADER,fs));gl.linkProgram(this.program);
  if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw Error('Falha no renderizador.');
  this.mainBuffer=gl.createBuffer();this.ghostBuffer=gl.createBuffer();this.cursorBuffer=gl.createBuffer();this.interaction={mode:'orbit'};this.pickWorld=null;this.pos=gl.getAttribLocation(this.program,'aPosition');this.col=gl.getAttribLocation(this.program,'aColor');
  this.matrix=gl.getUniformLocation(this.program,'uMatrix');this.offset=gl.getUniformLocation(this.program,'uOffset');gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  this.uv=gl.getAttribLocation(this.program,'aUV');this.textured=gl.getUniformLocation(this.program,'uTextured');const resources=minecraftResources();if(resources?.image){this.atlas=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,resources.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
  if(this.atlas){gl.bindTexture(gl.TEXTURE_2D,this.atlas);gl.generateMipmap(gl.TEXTURE_2D);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST_MIPMAP_LINEAR);}
  let drag=null,lastHover=0;
  canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;const editing=this.interaction.mode!=='orbit'&&!e.altKey&&!e.shiftKey;drag={x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,pan:e.shiftKey,editing};canvas.setPointerCapture(e.pointerId);if(editing)this.interaction.onStart?.(this.hit(e),e);});
  canvas.addEventListener('pointermove',e=>{if(!drag){if(performance.now()-lastHover>45){lastHover=performance.now();this.interaction.onHover?.(this.hit(e),e);}return;}if(drag.editing){this.interaction.onMove?.(this.hit(e),e);return;}const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;
   if(drag.pan){const speed=this.distance*.0018;this.target[0]-=(Math.cos(this.theta)*dx+Math.sin(this.theta)*dy)*speed;this.target[2]+=(Math.sin(this.theta)*dx-Math.cos(this.theta)*dy)*speed;}
   else{this.theta-=dx*.007;this.phi=Math.max(.12,Math.min(1.50,this.phi+dy*.006));}this.draw();});
  canvas.addEventListener('pointerup',e=>{const previous=drag;drag=null;if(previous?.editing)this.interaction.onEnd?.(this.hit(e),e);else if(previous&&Math.hypot(e.clientX-previous.startX,e.clientY-previous.startY)<4)this.pick(e);});
  const cancel=()=>{const previous=drag;drag=null;if(previous?.editing)this.interaction.onCancel?.();};
  canvas.addEventListener('pointercancel',cancel);canvas.addEventListener('lostpointercapture',cancel);canvas.addEventListener('pointerleave',()=>{if(!drag)this.interaction.onHover?.(null);});
  canvas.addEventListener('wheel',e=>{e.preventDefault();this.distance=Math.max(20,Math.min(350,this.distance*Math.exp(e.deltaY*.001)));this.draw();},{passive:false});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.querySelector('#render-status').textContent='WebGL interrompido. Recarregue para restaurar.';});
  this.observer=new ResizeObserver(()=>this.draw());this.observer.observe(canvas);
 }
 setWorld(world,cut=Infinity){let textured=null;this.textureWarning=null;try{if(this.atlas)textured=texturedMesh(world,cut);}catch(e){this.textureWarning=e.message;}const data=textured||mesh(world,null,cut);this.mainStride=textured?8:6;this.world=world;this.upload(this.mainBuffer,data);this.count=data.length/this.mainStride;this.draw();return this.count/3;}
 upload(buffer,data){this.gl.bindBuffer(this.gl.ARRAY_BUFFER,buffer);this.gl.bufferData(this.gl.ARRAY_BUFFER,data,this.gl.STATIC_DRAW);}
 setInteraction(options={mode:'orbit'}){this.interaction.onCancel?.();this.interaction=options;this.canvas.dataset.mode=options.mode;this.setCursor(null);}
 setPickWorld(world){this.pickWorld=world;}
 setCursor(point,radius=1,shape='sphere',tint=[.95,.72,.35]){if(!point){this.cursorCount=0;this.draw();return;}const data=[],r=Math.max(.55,radius+.5),segments=64,w=this.world;for(let i=0;i<segments;i++)for(const k of [i,i+1]){const angle=k/segments*Math.PI*2,c=Math.cos(angle),s=Math.sin(angle),scale=shape==='cube'?1/Math.max(Math.abs(c),Math.abs(s)):1,x=point[0]+.5+c*r*scale,z=point[2]+.5+s*r*scale,xx=Math.floor(x),zz=Math.floor(z),top=w&&w.inside(xx,0,zz)?w.top(xx,zz):-1,y=top>=0?top+1.08:point[1]+1.08;data.push(x,y,z,...tint);}this.upload(this.cursorBuffer,new Float32Array(data));this.cursorCount=data.length/6;this.draw();}
 setGhost(asset,t,invalid=false){if(!asset){this.ghost=null;this.draw();return;}
  // Transform coordinates and render the actual solid surfaces in amber/red.
  const data=mesh(asset,invalid?[.95,.25,.24]:[.92,.65,.23]);
  for(let i=0;i<data.length;i+=6){let x=data[i],z=data[i+2];if(t.mirrorX)x=asset.w-x;if(t.mirrorZ)z=asset.d-z;const nx=x,nz=z;switch(t.rotation){case 90:x=asset.d-nz;z=nx;break;case 180:x=asset.w-nx;z=asset.d-nz;break;case 270:x=nz;z=asset.w-nx;break;}data[i]=x;data[i+2]=z;}
  this.upload(this.ghostBuffer,data);this.ghost={count:data.length/6,offset:[t.x,t.y,t.z]};this.draw();
 }
 camera(){const c=Math.cos(this.phi),s=Math.sin(this.phi);this.eye=[this.target[0]+this.distance*c*Math.sin(this.theta),this.target[1]+this.distance*s,this.target[2]+this.distance*c*Math.cos(this.theta)];const z=normalize(this.eye.map((v,i)=>v-this.target[i])),x=normalize(cross([0,1,0],z)),y=cross(z,x);return {x,y,z};}
 draw(){
  const gl=this.gl,c=this.canvas,ratio=Math.min(window.devicePixelRatio||1,1.7),w=Math.max(1,Math.round(c.clientWidth*ratio)),h=Math.max(1,Math.round(c.clientHeight*ratio));if(c.width!==w||c.height!==h){c.width=w;c.height=h;}
  gl.viewport(0,0,w,h);gl.clearColor(.055,.085,.11,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);if(!this.count)return;
  const {x,y,z}=this.camera(),view=new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,this.eye),-dot(y,this.eye),-dot(z,this.eye),1]);
  const f=1/Math.tan(Math.PI/7),near=.1,far=2400,proj=new Float32Array([f/(w/h),0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0]);
  gl.useProgram(this.program);gl.uniformMatrix4fv(this.matrix,false,multiply(proj,view));
  const draw=(b,count,off,stride=6)=>{gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.enableVertexAttribArray(this.pos);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,stride*4,0);gl.enableVertexAttribArray(this.col);gl.vertexAttribPointer(this.col,3,gl.FLOAT,false,stride*4,12);if(stride===8){gl.enableVertexAttribArray(this.uv);gl.vertexAttribPointer(this.uv,2,gl.FLOAT,false,32,24);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.atlas);}else{gl.disableVertexAttribArray(this.uv);gl.vertexAttrib2f(this.uv,0,0);}gl.uniform1f(this.textured,stride===8?1:0);gl.uniform3fv(this.offset,off);gl.drawArrays(gl.TRIANGLES,0,count);};
  draw(this.mainBuffer,this.count,[0,0,0],this.mainStride||6);if(this.ghost)draw(this.ghostBuffer,this.ghost.count,this.ghost.offset);
  if(this.cursorCount){gl.uniform1f(this.textured,0);gl.disableVertexAttribArray(this.uv);gl.vertexAttrib2f(this.uv,0,0);gl.disable(gl.DEPTH_TEST);gl.bindBuffer(gl.ARRAY_BUFFER,this.cursorBuffer);gl.vertexAttribPointer(this.pos,3,gl.FLOAT,false,24,0);gl.vertexAttribPointer(this.col,3,gl.FLOAT,false,24,12);gl.uniform3fv(this.offset,[0,0,0]);gl.drawArrays(gl.LINES,0,this.cursorCount);gl.enable(gl.DEPTH_TEST);}
 }
 hit(e){const world=this.pickWorld||this.world;if(!world)return null;const r=this.canvas.getBoundingClientRect(),nx=2*(e.clientX-r.left)/r.width-1,ny=1-2*(e.clientY-r.top)/r.height,{x,y,z}=this.camera(),scale=Math.tan(Math.PI/7),dir=normalize(x.map((v,i)=>v*nx*scale*r.width/r.height+y[i]*ny*scale-z[i]));let previous=null;
  for(let n=1;n<2000;n+=.35){const p=this.eye.map((v,i)=>Math.floor(v+dir[i]*n));if(world.inside(...p)&&!isAir(world.palette[world.get(...p)])){const normal=[0,0,0];if(previous){const axis=previous.findIndex((v,i)=>v!==p[i]);if(axis>=0)normal[axis]=Math.sign(previous[axis]-p[axis]);}if(!normal.some(Boolean))normal[1]=1;return {point:p,normal};}previous=p;}return null;
 }
 pick(e){const hit=this.hit(e);if(hit)this.onPick?.(hit.point,hit);}
 reset(){this.theta=.78;this.phi=.70;this.distance=Math.max(this.world.w,this.world.h,this.world.d)*1.65;this.target=[this.world.w/2,this.world.h*.35,this.world.d/2];this.draw();}
 topView(){this.phi=1.49;this.theta=0;this.draw();}
 dispose(){this.interaction.onCancel?.();this.observer.disconnect();this.gl.deleteBuffer(this.mainBuffer);this.gl.deleteBuffer(this.ghostBuffer);this.gl.deleteBuffer(this.cursorBuffer);if(this.atlas)this.gl.deleteTexture(this.atlas);this.gl.deleteProgram(this.program);}
}
