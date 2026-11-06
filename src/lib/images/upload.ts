import imageCompression from 'browser-image-compression';
import { getSupabase } from '@/lib/supabase/client';

export const IMAGE_BUCKET = 'public-images';
export type ImageFolder = 'products' | 'categories' | 'gallery' | 'site';

/** The 600 px thumbnail stored beside each 1600 px image. */
export function thumbUrl(largeUrl: string): string {
  return largeUrl.replace(/\.webp(\?.*)?$/, '-thumb.webp$1');
}

async function toWebp(file: File, size: number): Promise<File> {
  return imageCompression(file, {
    maxWidthOrHeight: size,
    fileType: 'image/webp',
    initialQuality: 0.82,
    useWebWorker: true,
  });
}

/** Compresses to WebP (1600 px and 600 px) and uploads both to the public-images bucket. */
export async function uploadImage(file: File, folder: ImageFolder): Promise<{ large: string; thumb: string }> {
  const [large, thumb] = [await toWebp(file, 1600), await toWebp(file, 600)];
  const id = crypto.randomUUID();
  const largePath = `${folder}/${id}.webp`;
  const thumbPath = `${folder}/${id}-thumb.webp`;
  const bucket = getSupabase().storage.from(IMAGE_BUCKET);
  for (const [path, body] of [
    [largePath, large],
    [thumbPath, thumb],
  ] as const) {
    const { error } = await bucket.upload(path, body, { contentType: 'image/webp', cacheControl: '31536000', upsert: false });
    if (error) throw new Error(error.message || 'upload_failed');
  }
  return {
    large: bucket.getPublicUrl(largePath).data.publicUrl,
    thumb: bucket.getPublicUrl(thumbPath).data.publicUrl,
  };
}
