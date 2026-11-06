'use client';

import { useId, type ReactNode } from 'react';

const inputClass =
  'mt-1 block w-full rounded-lg border border-ink/20 bg-white px-3 py-2 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 aria-[invalid=true]:border-brand';

interface Base {
  label: string;
  error?: string;
  hint?: string;
}

function Wrap({ id, label, error, hint, children }: Base & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink/80">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink/60">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-brand-dark">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextField(
  p: Base & {
    value: string;
    onChange: (v: string) => void;
    type?: string;
    inputMode?: 'text' | 'numeric' | 'decimal' | 'tel' | 'email';
    autoComplete?: string;
    lang?: string;
    required?: boolean;
    placeholder?: string;
    step?: string;
    min?: string;
    maxLength?: number;
  },
) {
  const id = useId();
  return (
    <Wrap id={id} label={p.label} error={p.error} hint={p.hint}>
      <input
        id={id}
        type={p.type ?? 'text'}
        value={p.value}
        onChange={(e) => p.onChange(e.target.value)}
        inputMode={p.inputMode}
        autoComplete={p.autoComplete}
        lang={p.lang}
        required={p.required}
        placeholder={p.placeholder}
        step={p.step}
        min={p.min}
        maxLength={p.maxLength}
        aria-invalid={p.error ? true : undefined}
        aria-describedby={p.error ? `${id}-error` : p.hint ? `${id}-hint` : undefined}
        className={inputClass}
      />
    </Wrap>
  );
}

export function TextArea(p: Base & { value: string; onChange: (v: string) => void; lang?: string; rows?: number }) {
  const id = useId();
  return (
    <Wrap id={id} label={p.label} error={p.error} hint={p.hint}>
      <textarea
        id={id}
        value={p.value}
        rows={p.rows ?? 3}
        lang={p.lang}
        onChange={(e) => p.onChange(e.target.value)}
        aria-invalid={p.error ? true : undefined}
        className={inputClass}
      />
    </Wrap>
  );
}

export function SelectField(
  p: Base & { value: string; onChange: (v: string) => void; options: Array<{ value: string; label: string }> },
) {
  const id = useId();
  return (
    <Wrap id={id} label={p.label} error={p.error} hint={p.hint}>
      <select id={id} value={p.value} onChange={(e) => p.onChange(e.target.value)} className={inputClass}>
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 rounded border-ink/30 accent-brand"
      />
      <label htmlFor={id} className="font-medium">
        {label}
      </label>
    </div>
  );
}

export const buttonPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-brand px-5 py-2.5 font-semibold text-white shadow-sm hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50';
export const buttonSecondary =
  'inline-flex items-center justify-center gap-2 rounded-full border border-brand/30 bg-white px-5 py-2.5 font-semibold text-brand-dark hover:bg-brand-light disabled:cursor-not-allowed disabled:opacity-50';

/** '' → null, otherwise a number (NaN stays NaN so validation can flag it). */
export function toNum(v: string): number | null {
  return v.trim() === '' ? null : Number(v);
}
export function fromNum(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? '' : String(v);
}
