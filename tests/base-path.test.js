import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm,access} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalizeBasePath,nestStaticSite} from '../build/vite/base-path.js';
test('base normalization rejects traversal and external URLs',()=>{assert.equal(normalizeBasePath('relic-return'),'/relic-return/');assert.equal(normalizeBasePath(),'/');for(const s of ['../bad','https://example.com','//host','/_headers/','/a?x/'])assert.throws(()=>normalizeBasePath(s));});
test('nested site keeps prefixed headers at upload root',async()=>{const dir=await mkdtemp(join(tmpdir(),'relic-test-'));try{const dist=join(dir,'dist');await mkdir(dist);await writeFile(join(dist,'index.html'),'game');await writeFile(join(dist,'_headers'),'/playweft.json\n  Access-Control-Allow-Origin: *\n');await nestStaticSite(dist,'/games/relic/');assert.equal(await readFile(join(dist,'games/relic/index.html'),'utf8'),'game');assert.equal(await readFile(join(dist,'_headers'),'utf8'),'/games/relic/playweft.json\n  Access-Control-Allow-Origin: *\n');await assert.rejects(access(join(dist,'games/relic/_headers')));}finally{await rm(dir,{recursive:true,force:true});}});
