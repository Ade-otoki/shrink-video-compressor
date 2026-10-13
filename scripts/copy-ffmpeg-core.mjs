// Copies the single-threaded FFmpeg WebAssembly core into public/ so it is
// served same-origin (no CDN, no cross-origin isolation headers required).
import { copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'node_modules/@ffmpeg/core/dist/esm');
const dest = join(root, 'public/ffmpeg');
if (!existsSync(src)) process.exit(0);
mkdirSync(dest, { recursive: true });
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) copyFileSync(join(src, f), join(dest, f));
console.log('Copied FFmpeg core to public/ffmpeg');
