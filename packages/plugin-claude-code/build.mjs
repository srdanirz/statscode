import * as esbuild from 'esbuild';

await esbuild.build({
    entryPoints: ['hooks/index.ts'],
    bundle: true,
    outdir: 'dist/hooks',
    platform: 'node',
    target: 'node18',
    format: 'esm',
    external: ['sql.js'],  // Keep sql.js external, it's complex
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

console.log('✅ Bundle created successfully!');
