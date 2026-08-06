import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Every peerDependency must be external. Anything omitted here is inlined into the
  // bundle, so consumers ship it twice - once from their own install and once from
  // ours - and end up with two copies of the same Fluent components at runtime.
  external: [
    'react',
    'react-dom',
    '@fluentui/react-components',
    '@fluentui/react-icons',
    '@fluentui/react-datepicker-compat',
    '@fluentui/react-calendar-compat',
  ],
  treeshake: true,
  esbuildOptions(options) {
    // Use classic JSX transform for React 16 compatibility
    options.jsx = 'transform';
    options.jsxFactory = 'React.createElement';
    options.jsxFragment = 'React.Fragment';
  },
});
