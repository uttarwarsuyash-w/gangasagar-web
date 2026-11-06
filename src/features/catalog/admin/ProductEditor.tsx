'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  deleteVariant,
  getProduct,
  listCategories,
  saveProduct,
  type CategoryRow,
  type ProductDetail,
  type VariantRow,
} from '../admin-api';
import { validateProduct, type ProductInput } from '../validation';
import { VariantForm } from './VariantForm';
import { ImagesField } from './ImagesField';
import { Checkbox, SelectField, TextArea, TextField, buttonPrimary, buttonSecondary } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { getDictionary } from '@/i18n/get-dictionary';
import { localHref, pick } from '@/i18n/localized';
import type { Lang } from '@/i18n/types';
import { errorCode, fill } from '@/lib/errors';
import { formatRupees } from '@/lib/money';

const EMPTY: ProductInput = {
  slug: '',
  category_id: null,
  brand: null,
  name_en: '',
  name_hi: null,
  description_en: null,
  description_hi: null,
  images: [],
  seo_title_en: null,
  seo_title_hi: null,
  seo_description_en: null,
  seo_description_hi: null,
  is_active: true,
};

const toInput = (p: ProductDetail): ProductInput => ({
  id: p.id,
  slug: p.slug,
  category_id: p.category_id,
  brand: p.brand,
  name_en: p.name_en,
  name_hi: p.name_hi,
  description_en: p.description_en,
  description_hi: p.description_hi,
  images: p.images ?? [],
  seo_title_en: p.seo_title_en,
  seo_title_hi: p.seo_title_hi,
  seo_description_en: p.seo_description_en,
  seo_description_hi: p.seo_description_hi,
  is_active: p.is_active,
});

