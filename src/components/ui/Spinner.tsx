export function Spinner({ label }: { label: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-12 text-ink/70">
      <span aria-hidden className="h-6 w-6 animate-spin rounded-full border-2 border-brand/30 border-t-brand" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
