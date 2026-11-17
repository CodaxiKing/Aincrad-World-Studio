import {World,tower} from './world.js';
import {floorGeometry} from './floor-shell.js';
import {houseVariants,churchAsset,villageAsset,farmAsset,campAsset,ruinsAsset} from './aincrad-assets.js';
export {villageAsset};

// Andar em disco no estilo de Aincrad: layout procedural próprio (não copia mapas de jogos).
// No 1º andar o norte é Z negativo: cidade inicial ao sul, torre-labirinto ao norte. Outros andares giram o layout.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);},lerp=(a,b,t)=>a+(b-a)*t;
const M=s=>'minecraft:'+s,WATER=M('water[level=0]'),AIR=M('air');
function seedOf(s){let n=2166136261;for(const ch of String(s))n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;}
function segInfo(px,pz,a,b){const vx=b[0]-a[0],vz=b[1]-a[1],t=clamp(((px-a[0])*vx+(pz-a[1])*vz)/(vx*vx+vz*vz||1),0,1);return [Math.hypot(px-a[0]-vx*t,pz-a[1]-vz*t),t];}
const lineDist=(px,pz,pts)=>{let best=Infinity;for(let i=1;i<pts.length;i++){const d=segInfo(px,pz,pts[i-1],pts[i])[0];if(d<best)best=d;}return best;};
const chaikin=(pts,n=2)=>{for(;n>0;n--){const out=[pts[0]];for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i];out.push([a[0]*.75+b[0]*.25,a[1]*.75+b[1]*.25],[a[0]*.25+b[0]*.75,a[1]*.25+b[1]*.75]);}out.push(pts.at(-1));pts=out;}return pts;};

