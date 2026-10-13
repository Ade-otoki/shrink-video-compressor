import type { GifSettings, MediaInfo, Mp4Preset, Mp4Settings } from '../types';

// Initial H.264 CRF starting points (PRD §5.2). Lower CRF = higher quality, larger file.
export const MP4_PRESETS: Record<Mp4Preset, { crf: number; label: string; description: string }> = {
  smaller: { crf: 28, label: 'Smaller file', description: 'Prioritises size. Some detail loss may be visible.' },
  balanced: { crf: 23, label: 'Balanced', description: 'Good quality at a sensible size. Recommended.' },
  best: { crf: 18, label: 'Best quality', description: 'Keeps more detail. Usually a larger file.' },
};

export const GIF_MAX_SECONDS = 15;
export const GIF_FPS_OPTIONS = [8, 10, 12, 15, 20] as const;
export const GIF_WIDTH_OPTIONS = [240, 320, 480, 640, 800] as const;
export const GIF_DEFAULTS = { width: 480, fps: 12, loop: true } as const;

const AUDIO_BITRATE = '128k';

/** Build MP4 args from validated settings only — no user strings reach FFmpeg besides fixed paths. */
export function buildMp4Args(input: string, output: string, s: Mp4Settings, info: Pick<MediaInfo, 'hasAudio'>): string[] {
  const preset = MP4_PRESETS[s.preset];
  if (!preset) throw new Error(`Unknown preset: ${s.preset}`);
  const withAudio = s.keepAudio && info.hasAudio !== false;
  return [
    '-hide_banner',
    '-i', input,
    '-map', '0:v:0',
    ...(withAudio ? ['-map', '0:a:0?'] : []),
    // Keep source resolution and aspect; H.264 4:2:0 needs even dimensions.
    // FFmpeg auto-rotates by default, so orientation is baked into the output.
    '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', String(preset.crf),
    '-pix_fmt', 'yuv420p',
    ...(withAudio ? ['-c:a', 'aac', '-b:a', AUDIO_BITRATE] : ['-an']),
    '-movflags', '+faststart',
    output,
  ];
}

export function clampGif(s: GifSettings, info: Pick<MediaInfo, 'duration' | 'width'>): GifSettings {
  const dur = info.duration && Number.isFinite(info.duration) ? info.duration : GIF_MAX_SECONDS;
  const start = clamp(round1(s.start), 0, Math.max(0, dur - 0.1));
  let end = clamp(round1(s.end), start + 0.1, dur);
  if (end - start > GIF_MAX_SECONDS) end = start + GIF_MAX_SECONDS;
  const maxW = info.width ? Math.min(info.width, 1280) : 1280;
  const width = Math.round(clamp(s.width, 64, Math.max(64, maxW)) / 2) * 2;
  const fps = clamp(Math.round(s.fps), 1, 30);
  return { start, end: round1(end), width, fps, loop: !!s.loop };
}

export function buildGifArgs(input: string, output: string, raw: GifSettings, info: Pick<MediaInfo, 'duration' | 'width'>): string[] {
  const s = clampGif(raw, info);
  const filter =
    `fps=${s.fps},scale=${s.width}:-2:flags=lanczos,split[a][b];` +
    `[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
  return [
    '-hide_banner',
    '-ss', s.start.toFixed(2),
    '-t', (s.end - s.start).toFixed(2),
    '-i', input,
    '-filter_complex', filter,
    '-an',
    '-loop', s.loop ? '0' : '-1',
    output,
  ];
}

/** Parse "time=00:00:03.20" from an FFmpeg progress log line. */
export function parseLogTime(line: string): number | null {
  const m = /time=\s*(-?\d+):(\d+):(\d+(?:\.\d+)?)/.exec(line);
  if (!m) return null;
  const t = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
  return t >= 0 ? t : null;
}

/** Extract stream information from `ffmpeg -i` output. */
export function parseProbe(log: string): Partial<MediaInfo> & { hasVideo: boolean; invalid: boolean } {
  const out: Partial<MediaInfo> & { hasVideo: boolean; invalid: boolean } = {
    hasVideo: false,
    invalid: /Invalid data found|moov atom not found|could not find codec parameters|EBML header parsing failed/i.test(log),
  };
  const dur = /Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/.exec(log);
  if (dur) out.duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
  const v = /Stream #\d+:\d+[^\n]*?: Video: (\w+)[^\n]*?, (\d{2,5})x(\d{2,5})/.exec(log);
  if (v) {
    out.hasVideo = true;
    out.videoCodec = v[1];
    out.width = Number(v[2]);
    out.height = Number(v[3]);
  }
  const fps = /, (\d+(?:\.\d+)?) fps/.exec(log);
  if (fps) out.fps = Number(fps[1]);
  const a = /Stream #\d+:\d+[^\n]*?: Audio: (\w+)/.exec(log);
  out.hasAudio = !!a;
  if (a) out.audioCodec = a[1];
  const rot = /rotation of (-?\d+(?:\.\d+)?) degrees/.exec(log) ?? /rotate\s*:\s*(-?\d+)/.exec(log);
  if (rot) out.rotation = Math.round(Number(rot[1]));
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
function round1(v: number) {
  return Math.round(v * 10) / 10;
}
