import { describe, expect, it } from 'vitest';
import nextConfig from '../../next.config';

describe('next.config', () => {
  it('builds a static export', () => {
    expect(nextConfig.output).toBe('export');
    expect(nextConfig.trailingSlash).toBe(true);
    expect(nextConfig.images?.unoptimized).toBe(true);
  });
});
