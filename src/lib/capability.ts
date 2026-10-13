import type { MediaInfo, OutputFormat } from '../types';
import { formatBytes } from './format';

// Local-processing policy. Thresholds are starting points to be tuned by the M0 spike.
const DESKTOP_LOCAL_MAX = 350 * 1024 * 1024;
const MOBILE_LOCAL_MAX = 120 * 1024 * 1024;
const MAX_LOCAL_PIXELS = 3840 * 2160;

export const SERVER_API = (import.meta.env.VITE_API_BASE as string | undefined)?.replace(/\/$/, '') || '';
export const SERVER_REGION = (import.meta.env.VITE_SERVER_REGION as string | undefined) || 'our processing servers';
export const SERVER_RETENTION_HOURS = 24;
export const serverAvailable = SERVER_API.length > 0;

function isConstrainedDevice() {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return (mem !== undefined && mem <= 4) || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export interface LocalAssessment {
  ok: boolean;
  reason?: string;
}

export function assessLocal(info: MediaInfo, format: OutputFormat): LocalAssessment {
  if (typeof WebAssembly !== 'object' || typeof Worker === 'undefined') {
    return { ok: false, reason: 'This browser can’t run the in-browser video engine.' };
  }
  const constrained = isConstrainedDevice();
  const limit = constrained ? MOBILE_LOCAL_MAX : DESKTOP_LOCAL_MAX;
  // A GIF only decodes a short clip, so the size ceiling matters less.
  if (format === 'mp4' && info.size > limit) {
    return {
      ok: false,
      reason: `Files over ${formatBytes(limit)} are likely to run out of memory in ${constrained ? 'a mobile' : 'this'} browser.`,
    };
  }
  if (format === 'mp4' && info.width && info.height && info.width * info.height > MAX_LOCAL_PIXELS) {
    return { ok: false, reason: 'Video above 4K resolution is too demanding to encode in the browser.' };
  }
  return { ok: true };
}