export function ProductEditor({ lang }: { lang: Lang }) {
  const id = useSearchParams().get('id');
  const router = useRouter();
  const t = getDictionary(lang);
  const f = t.admin.fields;
  const toast = useToast();
  const [form, setForm] = useState<ProductInput | null>(id ? null : EMPTY);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState<{ variant: VariantRow | null } | null>(null);
  const [deleting, setDeleting] = useState<VariantRow | null>(null);

  const [version, setVersion] = useState(0);
  const reload = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    listCategories().then(setCategories, () => setCategories([]));
  }, []);
  useEffect(() => {
    if (!id) return;
    let active = true;
    getProduct(id).then(
      (p) => {
        if (!active) return;
        if (!p) {
          setFailed(true);
          return;
        }
        setForm(toInput(p));
        setVariants(p.variants);
      },
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [id, version]);

  const reason = (e: unknown) => t.admin.errors[errorCode(e) as keyof typeof t.admin.errors] ?? t.admin.errors.unknown;
  const err = (k: string) => (errors[k] ? t.admin.errors[errors[k] as keyof typeof t.admin.errors] : undefined);

  if (failed) return <p role="alert">{t.admin.errors.not_found}</p>;
  if (!form) return <Spinner label={t.auth.loading} />;

  const set = <K extends keyof ProductInput>(k: K) => (v: ProductInput[K]) => setForm((x) => (x ? { ...x, [k]: v } : x));
  const text = (k: keyof ProductInput) => (v: string) => set(k)((v === '' && k !== 'name_en' && k !== 'slug' ? null : v) as never);

  async function save() {
    if (!form) return;
    const clean: ProductInput = { ...form, slug: form.slug.trim(), name_en: form.name_en.trim() };
    const found = validateProduct(clean);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const newId = await saveProduct(clean);
      toast.success(t.admin.saved);
      if (!form.id) router.replace(localHref(lang, `/admin/products/edit/?id=${newId}`));
      else setForm(clean);
    } catch (e) {
      toast.error(fill(t.admin.saveFailed, { reason: reason(e) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <Link href={localHref(lang, '/admin/products/')} className="inline-flex items-center gap-1 text-brand-dark hover:underline">
        <ArrowLeft aria-hidden className="h-4 w-4" /> {t.admin.products}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">{form.id ? t.admin.editProduct : t.admin.newProduct}</h1>

      <form
        className="mt-4 grid gap-4 rounded-2xl border border-ink/10 bg-white p-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <TextField label={f.nameEn} value={form.name_en} onChange={text('name_en')} error={err('name_en')} required />
        <TextField label={f.nameHi} value={form.name_hi ?? ''} onChange={text('name_hi')} lang="hi" />
        <TextField label={f.slug} hint={f.slugHint} value={form.slug} onChange={(v) => set('slug')(v.toLowerCase())} error={err('slug')} required />
        <TextField label={f.brand} value={form.brand ?? ''} onChange={text('brand')} />
        <SelectField
          label={f.category}
          value={form.category_id ?? ''}
          onChange={(v) => set('category_id')(v || null)}
          options={[{ value: '', label: f.noCategory }, ...categories.map((c) => ({ value: c.id, label: pick(c as unknown as Record<string, unknown>, 'name', lang) }))]}
        />
        <div className="flex items-end">
          <Checkbox label={f.isActive} checked={form.is_active} onChange={set('is_active')} />
        </div>
        <TextArea label={f.descriptionEn} value={form.description_en ?? ''} onChange={text('description_en')} />
        <TextArea label={f.descriptionHi} value={form.description_hi ?? ''} onChange={text('description_hi')} lang="hi" />
        <div className="sm:col-span-2">
          <ImagesField t={t} images={form.images} onChange={set('images')} folder="products" />
        </div>
        <TextField label={f.seoTitleEn} value={form.seo_title_en ?? ''} onChange={text('seo_title_en')} />
        <TextField label={f.seoTitleHi} value={form.seo_title_hi ?? ''} onChange={text('seo_title_hi')} lang="hi" />
        <TextArea label={f.seoDescriptionEn} value={form.seo_description_en ?? ''} onChange={text('seo_description_en')} rows={2} />
        <TextArea label={f.seoDescriptionHi} value={form.seo_description_hi ?? ''} onChange={text('seo_description_hi')} rows={2} lang="hi" />
        <div className="sm:col-span-2">
          <button type="submit" className={buttonPrimary} disabled={busy}>
            {busy ? t.common.saving : t.common.save}
          </button>
        </div>
      </form>

      <div className="mt-8">
        <div className="flex items-center gap-3">
          <h2 className="flex-1 text-xl font-bold">{t.admin.variants}</h2>
          {form.id && (
            <button type="button" className={buttonSecondary} onClick={() => setEditing({ variant: null })}>
              <Plus aria-hidden className="h-5 w-5" /> {t.admin.addVariant}
            </button>
          )}
        </div>
        {!form.id ? (
          <p className="mt-2 text-ink/70">{t.admin.saveProductFirst}</p>
        ) : (
          <ul className="mt-3 divide-y divide-ink/10 overflow-hidden rounded-xl border border-ink/10 bg-white">
            {variants.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{pick(v as unknown as Record<string, unknown>, 'label', lang)}</p>
                  <p className="text-sm text-ink/60">
                    {formatRupees(v.retail_price)}
                    {v.is_loose ? ' / kg' : ''} · {v.stock_qty} {v.stock_unit} · {v.is_active ? t.admin.active : t.admin.hidden}
                  </p>
                </div>
                <button type="button" aria-label={fill(t.admin.editNamed, { name: v.label_en })} className="rounded-full p-2 hover:bg-brand-light" onClick={() => setEditing({ variant: v })}>
                  <Pencil aria-hidden className="h-4 w-4" />
                </button>
                <button type="button" aria-label={fill(t.admin.deleteNamed, { name: v.label_en })} className="rounded-full p-2 text-brand-dark hover:bg-brand-light" onClick={() => setDeleting(v)}>
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {editing && form.id && (
        <VariantForm
          key={editing.variant?.id ?? 'new'}
          t={t}
          open
          productId={form.id}
          variant={editing.variant}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
      <ConfirmDialog
        open={deleting !== null}
        title={t.admin.deleteVariantTitle}
        message={t.admin.deleteVariantMessage}
        confirmLabel={t.admin.deleteLabel}
        cancelLabel={t.common.cancel}
        closeLabel={t.common.close}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteVariant(deleting.id);
            toast.success(t.admin.deleted);
            reload();
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
