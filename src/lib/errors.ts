import type { ErrorCode } from '../types';

export interface ErrorCopy {
  title: string;
  body: string;
  /** Is the user's original file still selected and reusable? */
  originalKept: boolean;
}

export const ERROR_COPY: Record<ErrorCode, ErrorCopy> = {
  empty: { title: 'This file is empty', body: 'The file has no content. Check it opens on your device, then choose it again.', originalKept: false },
  'too-large': { title: 'This file is over 500 MB', body: 'Trim or split the video in another app first, or choose a smaller file.', originalKept: false },
  unsupported: { title: 'We can’t read this file type', body: 'Try MP4, MOV, WebM, MKV or AVI. If it plays elsewhere, export it to MP4 and try again.', originalKept: false },
  corrupt: { title: 'This video looks damaged', body: 'The file couldn’t be decoded. It may be incomplete — try downloading or exporting it again.', originalKept: false },
  'no-video': { title: 'No video track found', body: 'This file doesn’t contain a video stream. Audio-only files aren’t supported.', originalKept: false },
  memory: { title: 'Your browser ran out of memory', body: 'This video is too demanding to process on this device. Try the Smaller file preset, a shorter GIF clip, closing other tabs, or server processing.', originalKept: true },
  'engine-load-failed': { title: 'The video engine didn’t load', body: 'Check your connection and try again. Some privacy extensions block WebAssembly.', originalKept: true },
  'encode-failed': { title: 'Encoding failed', body: 'Something went wrong while compressing. Try again, or pick a different preset.', originalKept: true },
  'validation-failed': { title: 'The result didn’t pass checks', body: 'We made a file but it didn’t play back correctly, so we didn’t offer it for download. Try again or change settings.', originalKept: true },
  'server-unavailable': { title: 'Server processing isn’t available', body: 'We couldn’t reach the processing service. Nothing was uploaded. You can try on this device instead.', originalKept: true },
  'server-failed': { title: 'Server processing failed', body: 'The server couldn’t finish this job. Uploaded files are deleted automatically. You can retry — we’ll ask before uploading again.', originalKept: true },
  interrupted: { title: 'The job was interrupted', body: 'The connection dropped before finishing. Your original file is still here — try again.', originalKept: true },
  expired: { title: 'This job expired', body: 'Server results are deleted after the retention period. Process the video again to get a new copy.', originalKept: true },
  'download-failed': { title: 'Download failed', body: 'The file couldn’t be saved. Check storage space and try again.', originalKept: true },
  cancelled: { title: 'Cancelled', body: 'Processing stopped.', originalKept: true },
};
