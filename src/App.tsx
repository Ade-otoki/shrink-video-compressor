import { useCallback, useEffect, useRef, useState } from 'react';
import { ConfigureScreen } from './components/ConfigureScreen';
import { ConsentDialog } from './components/ConsentDialog';
import { ErrorScreen, type RecoveryAction } from './components/ErrorScreen';
import { ProcessingScreen } from './components/ProcessingScreen';
import { ResultsScreen } from './components/ResultsScreen';
import { UploadScreen } from './components/UploadScreen';
import { Icon, Logo } from './components/ui';
import { assessLocal, serverAvailable } from './lib/capability';
import { resetEngine } from './lib/engine';
import { GIF_DEFAULTS } from './lib/ffmpeg-args';
import { inspectBasic, precheck, probe } from './lib/inspect';
import { processLocally } from './lib/local-processor';
import { processOnServer } from './lib/server-processor';
import { AppError, type JobOutput, type JobProgress, type JobSettings, type MediaInfo, type ProcessingMode } from './types';

type View = 'upload' | 'configure' | 'processing' | 'results' | 'error';

interface Source {
  file: File;
  url: string;
  info: MediaInfo;
}

function defaultSettings(info?: MediaInfo): JobSettings {
  const dur = info?.duration ?? 5;
  return {
    format: 'mp4',
    mp4: { preset: 'balanced', keepAudio: true },
    gif: {
      start: 0,
      end: Math.min(dur, 6),
      width: info?.width ? Math.min(GIF_DEFAULTS.width, info.width) : GIF_DEFAULTS.width,
      fps: GIF_DEFAULTS.fps,
      loop: GIF_DEFAULTS.loop,
    },
  };
}

const toAppError = (e: unknown) => (e instanceof AppError ? e : new AppError('encode-failed', String(e)));

