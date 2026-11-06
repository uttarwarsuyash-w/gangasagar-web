// Mirror next.config trailingSlash: true so next/link keeps trailing slashes in tests.
process.env.__NEXT_TRAILING_SLASH = 'true';
// Most tests act as a site with Supabase connected; a test can stub these empty to check the not-set-up case.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
