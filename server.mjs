import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {localAPI} from './lib/local-api.mjs';
const root=path.resolve(fileURLToPath(new URL('./dist/',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.png':'image/png'};
const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,'http://localhost');
 if(await localAPI(req,res,url))return;
 const pathname=decodeURIComponent(url.pathname);
 const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
 if(!filename.startsWith(root+path.sep)&&filename!==root){res.writeHead(403);return res.end();}
 const data=await readFile(filename);res.writeHead(200,{'Content-Type':types[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});res.end(data);
}catch{res.writeHead(404);res.end('Arquivo não encontrado');}});
const port=Number(process.env.PORT)||4173;
server.listen(port,'127.0.0.1',()=>console.log(`Aincrad World Studio: http://127.0.0.1:${port}`));
