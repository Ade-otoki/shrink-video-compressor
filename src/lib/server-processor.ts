import { AppError, type JobStage, type ProcessFn } from '../types';
import { SERVER_API } from './capability';
import { clampGif, MP4_PRESETS } from './ffmpeg-args';
import { outputFilename } from './format';
import { validateOutput } from './validate';

// Client for the hybrid server path (PRD §8). Must only be called after the user
// has given explicit consent for this specific upload.

interface CreatedJob {
  id: string;
  token: string; // per-job capability; never logged
  uploadUrl: string;
}
interface JobStatus {
  state: JobStage;
  progress: number | null;
}

const POLL_MS = 1500;

export const processOnServer: ProcessFn = async (file, info, settings, onProgress, signal) => {
  if (!SERVER_API) throw new AppError('server-unavailable');
  const isGif = settings.format === 'gif';
  const gif = clampGif(settings.gif, info);
  let job: CreatedJob | null = null;
  const auth = () => ({ Authorization: `Bearer ${job!.token}` });

  const onAbort = () => {
    if (job) {
      // Idempotent cancel; fire-and-forget.
      void fetch(`${SERVER_API}/api/v1/jobs/${job.id}/cancel`, { method: 'POST', headers: auth() }).catch(() => {});
    }
  };
  signal.addEventListener('abort', onAbort, { once: true });

  try {
    onProgress({ stage: 'queued', ratio: null });
    const created = await request(`${SERVER_API}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        format: settings.format,
        size: file.size,
        mp4: isGif ? undefined : { crf: MP4_PRESETS[settings.mp4.preset].crf, keepAudio: settings.mp4.keepAudio },
        gif: isGif ? gif : undefined,
      }),
      signal,
    });
    job = (await created.json()) as CreatedJob;

    await upload(job.uploadUrl, file, signal, (r) => onProgress({ stage: 'uploading', ratio: r }));
    await request(`${SERVER_API}/api/v1/jobs/${job.id}/upload-complete`, { method: 'POST', headers: auth(), signal });

    for (;;) {
      await delay(POLL_MS, signal);
      const res = await request(`${SERVER_API}/api/v1/jobs/${job.id}`, { headers: auth(), signal });
      const status = (await res.json()) as JobStatus;
      if (status.state === 'completed') break;
      if (status.state === 'failed') throw new AppError('server-failed');
      if (status.state === 'expired') throw new AppError('expired');
      if (status.state === 'cancelled') throw new AppError('cancelled');
      onProgress({ stage: status.state, ratio: typeof status.progress === 'number' ? status.progress : null });
    }

    onProgress({ stage: 'finalizing', ratio: null });
    const dl = await request(`${SERVER_API}/api/v1/jobs/${job.id}/download`, { headers: auth(), signal });
    const { url } = (await dl.json()) as { url: string };
    const blobRes = await fetch(url, { signal });
    if (!blobRes.ok) throw new AppError('download-failed');
    const blob = await blobRes.blob();

    onProgress({ stage: 'validating', ratio: null });
    const meta = await validateOutput(blob, settings.format, isGif ? gif.end - gif.start : info.duration);
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
    if (e instanceof AppError) throw e;
    throw new AppError('interrupted', String(e));
  } finally {
    signal.removeEventListener('abort', onAbort);
  }
};

async function request(url: string, init: RequestInit) {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    if (init.signal?.aborted) throw e;
    throw new AppError('server-unavailable');
  }
  if (res.status === 404 || res.status >= 500) throw new AppError('server-unavailable');
  if (!res.ok) throw new AppError('server-failed', `HTTP ${res.status}`);
  return res;
}

function upload(url: string, file: File, signal: AbortSignal, onRatio: (r: number | null) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    xhr.upload.onprogress = (e) => onRatio(e.lengthComputable ? e.loaded / e.total : null);
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new AppError('server-failed', `Upload HTTP ${xhr.status}`)));
    xhr.onerror = () => reject(new AppError('interrupted'));
    signal.addEventListener('abort', () => xhr.abort(), { once: true });
    xhr.send(file);
  });
}

function delay(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), reject(new AppError('cancelled'))), { once: true });
  });
}
