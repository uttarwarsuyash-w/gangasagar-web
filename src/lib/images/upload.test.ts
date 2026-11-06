import { beforeEach, describe, expect, it, vi } from 'vitest';

const { compress, upload, from } = vi.hoisted(() => {
  const compress = vi.fn(async (file: File, opts: { maxWidthOrHeight: number }) =>
    new File([`compressed-${opts.maxWidthOrHeight}`], file.name, { type: 'image/webp' }),
  );
  const upload = vi.fn(async (path: string) => ({ data: { path } as unknown, error: null as unknown }));
  const getPublicUrl = vi.fn((path: string) => ({ data: { publicUrl: `https://cdn.example/public-images/${path}` } }));
  const from = vi.fn(() => ({ upload, getPublicUrl }));
  return { compress, upload, getPublicUrl, from };
});
vi.mock('browser-image-compression', () => ({ default: compress }));
vi.mock('@/lib/supabase/client', () => ({ getSupabase: () => ({ storage: { from } }) }));

import { thumbUrl, uploadImage } from './upload';

describe('uploadImage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('compresses to 1600 px and 600 px WebP and uploads both to public-images', async () => {
    const file = new File(['raw'], 'peanuts.png', { type: 'image/png' });
    const result = await uploadImage(file, 'products');
    expect(compress).toHaveBeenCalledTimes(2);
    expect(compress).toHaveBeenCalledWith(file, expect.objectContaining({ maxWidthOrHeight: 1600, fileType: 'image/webp' }));
    expect(compress).toHaveBeenCalledWith(file, expect.objectContaining({ maxWidthOrHeight: 600, fileType: 'image/webp' }));
    expect(from).toHaveBeenCalledWith('public-images');
    expect(upload).toHaveBeenCalledTimes(2);
    const [largePath, , largeOpts] = upload.mock.calls[0] as unknown as [string, File, { contentType: string }];
    const [thumbPath] = upload.mock.calls[1] as unknown as [string];
    expect(largePath).toMatch(/^products\/[0-9a-f-]+\.webp$/);
    expect(thumbPath).toBe(largePath.replace(/\.webp$/, '-thumb.webp'));
    expect(largeOpts.contentType).toBe('image/webp');
    expect(result.large).toBe(`https://cdn.example/public-images/${largePath}`);
    expect(result.thumb).toBe(`https://cdn.example/public-images/${thumbPath}`);
    expect(thumbUrl(result.large)).toBe(result.thumb);
  });

  it('throws when the upload fails', async () => {
    upload.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    await expect(uploadImage(new File(['x'], 'a.jpg', { type: 'image/jpeg' }), 'site')).rejects.toThrow();
  });
});
