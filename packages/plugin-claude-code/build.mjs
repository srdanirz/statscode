import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

await esbuild.build({
    entryPoints: ['hooks/index.ts'],
    bundle: true,
    outdir: 'dist/hooks',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    banner: {
        js: `
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
});

// Copy sql.js WASM file
const wasmSrc = join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
const wasmDest = join(__dirname, 'dist/hooks/sql-wasm.wasm');
copyFileSync(wasmSrc, wasmDest);

console.log('✅ Bundle created successfully!');
console.log('✅ WASM file copied!');


