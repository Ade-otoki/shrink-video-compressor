import { AppError, type MediaInfo } from '../types';
import { MAX_INPUT_BYTES } from './format';
import { isMemoryError, mountInput, withEngine } from './engine';
import { parseProbe } from './ffmpeg-args';

/** Cheap checks that run before anything is read into memory. */
export function precheck(file: File) {
  if (file.size === 0) throw new AppError('empty');
  if (file.size > MAX_INPUT_BYTES) throw new AppError('too-large');
}

/** Identify the container from magic bytes rather than trusting extension or MIME type. */
export async function sniffContainer(file: File): Promise<string | null> {
  const b = new Uint8Array(await file.slice(0, 512).arrayBuffer());
  const ascii = (o: number, n: number) => String.fromCharCode(...b.slice(o, o + n));
  if (ascii(4, 4) === 'ftyp') {
    const brand = ascii(8, 4);
    return brand.startsWith('qt') ? 'MOV' : 'MP4';
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return 'WebM/MKV';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'AVI ') return 'AVI';
  if (ascii(0, 3) === 'FLV') return 'FLV';
  if (ascii(0, 4) === 'OggS') return 'Ogg';
  if (b[0] === 0x47 && (b.length < 189 || b[188] === 0x47)) return 'MPEG-TS';
  if (b[0] === 0 && b[1] === 0 && b[2] === 1 && b[3] === 0xba) return 'MPEG-PS';
  if (ascii(0, 4) === '0&²u') return 'WMV';
  if (ascii(4, 4) === 'moov' || ascii(4, 4) === 'mdat' || ascii(4, 4) === 'wide') return 'MOV';
  return null;
}

/** Fast metadata via the browser's own decoder. Resolves null if the browser can't read it. */
export function browserMetadata(url: string): Promise<{ duration: number; width: number; height: number } | null> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.muted = true;
    const done = (r: { duration: number; width: number; height: number } | null) => {
      clearTimeout(timer);
      v.removeAttribute('src');
      v.load();
      resolve(r);
    };
    const timer = setTimeout(() => done(null), 8000);
    v.onloadedmetadata = () =>
      done(v.videoWidth > 0 ? { duration: v.duration, width: v.videoWidth, height: v.videoHeight } : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}

export async function inspectBasic(file: File, url: string): Promise<MediaInfo> {
  precheck(file);
  const container = await sniffContainer(file);
  if (!container) throw new AppError('unsupported');
  const meta = await browserMetadata(url);
  return {
    size: file.size,
    container,
    duration: meta && Number.isFinite(meta.duration) ? meta.duration : null,
    width: meta?.width ?? null,
    height: meta?.height ?? null,
    hasAudio: null,
    browserPlayable: !!meta,
    probed: false,
  };
}

/** Stream-level inspection with FFmpeg: codecs, audio presence, rotation. */
export async function probe(file: File, base: MediaInfo): Promise<MediaInfo> {
  const log = await withEngine(async (ff) => {
    const lines: string[] = [];
    const onLog = ({ message }: { message: string }) => lines.push(message);
    ff.on('log', onLog);
    const input = await mountInput(ff, file);
    try {
      await ff.exec(['-hide_banner', '-i', input.path]); // exits non-zero without an output; logs are what we want
    } finally {
      ff.off('log', onLog);
      await input.cleanup();
    }
    return lines.join('\n');
  });
  const p = parseProbe(log);
  if (isMemoryError(log)) throw new AppError('memory');
  if (!p.hasVideo) throw new AppError(p.invalid ? 'corrupt' : 'no-video');
  return {
    ...base,
    duration: base.duration ?? p.duration ?? null,
    width: base.width ?? p.width ?? null,
    height: base.height ?? p.height ?? null,
    hasAudio: p.hasAudio ?? null,
    videoCodec: p.videoCodec,
    audioCodec: p.audioCodec,
    fps: p.fps,
    rotation: p.rotation,
    probed: true,
  };
}
