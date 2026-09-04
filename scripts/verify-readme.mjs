/**
 * Typecheck the README's code examples.
 *
 *   npm run verify:readme
 *
 * Documentation drifts silently: a renamed prop or a removed export keeps rendering
 * fine in Markdown. This extracts every ```tsx / ```ts block, compiles it against the
 * real library types, and fails if an example no longer matches the API.
 *
 * Some blocks are deliberately partial - an elision (`...`), a bare object literal
 * showing a shape - and cannot compile alone. Those are counted and listed rather than
 * quietly passed, so the split between "verified" and "illustrative" stays visible.
 */

import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const run = promisify(execFile);
const ROOT = process.cwd();
const OUT = path.join(ROOT, '.readme-check');

// The README is CRLF; strip carriage returns so the fence regex matches.
const readme = (await readFile(path.join(ROOT, 'README.md'), 'utf8')).replace(/\r/g, '');

const blocks = [];
const fence = /```(tsx|ts)\n([\s\S]*?)```/g;
let match;
while ((match = fence.exec(readme))) {
  blocks.push({ line: readme.slice(0, match.index).split('\n').length, code: match[2] });
}

/** A block that cannot stand alone, and is illustrative rather than executable. */
const isFragment = (code) => {
  const body = code.trim();
  if (/(\[\s*\.\.\.\s*\]|\s\.\.\.\s*\/?>)/.test(body)) return true; // elisions
  if (body.startsWith('{') && body.endsWith('}')) return true; // a bare shape
  return false;
};

const IMPORTS = [
  "import * as React from 'react';",
  "import { FluentProvider, webLightTheme, Link, Text, Badge, Button, ToggleButton, Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent } from '@fluentui/react-components';",
  "import { BuildingRegular, PersonRegular, ArrowLeftRegular, AddRegular, EditRegular, DeleteRegular } from '@fluentui/react-icons';",
  "import { PersonSearchRegular, CheckmarkCircleRegular, DismissRegular } from '@fluentui/react-icons';",
  'void [PersonSearchRegular, CheckmarkCircleRegular, DismissRegular];',
  "import * as Lib from '../src';",
  'const {',
  '  Lookup, QueryBuilder, CommandBar, EntityGrid, DateTimeField, DateTimeRangeField, OptionSetField,',
  '  RecordHoverCard, SystemUserPersona, SystemUserCard, OwnerLookup,',
  '  ParentPortal, FluentShell, FluentContainer, D365TestHarness,',
  '  setWebApiBaseUrl, setWebApiFetch, getEntityDefinition, clearMetadataCache,',
  '  parseStoredValue, formatStoredValue, formatMultiSelectValue, parseSelectedValues,',
  '  serializeQueryBuilderState, parseFetchXmlToState, validateQueryBuilderState,',
  '} = Lib;',
  'void [React, FluentProvider, webLightTheme, Link, Text, Badge, Button, ToggleButton,',
  '  Dialog, DialogSurface, DialogBody, DialogTitle, DialogContent,',
  '  BuildingRegular, PersonRegular, ArrowLeftRegular, AddRegular, EditRegular, DeleteRegular,',
  '  Lookup, QueryBuilder, CommandBar, EntityGrid, DateTimeField, DateTimeRangeField, OptionSetField,',
  '  RecordHoverCard, SystemUserPersona, SystemUserCard, OwnerLookup,',
  '  ParentPortal, FluentShell, FluentContainer, D365TestHarness,',
  '  setWebApiBaseUrl, setWebApiFetch, getEntityDefinition, clearMetadataCache,',
  '  parseStoredValue, formatStoredValue, formatMultiSelectValue, parseSelectedValues,',
  '  serializeQueryBuilderState, parseFetchXmlToState, validateQueryBuilderState];',
].join('\n');

/**
 * Symbols an example may reference but cannot define in a snippet. Emitted per block,
 * and only when the block mentions one without declaring it - a blanket prelude
 * collides with examples that define their own `fields`, `handleChange` and so on.
 */
