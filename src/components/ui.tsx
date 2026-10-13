import type { ButtonHTMLAttributes, ReactNode } from 'react';

const paths = {
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5" /><path d="M12 3v12" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5" /><path d="M12 15V3" /></>,
  lock: <><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  check: <path d="M20 6 9 17l-5-5" />,
  x: <><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>,
  alert: <><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  cloud: <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />,
  device: <><rect width="20" height="14" x="2" y="3" rx="2" /><path d="M8 21h8" /><path d="M12 17v4" /></>,
  film: <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M17 3v18M3 7.5h4M3 12h18M3 16.5h4M17 7.5h4M17 16.5h4" /></>,
  back: <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>,
  retry: <><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  info: <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>,
  play: <path d="M6 3l14 9-14 9V3z" />,
  shield: <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />,
  sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, className = '' }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`shrink-0 ${className}`}>
      {paths[name]}
    </svg>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink glow-accent hover:brightness-110',
  secondary: 'bg-surface-2 text-ink border border-border-strong hover:bg-raised',
  ghost: 'text-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-surface-2 text-bad border border-border-strong hover:bg-bad-soft',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'md' | 'lg' }) {
  const sz = size === 'lg' ? 'h-12 px-6 text-[15px]' : 'h-10 px-4 text-sm';
  return (
    <button
      {...rest}
      className={`pressable inline-flex items-center justify-center gap-2 rounded-full font-semibold outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-50 ${sz} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Chip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'good' | 'warn' | 'accent' }) {
  const tones = {
    neutral: 'bg-surface-2 text-muted ring-1 ring-inset ring-border',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    accent: 'bg-accent-soft text-accent',
  };
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Notice({ tone, icon, title, children }: { tone: 'info' | 'warn' | 'bad' | 'good'; icon: IconName; title?: ReactNode; children?: ReactNode }) {
  const tones = {
    info: 'bg-surface-2 text-ink',
    warn: 'bg-warn-soft text-ink',
    bad: 'bg-bad-soft text-ink',
    good: 'bg-good-soft text-ink',
  };
  const iconTone = { info: 'text-muted', warn: 'text-warn', bad: 'text-bad', good: 'text-good' };
  return (
    <div className={`flex gap-3 rounded-xl p-3.5 text-sm ${tones[tone]}`}>
      <Icon name={icon} className={`mt-0.5 ${iconTone[tone]}`} />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className="text-muted leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

export function ProgressBar({ ratio, label }: { ratio: number | null; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={ratio === null ? undefined : Math.round(ratio * 100)}
      className="relative h-1.5 w-full overflow-hidden rounded-full bg-raised"
    >
      {ratio === null ? (
        <div className="animate-indeterminate glow-bar absolute inset-y-0 w-2/5 rounded-full bg-accent" />
      ) : (
        <div className="glow-bar h-full rounded-full bg-accent transition-[width] duration-500 ease-linear" style={{ width: `${Math.max(2, ratio * 100)}%` }} />
      )}
    </div>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} aria-hidden="true" />;
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card-elev rounded-[20px] border border-border bg-surface ${className}`}>{children}</div>;
}

export function Logo() {
  return (
    <div className="font-display flex items-center gap-2 text-lg font-bold tracking-tight">
      <span className="glow-accent grid size-7 place-items-center rounded-lg bg-accent text-accent-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
        </svg>
      </span>
      Shrink
    </div>
  );
}
