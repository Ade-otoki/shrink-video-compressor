export const MAX_INPUT_BYTES = 500 * 1024 * 1024;

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return '—';
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  if (m === 0) return `${rest.toFixed(1)}s`;
  return `${m}:${Math.floor(rest).toString().padStart(2, '0')}`;
}

/** Never trust user-provided filenames: strip path parts, extension and unsafe characters. */
export function safeBaseName(name: string): string {
  const leaf = name.split(/[\\/]/).pop() ?? '';
  const noExt = leaf.replace(/\.[^.]*$/, '');
  const cleaned = noExt
    .normalize('NFKD')
    .replace(/[^\w\- ]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 80);
  return cleaned || 'video';
}

export function outputFilename(sourceName: string, format: 'mp4' | 'gif'): string {
  const base = safeBaseName(sourceName);
  return format === 'mp4' ? `${base}-compressed.mp4` : `${base}.gif`;
}

export function savings(input: number, output: number) {
  const saved = input - output;
  const pct = input > 0 ? (saved / input) * 100 : 0;
  return { saved, pct, larger: output > input };
}
