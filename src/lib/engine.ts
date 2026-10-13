import { FFmpeg, FFFSType } from '@ffmpeg/ffmpeg';
import { AppError } from '../types';

// One FFmpeg WebAssembly instance, running in its own Web Worker so the UI never blocks.
// Calls are serialised; cancelling terminates the worker and frees its memory.

let current: FFmpeg | null = null;
let loading: Promise<FFmpeg> | null = null;
let lock: Promise<unknown> = Promise.resolve();
let mountSeq = 0;

function coreUrl(file: string) {
  return new URL(`${import.meta.env.BASE_URL}ffmpeg/${file}`, window.location.href).href;
}

export function getEngine(): Promise<FFmpeg> {
  if (current?.loaded) return Promise.resolve(current);
  if (loading) return loading;
  const ff = new FFmpeg();
  current = ff;
  loading = ff
    .load({ coreURL: coreUrl('ffmpeg-core.js'), wasmURL: coreUrl('ffmpeg-core.wasm') })
    .then(() => ff)
    .catch((e: unknown) => {
      if (current === ff) resetEngine();
      throw new AppError('engine-load-failed', String(e));
    });
  return loading;
}

/** Terminate the worker (cancels any running exec) and drop the instance. */
export function resetEngine() {
  try {
    current?.terminate();
  } catch {
    /* already gone */
  }
  current = null;
  loading = null;
}

/** Run `fn` with exclusive access to the engine. */
export function withEngine<T>(fn: (ff: FFmpeg) => Promise<T>): Promise<T> {
  const run = lock.then(async () => fn(await getEngine()));
  lock = run.catch(() => undefined);
  return run;
}

/**
 * Expose the file to FFmpeg's virtual filesystem. WORKERFS reads lazily from the File,
 * so a large input is not copied into WebAssembly memory. The user's filename is never used.
 */
export async function mountInput(ff: FFmpeg, file: File): Promise<{ path: string; cleanup: () => Promise<void> }> {
  const ext = (/\.([a-z0-9]{1,5})$/i.exec(file.name)?.[1] ?? 'bin').toLowerCase();
  const safe = new File([file], `input.${ext}`, { type: file.type });
  const dir = `/in${++mountSeq}`;
  try {
    await ff.createDir(dir);
    await ff.mount(FFFSType.WORKERFS, { files: [safe] }, dir);
    return {
      path: `${dir}/${safe.name}`,
      cleanup: async () => {
        await ff.unmount(dir).catch(() => {});
        await ff.deleteDir(dir).catch(() => {});
      },
    };
  } catch {
    const path = `/${safe.name}`;
    await ff.writeFile(path, new Uint8Array(await file.arrayBuffer()));
    return { path, cleanup: async () => void (await ff.deleteFile(path).catch(() => {})) };
  }
}

export function isMemoryError(text: string) {
  return /out of memory|cannot allocate memory|memory access out of bounds|out of bounds memory|cannot enlarge memory/i.test(text) || /\bOOM\b/.test(text);
}
