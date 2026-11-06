import type { ReactNode } from 'react';

/** Re-mounts on every page change, so each page slides in. */
export default function PageTemplate({ children }: { children: ReactNode }) {
  return <div className="animate-page-in">{children}</div>;
}
