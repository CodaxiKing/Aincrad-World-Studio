import {importSchematic} from './nbt.js';
self.onmessage=async({data})=>{try{const result=await importSchematic(new Uint8Array(data));self.postMessage({result},[result.cells.buffer]);}catch(e){self.postMessage({error:e.message});}};