export function aincradOptions(input={}){
 const o={city:1,villages:2,forest:1,mountains:1,water:1,pois:1,...input};
 if(!Number.isFinite(o.city)||o.city<.5||o.city>2||!Number.isInteger(o.villages)||o.villages<0||o.villages>5||!['forest','mountains','water','pois'].every(k=>Number.isFinite(o[k])&&o[k]>=0&&o[k]<=2))throw Error('Opções do andar de Aincrad inválidas.');
 return {city:o.city,villages:o.villages,forest:o.forest,mountains:o.mountains,water:o.water,pois:o.pois};
}
// Tema sugerido para cada um dos 100 andares: bioma, relevo, escala (o castelo afunila) e conteúdo.
const CYCLE=['beginning','forest','beginning','ruins','forest','frost','beginning','ember','forest','ruins'];
export function floorTheme(n){
 if(!Number.isInteger(n)||n<1||n>100)throw Error('Andar: 1 a 100.');
 const tier=Math.floor((n-1)/10),biome=n===1?'beginning':CYCLE[(n*7+tier*3)%10],r=k=>((n*k)%10)/9;
 return {floor:n,seed:'aincrad-'+String(n).padStart(3,'0'),biome,relief:n===1?12:Math.round(8+r(5)*10+(biome==='frost'||biome==='ember'?4:0)),scale:Math.round((1-.006*(n-1))*1000)/1000,
  aincrad:n===1?aincradOptions():{city:Math.round((.8+r(3)*.6)*10)/10,villages:1+n%4,forest:Math.round((.4+r(3)*1.2)*10)/10,mountains:Math.round((.5+r(7)*1.3)*10)/10,water:Math.round((.5+r(9)*1.2)*10)/10,pois:1}};
}
const SKINS={
 beginning:{grass:'grass_block',soil:'dirt',rock:'stone',sand:'sand',forest:'podzol',mud:'mud',tree:['oak'],forestTree:['dark_oak','oak','oak'],grove:'birch',highTree:['spruce'],flowers:['poppy','dandelion','cornflower','azure_bluet','oxeye_daisy','allium'],tuft:'short_grass',snow:3,export:true},
 forest:{grass:'grass_block',soil:'dirt',rock:'stone',sand:'sand',forest:'podzol',mud:'mud',tree:['oak','birch'],forestTree:['dark_oak','dark_oak','oak'],grove:'birch',highTree:['spruce'],flowers:['poppy','dandelion','azure_bluet','allium'],tuft:'fern',snow:2.8,forestBias:.16,export:true},
 ruins:{grass:'moss_block',soil:'dirt',rock:'andesite',sand:'gravel',forest:'moss_block',mud:'mud',tree:['azalea','oak'],forestTree:['azalea','oak'],highTree:['spruce'],flowers:['azure_bluet','oxeye_daisy'],tuft:'moss_carpet',snow:3},
 frost:{grass:'snow_block',soil:'dirt',rock:'stone',sand:'gravel',forest:'snow_block',mud:'snow_block',tree:['spruce'],forestTree:['spruce'],highTree:['spruce'],flowers:[],tuft:null,snow:-99,freeze:true},
 ember:{grass:'red_sand',soil:'red_terracotta',rock:'basalt',sand:'red_sand',forest:'crimson_nylium',mud:'red_sand',tree:['crimson'],forestTree:['crimson'],highTree:['crimson'],flowers:[],tuft:'dead_bush',snow:99}
};
const TREES={oak:['oak_log','oak_leaves'],dark_oak:['dark_oak_log','dark_oak_leaves'],birch:['birch_log','birch_leaves'],spruce:['spruce_log','spruce_leaves'],azalea:['oak_log','azalea_leaves'],crimson:['crimson_stem','nether_wart_block']};
const CITY={
 beginning:{wall:'stone_bricks',trim:'chiseled_stone_bricks',pave:'stone_bricks',pave2:'polished_andesite',lane:'cobblestone',palace:'polished_blackstone_bricks'},
 forest:{wall:'mossy_stone_bricks',trim:'chiseled_stone_bricks',pave:'stone_bricks',pave2:'mossy_cobblestone',lane:'cobblestone',palace:'deepslate_bricks'},
 ruins:{wall:'cobblestone',trim:'mossy_cobblestone',pave:'cracked_stone_bricks',pave2:'andesite',lane:'gravel',palace:'deepslate_bricks'},
 frost:{wall:'polished_diorite',trim:'packed_ice',pave:'stone_bricks',pave2:'polished_andesite',lane:'cobblestone',palace:'quartz_block'},
 ember:{wall:'polished_blackstone_bricks',trim:'chiseled_polished_blackstone',pave:'blackstone',pave2:'polished_basalt',lane:'basalt',palace:'nether_bricks'}
};
const layouts=new Map();
export function createAincradFloor(c){
 const key=JSON.stringify([c.seed,c.width,c.depth,c.height,c.relief,c.biome,c.floor,c.features,c.aincrad,c.shell]);let cached=layouts.get(key);
 if(!cached){cached=build(c);layouts.set(key,cached);if(layouts.size>4)layouts.delete(layouts.keys().next().value);}
 return cached;
}
function build(c){
 const opt=c.aincrad,seed=(seedOf(c.seed)+c.floor*7919)|0,cx=c.width/2,cz=c.depth/2,R=Math.min(c.width,c.depth)/2-2,level=Math.round(c.height*.35),relief=c.relief,rel=Math.max(relief,2),maxTop=c.height-30,sk=SKINS[c.biome],pal=CITY[c.biome],rich=!!sk.export;
 const h2=(x,z,s)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(s+seed|0,1274126177);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 const vnoise=(x,z,s)=>{const xi=Math.floor(x),zi=Math.floor(z),fx=x-xi,fz=z-zi,u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz),a=h2(xi,zi,s),b=h2(xi+1,zi,s),d=h2(xi,zi+1,s),e=h2(xi+1,zi+1,s);return a+(b-a)*u+(d-a)*v+(a-b-d+e)*u*v;};
 const fbm=(x,z,s,oct=4)=>{let amp=1,f=1,sum=0,norm=0;for(let i=0;i<oct;i++){sum+=amp*vnoise(x*f,z*f,s+i*31);norm+=amp;amp*=.5;f*=2;}return sum/norm;};
 const L=clamp(R/3,70,420),theta=c.floor===1?0:((c.floor*137)%360)*Math.PI/180,ct=Math.cos(theta),st=Math.sin(theta);
 const at=(u,v)=>[cx+(u*ct-v*st)*R,cz+(u*st+v*ct)*R],local=(x,z)=>{const dx=(x-cx)/R,dz=(z-cz)/R;return [dx*ct+dz*st,-dx*st+dz*ct];};
 const cardinal=(dx,dz)=>Math.abs(dx)>=Math.abs(dz)?[Math.sign(dx)||1,0]:[0,Math.sign(dz)||1];
 let sea=null;try{const g=floorGeometry(c);if(g.enabled&&g.oceanEnabled)sea=g.seaLevel;}catch{}
 // Cidade inicial e torre-labirinto
 const cityOn=c.features.city,towerOn=c.features.labyrinth;
 const cityR=clamp(Math.round(R*.2*opt.city),40,260),[cityX,cityZ]=at(0,.62).map(Math.round),plazaR=clamp(Math.round(cityR*.2),9,36);
 const towerR=clamp(Math.round(R*.045),10,40),[towerX,towerZ]=at(0,-.68).map(Math.round),towerBase=Math.min(maxTop-12,level+Math.round(relief*.5)),towerTop=c.height-1;
 const gate=cardinal(towerX-cityX,towerZ-cityZ),door=cardinal(cityX-towerX,cityZ-towerZ),storeys=Math.max(1,Math.floor((towerTop-1-towerBase)/12));
 const T={x:towerX,z:towerZ,r:towerR,base:towerBase,top:towerTop,door,storeys,maze:towerR>=18};
 const palace=cityR>=70?{w:clamp(Math.round(cityR*.42/2)*2+1,29,61),d:clamp(Math.round(cityR*.28/2)*2+1,19,41),h:22}:null;
 if(palace){palace.x0=cityX-(palace.w-1)/2;palace.z0=cityZ-plazaR-6-palace.d;}
 // Relevo bruto (antes de rios, estradas e estruturas)
 function raw(x,z){const [u,v]=local(x,z),hills=(fbm(x/L,z/L,1)-.5)*relief*1.2+smooth(.56,.8,fbm(x/(L*2),z/(L*2),41,2))*relief*1.4*Math.min(1,opt.mountains);
  const mount=smooth(-.34,-.72,v+(fbm(x/(L*1.5),z/(L*1.5),3,3)-.5)*.25)*opt.mountains,ridge=1-Math.abs(fbm(x/(L*.8),z/(L*.8),7)*2-1);
  return {base:level+hills,peaks:mount*(.12+ridge*ridge*.88)*relief*3.6,mount,u,v};}
 // Grade grosseira para hidrografia e estradas por menor custo
 const G=128,gs=2*R/G,gpos=i=>[cx-R+(i%G+.5)*gs,cz-R+(Math.floor(i/G)+.5)*gs],gcell=(x,z)=>{const i=Math.floor((x-cx+R)/gs),j=Math.floor((z-cz+R)/gs);return i<0||j<0||i>=G||j>=G?-1:i+j*G;};
 const gh=new Float32Array(G*G),grad=new Float32Array(G*G),gblock=new Uint8Array(G*G),gwater=new Uint8Array(G*G),groad=new Uint8Array(G*G);
 for(let i=0;i<G*G;i++){const [x,z]=gpos(i),r=raw(x,z);gh[i]=r.base+r.peaks;grad[i]=Math.hypot(x-cx,z-cz)/R;if(cityOn&&Math.hypot(x-cityX,z-cityZ)<cityR+gs*2||towerOn&&Math.hypot(x-towerX,z-towerZ)<towerR+gs*2)gblock[i]=1;}
 function route(starts,goal,cost){const dist=new Float64Array(G*G).fill(Infinity),prev=new Int32Array(G*G).fill(-1),heap=[];
  const push=(i,d)=>{heap.push([d,i]);let k=heap.length-1;while(k>0){const p=(k-1)>>1;if(heap[p][0]<=heap[k][0])break;[heap[p],heap[k]]=[heap[k],heap[p]];k=p;}};
  const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){heap[0]=last;let k=0;for(;;){const l=k*2+1,r=l+1;let m=k;if(l<heap.length&&heap[l][0]<heap[m][0])m=l;if(r<heap.length&&heap[r][0]<heap[m][0])m=r;if(m===k)break;[heap[m],heap[k]]=[heap[k],heap[m]];k=m;}}return top;};
  for(const s of starts)if(s>=0){dist[s]=0;push(s,0);}
  while(heap.length){const [d,i]=pop();if(d>dist[i])continue;if(goal(i)&&!starts.includes(i)){const path=[];for(let k=i;k>=0;k=prev[k])path.push(k);return path.reverse();}
   const x=i%G,y=Math.floor(i/G);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dy)continue;const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=G||ny>=G)continue;const n=nx+ny*G,nd=d+cost(i,n)*(dx&&dy?1.414:1);if(nd<dist[n]){dist[n]=nd;prev[n]=i;push(n,nd);}}}
  return null;}
 const toPoints=(path,first,last)=>{const pts=[];for(let k=0;k<path.length;k+=2)pts.push(gpos(path[k]));if((path.length-1)%2)pts.push(gpos(path.at(-1)));if(first)pts[0]=first;if(last)pts[pts.length-1]=last;return chaikin(pts);};
 // Lago e rios: nascem nas montanhas e descem pelo caminho de menor custo até o lago; o lago escoa para a borda
 const waterY=level-1,lakeOn=opt.water>0,lake={x:at(.28,-.05)[0],z:at(.28,-.05)[1],r:.15*R*Math.sqrt(Math.max(opt.water,.3))},riverW=clamp(R*.012,3,9),rivers=[];
 if(lakeOn){
  const inLake=i=>{const [x,z]=gpos(i);return Math.hypot(x-lake.x,z-lake.z)<lake.r;},flow=(a,b)=>gblock[b]?1e4:1+Math.max(0,gh[b]-level)*.3+Math.max(0,gh[b]-gh[a])*5;
  const mark=path=>{for(const i of path)gwater[i]=1;};for(let i=0;i<G*G;i++)if(inLake(i))gwater[i]=2;
  const sources=[[.34,-.62,1],[-.3,-.62,.75],[-.62,.08,.6]].slice(0,opt.water>=1.5?3:opt.water>=1?2:1);
  for(const [u,v,wf]of sources){const start=gcell(...at(u,v));if(start<0||gwater[start])continue;const path=route([start],i=>gwater[i]>0,flow);if(!path)continue;mark(path);
   const pts=toPoints(path),wl=[];let run=Infinity,len=0;const lens=[0];for(let i=1;i<pts.length;i++){len+=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]);lens.push(len);}
   for(let i=0;i<pts.length;i++){const r=raw(pts[i][0],pts[i][1]),want=clamp(Math.round(r.base+r.peaks*.6-2),waterY,waterY+Math.round(relief*1.8));run=Math.min(run,want,waterY+Math.floor((len-lens[i])/12));wl.push(Math.max(waterY,run));}
   rivers.push({pts,wl,w:riverW*wf});}
  const [cu,cv]=local(cityX,cityZ),cityAngle=Math.atan2(cv,cu),lakeCells=[];for(let i=0;i<G*G;i++)if(gwater[i]===2)lakeCells.push(i);
  const out=route(lakeCells,i=>{if(grad[i]<.97)return false;const [x,z]=gpos(i),[u,v]=local(x,z);let da=Math.abs(Math.atan2(v,u)-cityAngle);if(da>Math.PI)da=Math.PI*2-da;return da>.9;},flow);
  if(out){mark(out);const pts=toPoints(out),a=pts.at(-2),b=pts.at(-1),n=Math.hypot(b[0]-a[0],b[1]-a[1])||1;pts.push([b[0]+(b[0]-a[0])/n*R*.12,b[1]+(b[1]-a[1])/n*R*.12]);rivers.push({pts,wl:pts.map(()=>waterY),w:riverW*1.2});}
 }
 // Vilas: primeiras posições candidatas válidas (secas, baixas e fora da cidade)
 const villages=[];
 for(const [u,v]of [[-.52,0],[.5,.38],[-.42,.44],[.62,-.25],[-.6,-.32]]){if(villages.length>=opt.villages)break;const p=at(u,v),i=gcell(...p);if(i<0||gwater[i]||gblock[i]||gh[i]>level+rel*1.1)continue;let wet=false;for(let dy=-3;dy<=3&&!wet;dy++)for(let dx=-3;dx<=3;dx++){const n=i+dx+dy*G;if(n>=0&&n<G*G&&gwater[n]){wet=true;break;}}if(!wet)villages.push({name:['Vila da campina','Vila do bosque','Vila do riacho','Vila do vale','Vila da serra'][villages.length],p:p.map(Math.round),index:villages.length});}
 // Estradas por menor custo: evitam ladeiras e água; cruzam rios em pontes
 const roads=[],gatePos=[cityX+gate[0]*cityR,cityZ+gate[1]*cityR],doorPos=[towerX+door[0]*(towerR+1),towerZ+door[1]*(towerR+1)],hub=at(-.08,.14);
 const walk=(a,b)=>(gblock[b]?400:1+((Math.abs(gh[b]-gh[a])/gs)*14)**2+(gwater[b]===2?1e4:gwater[b]?10:0))*(groad[b]?.35:1);
 const addRoad=(from,to,goal)=>{const s=gcell(...from);if(s<0)return;const path=route([s],goal||(i=>i===gcell(...to)),walk);if(!path)return;for(const i of path)groad[i]=1;roads.push(toPoints(path,from,goal?null:to));};
 if(cityOn&&towerOn)addRoad(gatePos,doorPos);else if(cityOn)addRoad(gatePos,hub);else if(towerOn)addRoad(hub,doorPos);
 for(const v of villages)addRoad(v.p,null,roads.length?(i=>groad[i]===1):(i=>i===gcell(...hub)));
 const mainRoad=roads[0]||[hub,hub];
 // Índice espacial: para cada célula da grade, os segmentos de rio/estrada que podem influenciar suas colunas
 const FAR=gs*.75+64,index=segs=>{const out=new Array(G*G).fill(null);for(const sg of segs){const i0=Math.max(0,Math.floor((Math.min(sg.a[0],sg.b[0])-FAR-cx+R)/gs)),i1=Math.min(G-1,Math.floor((Math.max(sg.a[0],sg.b[0])+FAR-cx+R)/gs)),j0=Math.max(0,Math.floor((Math.min(sg.a[1],sg.b[1])-FAR-cz+R)/gs)),j1=Math.min(G-1,Math.floor((Math.max(sg.a[1],sg.b[1])+FAR-cz+R)/gs));
   for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const n=i+j*G,[x,z]=gpos(n);if(segInfo(x,z,sg.a,sg.b)[0]<FAR)(out[n]||(out[n]=[])).push(sg);}}return out;};
 const riverSegs=[],roadSegs=[];for(const rv of rivers)for(let i=1;i<rv.pts.length;i++)riverSegs.push({a:rv.pts[i-1],b:rv.pts[i],w:rv.w,wa:rv.wl[i-1],wb:rv.wl[i]});
 roads.forEach((pts,k)=>{for(let i=1;i<pts.length;i++)roadSegs.push({a:pts[i-1],b:pts[i],main:k===0});});
 const riverIdx=index(riverSegs),roadIdx=index(roadSegs);
 const variants=houseVariants(),tower_=tower(),church=churchAsset(),P=18,lotCache=new Map(),churchLot=Math.ceil((plazaR+3.5)/(1.414*P));
 function lot(ix,iz){const k=ix+','+iz;let v=lotCache.get(k);if(v!==undefined)return v;v=null;const x0=ix*P,z0=iz*P,x1=x0+P-1,z1=z0+P-1,far=Math.max(Math.hypot(x0,z0),Math.hypot(x1,z0),Math.hypot(x0,z1),Math.hypot(x1,z1)),near=Math.hypot(clamp(0,x0,x1),clamp(0,z0,z1));
  const crossesAvenue=(x0<=5&&x1>=-5)||(z0<=5&&z1>=-5),inPalace=palace&&x1>=palace.x0-cityX-4&&x0<=palace.x0-cityX+palace.w+3&&z1>=palace.z0-cityZ-4&&z0<=palace.z0-cityZ+palace.d+3;
  if(far<cityR-11&&near>plazaR+3&&!crossesAvenue&&!inPalace){const n=Math.floor(h2(ix,iz,777)*100);
   if(ix===churchLot&&iz===churchLot)v={kind:'asset',asset:church,x0,z0};
   else if(n<70)v={kind:'asset',asset:variants[Math.floor(h2(ix,iz,778)*variants.length)],x0,z0};
   else if(n<75)v={kind:'tower',x0,z0};else v={kind:n<88?'garden':'park',x0,z0};}
  lotCache.set(k,v);return v;}
 function cityCell(px,pz,d){
  if(d>=cityR-3&&d<cityR){const g=Math.abs(px)<=2||Math.abs(pz)<=2;return {type:'wall',gate:g,merlon:Math.floor(Math.atan2(pz,px)*cityR/2)%2===0};}
  const ang=Math.atan2(pz,px)/(Math.PI/4)+.5,turret=Math.abs(ang-Math.round(ang))*Math.PI/4*cityR;
  if(d>=cityR-7&&d<cityR+3&&turret<5&&Math.hypot(turret,d-(cityR-2))<5)return {type:'turret'};
  if(d>=cityR)return null;
  if(d<=3.2)return {type:'fountain',core:d<1,rim:d>2.2,mat:pal.pave};
  if(d<plazaR){if(plazaR>=14&&d>plazaR-8){const k=((Math.floor(Math.atan2(pz,px)/(Math.PI/4))%8)+8)%8,a=(k+.5)*Math.PI/4,sx=Math.round(Math.cos(a)*(plazaR-5)),sz=Math.round(Math.sin(a)*(plazaR-5));if(Math.abs(px-sx)<=1&&Math.abs(pz-sz)<=1)return {type:'stall',lx:px-sx,lz:pz-sz,k,mat:pal.pave};}
   return {type:'pave',mat:(Math.floor(d/3)+Math.round(ang*2))%2?pal.pave2:pal.pave};}
  if(Math.abs(px)<=3||Math.abs(pz)<=3||d>=cityR-9)return {type:'pave',mat:pal.pave,lamp:(Math.abs(px)===3||Math.abs(pz)===3)&&Math.round(d)%14===0};
  if(palace){const lx=px+cityX-palace.x0,lz=pz+cityZ-palace.z0;if(lx>=0&&lz>=0&&lx<palace.w&&lz<palace.d)return {type:'palace',lx,lz,mat:pal.pave2};if(lx>=-2&&lz>=-2&&lx<palace.w+2&&lz<palace.d+6)return {type:'pave',mat:pal.pave2};}
  const l=lot(Math.floor(px/P),Math.floor(pz/P));if(!l)return {type:'pave',mat:pal.lane};
  const lx=px-l.x0,lz=pz-l.z0;if(lx<3||lz<3)return {type:'pave',mat:pal.lane,lamp:lx===1&&lz===1&&(l.x0/P+l.z0/P)%2===0};
  if(l.kind==='asset'){const ox=4+Math.floor((13-l.asset.w)/2);if(lx>=ox&&lx<ox+l.asset.w&&lz>=4&&lz<4+l.asset.d)return {type:'asset',asset:l.asset,dx:lx-ox,dz:lz-4};if(lz===3&&lx===ox+(l.asset.w>>1))return {type:'pave',mat:pal.lane};}
  if(l.kind==='tower'&&lx>=4&&lx<17&&lz>=4&&lz<17&&tower_.get(lx-4,0,lz-4))return {type:'asset',asset:tower_,dx:lx-4,dz:lz-4};
  return {type:'yard',kind:l.kind};
 }
 // Forma do terreno (altura, água, distâncias), memorizada
 const shapes=new Map(),cols=new Map();
 function shape(x,z){
  if(x<0||z<0||x>=c.width||z>=c.depth)return null;const k=x*16384+z;let s=shapes.get(k);if(s!==undefined)return s;if(shapes.size>160000)shapes.clear();
  const dx=x-cx,dz=z-cz,rim=1+(fbm(x/40,z/40,5,3)-.5)*.05,radial=Math.hypot(dx,dz)/R;
  if(radial>rim){shapes.set(k,null);return null;}
  const g=gcell(x,z),r=raw(x,z);
  let dRoad=1e6,dMain=1e6,wl=waterY,dRiver=1e6;const rs=g<0?null:riverIdx[g],ds=g<0?null:roadIdx[g];
  if(ds)for(const sg of ds){const d=segInfo(x,z,sg.a,sg.b)[0];if(d<dRoad)dRoad=d;if(sg.main&&d<dMain)dMain=d;}
  if(rs){const wob=(vnoise(x/45,z/45,9)-.5)*6;for(const sg of rs){const [d,t]=segInfo(x,z,sg.a,sg.b),e=d+wob-sg.w;if(e<dRiver){dRiver=e;wl=Math.round(lerp(sg.wa,sg.wb,t));}}}
  const dLake=lakeOn?Math.hypot(x-lake.x,z-lake.z)-lake.r*(1+(fbm(x/90,z/90,13,3)-.5)*.5):1e6,isLake=dLake<dRiver;if(isLake)wl=waterY;
  const dW=Math.min(dRiver,dLake),dCity=cityOn?Math.hypot(x-cityX,z-cityZ):1e6,dTower=towerOn?Math.hypot(x-towerX,z-towerZ):1e6;
  let top=r.base+r.peaks*smooth(8,60,dMain)*smooth(4,50,dRiver),water,coast=false;
  if(dW<14)top=lerp(wl+1,top,smooth(0,14,dW));
  if(dW<0){water=wl;top=wl-2-Math.min(5,Math.round(-dW/(isLake?6:3)));}
  if(dCity<cityR+18)top=lerp(level,top,smooth(cityR+2,cityR+18,dCity));
  if(dTower<towerR+34)top=lerp(towerBase,top,smooth(towerR+8,towerR+34,dTower));
  if(sea!==null&&water===undefined){const t=smooth(.93,.995,radial/rim)*smooth(.48,.62,vnoise(x/(L*1.3),z/(L*1.3),61))*smooth(25,80,dRiver)*smooth(cityR+12,cityR+70,dCity)*smooth(towerR+40,towerR+90,dTower);if(t>0){top=lerp(top,sea-1.5,t);coast=top<sea+3.5;}}
  top=Math.round(clamp(top,6,maxTop));
  const stal=Math.max(0,vnoise(x/9,z/9,71)-.62)*34*(1-radial*.6);
  let bottom=Math.round(level-8-Math.pow(Math.max(0,1-radial),.6)*(level-11)-stal);bottom=clamp(bottom,2,top-4);
  s={top,bottom,water,wl,dW,dRoad,dCity,dTower,radial,rim,mount:r.mount,coast,isLake,u:r.u,v:r.v};shapes.set(k,s);return s;
 }
 function column(x,z){
  x=Math.floor(x);z=Math.floor(z);const k=x*16384+z;let col=cols.get(k);if(col!==undefined)return col;if(cols.size>90000)cols.clear();
  const s=shape(x,z);if(!s){cols.set(k,null);return null;}
  const n=[shape(x+2,z),shape(x-2,z),shape(x,z+2),shape(x,z-2)],edge=n.some(v=>!v),hgt=v=>v?(v.water!==undefined?v.water:v.top):s.top,me=s.water!==undefined?s.water:s.top;
  const slope=Math.max(Math.abs(hgt(n[0])-hgt(n[1])),Math.abs(hgt(n[2])-hgt(n[3])))/4,alt=s.top-level,j=(h2(x,z,55)-.5)*.1;
  col={top:s.top,bottom:s.bottom,biome:c.biome,sub:'plains',surface:sk.grass,soil:sk.soil,trees:3,kinds:sk.tree,tufts:120,flowers:8,rocks:1.5,logs:.4,bushes:2};
  const bare=()=>{col.trees=0;col.tufts=0;col.flowers=0;col.rocks=0;col.logs=0;col.bushes=0;};
  if(s.water!==undefined){col.sub='water';col.water=s.water;bare();const depth=s.water-s.top;col.surface=depth<=3?sk.sand:vnoise(x/11,z/11,81)>.6?'clay':'gravel';col.soil=col.surface==='clay'?'clay':sk.sand;col.lake=s.isLake;col.shore=s.dW>-3;if(sk.freeze)col.ice=true;}
  else if(s.coast||s.dW<2+vnoise(x/17,z/17,83)*6&&s.top<=s.wl+2){col.sub='beach';bare();col.surface=col.soil=sk.sand;col.cane=rich&&s.dW<1.6&&!s.coast;col.tufts=rich?12:0;col.tuft='dead_bush';}
  else if((edge||s.radial/s.rim>.985)&&alt>-4||slope>1.15+j*3){col.sub='cliff';bare();col.surface=sk.rock;col.soil=sk.rock;if(rich)col.biome=alt>rel?'ruins':c.biome;}
  else if(alt>rel*sk.snow+j*rel*4){col.sub='snow';bare();col.surface='snow_block';col.trees=1;col.kinds=sk.highTree;if(rich)col.biome='frost';}
  else if(alt>rel*1.25+j*rel*4){col.sub='highland';col.kinds=sk.highTree;col.trees=alt<rel*2?16:2;col.tufts=50;col.flowers=2;col.rocks=7;col.logs=1;if(slope>.6){col.surface=sk.rock;col.tufts=0;}if(rich)col.biome='ruins';}
  else{
   const moist=fbm(x/(L*.7),z/(L*.7),23,3)*.6+(1-smooth(0,90,s.dW))*.5,forest=fbm(x/(L*.9),z/(L*.9),21)+Math.abs(s.u)*.3-Math.max(0,-s.v-.2)*.3+(opt.forest-1)*.22+(sk.forestBias||0);
   if(moist>.76+j&&alt<3&&rich){col.sub='swamp';col.surface=vnoise(x/5,z/5,85)>.52?sk.mud:sk.grass;col.trees=13;col.tufts=260;col.tuft='fern';col.flowers=14;col.flower=['blue_orchid','brown_mushroom','red_mushroom'];col.bushes=20;col.biome='forest';}
   else if(opt.forest>0&&forest>.72+j){col.sub='forest';col.surface=vnoise(x/7,z/7,87)>.45?sk.forest:sk.grass;col.trees=40;col.kinds=sk.forestTree;col.tufts=160;col.tuft=rich?'fern':sk.tuft;col.flowers=3;col.flower=rich?['brown_mushroom','red_mushroom','poppy']:null;col.rocks=2;col.logs=3;col.bushes=16;if(rich)col.biome='forest';}
   else if(sk.grove&&opt.forest>0&&fbm(x/(L*.6),z/(L*.6),25,3)>.68+j){col.sub='grove';col.trees=20;col.kinds=[sk.grove];col.flowers=22;col.tufts=180;}
   else if(fbm(x/(L*.5),z/(L*.5),27,3)>.66+j){col.sub='meadow';col.trees=.5;col.flowers=95;col.tufts=280;}
   if(s.mount>.6&&alt>rel*.4)col.rocks=5;
  }
  if(s.water!==undefined&&s.dRoad<2.7)col.build={type:'bridge',rail:s.dRoad>=1.7};
  else if(s.dRoad<1.8&&s.water===undefined){bare();col.surface=sk.path||'dirt_path';col.road=true;}else if(s.dRoad<5){col.trees=0;col.logs=0;col.rocks=0;}
  if(s.dCity<cityR+3){const cell=cityCell(x-cityX,z-cityZ,s.dCity);if(cell){bare();col.build=cell;col.city=true;col.sub='city';col.biome=c.biome;col.soil=sk.soil;delete col.water;delete col.road;delete col.ice;
    if(cell.type==='yard'){col.surface=sk.grass;col.tufts=cell.kind==='tower'?60:140;col.flowers=cell.kind==='park'?130:cell.kind==='garden'?40:14;col.trees=cell.kind==='garden'?45:cell.kind==='park'?8:0;col.bushes=cell.kind==='asset'?0:25;}
    else col.surface=cell.mat||pal.wall;}else if(s.dCity<cityR+8){col.trees=0;col.logs=0;}}
  if(s.dTower<=towerR){bare();col.build={type:'labyrinth',d:s.dTower,px:x-towerX,pz:z-towerZ};col.sub='tower';col.surface='deepslate_tiles';col.soil=sk.soil;delete col.water;delete col.road;delete col.ice;}else if(s.dTower<towerR+6){bare();if(!col.road)col.surface='stone_bricks';}
  cols.set(k,col);return col;
 }
 // Labirinto por andar da torre (grade de células de 4 blocos, DFS com seed)
 const mazes=new Map(),RI=towerR-7,cellOk=(i,j)=>Math.hypot(Math.abs(4*i)+2,Math.abs(4*j)+2)<=RI;
 function maze(k){let m=mazes.get(k);if(m)return m;m=new Set();const seen=new Set(['0,0']),stack=[[0,0]];let n=0;const rnd=()=>h2(n++,k,4242);
  while(stack.length){const [i,j]=stack.at(-1),opts=[[1,0],[-1,0],[0,1],[0,-1]].filter(([a,b])=>cellOk(i+a,j+b)&&!seen.has((i+a)+','+(j+b)));if(!opts.length){stack.pop();continue;}
   const [a,b]=opts[Math.floor(rnd()*opts.length)];m.add(a?`${Math.max(i,i+a)},${j},W`:`${i},${Math.max(j,j+b)},N`);seen.add((i+a)+','+(j+b));stack.push([i+a,j+b]);}
  for(const key of seen){const [i,j]=key.split(',').map(Number);if(rnd()<.1&&cellOk(i-1,j))m.add(`${i},${j},W`);if(rnd()<.1&&cellOk(i,j-1))m.add(`${i},${j},N`);}
  mazes.set(k,m);return m;}
 function towerBlock(b,y){
  if(y>T.top)return undefined;const r0=y-(T.base+1);if(r0<0)return undefined;const ang=Math.atan2(b.pz,b.px);
  if(b.d>T.r-2.5){const along=b.px*door[0]+b.pz*door[1],across=Math.abs(-b.px*door[1]+b.pz*door[0]);if(along>0&&across<=1.5&&r0<=4)return AIR;return r0%12===11?M('chiseled_deepslate'):r0%12===5&&Math.floor(ang*T.r/3)%3===0?M('sea_lantern'):M('deepslate_bricks');}
  if(y>=T.top-1)return M('deepslate_tiles');
  const k=Math.min(storeys,Math.floor(r0/12)+1),r=r0-12*(k-1),plate=r===11&&k<storeys,boss=k===storeys&&storeys>=3,s=Math.floor((((ang/(Math.PI*2))+1)%1)*24),n=Math.floor((s+1)/2),ramp=k%2===0&&k<storeys;
  if(b.d>T.r-6){
   if(plate){if(ramp&&n>=9)return n===12?M('stone_bricks'):n===11&&s%2===0?M('stone_brick_slab[type=bottom,waterlogged=false]'):AIR;return M('deepslate_tiles');}
   if(ramp){if(r===n-1||r===n-2&&n>=2)return M('stone_bricks');if(r===n&&s%2===0)return M('stone_brick_slab[type=bottom,waterlogged=false]');}
   return AIR;}
  const ladder=k%2===1&&!boss&&k<storeys;
  if(plate){if(ladder&&b.px===0&&b.pz===1)return M('ladder[facing=south,waterlogged=false]');return (b.px&3)===0&&(b.pz&3)===0&&((b.px+b.pz)&4)===0?M('sea_lantern'):M('deepslate_tiles');}
  const tunnel=b.px>0&&Math.abs(b.pz)<=1&&r<=2;
  if(boss){if(b.d>RI)return b.px>0&&Math.abs(b.pz)<=2&&r<=4?AIR:M('deepslate_bricks');const q=Math.max(3,Math.round(RI*.55));if(Math.abs(Math.abs(b.px)-q)<=1&&Math.abs(Math.abs(b.pz)-q)<=1&&RI>=10)return M(r%6===5?'sea_lantern':'chiseled_deepslate');return AIR;}
  if(b.px===0&&b.pz===0)return M('deepslate_bricks');
  if(ladder&&b.px===0&&b.pz===1)return M('ladder[facing=south,waterlogged=false]');
  if(!T.maze)return b.d>RI?(tunnel?AIR:M('deepslate_bricks')):AIR;
  const i=Math.floor((b.px+2)/4),jj=Math.floor((b.pz+2)/4),lx=b.px+2-4*i,lz=b.pz+2-4*jj;
  if(!cellOk(i,jj))return jj===0&&i>0&&lz>=1&&r<=2?AIR:M('deepslate_bricks');
  if(lx===0&&lz===0)return M('deepslate_bricks');
  if(lx===0)return cellOk(i-1,jj)&&maze(k).has(`${i},${jj},W`)?AIR:M('deepslate_bricks');
  if(lz===0)return cellOk(i,jj-1)&&maze(k).has(`${i},${jj},N`)?AIR:M('deepslate_bricks');
  return AIR;
 }
 const GOODS=['hay_block','pumpkin','melon','bookshelf'],WOOL=['red_wool','yellow_wool','blue_wool','white_wool'];
 // Bloco de estrutura para uma coluna; undefined = manter terreno/ar.
 function buildBlock(col,x,y,z){
  const b=col.build,dy=y-col.top;if(b.type==='labyrinth')return dy>0?towerBlock(b,y):undefined;if(dy<0||dy===0&&b.type!=='fountain')return undefined;
  switch(b.type){
   case 'bridge':return y===col.water+1?M('stone_bricks'):b.rail&&y===col.water+2?M('stone_brick_wall'):y<=col.water&&dy>0&&b.rail&&(x+z)%7===0?M('stone_bricks'):undefined;
   case 'wall':if(dy>13)return undefined;if(b.gate&&dy<=5)return AIR;return dy===13?(b.merlon?M(pal.wall):undefined):dy===12?M(pal.trim):M(pal.wall);
   case 'turret':return dy<=19?(dy===19&&(x+z)%2?undefined:dy%9===0?M(pal.trim):M(pal.wall)):undefined;
   case 'fountain':if(dy===0)return M(pal.pave);if(b.core)return dy<=4?(dy===4?M('sea_lantern'):M(pal.trim)):undefined;if(dy===1)return b.rim?M(pal.pave):sk.freeze?M('ice'):WATER;return undefined;
   case 'pave':if(b.lamp)return dy<=3?M('cobblestone_wall'):dy===4?M('lantern[hanging=false,waterlogged=false]'):undefined;return undefined;
   case 'stall':{const corner=Math.abs(b.lx)===1&&Math.abs(b.lz)===1;if(dy===3)return M(WOOL[b.k%4]);if(corner&&dy<3)return M('oak_fence');if(!b.lx&&!b.lz&&dy===1)return M(GOODS[b.k%4]);return undefined;}
   case 'asset':return dy<=b.asset.h?b.asset.palette[b.asset.get(b.dx,dy-1,b.dz)]:undefined;
   case 'palace':{const p=palace,edge=b.lx===0||b.lz===0||b.lx===p.w-1||b.lz===p.d-1,corner=(b.lx<4||b.lx>=p.w-4)&&(b.lz<4||b.lz>=p.d-4),h=corner?p.h+6:p.h,m=M(pal.palace);if(dy>h+1)return undefined;
    if(dy===h+1)return (edge||corner)&&(b.lx+b.lz)%2===0?m:undefined;
    if(dy===1||dy===h)return m;if(corner&&dy>p.h)return m;
    if(!edge)return dy===Math.floor(h/2)&&(b.lx%8===4&&b.lz%8===4)?M('sea_lantern'):AIR;
    if(b.lz===p.d-1&&Math.abs(b.lx-(p.w-1)/2)<=2&&dy<=6)return AIR;
    return dy%7===4&&(b.lx+b.lz)%4<2?M('glass'):m;}
  }
  return undefined;
 }
 // Vegetação e detalhes: árvores de vários portes, arbustos, capim, flores, pedras, troncos caídos, juncos e vitórias-régias
 function tree(w,lx,y,lz,kind,size){
  const [log,leaf]=TREES[kind],L_=M(log),F=M(leaf+(leaf.endsWith('_leaves')?'[persistent=true]':'')),put=(x,yy,z)=>{if(w.get(x,yy,z)===0)w.set(x,yy,z,F);};
  if(kind==='spruce'){const h=6+Math.floor(size*5);for(let dy=0;dy<h;dy++)w.set(lx,y+dy,lz,L_);for(let dy=2;dy<=h+1;dy++){const rr=dy>h-1?0:dy>h-3?1:(h-dy)%2?2:1+(dy<h-4?1:0);for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++)if(Math.abs(dx)+Math.abs(dz)<=rr+(rr>1?1:0))put(lx+dx,y+dy,lz+dz);}return;}
  const big=kind==='dark_oak'||size>.82,h=kind==='birch'?5+Math.floor(size*3):big?6+Math.floor(size*3):4+Math.floor(size*3),rad=big?3:2;
  for(let dy=0;dy<h;dy++)w.set(lx,y+dy,lz,L_);
  for(let dy=h-2-(big?1:0);dy<=h+1;dy++){const rr=dy>=h+1?rad-2:dy>=h?rad-1:rad;for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++)if(dx*dx+dz*dz<=rr*rr+1)put(lx+dx,y+dy,lz+dz);}
 }
 function decorate(w,chunkX,chunkZ,blocked=()=>false){
  const x0=chunkX*16,z0=chunkZ*16;
  for(let gz=z0-5;gz<z0+21;gz++)for(let gx=x0-5;gx<x0+21;gx++){
   const roll=h2(gx,gz,901)*1000,r2=h2(gx,gz,907)*1000;if(roll>=46&&r2>=11)continue;const col=column(gx,gz);if(!col||col.build&&col.build.type!=='yard'||col.road||col.water!==undefined)continue;const lx=gx-x0,lz=gz-z0,y=col.top+1;
   if(roll<col.trees){if(c.features.trees&&!blocked(gx,gz))tree(w,lx,y,lz,col.kinds[Math.floor(h2(gx,gz,903)*col.kinds.length)],h2(gx,gz,905));continue;}
   if(r2<col.rocks){if(blocked(gx,gz))continue;const rr=1+Math.floor(h2(gx,gz,909)*2.4),mat=M(h2(gx,gz,911)<.5?'mossy_cobblestone':sk.rock==='stone'?'cobblestone':sk.rock);for(let dy=-1;dy<=rr;dy++)for(let dx=-rr;dx<=rr;dx++)for(let dz=-rr;dz<=rr;dz++)if(dx*dx+dy*dy*1.6+dz*dz<=rr*rr+.3)w.set(lx+dx,y+dy,lz+dz,mat);}
   else if(r2<col.rocks+col.logs&&c.features.trees){if(blocked(gx,gz))continue;const ax=h2(gx,gz,913)<.5,len=3+Math.floor(h2(gx,gz,915)*3),log=M(TREES[col.kinds[0]][0]+`[axis=${ax?'x':'z'}]`);for(let i=0;i<len;i++){const c2=column(gx+(ax?i:0),gz+(ax?0:i));if(c2&&c2.top===col.top&&!c2.build&&!c2.road&&c2.water===undefined)w.set(lx+(ax?i:0),y,lz+(ax?0:i),log);}}
  }
  if(!c.features.trees)return;
  for(let lz=0;lz<16;lz++)for(let lx=0;lx<16;lx++){
   const gx=x0+lx,gz=z0+lz,col=column(gx,gz);if(!col||col.road)continue;const roll=h2(gx,gz,921)*1000;
   if(col.water!==undefined){if(col.build)continue;if(col.ice){w.set(lx,col.water,lz,M('ice'));continue;}if(rich&&col.lake&&col.shore&&roll<70&&w.get(lx,col.water+1,lz)===0)w.set(lx,col.water+1,lz,M('lily_pad'));else if(rich&&roll>940&&col.water-col.top>=2)w.set(lx,col.top+1,lz,M('seagrass'));continue;}
   if(col.build&&col.build.type!=='yard'||blocked(gx,gz))continue;const y=col.top+1;if(w.get(lx,y,lz)!==0||w.palette[w.get(lx,col.top,lz)]!==M(col.surface))continue;
   if(col.cane){if(roll<300&&[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>{const n=column(gx+a,gz+b);return n&&n.water!==undefined&&n.water===col.top;})){const h=1+Math.floor(h2(gx,gz,923)*3);for(let i=0;i<h;i++)w.set(lx,y+i,lz,M('sugar_cane'));}continue;}
   if(roll<col.bushes){w.set(lx,y,lz,M(TREES[col.kinds[0]][1]+(TREES[col.kinds[0]][1].endsWith('_leaves')?'[persistent=true]':'')));continue;}
   const soilOk=['grass_block','podzol','moss_block','mud','dirt'].includes(col.surface);
   if(roll<col.bushes+col.flowers&&soilOk){const list=col.flower||sk.flowers;if(list.length)w.set(lx,y,lz,M(list[Math.floor(h2(gx,gz,925)*list.length)]));continue;}
   const tuft=col.tuft||sk.tuft;if(roll<col.bushes+col.flowers+col.tufts&&tuft&&(tuft==='dead_bush'?['sand','red_sand'].includes(col.surface):tuft==='moss_carpet'||soilOk))w.set(lx,y,lz,M(tuft));
  }
 }
 // Pontos de interesse: fazendas junto às vilas, ruínas, acampamentos e torres de vigia
 const pois=[],spots=[...villages.map(v=>v.p)],okSpot=(x,z,high,gap=52)=>{const s=shape(Math.round(x),Math.round(z));if(!s||s.water!==undefined||s.coast||s.dW<16||s.dCity<cityR+34||s.dTower<towerR+34||s.dRoad<9||s.radial>.9||s.top-level>rel*(high?2.2:1.1))return false;
  for(const [a,b]of [[10,0],[-10,0],[0,10],[0,-10]]){const n=shape(Math.round(x)+a,Math.round(z)+b);if(!n||n.water!==undefined||Math.abs(n.top-s.top)>3)return false;}return spots.every(p=>Math.hypot(p[0]-x,p[1]-z)>gap);};
 if(opt.pois>0){
  villages.forEach((v,i)=>{for(const [a,b]of [[40,0],[-40,0],[0,40],[0,-40]]){const p=[v.p[0]+a,v.p[1]+b];if(okSpot(p[0],p[1],false,36)){pois.push({name:'Fazenda',asset:farmAsset(i),x:p[0],z:p[1]});spots.push(p);break;}}});
  const want=Math.round(6*opt.pois*clamp(R/500,.6,3));let made=0,rs=0;const rnd=()=>h2(rs++,17,6161);
  for(let k=0;k<want*12&&made<want;k++){const a=h2(k,1,6001)*Math.PI*2,rr=Math.sqrt(h2(k,2,6001))*.86*R,x=Math.round(cx+Math.cos(a)*rr),z=Math.round(cz+Math.sin(a)*rr),kind=made%3;if(!okSpot(x,z,kind===0))continue;
   pois.push(kind===0?{name:'Ruínas antigas',asset:ruinsAsset(rnd),x,z}:kind===1?{name:'Acampamento',asset:campAsset(made),x,z}:{name:'Torre de vigia',asset:tower_,x,z});spots.push([x,z]);made++;}
 }
 let dungeon=null;for(let k=0;k<80&&!dungeon;k++){const a=h2(k,3,6003)*Math.PI*2,rr=(.3+h2(k,4,6003)*.5)*R,x=Math.round(cx+Math.cos(a)*rr),z=Math.round(cz+Math.sin(a)*rr);if(okSpot(x,z,true)){dungeon=[x,z];spots.push(dungeon);}}
 const hubR=hub.map(Math.round),spawn=cityOn?[cityX,cityZ+Math.min(plazaR-2,8)]:roads.length?mainRoad[Math.floor(mainRoad.length/2)].map(Math.round):hubR;
 const places=[...(cityOn?[{name:'Cidade inicial',x:cityX,z:cityZ,r:cityR}]:[]),...(towerOn?[{name:'Torre-labirinto',x:towerX,z:towerZ,r:towerR}]:[]),...villages.map(v=>({name:v.name,x:v.p[0],z:v.p[1],r:23})),...(lakeOn?[{name:'Lago',x:Math.round(lake.x),z:Math.round(lake.z),r:Math.round(lake.r)}]:[]),...pois.map(p=>({name:p.name,x:p.x,z:p.z,r:9}))];
 return {column,buildBlock,decorate,spawn,places,villages,pois,dungeon,level,radius:R,sea,rivers,roads,theta,city:cityOn?{x:cityX,z:cityZ,r:cityR,gate,plaza:plazaR,palette:pal}:null,labyrinth:towerOn?T:null};
}

