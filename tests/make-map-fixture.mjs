import {mkdir,writeFile} from 'node:fs/promises';
import {regionBytes} from './map-fixture.mjs';
await mkdir(new URL('./fixtures/',import.meta.url),{recursive:true});
await writeFile(new URL('./fixtures/r.0.0.mca',import.meta.url),regionBytes());
console.log('Fixture sintética em tests/fixtures/r.0.0.mca; construção X14..18 Y64..70 Z3..7.');
