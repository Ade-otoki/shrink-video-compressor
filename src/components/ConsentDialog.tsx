import { useEffect, useRef } from 'react';
import { SERVER_REGION, SERVER_RETENTION_HOURS } from '../lib/capability';
import { formatBytes } from '../lib/format';
import { Button, Icon } from './ui';

interface Props {
  open: boolean;
  reason: string;
  fileSize: number;
  onAccept: () => void;
  onCancel: () => void;
}

/** Shown before every server upload. Declining never triggers an upload or fallback. */
export function ConsentDialog({ open, reason, fileSize, onAccept, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => (e.preventDefault(), onCancel())}
      aria-labelledby="consent-title"
      className="card-elev m-auto w-[min(480px,calc(100vw-32px))] rounded-[24px] border border-border bg-surface p-0 text-ink"
    >
      <div className="p-6">
        <span className="grid size-11 place-items-center rounded-full bg-accent-soft text-accent">
          <Icon name="cloud" size={22} />
        </span>
        <h2 id="consent-title" className="font-display mt-4 text-2xl font-bold tracking-tight">
          Upload this video for processing?
        </h2>
        <p className="mt-2 text-sm text-muted">{reason}</p>

        <ul className="mt-5 space-y-3 text-sm">
          <Row icon="upload" title="Your video will leave this device">
            {formatBytes(fileSize)} will be uploaded over an encrypted connection.
          </Row>
          <Row icon="device" title="Where it’s processed">
            On {SERVER_REGION}, in an isolated worker with no access to other jobs.
          </Row>
          <Row icon="clock" title={`Deleted within ${SERVER_RETENTION_HOURS} hours`}>
            Your upload and the result are removed automatically — sooner once you’ve downloaded it.
          </Row>
        </ul>
      </div>
      <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button onClick={onAccept}>Upload and process</Button>
      </div>
    </dialog>
  );
}

function Row({ icon, title, children }: { icon: 'upload' | 'device' | 'clock'; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <Icon name={icon} size={18} className="mt-0.5 text-muted" />
      <span>
        <span className="block font-medium">{title}</span>
        <span className="block text-muted">{children}</span>
      </span>
    </li>
  );
}
