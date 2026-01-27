import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Ensure dist directories exist
if (!existsSync(join(__dirname, 'dist/hooks'))) {
    mkdirSync(join(__dirname, 'dist/hooks'), { recursive: true });
}
if (!existsSync(join(__dirname, 'dist/scripts'))) {
    mkdirSync(join(__dirname, 'dist/scripts'), { recursive: true });
}

// Build hooks
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

// Build stats CLI script
await esbuild.build({
    entryPoints: ['scripts/stats.mjs'],
    bundle: true,
    outfile: 'dist/scripts/stats.mjs',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    banner: {
        js: `import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
});

// Build login CLI script
await esbuild.build({
    entryPoints: ['scripts/login.mjs'],
    bundle: true,
    outfile: 'dist/scripts/login.mjs',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    banner: {
        js: `import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
});

// Build force-sync CLI script
await esbuild.build({
    entryPoints: ['scripts/force-sync.mjs'],
    bundle: true,
    outfile: 'dist/scripts/force-sync.mjs',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    banner: {
        js: `import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
});

// Build insights CLI script
await esbuild.build({
    entryPoints: ['scripts/insights.mjs'],
    bundle: true,
    outfile: 'dist/scripts/insights.mjs',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    banner: {
        js: `import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
    }
});

// Copy sql.js WASM files
const wasmSrc = join(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm');
copyFileSync(wasmSrc, join(__dirname, 'dist/hooks/sql-wasm.wasm'));
copyFileSync(wasmSrc, join(__dirname, 'dist/scripts/sql-wasm.wasm'));

console.log('✅ Bundle created successfully!');
console.log('✅ WASM files copied!');
