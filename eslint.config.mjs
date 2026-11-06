import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // A circular import can crash the dev server ("Cannot access ... before initialization").
  { files: ["src/**/*.{ts,tsx}"], rules: { "import/no-cycle": "error" } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "e2e/.site/**",
    "test-results/**",
    "playwright-report/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
