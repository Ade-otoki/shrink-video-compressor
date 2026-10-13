import { ERROR_COPY } from '../lib/errors';
import type { AppError } from '../types';
import { Button, Card, Icon } from './ui';

export interface RecoveryAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

export function ErrorScreen({ error, actions, fileName }: { error: AppError; actions: RecoveryAction[]; fileName?: string }) {
  const copy = ERROR_COPY[error.code];
  return (
    <div className="enter mx-auto w-full max-w-lg" role="alert">
      <Card className="p-6 sm:p-8">
        <span className="grid size-11 place-items-center rounded-full bg-bad-soft text-bad">
          <Icon name="alert" size={22} />
        </span>
        <h1 className="font-display mt-5 text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-muted">{copy.body}</p>
        {copy.originalKept && fileName && (
          <p className="mt-4 flex items-center gap-2 rounded-lg bg-surface-2 px-3 py-2 text-sm">
            <Icon name="check" size={16} className="text-good" />
            <span className="min-w-0 truncate">
              Your original <span className="font-medium">{fileName}</span> is still selected and unchanged.
            </span>
          </p>
        )}
        <div className="mt-8 flex flex-col gap-2">
          {actions.map((a) => (
            <Button key={a.label} variant={a.primary ? 'primary' : 'secondary'} onClick={a.onClick} className="w-full">
              {a.label}
            </Button>
          ))}
        </div>
        {import.meta.env.DEV && error.message !== error.code && (
          <details className="mt-6 text-xs text-muted">
            <summary className="cursor-pointer">Technical details</summary>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-surface-2 p-3">{error.message}</pre>
          </details>
        )}
      </Card>
    </div>
  );
}
