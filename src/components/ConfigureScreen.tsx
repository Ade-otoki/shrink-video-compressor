import { useEffect, useRef } from 'react';
import { assessLocal, serverAvailable } from '../lib/capability';
import { clampGif, GIF_FPS_OPTIONS, GIF_MAX_SECONDS, GIF_WIDTH_OPTIONS, MP4_PRESETS } from '../lib/ffmpeg-args';
import { formatBytes, formatDuration } from '../lib/format';
import type { JobSettings, MediaInfo, Mp4Preset, ProcessingMode } from '../types';
import { Button, Card, Chip, Icon, Notice, Spinner } from './ui';

interface Props {
  fileName: string;
  sourceUrl: string;
  info: MediaInfo;
  probing: boolean;
  settings: JobSettings;
  onSettings: (s: JobSettings) => void;
  mode: ProcessingMode;
  onMode: (m: ProcessingMode) => void;
  onStart: () => void;
  onReset: () => void;
  notice?: string | null;
}

export function ConfigureScreen({ fileName, sourceUrl, info, probing, settings, onSettings, mode, onMode, onStart, onReset, notice }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const local = assessLocal(info, settings.format);
  const needsServer = !local.ok || mode === 'server';
  const gif = clampGif(settings.gif, info);
  const duration = info.duration ?? 0;

  const setGif = (patch: Partial<JobSettings['gif']>) => onSettings({ ...settings, gif: clampGif({ ...settings.gif, ...patch }, info) });

  // Keep the preview on the GIF start frame while trimming.
  useEffect(() => {
    if (settings.format === 'gif' && video.current && info.browserPlayable) {
      video.current.pause();
      video.current.currentTime = gif.start;
    }
  }, [gif.start, settings.format, info.browserPlayable]);

  const playClip = () => {
    const v = video.current;
    if (!v) return;
    v.currentTime = gif.start;
    const stop = () => {
      if (v.currentTime >= gif.end) {
        v.pause();
        v.removeEventListener('timeupdate', stop);
      }
    };
    v.addEventListener('timeupdate', stop);
    void v.play();
  };

  return (
    <div className="enter-stagger mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      {/* Preview */}
      <section aria-label="Source video" className="min-w-0">
        <button onClick={onReset} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink">
          <Icon name="back" size={16} /> Choose a different file
        </button>
        <Card className="overflow-hidden">
          <div className="grid aspect-video place-items-center bg-black/60">
            {info.browserPlayable ? (
              <video ref={video} src={`${sourceUrl}#t=0.05`} preload="metadata" controls playsInline muted={settings.format === 'gif'} className="h-full w-full object-contain" />
            ) : (
              <div className="p-6 text-center text-sm text-white/70">
                <Icon name="film" size={28} className="mx-auto mb-2" />
                Preview isn’t available in this browser.
                <br />
                The file can still be processed.
              </div>
            )}
          </div>
          <div className="space-y-3 p-4">
            <p className="font-display truncate text-lg font-bold tracking-tight" title={fileName}>{fileName}</p>
            <div className="flex flex-wrap gap-2">
              <Chip>{formatBytes(info.size)}</Chip>
              <Chip>{formatDuration(info.duration)}</Chip>
              {info.width && info.height && <Chip>{info.width} × {info.height}</Chip>}
              <Chip>{info.container}</Chip>
              {info.videoCodec && <Chip>{info.videoCodec.toUpperCase()}</Chip>}
              {info.probed && <Chip>{info.hasAudio ? `Audio · ${info.audioCodec?.toUpperCase()}` : 'No audio'}</Chip>}
              {info.fps && <Chip>{Math.round(info.fps * 100) / 100} fps</Chip>}
              {info.rotation ? <Chip>Rotated {Math.abs(info.rotation)}°</Chip> : null}
              {probing && (
                <Chip>
                  <Spinner className="size-3" /> Inspecting streams
                </Chip>
              )}
            </div>
          </div>
        </Card>
      </section>

      {/* Settings */}
      <section aria-label="Export settings" className="lg:pt-8">
        <Card className="flex flex-col">
          <div className="space-y-6 p-5">
            <div>
              <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">Export as</h2>
              <div role="radiogroup" aria-label="Output format" className="mt-2 grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
                {(['mp4', 'gif'] as const).map((f) => (
                  <button
                    key={f}
                    role="radio"
                    aria-checked={settings.format === f}
                    onClick={() => onSettings({ ...settings, format: f })}
                    className={`pressable h-9 rounded-lg text-sm font-semibold ${settings.format === f ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                  >
                    {f === 'mp4' ? 'MP4 video' : 'GIF'}
                  </button>
                ))}
              </div>
            </div>

            {settings.format === 'mp4' ? (
              <fieldset>
                <legend className="text-xs font-semibold tracking-wider text-muted uppercase">Quality</legend>
                <div className="mt-2 space-y-2">
                  {(Object.keys(MP4_PRESETS) as Mp4Preset[]).map((p) => {
                    const on = settings.mp4.preset === p;
                    return (
                      <label
                        key={p}
                        className={`pressable flex cursor-pointer items-start gap-3 rounded-xl border p-3 has-focus-visible:ring-2 has-focus-visible:ring-accent ${on ? 'glow-accent border-accent/60 bg-accent-soft' : 'border-border bg-surface-2/50 hover:border-border-strong'}`}
                      >
                        <input
                          type="radio"
                          name="preset"
                          checked={on}
                          onChange={() => onSettings({ ...settings, mp4: { ...settings.mp4, preset: p } })}
                          className="sr-only"
                        />
                        <span className={`mt-0.5 grid size-4 place-items-center rounded-full border ${on ? 'border-accent bg-accent' : 'border-border-strong'}`}>
                          {on && <span className="size-1.5 rounded-full bg-accent-ink" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{MP4_PRESETS[p].label}</span>
                          <span className="block text-xs text-muted">{MP4_PRESETS[p].description}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ) : (
              <div className="space-y-5">
                <fieldset>
                  <div className="flex items-baseline justify-between">
                    <legend className="text-xs font-semibold tracking-wider text-muted uppercase">Clip</legend>
                    <span className={`text-xs tabular-nums ${gif.end - gif.start >= GIF_MAX_SECONDS ? 'text-warn' : 'text-muted'}`}>
                      {(gif.end - gif.start).toFixed(1)}s of {GIF_MAX_SECONDS}s max
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <RangeRow label="Start" value={gif.start} max={duration} onChange={(v) => {
                      const end = Math.max(gif.end, v + 0.1);
                      setGif({ start: v, end: end - v > GIF_MAX_SECONDS ? v + GIF_MAX_SECONDS : end });
                    }} />
                    <RangeRow label="End" value={gif.end} max={duration} onChange={(v) => {
                      const start = Math.min(gif.start, v - 0.1);
                      setGif({ end: v, start: v - start > GIF_MAX_SECONDS ? v - GIF_MAX_SECONDS : start });
                    }} />
                  </div>
                  {info.browserPlayable && (
                    <button onClick={playClip} className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
                      <Icon name="play" size={14} /> Preview clip
                    </button>
                  )}
                </fieldset>

                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="Width"
                    value={gif.width}
                    options={uniqueSorted([...GIF_WIDTH_OPTIONS.filter((w) => !info.width || w <= info.width), gif.width]).map((w) => ({ value: w, label: `${w}px` }))}
                    onChange={(w) => setGif({ width: w })}
                  />
                  <Select label="Frame rate" value={gif.fps} options={GIF_FPS_OPTIONS.map((f) => ({ value: f, label: `${f} fps` }))} onChange={(fps) => setGif({ fps })} />
                </div>

                <label className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Loop forever</span>
                  <Toggle checked={gif.loop} onChange={(loop) => setGif({ loop })} label="Loop forever" />
                </label>

                <Notice tone="info" icon="info">
                  GIFs have no sound and can be larger than the original video, especially at higher widths and frame rates.
                </Notice>
              </div>
            )}

            <details className="group">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium text-muted hover:text-ink">
                <Icon name="sliders" size={16} /> Advanced
                <Icon name="chevron" size={16} className="ml-auto transition group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-4">
                {settings.format === 'mp4' && (
                  <label className="flex items-center justify-between gap-3">
                    <span>
                      <span className="block text-sm font-medium">Keep audio</span>
                      <span className="block text-xs text-muted">
                        {info.hasAudio === false ? 'This video has no audio track.' : 'Re-encoded to AAC 128 kbps.'}
                      </span>
                    </span>
                    <Toggle
                      checked={settings.mp4.keepAudio && info.hasAudio !== false}
                      disabled={info.hasAudio === false}
                      onChange={(keepAudio) => onSettings({ ...settings, mp4: { ...settings.mp4, keepAudio } })}
                      label="Keep audio"
                    />
                  </label>
                )}
                <fieldset>
                  <legend className="text-sm font-medium">Where to process</legend>
                  <div className="mt-2 space-y-1.5">
                    <ModeOption icon="device" label="This device" hint="Recommended. Your video stays in your browser." checked={mode === 'local'} onChange={() => onMode('local')} />
                    <ModeOption
                      icon="cloud"
                      label="Server"
                      hint={serverAvailable ? 'Faster for large files. We’ll ask before uploading.' : 'Not available in this build.'}
                      checked={mode === 'server'}
                      disabled={!serverAvailable}
                      onChange={() => onMode('server')}
                    />
                  </div>
                </fieldset>
              </div>
            </details>
          </div>

          <div className="space-y-3 border-t border-border p-5">
            {notice && <Notice tone="info" icon="info">{notice}</Notice>}
            {mode === 'local' && local.ok && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Icon name="lock" size={14} /> Processed on this device. Your video isn’t uploaded.
              </p>
            )}
            {!local.ok && (
              <Notice tone="warn" icon="alert" title={serverAvailable ? 'Server processing recommended' : 'This may not work in your browser'}>
                {local.reason} {serverAvailable ? 'You’ll be asked before anything is uploaded.' : 'You can still try — if it fails, your original file stays here.'}
              </Notice>
            )}
            {mode === 'server' && local.ok && (
              <p className="flex items-center gap-2 text-xs text-muted">
                <Icon name="cloud" size={14} /> You’ll be asked to confirm before uploading.
              </p>
            )}
            <Button size="lg" className="w-full" onClick={onStart} disabled={!info.duration && !info.probed && probing}>
              {needsServer && serverAvailable ? 'Continue to server processing' : settings.format === 'mp4' ? 'Compress video' : 'Create GIF'}
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function RangeRow({ label, value, max, onChange }: { label: string; value: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="grid grid-cols-[44px_1fr_64px] items-center gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <input type="range" min={0} max={max} step={0.1} value={value} onChange={(e) => onChange(Number(e.target.value))} aria-label={`${label} time in seconds`} />
      <input
        type="number"
        min={0}
        max={max}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-8 w-full rounded-lg border border-border bg-surface px-2 text-right tabular-nums outline-none focus:border-accent"
        aria-label={`${label} (seconds)`}
      />
    </label>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: number; options: { value: number; label: string }[]; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`pressable relative h-6 w-10 shrink-0 rounded-full disabled:opacity-40 ${checked ? 'bg-accent' : 'bg-border-strong'}`}
    >
      <span className={`absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform duration-200 ease-[var(--ease-out)] ${checked ? 'translate-x-4' : ''}`} />
    </button>
  );
}

function ModeOption({ icon, label, hint, checked, disabled, onChange }: { icon: 'device' | 'cloud'; label: string; hint: string; checked: boolean; disabled?: boolean; onChange: () => void }) {
  return (
    <label className={`flex items-center gap-3 rounded-xl border p-3 has-focus-visible:ring-2 has-focus-visible:ring-accent ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${checked ? 'border-accent bg-accent-soft' : 'border-border'}`}>
      <input type="radio" name="mode" checked={checked} disabled={disabled} onChange={onChange} className="sr-only" />
      <Icon name={icon} size={18} className={checked ? 'text-accent' : 'text-muted'} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted">{hint}</span>
      </span>
    </label>
  );
}

function uniqueSorted(xs: number[]) {
  return [...new Set(xs)].sort((a, b) => a - b);
}