const AMBIENT = {
  LookupOption: 'type LookupOption = Lib.LookupOption;',
  QueryBuilderField: 'type QueryBuilderField = Lib.QueryBuilderField;',
  QueryBuilderApplyResult: 'type QueryBuilderApplyResult = Lib.QueryBuilderApplyResult;',
  QueryBuilderState: 'type QueryBuilderState = Lib.QueryBuilderState;',
  OwnerRecord: 'type OwnerRecord = Lib.OwnerRecord;',
  SystemUserRecord: 'type SystemUserRecord = Lib.SystemUserRecord;',
  ReactNode: 'type ReactNode = React.ReactNode;',
  options: 'declare const options: any[];',
  fields: 'declare const fields: Lib.QueryBuilderField[];',
  state: 'declare const state: Lib.QueryBuilderState;',
  value: 'declare const value: any;',
  values: 'declare const values: number[];',
  owner: 'declare const owner: Lib.OwnerRecord;',
  owners: 'declare const owners: Lib.OwnerRecord[];',
  record: 'declare const record: Record<string, string>;',
  accounts: 'declare const accounts: Lib.LookupOption[];',
  account: 'declare const account: Record<string, string>;',
  apiResults: 'declare const apiResults: Lib.LookupOption[];',
  fetchFromApi: 'declare const fetchFromApi: (t: string) => Promise<Lib.LookupOption[]>;',
  isLoading: 'declare const isLoading: boolean;',
  fetchXmlString: 'declare const fetchXmlString: string;',
  selected: 'declare const selected: Lib.LookupOption | null;',
  useState: 'declare const useState: <T>(initial: T) => [T, (next: T) => void];',
  setValue: 'declare const setValue: (v: any) => void;',
  setValues: 'declare const setValues: (v: number[]) => void;',
  setOwner: 'declare const setOwner: (v: Lib.OwnerRecord | null) => void;',
  setOwners: 'declare const setOwners: (v: Lib.OwnerRecord[]) => void;',
  setSelected: 'declare const setSelected: (v: Lib.LookupOption | null) => void;',
  handleChange: 'declare const handleChange: (...a: unknown[]) => void;',
  handleNew: 'declare const handleNew: () => void;',
  handleEdit: 'declare const handleEdit: () => void;',
  handleDelete: 'declare const handleDelete: () => void;',
  handleExport: 'declare const handleExport: () => void;',
  open: 'declare const open: () => void;',
  openRecord: 'declare const openRecord: (...a: unknown[]) => void;',
  authenticatedFetch:
    'declare const authenticatedFetch: (u: string, i?: RequestInit) => Promise<Response>;',
  Xrm: 'declare const Xrm: { Navigation: { openForm: (o: unknown) => void } };',
};

/** Declarations this block needs: mentioned, but not defined by the block itself. */
const ambientFor = (code) =>
  Object.entries(AMBIENT)
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(code))
    .filter(
      ([name]) =>
        !new RegExp(`\\b(const|let|var|function|interface|type|class)\\s+${name}\\b`).test(code),
    )
    .map(([, declaration]) => declaration)
    .join('\n');

await rm(OUT, { recursive: true, force: true });
await mkdir(OUT, { recursive: true });

const fragments = [];
const files = [];

for (const [index, block] of blocks.entries()) {
  if (isFragment(block.code)) {
    fragments.push(block.line);
    continue;
  }

  // Imports cannot live inside a wrapper function, so hoist them out. Library and
  // Fluent imports are dropped: IMPORTS already binds those names.
  const imports = [];
  const rest = [];
  for (const line of block.code.split('\n')) {
    if (/^\s*import\s/.test(line)) {
      if (!/fluentui-extended|@fluentui\/|['"]react['"]/.test(line)) imports.push(line);
      continue;
    }
    rest.push(line);
  }

  const body = rest.join('\n').trim();
  // Loose JSX siblings need a parent to be valid inside a module. Test the first
  // meaningful line rather than the raw start: several examples open with a comment.
  const firstCode = body.split('\n').find((l) => l.trim() && !l.trim().startsWith('//')) ?? '';
  const wrapped = firstCode.trim().startsWith('<')
    ? `export const Example = () => (\n<>\n${body}\n</>\n);`
    : body;

  const file = path.join(OUT, `example-${String(index).padStart(2, '0')}-line-${block.line}.tsx`);
  await writeFile(
    file,
    [`/* README line ${block.line} */`, IMPORTS, ambientFor(block.code), ...imports, '', wrapped, '']
      .filter((part) => part !== '')
      .join('\n'),
  );
  files.push(file);
}

console.log(
  `${blocks.length} block(s): ${files.length} compiled, ${fragments.length} illustrative fragment(s)`,
);
if (fragments.length) console.log(`  fragments at README lines: ${fragments.join(', ')}`);

try {
  await run(
    'npx',
    [
      'tsc', '--noEmit', '--jsx', 'react-jsx', '--esModuleInterop', '--skipLibCheck',
      '--target', 'es2020', '--module', 'esnext', '--moduleResolution', 'bundler',
      ...files,
    ],
    { shell: true, cwd: ROOT, maxBuffer: 10 * 1024 * 1024 },
  );
  console.log('\nAll compiled examples typecheck against the library.');
  await rm(OUT, { recursive: true, force: true });
} catch (err) {
  console.log('\nExample errors:\n');
  console.log((err.stdout || err.message).split('\n').slice(0, 25).join('\n'));
  process.exitCode = 1;
}
