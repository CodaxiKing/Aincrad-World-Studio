import {parentPort,workerData} from 'node:worker_threads';
import {deflateSync} from 'node:zlib';
import {createSource} from './chunk-source.mjs';
import {encodeChunk} from './world-export.mjs';

// Gera, codifica e comprime lotes de chunks em paralelo; a escrita em ordem fica com o worker principal.
const {land,source}=createSource(workerData);
parentPort.on('message',async({id,entries})=>{
 try{const chunks=[];for(const {x,z}of entries){const bytes=deflateSync(encodeChunk(await source(x,z),x,z,land.theme));chunks.push(new Uint8Array(bytes.buffer,bytes.byteOffset,bytes.length));}parentPort.postMessage({id,chunks});}
 catch(e){parentPort.postMessage({id,error:e.message});}
});
