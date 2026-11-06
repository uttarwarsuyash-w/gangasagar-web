// Mirror next.config trailingSlash: true so next/link keeps trailing slashes in tests.
process.env.__NEXT_TRAILING_SLASH = 'true';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
