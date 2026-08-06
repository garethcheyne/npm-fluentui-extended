// @ts-check
/**
 * ESLint flat config.
 *
 * Scope is deliberately narrow: this lints the published library under `src/`, which is
 * the code consumers actually get. The test harness and build scripts are checked by
 * their own builds instead, so a demo file cannot fail the package's lint gate.
 */

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
  {
    // Build output and generated scratch directories are never sources
    ignores: ['dist/**', 'node_modules/**', '.readme-check/**', 'coverage/**'],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // The Web API returns untyped JSON; `any` at those boundaries is deliberate and
      // is narrowed by the typed wrappers around it. Flag it, but do not fail on it.
      '@typescript-eslint/no-explicit-any': 'warn',

      // Unused args are common in Fluent event handlers, which pass (event, data) and
      // frequently only need `data`. Allow a leading underscore to opt out.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },

  {
    // Tests may lean on non-null assertions to keep assertions readable
    files: ['src/**/*.test.{ts,tsx}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
);
