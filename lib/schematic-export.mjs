import {mkdir,writeFile,rename} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {buildPlanTile,validateReference} from '../dist/image-blueprint.js';
import {encodeSchematic} from '../dist/nbt.js';
import {zipDirectory} from './world-export.mjs';

export async function exportReferenceSchematics({dir,config,exportId,onProgress=()=>{}}){
 const reference=validateReference(config.reference),tileSize=128,out=path.join(dir,'exports',exportId),tiles=[],total=Math.ceil(config.width/tileSize)*Math.ceil(config.depth/tileSize);await mkdir(out,{recursive:true});let done=0;
 for(let z=0;z<config.depth;z+=tileSize)for(let x=0;x<config.width;x+=tileSize){const width=Math.min(tileSize,config.width-x),depth=Math.min(tileSize,config.depth-z),w=buildPlanTile(reference,{width,depth,worldWidth:config.width,worldDepth:config.depth,originX:x,originZ:z}),name=`cidade_x${String(x).padStart(4,'0')}_z${String(z).padStart(4,'0')}.schem`;let solid=0;for(const n of w.cells)if(n)solid++;if(solid){await writeFile(path.join(out,name),gzipSync(encodeSchematic(w)));tiles.push({file:name,offset:[x,0,z],width,height:w.h,depth,solid});}onProgress({done:++done,total,progress:done/total});}
 await writeFile(path.join(out,'manifest.json'),JSON.stringify({kind:'schematics',format:'Sponge v3',dataVersion:4671,referenceName:reference.name,width:config.width,depth:config.depth,height:reference.buildingHeight+2,tiles,limitations:'Traçado da planta com volumes guiados; não é reconstrução automática fiel de perspectiva. Sem entidades ou inventários.'},null,2));
 await writeFile(path.join(out,'export-info.json'),JSON.stringify({kind:'schematics'}));
 await writeFile(path.join(out,'LEIA-ME.txt'),'Cidade gerada a partir do traçado revisado da imagem.\nCada peça usa Sponge v3 e contém Offset relativo à mesma origem da cidade.\nNo WorldEdit compatível, carregue e cole cada peça a partir da mesma origem; confira primeiro em uma cópia.\nSe o leitor ignorar Offset, use os deslocamentos do manifest.json. O editor local posiciona a seleção pelo canto mínimo.\nAs ruas e plantas seguem a classificação; altura, fachadas e interiores são estimados pelo estilo selecionado.\nEsta exportação não inclui a muralha, o oceano externo ou o relevo; use a exportação de mundo para o andar completo.\nHomologação em WorldEdit/Minecraft permanece pendente.\n');
 await zipDirectory(out,path.join(dir,'exports',exportId+'.partial'));await rename(path.join(dir,'exports',exportId+'.partial'),path.join(dir,'exports',exportId+'.zip'));return {tiles:tiles.length};
}
