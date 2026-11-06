'use client';

import { Dialog } from './Dialog';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  closeLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog(p: ConfirmDialogProps) {
  return (
    <Dialog
      open={p.open}
      title={p.title}
      closeLabel={p.closeLabel}
      onClose={p.onClose}
      footer={
        <>
          <button type="button" data-autofocus onClick={p.onClose} className="rounded-full border border-ink/20 px-4 py-2 font-medium hover:bg-ink/5">
            {p.cancelLabel}
          </button>
          <button
            type="button"
            onClick={p.onConfirm}
            disabled={p.busy}
            className="rounded-full bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {p.confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-ink/80">{p.message}</p>
    </Dialog>
  );
}
