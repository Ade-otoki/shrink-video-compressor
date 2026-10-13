import { useState } from 'react';
import { formatBytes, formatDuration, savings } from '../lib/format';
import type { JobOutput, ProcessingMode } from '../types';
import { Button, Card, Chip, Icon, Notice } from './ui';

interface Props {
  output: JobOutput;
  originalSize: number;
  mode: ProcessingMode;
  onAdjust: () => void;
  onStartOver: () => void;
}

export function ResultsScreen({ output, originalSize, mode, onAdjust, onStartOver }: Props) {
  const s = savings(originalSize, output.size);
  const [dlError, setDlError] = useState(false);

  const download = () => {
    setDlError(false);
    try {
      const a = document.createElement('a');
      a.href = output.url;
      a.download = output.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      setDlError(true);
    }
  };

  return (
    <div className="enter-stagger mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <Card className="min-w-0 overflow-hidden">
        <div className="grid aspect-video place-items-center bg-black/60">
          {output.format === 'gif' ? (
            <img src={output.url} alt="Preview of the exported GIF" className="h-full w-full object-contain" />
          ) : (
            <video src={output.url} controls playsInline className="h-full w-full object-contain" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 p-4">
          <span className="mr-auto truncate text-sm font-medium" title={output.filename}>{output.filename}</span>
          {output.width && <Chip>{output.width} × {output.height}</Chip>}
          {output.duration && Number.isFinite(output.duration) && <Chip>{formatDuration(output.duration)}</Chip>}
          <Chip tone="good"><Icon name="check" size={12} /> Verified</Chip>
        </div>
      </Card>

      <Card className="flex flex-col p-6 sm:p-7">
        <p className="flex items-center gap-2 text-sm font-medium text-muted">
          <span className={`grid size-5 place-items-center rounded-full ${s.larger ? 'bg-warn-soft text-warn' : 'bg-good-soft text-good'}`}>
            <Icon name={s.larger ? 'alert' : 'check'} size={12} />
          </span>
          {s.larger ? 'Done, but the file got bigger' : output.format === 'gif' ? 'Your GIF is ready' : 'Your video is ready'}
        </p>

        <div className="mt-6">
          <p
            className={`font-display text-[88px] leading-[0.9] font-extrabold tracking-[-0.05em] tabular-nums ${s.larger ? 'text-warn' : 'glow-text-good text-good'}`}
          >
            {s.larger ? '+' : '−'}
            {Math.abs(s.pct).toFixed(0)}
            <span className="text-5xl">%</span>
          </p>
          <p className="mt-2 text-sm text-muted">
            {s.larger ? `larger than the original, +${formatBytes(-s.saved)}` : `smaller than the original, ${formatBytes(s.saved)} saved`}
          </p>
        </div>

        <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border">
          <SizeStat label="Original" bytes={originalSize} />
          <SizeStat label="Output" bytes={output.size} highlight />
        </dl>

        {s.larger && (
          <div className="mt-5">
            <Notice tone="warn" icon="info" title={`${formatBytes(-s.saved)} larger (+${Math.abs(s.pct).toFixed(0)}%)`}>
              {output.format === 'gif'
                ? 'GIFs store every frame as an image, so they’re often larger than video. Try a smaller width, lower frame rate or shorter clip.'
                : 'The original was already efficiently compressed. Try the Smaller file preset, or keep your original.'}
            </Notice>
          </div>
        )}

        {dlError && (
          <div className="mt-4" role="alert">
            <Notice tone="bad" icon="alert" title="Download didn’t start">Check your browser’s download permissions and storage, then try again.</Notice>
          </div>
        )}

        <div className="mt-auto space-y-2 pt-8">
          <Button size="lg" className="w-full" onClick={download}>
            <Icon name="download" /> Download {output.format.toUpperCase()}
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onAdjust}>
              <Icon name="sliders" size={16} /> Adjust settings
            </Button>
            <Button variant="ghost" onClick={onStartOver}>New video</Button>
          </div>
          <p className="pt-2 text-center text-xs text-muted">
            {mode === 'local' ? 'Made on this device. Nothing was uploaded.' : 'Server copies are deleted automatically.'}
          </p>
        </div>
      </Card>
    </div>
  );
}

function SizeStat({ label, bytes, highlight }: { label: string; bytes: number; highlight?: boolean }) {
  return (
    <div className="bg-surface-2 p-4">
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`font-display mt-1 text-2xl font-bold tracking-tight tabular-nums ${highlight ? 'text-ink' : 'text-muted'}`}>{formatBytes(bytes)}</dd>
    </div>
  );
}
