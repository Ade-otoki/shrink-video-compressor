import { AppError, type ProcessFn } from '../types';
import { isMemoryError, mountInput, resetEngine, withEngine } from './engine';
import { buildGifArgs, buildMp4Args, clampGif, parseLogTime } from './ffmpeg-args';
import { outputFilename } from './format';
import { validateOutput } from './validate';

export const processLocally: ProcessFn = async (file, info, settings, onProgress, signal) => {
  const isGif = settings.format === 'gif';
  const gif = clampGif(settings.gif, info);
  const expected = isGif ? gif.end - gif.start : info.duration;
  const outName = isGif ? 'output.gif' : 'output.mp4';

  // Cancelling terminates the worker, which rejects the running exec and frees memory.
  const onAbort = () => resetEngine();
  signal.addEventListener('abort', onAbort, { once: true });
  const tail: string[] = [];

  try {
    onProgress({ stage: 'loading-engine', ratio: null });
    const data = await withEngine(async (ff) => {
      if (signal.aborted) throw new AppError('cancelled');
      onProgress({ stage: 'inspecting', ratio: null });
      const input = await mountInput(ff, file);
      const args = isGif
        ? buildGifArgs(input.path, outName, gif, info)
        : buildMp4Args(input.path, outName, settings.mp4, info);

      const onLog = ({ message }: { message: string }) => {
        tail.push(message);
        if (tail.length > 60) tail.shift();
        const t = parseLogTime(message);
        if (t !== null && expected && expected > 0) {
          onProgress({ stage: 'processing', ratio: Math.min(t / expected, 0.99) });
        }
      };
      ff.on('log', onLog);
      onProgress({ stage: 'processing', ratio: expected ? 0 : null });
      let code: number;
      try {
        code = await ff.exec(args);
      } finally {
        ff.off('log', onLog);
        await input.cleanup().catch(() => {});
      }
      if (signal.aborted) throw new AppError('cancelled');
      if (code !== 0) {
        await ff.deleteFile(outName).catch(() => {});
        const log = tail.join('\n');
        throw new AppError(isMemoryError(log) ? 'memory' : 'encode-failed', log.slice(-400));
      }
      onProgress({ stage: 'finalizing', ratio: null });
      const out = (await ff.readFile(outName)) as Uint8Array;
      await ff.deleteFile(outName).catch(() => {});
      return out;
    });

    onProgress({ stage: 'validating', ratio: null });
    const blob = new Blob([data as BlobPart], { type: isGif ? 'image/gif' : 'video/mp4' });
    const meta = await validateOutput(blob, settings.format, expected);
    onProgress({ stage: 'completed', ratio: 1 });
    return {
      blob,
      url: URL.createObjectURL(blob),
      filename: outputFilename(file.name, settings.format),
      format: settings.format,
      size: blob.size,
      ...meta,
    };
  } catch (e) {
    if (signal.aborted) throw new AppError('cancelled');
    if (e instanceof AppError) {
      if (e.code === 'memory' || e.code === 'encode-failed') resetEngine();
      throw e;
    }
    resetEngine(); // a crashed WebAssembly instance is unusable
    throw new AppError(isMemoryError(String(e)) ? 'memory' : 'encode-failed', String(e));
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};
