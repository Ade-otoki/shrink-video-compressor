import { describe, expect, it } from 'vitest';
import { buildGifArgs, buildMp4Args, clampGif, parseLogTime, parseProbe } from './ffmpeg-args';
import { outputFilename, safeBaseName, savings } from './format';

describe('buildMp4Args', () => {
  it('maps presets to documented CRF values', () => {
    for (const [preset, crf] of [['smaller', '28'], ['balanced', '23'], ['best', '18']] as const) {
      const args = buildMp4Args('in', 'out.mp4', { preset, keepAudio: true }, { hasAudio: true });
      expect(args[args.indexOf('-crf') + 1]).toBe(crf);
    }
  });
  it('drops audio when requested or absent', () => {
    expect(buildMp4Args('in', 'o', { preset: 'balanced', keepAudio: false }, { hasAudio: true })).toContain('-an');
    expect(buildMp4Args('in', 'o', { preset: 'balanced', keepAudio: true }, { hasAudio: false })).toContain('-an');
    expect(buildMp4Args('in', 'o', { preset: 'balanced', keepAudio: true }, { hasAudio: null })).toContain('aac');
  });
});

describe('GIF', () => {
  const info = { duration: 60, width: 1920 };
  it('caps clip at 15 seconds', () => {
    const s = clampGif({ start: 10, end: 40, width: 480, fps: 12, loop: true }, info);
    expect(s.end - s.start).toBe(15);
  });
  it('never exceeds source width', () => {
    expect(clampGif({ start: 0, end: 3, width: 800, fps: 12, loop: true }, { duration: 5, width: 320 }).width).toBe(320);
  });
  it('honours loop setting', () => {
    const once = buildGifArgs('in', 'o.gif', { start: 0, end: 3, width: 480, fps: 12, loop: false }, info);
    expect(once[once.indexOf('-loop') + 1]).toBe('-1');
    expect(once[once.indexOf('-t') + 1]).toBe('3.00');
  });
});

describe('parsers', () => {
  it('reads progress time', () => {
    expect(parseLogTime('frame=  90 fps= 30 q=28.0 size=  256kB time=00:01:03.50 bitrate=')).toBeCloseTo(63.5);
    expect(parseLogTime('nothing')).toBeNull();
  });
  it('reads probe output', () => {
    const log = [
      '  Duration: 00:00:12.48, start: 0.000000, bitrate: 8000 kb/s',
      '  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709), 1920x1080 [SAR 1:1 DAR 16:9], 7800 kb/s, 29.97 fps',
      '      displaymatrix: rotation of -90.00 degrees',
      '  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706D), 48000 Hz, stereo',
    ].join('\n');
    const p = parseProbe(log);
    expect(p).toMatchObject({ hasVideo: true, width: 1920, height: 1080, videoCodec: 'h264', hasAudio: true, audioCodec: 'aac', rotation: -90, fps: 29.97 });
    expect(p.duration).toBeCloseTo(12.48);
  });
});

describe('format helpers', () => {
  it('sanitises filenames', () => {
    expect(safeBaseName('../../etc/My Holiday <clip>.final.MOV')).toBe('My-Holiday-clipfinal');
    expect(safeBaseName('....')).toBe('video');
    expect(outputFilename('a b.mov', 'mp4')).toBe('a-b-compressed.mp4');
  });
  it('reports larger outputs honestly', () => {
    expect(savings(100, 150)).toMatchObject({ saved: -50, larger: true });
  });
});
