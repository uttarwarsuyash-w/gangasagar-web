'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { deleteCategory, listCategories, saveCategory, type CategoryRow } from '../admin-api';
import { validateCategory, type CategoryInput } from '../validation';
import { ImagesField } from './ImagesField';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Checkbox, SelectField, TextField, buttonPrimary, buttonSecondary, fromNum, toNum } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { getDictionary } from '@/i18n/get-dictionary';
import { pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { errorCode, fill } from '@/lib/errors';

const blank: CategoryInput = { slug: '', name_en: '', name_hi: null, parent_id: null, image_url: null, sort: 0, is_active: true };

export function CategoriesAdmin({ lang }: { lang: Lang }) {
  const t = getDictionary(lang);
  const f = t.admin.fields;
  const toast = useToast();
  const [rows, setRows] = useState<CategoryRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [form, setForm] = useState<CategoryInput | null>(null);
  const [sortText, setSortText] = useState('0');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const load = useCallback(() => {
    listCategories().then(setRows, () => setFailed(true));
  }, []);
  useEffect(load, [load]);

  const reason = (e: unknown) => t.admin.errors[errorCode(e) as keyof typeof t.admin.errors] ?? t.admin.errors.unknown;
  const err = (k: string) => (errors[k] ? t.admin.errors[errors[k] as keyof typeof t.admin.errors] : undefined);
  const name = (c: CategoryRow) => pick(c as unknown as Record<string, unknown>, 'name', lang);

  function open(c: CategoryInput) {
    setErrors({});
    setForm(c);
    setSortText(fromNum(c.sort ?? 0));
  }

  async function save() {
    if (!form) return;
    const input: CategoryInput = { ...form, slug: form.slug.trim(), name_en: form.name_en.trim(), sort: toNum(sortText) ?? 0 };
    const found = validateCategory(input);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await saveCategory(input);
      toast.success(t.admin.saved);
      setForm(null);
      load();
    } catch (e) {
      toast.error(fill(t.admin.saveFailed, { reason: reason(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="flex-1 font-display text-4xl leading-none font-semibold text-brand-dark animate-rise">{t.admin.categories}</h1>
        <button type="button" className={buttonPrimary} onClick={() => open(blank)}>
          <Plus aria-hidden className="h-5 w-5" /> {t.admin.addCategory}
        </button>
      </div>
      <p className="mt-1 text-ink/70">{t.admin.categoriesHint}</p>
      <div className="mt-4">
        {failed ? (
          <p role="alert">{t.admin.loadFailed}</p>
        ) : rows === null ? (
          <Spinner label={t.auth.loading} />
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-ink/70">{t.admin.noCategories}</p>
        ) : (
          <ul className="divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-white">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{name(c)}</p>
                  <p className="text-sm text-ink/60">
                    /{c.slug} · {c.is_active ? t.admin.active : t.admin.hidden}
                    {c.parent_id ? ` · ${rows.find((p) => p.id === c.parent_id)?.name_en ?? ''}` : ''}
                  </p>
                </div>
                <button type="button" aria-label={fill(t.admin.editNamed, { name: name(c) })} className="rounded-full p-2 hover:bg-brand-light" onClick={() => open(c)}>
                  <Pencil aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" aria-label={fill(t.admin.deleteNamed, { name: name(c) })} className="rounded-full p-2 text-brand-dark hover:bg-brand-light" onClick={() => setDeleting(c)}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog
        open={form !== null}
        title={form?.id ? fill(t.admin.editNamed, { name: form.name_en }) : t.admin.addCategory}
        closeLabel={t.common.close}
        onClose={() => setForm(null)}
        footer={
          <>
            <button type="button" className={buttonSecondary} onClick={() => setForm(null)}>
              {t.common.cancel}
            </button>
            <button type="button" className={buttonPrimary} onClick={save} disabled={busy}>
              {busy ? t.common.saving : t.common.save}
            </button>
          </>
        }
      >
        {form && (
          <div className="grid gap-3">
            <TextField label={f.nameEn} value={form.name_en} onChange={(v) => setForm({ ...form, name_en: v })} error={err('name_en')} />
            <TextField label={f.nameHi} value={form.name_hi ?? ''} onChange={(v) => setForm({ ...form, name_hi: v || null })} lang="hi" />
            <TextField label={f.slug} hint={f.slugHint} value={form.slug} onChange={(v) => setForm({ ...form, slug: v.toLowerCase() })} error={err('slug')} />
            <SelectField
              label={f.parentCategory}
              value={form.parent_id ?? ''}
              onChange={(v) => setForm({ ...form, parent_id: v || null })}
              options={[
                { value: '', label: f.noCategory },
                ...(rows ?? []).filter((c) => c.id !== form.id).map((c) => ({ value: c.id, label: name(c) })),
              ]}
            />
            <TextField label={f.sort} value={sortText} onChange={setSortText} inputMode="numeric" />
            <ImagesField
              t={t}
              images={form.image_url ? [form.image_url] : []}
              onChange={(imgs) => setForm({ ...form, image_url: imgs[0] ?? null })}
              folder="categories"
              max={1}
            />
            <Checkbox label={f.isActive} checked={form.is_active ?? true} onChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={t.admin.deleteLabel}
        message={deleting ? name(deleting) : ''}
        confirmLabel={t.admin.deleteLabel}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteCategory(deleting.id);
            toast.success(t.admin.deleted);
            load();
          } catch (e) {
            toast.error(fill(t.admin.deleteFailed, { reason: reason(e) }));
          } finally {
            setDeleting(null);
          }
        }}
      />
    </section>
  );
}
