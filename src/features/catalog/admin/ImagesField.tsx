'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { thumbUrl, uploadImage, type ImageFolder } from '@/lib/images/upload';
import { useToast } from '@/components/ui/Toast';
import type { Dictionary } from '@/i18n/get-dictionary';
import { errorCode, fill } from '@/lib/errors';

export function ImagesField({
  t,
  images,
  onChange,
  folder,
  max = 8,
}: {
  t: Dictionary;
  images: string[];
  onChange: (images: string[]) => void;
  folder: ImageFolder;
  max?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of Array.from(files).slice(0, Math.max(0, max - images.length))) {
        const { large } = await uploadImage(file, folder);
        added.push(large);
      }
    } catch (e) {
      const code = errorCode(e) as keyof typeof t.admin.errors;
      toast.error(fill(t.admin.saveFailed, { reason: t.admin.errors[code] ?? t.admin.errors.unknown }));
    } finally {
      if (added.length) onChange([...images, ...added]);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink/80">{t.admin.fields.images}</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {images.map((src, i) => (
          <div key={src} className="relative h-24 w-24 overflow-hidden rounded-lg border border-ink/10 bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumbUrl(src)} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              aria-label={`${t.admin.fields.removeImage} ${i + 1}`}
              onClick={() => onChange(images.filter((x) => x !== src))}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-1 shadow hover:bg-white"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        ))}
        {images.length < max && (
          <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-brand/30 text-sm text-brand-dark hover:bg-brand-light">
            <ImagePlus aria-hidden className="h-6 w-6" />
            <span>{busy ? t.admin.fields.uploading : t.admin.fields.addImage}</span>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              disabled={busy}
              className="sr-only"
              onChange={(e) => onFiles(e.target.files)}
            />
          </label>
        )}
      </div>
    </fieldset>
  );
}
