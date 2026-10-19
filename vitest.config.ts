import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

declare const process: { cwd(): string };

/**
 * The icon package's ESM entry imports its chunks by extensionless path, which
 * is not valid ESM and which Vite's resolver refuses. Its CJS build has no such
 * split and is identical in content.
 *
 * Aliased to an absolute file path rather than to a subpath specifier, because
 * the package's `exports` map does not publish `./lib-cjs/index.js` and a
 * specifier alias is resolved through that map.
 */
const ICONS_CJS = `${process.cwd()}/node_modules/@fluentui/react-icons/lib-cjs/index.js`;

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    alias: [{ find: /^@fluentui\/react-icons$/, replacement: ICONS_CJS }],
    server: {
      // Node's own loader handles externalised dependencies and does not see the
      // alias. The whole Fluent scope is inlined because the failing import is
      // react-components reaching for react-icons, not our own source doing it.
      deps: { inline: [/@fluentui[\\/]/] },
    },
  },
});
