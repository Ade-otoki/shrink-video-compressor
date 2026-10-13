import type { JobProgress, JobStage, OutputFormat, ProcessingMode } from '../types';
import { Button, Card, Chip, Icon, ProgressBar, Spinner } from './ui';

const LOCAL_STEPS: { stage: JobStage[]; label: string }[] = [
  { stage: ['loading-engine'], label: 'Loading video engine' },
  { stage: ['inspecting'], label: 'Reading your file' },
  { stage: ['processing'], label: 'Encoding' },
  { stage: ['finalizing', 'validating'], label: 'Checking the result' },
];
const SERVER_STEPS: { stage: JobStage[]; label: string }[] = [
  { stage: ['queued'], label: 'Creating job' },
  { stage: ['uploading'], label: 'Uploading' },
  { stage: ['inspecting', 'processing'], label: 'Processing on server' },
  { stage: ['finalizing', 'validating'], label: 'Downloading and checking' },
];

export function ProcessingScreen({ progress, mode, format, onCancel }: { progress: JobProgress; mode: ProcessingMode; format: OutputFormat; onCancel: () => void }) {
  const steps = mode === 'local' ? LOCAL_STEPS : SERVER_STEPS;
  const activeIdx = Math.max(0, steps.findIndex((s) => s.stage.includes(progress.stage)));
  const active = steps[activeIdx];
  const pct = progress.ratio === null ? null : Math.round(progress.ratio * 100);

  return (
    <div className="enter mx-auto w-full max-w-md">
      <Card className="p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <Chip tone={mode === 'local' ? 'good' : 'accent'}>
            <Icon name={mode === 'local' ? 'device' : 'cloud'} size={14} />
            {mode === 'local' ? 'On this device' : 'On server'}
          </Chip>
          <span className="text-xs text-muted">{format === 'mp4' ? 'MP4 · H.264' : 'Animated GIF'}</span>
        </div>

        <div className="mt-8" aria-live="polite">
          <p className="text-sm font-medium text-muted">{active.label}</p>
          {pct !== null ? (
            <p className="font-display glow-text-accent mt-1 text-7xl leading-none font-extrabold tracking-[-0.04em] tabular-nums">
              {pct}
              <span className="text-4xl text-muted">%</span>
            </p>
          ) : (
            <h1 className="font-display mt-1 text-4xl leading-tight font-bold tracking-[-0.03em]">
              {active.label}…
            </h1>
          )}
        </div>
        <div className="mt-6">
          <ProgressBar ratio={progress.ratio} label={active.label} />
        </div>
        <p className="mt-3 text-xs text-muted">
          {pct === null
            ? 'Progress for this step can’t be measured precisely.'
            : 'Keep this tab open. You can switch to other tabs while it works.'}
        </p>

        <ol className="mt-8 space-y-3 border-t border-border pt-6">
          {steps.map((s, i) => {
            const done = i < activeIdx;
            const current = i === activeIdx;
            return (
              <li key={s.label} className={`flex items-center gap-3 text-sm ${done || current ? 'text-ink' : 'text-muted'}`}>
                <span className={`grid size-5 place-items-center rounded-full ${done ? 'bg-good-soft text-good' : current ? 'text-accent' : 'border border-border-strong'}`}>
                  {done ? <Icon name="check" size={12} /> : current ? <Spinner className="size-4" /> : null}
                </span>
                {s.label}
              </li>
            );
          })}
        </ol>

        <Button variant="ghost" className="mt-6 w-full" onClick={onCancel}>
          Cancel
        </Button>
      </Card>
    </div>
  );
}
