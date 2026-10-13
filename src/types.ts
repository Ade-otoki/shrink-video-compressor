// Shared job, error and output contract used by both local and server processing.

export type OutputFormat = 'mp4' | 'gif';
export type Mp4Preset = 'smaller' | 'balanced' | 'best';
export type ProcessingMode = 'local' | 'server';

export interface Mp4Settings {
  preset: Mp4Preset;
  keepAudio: boolean;
}

export interface GifSettings {
  start: number;
  end: number;
  width: number;
  fps: number;
  loop: boolean;
}

export interface JobSettings {
  format: OutputFormat;
  mp4: Mp4Settings;
  gif: GifSettings;
}

export interface MediaInfo {
  size: number;
  container: string;
  duration: number | null;
  width: number | null;
  height: number | null;
  /** null = not yet known */
  hasAudio: boolean | null;
  videoCodec?: string;
  audioCodec?: string;
  fps?: number;
  rotation?: number;
  /** The browser can decode this file for preview. */
  browserPlayable: boolean;
  /** Stream-level inspection via FFmpeg has completed. */
  probed: boolean;
}

export type JobStage =
  | 'queued'
  | 'loading-engine'
  | 'uploading'
  | 'inspecting'
  | 'processing'
  | 'finalizing'
  | 'validating'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface JobProgress {
  stage: JobStage;
  /** 0..1 when measurable, null when it can't be measured reliably. */
  ratio: number | null;
}

export interface JobOutput {
  blob: Blob;
  url: string;
  filename: string;
  format: OutputFormat;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export type ErrorCode =
  | 'empty'
  | 'too-large'
  | 'unsupported'
  | 'corrupt'
  | 'no-video'
  | 'memory'
  | 'engine-load-failed'
  | 'encode-failed'
  | 'validation-failed'
  | 'server-unavailable'
  | 'server-failed'
  | 'interrupted'
  | 'expired'
  | 'download-failed'
  | 'cancelled';

export class AppError extends Error {
  readonly code: ErrorCode;
  constructor(code: ErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'AppError';
  }
}

export type ProcessFn = (
  file: File,
  info: MediaInfo,
  settings: JobSettings,
  onProgress: (p: JobProgress) => void,
  signal: AbortSignal,
) => Promise<JobOutput>;
