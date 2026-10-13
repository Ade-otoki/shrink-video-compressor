import { AppError, type OutputFormat } from '../types';

export interface ValidatedMeta {
  width?: number;
  height?: number;
  duration?: number;
}

/** Confirm the output is a real, decodable file before it is offered for download. */
export async function validateOutput(blob: Blob, format: OutputFormat, expectedDuration: number | null): Promise<ValidatedMeta> {
  if (blob.size === 0) throw new AppError('validation-failed', 'Output is empty.');
  const head = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const ascii = (o: number, n: number) => String.fromCharCode(...head.slice(o, o + n));
  return format === 'gif' ? validateGif(blob, ascii(0, 6)) : validateMp4(blob, ascii(4, 4), expectedDuration);
}

async function validateGif(blob: Blob, sig: string): Promise<ValidatedMeta> {
  if (sig !== 'GIF89a' && sig !== 'GIF87a') throw new AppError('validation-failed', 'Not a GIF.');
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    if (!img.naturalWidth) throw new Error('no frames');
    return { width: img.naturalWidth, height: img.naturalHeight };
  } catch {
    throw new AppError('validation-failed', 'GIF could not be decoded.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function validateMp4(blob: Blob, box: string, expected: number | null): Promise<ValidatedMeta> {
  if (box !== 'ftyp') throw new AppError('validation-failed', 'Not an MP4 container.');
  const url = URL.createObjectURL(blob);
  try {
    const meta = await new Promise<ValidatedMeta>((resolve, reject) => {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.muted = true;
      const t = setTimeout(() => reject(new Error('timeout')), 10000);
      v.onloadedmetadata = () => {
        clearTimeout(t);
        resolve({ width: v.videoWidth, height: v.videoHeight, duration: v.duration });
      };
      v.onerror = () => {
        clearTimeout(t);
        reject(new Error('decode'));
      };
      v.src = url;
    });
    if (!meta.width) throw new AppError('validation-failed', 'No video frames in output.');
    if (expected && Number.isFinite(expected) && meta.duration && Number.isFinite(meta.duration)) {
      const tolerance = Math.max(0.6, expected * 0.05);
      if (Math.abs(meta.duration - expected) > tolerance) {
        throw new AppError('validation-failed', `Duration mismatch (${meta.duration.toFixed(1)}s vs ${expected.toFixed(1)}s).`);
      }
    }
    return meta;
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('validation-failed', 'Output could not be played back.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