export default function App() {
  const [view, setView] = useState<View>('upload');
  const [source, setSource] = useState<Source | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [probing, setProbing] = useState(false);
  const [uploadError, setUploadError] = useState<AppError | null>(null);
  const [settings, setSettings] = useState<JobSettings>(defaultSettings());
  const [mode, setMode] = useState<ProcessingMode>('local');
  const [progress, setProgress] = useState<JobProgress>({ stage: 'queued', ratio: null });
  const [runMode, setRunMode] = useState<ProcessingMode>('local');
  const [output, setOutput] = useState<JobOutput | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [consentReason, setConsentReason] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const fileToken = useRef(0);

  // Release object URLs when they're replaced or the app unmounts.
  useEffect(() => () => void (source && URL.revokeObjectURL(source.url)), [source]);
  useEffect(() => () => void (output && URL.revokeObjectURL(output.url)), [output]);

  // Warn before closing the tab mid-job.
  useEffect(() => {
    if (view !== 'processing') return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [view]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    fileToken.current++;
    setSource(null);
    setOutput(null);
    setError(null);
    setUploadError(null);
    setNotice(null);
    setProbing(false);
    setInspecting(false);
    setMode('local');
    setView('upload');
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const token = ++fileToken.current;
    setUploadError(null);
    setNotice(null);
    setOutput(null);
    try {
      precheck(file);
    } catch (e) {
      setUploadError(toAppError(e));
      return;
    }
    setInspecting(true);
    const url = URL.createObjectURL(file);
    try {
      let info = await inspectBasic(file, url);
      if (token !== fileToken.current) return URL.revokeObjectURL(url);
      // If the browser can't read it at all, stream inspection must succeed before we continue.
      if (!info.browserPlayable) info = await probe(file, info);
      if (token !== fileToken.current) return URL.revokeObjectURL(url);
      setSource({ file, url, info });
      setSettings(defaultSettings(info));
      setMode('local');
      setView('configure');
      setInspecting(false);

      if (!info.probed) {
        // Enrich with codecs / audio in the background; the browser already gave us the basics.
        setProbing(true);
        probe(file, info)
          .then((full) => {
            if (token !== fileToken.current) return;
            setSource((s) => (s && s.file === file ? { ...s, info: full } : s));
            setSettings((s) => ({ ...s, mp4: { ...s.mp4, keepAudio: full.hasAudio !== false } }));
          })
          .catch(() => {
            /* non-fatal: browser metadata is enough to proceed */
          })
          .finally(() => token === fileToken.current && setProbing(false));
      }
    } catch (e) {
      URL.revokeObjectURL(url);
      if (token !== fileToken.current) return;
      setInspecting(false);
      setUploadError(toAppError(e));
    }
  }, []);

  const run = useCallback(
    async (m: ProcessingMode) => {
      if (!source) return;
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setOutput(null);
      setError(null);
      setNotice(null);
      setRunMode(m);
      setProgress({ stage: m === 'local' ? 'loading-engine' : 'queued', ratio: null });
      setView('processing');
      const process = m === 'local' ? processLocally : processOnServer;
      try {
        const out = await process(source.file, source.info, settings, setProgress, ac.signal);
        if (ac.signal.aborted) return URL.revokeObjectURL(out.url);
        setOutput(out);
        setView('results');
      } catch (e) {
        const err = toAppError(e);
        if (ac.signal.aborted || err.code === 'cancelled') {
          setNotice('Processing cancelled. Your settings are kept.');
          setView((v) => (v === 'processing' ? 'configure' : v));
          return;
        }
        setError(err);
        setView('error');
      }
    },
    [source, settings],
  );

  /** Every server run goes through this; it only opens the consent dialog. */
  const requestServer = useCallback(
    (reason: string) => setConsentReason(reason),
    [],
  );

  const start = useCallback(() => {
    if (!source) return;
    const local = assessLocal(source.info, settings.format);
    if (mode === 'server' && serverAvailable) {
      return requestServer('You chose to process this video on our servers.');
    }
    if (!local.ok && serverAvailable) {
      return requestServer(`${local.reason} Processing on our servers avoids this limit.`);
    }
    void run('local');
  }, [source, settings.format, mode, run, requestServer]);

  const cancel = () => {
    abortRef.current?.abort();
    resetEngine();
  };

  const recoveryActions = (): RecoveryAction[] => {
    if (!error) return [];
    const acts: RecoveryAction[] = [];
    const retry = () => (runMode === 'server' ? requestServer('Retrying needs a fresh upload.') : void run('local'));
    switch (error.code) {
      case 'memory':
        if (serverAvailable) acts.push({ label: 'Process on server instead…', onClick: () => requestServer('This video ran out of memory in your browser.'), primary: true });
        acts.push({ label: 'Adjust settings', onClick: () => setView('configure'), primary: !serverAvailable });
        break;
      case 'server-unavailable':
        acts.push({ label: 'Try on this device', onClick: () => (setMode('local'), void run('local')), primary: true });
        acts.push({ label: 'Back to settings', onClick: () => setView('configure') });
        break;
      case 'engine-load-failed':
      case 'encode-failed':
      case 'validation-failed':
      case 'interrupted':
      case 'server-failed':
      case 'expired':
      case 'download-failed':
        acts.push({ label: runMode === 'server' ? 'Try again (asks before uploading)' : 'Try again', onClick: retry, primary: true });
        acts.push({ label: 'Adjust settings', onClick: () => setView('configure') });
        break;
      default:
        break;
    }
    acts.push({ label: 'Choose a different video', onClick: reset });
    return acts;
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="atmosphere" aria-hidden="true" />
      <header className="sticky top-0 z-10 border-b border-white/5 bg-bg/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <button onClick={view === 'processing' ? undefined : reset} aria-label="Shrink — start over" className="rounded-lg">
            <Logo />
          </button>
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Icon name="lock" size={14} /> <span className="hidden sm:inline">Private by default ·</span> No account needed
          </span>
        </div>
      </header>

      <main key={view} className="flex flex-1 items-start px-4 py-10 sm:px-6 sm:py-16">
        {view === 'upload' && <UploadScreen onFile={handleFile} busy={inspecting} error={uploadError} />}
        {view === 'configure' && source && (
          <ConfigureScreen
            fileName={source.file.name}
            sourceUrl={source.url}
            info={source.info}
            probing={probing}
            settings={settings}
            onSettings={setSettings}
            mode={mode}
            onMode={setMode}
            onStart={start}
            onReset={reset}
            notice={notice}
          />
        )}
        {view === 'processing' && <ProcessingScreen progress={progress} mode={runMode} format={settings.format} onCancel={cancel} />}
        {view === 'results' && output && source && (
          <ResultsScreen output={output} originalSize={source.file.size} mode={runMode} onAdjust={() => setView('configure')} onStartOver={reset} />
        )}
        {view === 'error' && error && <ErrorScreen error={error} actions={recoveryActions()} fileName={source?.file.name} />}
      </main>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-6 text-xs text-muted sm:px-6">
        Compression always trades some detail for size — we show real results so you can decide. Server uploads (when available) need your confirmation each time and are deleted within 24 hours.
      </footer>

      {source && (
        <ConsentDialog
          open={consentReason !== null}
          reason={consentReason ?? ''}
          fileSize={source.file.size}
          onAccept={() => {
            setConsentReason(null);
            void run('server');
          }}
          onCancel={() => {
            // Declining never uploads or silently falls back.
            setConsentReason(null);
            if (view !== 'configure') setView('configure');
          }}
        />
      )}
    </div>
  );
}
