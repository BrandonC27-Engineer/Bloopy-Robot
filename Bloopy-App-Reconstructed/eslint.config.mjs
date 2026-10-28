import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored v0 design references — kept read-only for visual/code reference,
    // not part of the real app, so excluded from linting.
    "_v0-reference/**",
    "_v0-day8-reference/**",
    "_v0-theme-variations-reference/**",
  ]),
]);

export default eslintConfig;