// Miniatura voxel do andar inteiro (cada célula representa `step` blocos) para pré-visualização.
export function floorMiniature(land,geometry,cells=176){
 const c=land.config,pad=Math.round(Math.max(c.width,c.depth)*.06),size=Math.max(c.width,c.depth)+pad*2,step=size/cells,ex=clamp(step/5,1,4),x0=c.width/2-size/2,z0=c.depth/2-size/2;
 const sea=geometry?.enabled&&geometry.oceanEnabled?geometry.seaLevel:null,yBase=(sea??Math.round(c.height*.35)-14)-6,toY=y=>Math.max(0,Math.round((y-yBase)*ex/step)),H=Math.min(120,toY(c.height)+2),w=new World(cells,H,cells);
 const blocks={beginning:'grass_block',forest:'podzol',ruins:'moss_block',frost:'snow_block',ember:'red_sand'};
 for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
  const x=Math.floor(x0+(i+.5)*step),z=Math.floor(z0+(j+.5)*step),col=land.column(x,z);
  if(!col){if(sea!==null&&Math.hypot(x-geometry.cx,z-geometry.cz)<geometry.innerRadius){w.set(i,0,j,M('sand'));for(let y=1;y<=toY(sea);y++)w.set(i,y,j,WATER);}continue;}
  let surface=M(col.surface||blocks[col.biome]||'grass_block'),top=toY(col.top),extra=0,mat=null;const b=col.build;
  if(col.referenceRole===2)surface=M('cobblestone');
  if(b){if(b.type==='labyrinth'){extra=toY(land.layout.labyrinth.top)-top;mat=M('deepslate_bricks');}else if(b.type==='wall'||b.type==='turret'){extra=Math.max(1,Math.round(14*ex/step));mat=M(land.layout.city.palette.wall);}else if(b.type==='palace'){extra=Math.max(2,Math.round(24*ex/step));mat=M(land.layout.city.palette.palace);}else if(b.type==='asset'){extra=Math.max(1,Math.round(10*ex/step));mat=M((i+j)%2?'dark_oak_planks':'oak_planks');}else if(b.type==='bridge')surface=M('stone_bricks');}
  if(col.referenceRole===3){extra=Math.max(1,Math.round((c.reference?.buildingHeight||12)*ex/step));mat=M('stone_bricks');}
  for(const m of land.modules)if(x>=m.x&&x<m.x+m.asset.w&&z>=m.z&&z<m.z+m.asset.d){extra=Math.max(extra,Math.max(1,Math.round(m.asset.h*ex/step)));mat=M('oak_planks');}
  for(let y=Math.max(0,toY(col.bottom));y<top;y++)w.set(i,y,j,M('stone'));w.set(i,top,j,surface);
  if(col.water!==undefined)for(let y=top+1;y<=Math.max(top+1,toY(col.water));y++)w.set(i,y,j,col.ice?M('ice'):WATER);
  for(let y=1;y<=extra;y++)w.set(i,top+y,j,mat);
  if(!extra&&col.water===undefined&&(col.trees||0)>12&&(i*7+j*13)%3===0)w.set(i,top+1,j,M(TREES[col.kinds?.[0]||'oak'][1]));
  if(sea!==null){w.set(i,0,j,M('sand'));for(let y=1;y<Math.min(toY(sea)+1,toY(col.bottom));y++)w.set(i,y,j,WATER);}
 }
 return {world:w,step,origin:[x0,z0]};
}
