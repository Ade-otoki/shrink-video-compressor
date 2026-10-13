import { useRef, useState, type DragEvent } from 'react';
import { ERROR_COPY } from '../lib/errors';
import type { AppError } from '../types';
import { Button, Icon, Notice, Spinner } from './ui';

export function UploadScreen({ onFile, busy, error }: { onFile: (f: File) => void; busy: boolean; error: AppError | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && !busy) onFile(f);
  };

  return (
    <div className="enter-stagger mx-auto w-full max-w-2xl text-center">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent ring-1 ring-inset ring-accent/20">
          <Icon name="lock" size={12} /> Runs privately in your browser
        </span>
        <h1 className="font-display mt-5 text-[40px] leading-[1.02] font-extrabold tracking-[-0.03em] text-balance sm:text-6xl">
          Smaller videos.<br />
          <span className="text-muted">Quality you can trust.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-md text-[15px] text-muted text-pretty">
          Compress to MP4 or turn a clip into a GIF. No account, no upload unless you say so.
        </p>
      </div>

      <div
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
        className={`group card-elev relative mt-10 flex min-h-72 flex-col items-center justify-center overflow-hidden rounded-[24px] border border-dashed px-6 py-12 transition-[border-color,background-color] duration-200 ${
          over ? 'border-accent bg-accent-soft' : 'border-border-strong bg-surface/80'
        }`}
      >
        <div aria-hidden="true" className={`pointer-events-none absolute -top-24 left-1/2 h-48 w-80 -translate-x-1/2 rounded-full bg-accent/25 blur-3xl transition-opacity duration-300 ${over ? 'opacity-100' : 'opacity-40'}`} />
        {busy ? (
          <div className="relative">
            <Spinner className="size-6 text-accent" />
            <p className="mt-4 font-medium">Inspecting your video…</p>
            <p className="mt-1 text-sm text-muted">Checking format, duration and dimensions.</p>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            <span className={`glow-accent grid size-14 place-items-center rounded-2xl bg-accent text-accent-ink transition-transform duration-200 ease-[var(--ease-out)] ${over ? '-translate-y-1 scale-105' : ''}`}>
              <Icon name="upload" size={24} />
            </span>
            <p className="mt-5 text-[17px] font-semibold">{over ? 'Drop to start' : 'Drop a video here'}</p>
            <p className="mt-1 text-sm text-muted">MP4, MOV, WebM, MKV or AVI · up to 500 MB</p>
            <Button className="mt-6" variant="secondary" onClick={() => input.current?.click()}>
              Browse files
            </Button>
          </div>
        )}
        <input
          ref={input}
          type="file"
          accept="video/*,.mkv,.mov,.avi,.webm,.mp4,.m4v,.ts,.flv,.wmv"
          className="sr-only"
          aria-label="Choose a video file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (f) onFile(f);
          }}
        />
      </div>

      {error && (
        <div className="mt-4 text-left" role="alert">
          <Notice tone="bad" icon="alert" title={ERROR_COPY[error.code].title}>
            {ERROR_COPY[error.code].body}
          </Notice>
        </div>
      )}

      <div className="mt-10 grid gap-6 text-left sm:grid-cols-3">
        {[
          { icon: 'lock', title: 'Stays on your device', body: 'Videos are processed in your browser whenever possible.' },
          { icon: 'shield', title: 'Never uploaded silently', body: 'If a server is needed, we ask first — every time.' },
          { icon: 'check', title: 'Checked before download', body: 'Every result is verified and real sizes are shown.' },
        ].map((f) => (
          <div key={f.title}>
            <div className="flex items-center gap-2 text-sm font-medium">
              <Icon name={f.icon as 'lock'} size={16} className="text-accent" />
              {f.title}
            </div>
            <p className="mt-1 text-sm text-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
