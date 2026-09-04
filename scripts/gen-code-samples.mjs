/**
 * Generate the harness's code samples, and wire a "Show code" panel into every
 * example section.
 *
 *   npm run gen:samples
 *
 * Two sources, for two kinds of panel:
 *
 * 1. **Per-section**, for pages built from `<section style={{ marginBottom: 40 }}>`
 *    blocks. The snippet is the library element in that section, read straight
 *    out of the example file — so the code shown *is* the code running, and
 *    cannot drift. The script also inserts the `<CodeExample>` call, so a new
 *    example gets a panel by being written, not by being registered somewhere.
 *
 * 2. **Per-page**, from the README, for pages with no sections. The README's
 *    blocks are compiled by `npm run verify:readme`, so those cannot drift either.
 *
 * Idempotent: previously inserted panels are stripped before extraction and
 * re-inserted, so running it twice is a no-op.
 */

import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const EXAMPLES = path.join(ROOT, 'testHarness/examples');

/** Folders whose tab id is not just the lower-cased folder name. */
const TAB_ID_OVERRIDES = { D365TestHarness: 'harness' };

/** Pages with no sections take a single snippet from this README heading. */
const README_SECTIONS = [
  ['fluentshell', '### FluentShell', 'FluentShell'],
  ['fluentcontainer', '### FluentContainer', 'FluentContainer'],
  ['parentportal', '### ParentPortal', 'ParentPortal'],
  ['harness', '### D365TestHarness', 'D365TestHarness'],
];

/**
 * Library components a snippet should show.
 *
 * A demo section also holds a heading, a description and a readout of the
 * current selection. That scaffolding explains the page rather than the
 * component, and is noise in a code panel — so only these elements are lifted.
 *
 * Longer names first, so `DateTimeRangeField` is not matched as `DateTimeField`.
 */
const COMPONENT_TAGS = [
  'DateTimeRangeField',
  'DateTimeField',
  'D365TestHarness',
  'RecordHoverCard',
  'SystemUserPersona',
  'SystemUserCard',
  'FluentContainer',
  'OptionSetField',
  'QueryBuilder',
  'ParentPortal',
  'FluentShell',
  'OwnerLookup',
  'EntityGrid',
  'CommandBar',
  'Lookup',
];

const SECTION_OPEN = '<section style={{ marginBottom: 40 }}>';
const CODE_CALL = /^[ \t]*<CodeExample sampleId="[^"]*" \/>\r?\n/gm;

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/&amp;/g, 'and')
    .replace(/&[a-z]+;/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'example';

/**
 * Re-indent an extracted element.
 *
 * The tag goes to column zero and its continuation lines to a consistent two
 * spaces, keeping their relative depth. Source indentation is not preserved
 * because it cannot be trusted: several example files have attributes indented
 * further than the tag that owns them, which reads as broken in a code panel
 * even though it renders fine.
 */
function reindent(code) {
  const lines = code.replace(/\s+$/, '').split('\n');
  const first = lines[0].trim();
  const rest = lines.slice(1);
  const filled = rest.filter((l) => l.trim());
  if (!filled.length) return first;

  // The baseline is the *closing* line's indent, not the shallowest line's. A
  // closing `/>` or `</Tag>` aligns with the tag that owns it, so it reports
  // where the element really sits — whereas the shallowest line is whatever the
  // author happened to indent least, which in these files is sometimes the tag.
  const indentOf = (l) => l.match(/^[ \t]*/)[0].length;
  const base = indentOf(filled[filled.length - 1]);
  return [
    first,
    ...rest.map((l) => (l.trim() ? ' '.repeat(Math.max(0, indentOf(l) - base)) + l.trim() : '')),
  ].join('\n');
}

/**
 * The source of every library element in a section, in document order.
 *
 * Scanned rather than regex-matched to a closing tag, so an element holding
 * further JSX — a CommandBar with rendered items, say — comes out whole, and an
 * attribute containing `>` inside a string or an expression does not end it early.
 */
function extractElements(body) {
  const found = [];

  for (const tag of COMPONENT_TAGS) {
    const opener = new RegExp(`<${tag}[\\s/>]`, 'g');
    let match;
    while ((match = opener.exec(body))) {
      const start = match.index;

      let i = start;
      let depth = 0;
      let quote = null;
      let selfClosing = false;
      for (; i < body.length; i++) {
        const c = body[i];
        if (quote) {
          if (c === quote) quote = null;
          continue;
        }
        if (c === '"' || c === "'" || c === '`') quote = c;
        else if (c === '{') depth += 1;
        else if (c === '}') depth -= 1;
        else if (c === '>' && depth === 0) {
          selfClosing = body[i - 1] === '/';
          break;
        }
      }

      let end = i + 1;
      if (!selfClosing) {
        const closeTag = `</${tag}>`;
        const at = body.indexOf(closeTag, end);
        if (at >= 0) end = at + closeTag.length;
      }

      found.push({ start, end, code: body.slice(start, end) });
      opener.lastIndex = end;
    }
  }

  // Drop elements nested inside one already captured, so a Lookup rendered
  // inside a CommandBar is not also shown on its own.
  const ordered = found.sort((a, b) => a.start - b.start);
  const top = ordered.filter(
    (el, idx) => !ordered.some((other, j) => j !== idx && other.start < el.start && other.end >= el.end),
  );

  return top.map((el) => reindent(el.code));
}

const samples = [];
const withSections = new Set();
const folders = (await readdir(EXAMPLES, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && d.name !== 'shared')
  .map((d) => d.name);

for (const folder of folders) {
  const file = path.join(EXAMPLES, folder, 'index.tsx');
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    continue; // not an example module
  }

  const tab = TAB_ID_OVERRIDES[folder] ?? folder.toLowerCase();
  const nl = source.includes('\r\n') ? '\r\n' : '\n';

  // Remove any panel inserted previously, so extraction sees the example's own
  // code and reruns stay idempotent.
  const cleaned = source.replace(CODE_CALL, '');

  const found = [];
  let cursor = 0;
  while (true) {
    const open = cleaned.indexOf(SECTION_OPEN, cursor);
    if (open < 0) break;
    const bodyStart = open + SECTION_OPEN.length;
    const close = cleaned.indexOf('</section>', bodyStart);
    if (close < 0) break;

    const body = cleaned.slice(bodyStart, close);
    const heading = /<h2>([\s\S]*?)<\/h2>/.exec(body);
    const title = heading
      ? heading[1].replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim()
      : `${folder} example ${found.length + 1}`;

    const elements = extractElements(body);
    // A section with no library element is scaffolding only; skip its panel
    // rather than show a snippet of headings.
    if (elements.length) {
      found.push({ id: `${tab}-${slugify(title)}`, title, code: elements.join('\n\n'), close });
    }
    cursor = close + 1;
  }

  if (!found.length) continue;

  withSections.add(tab);
  for (const f of found) samples.push({ id: f.id, title: f.title, code: f.code });

  // Insert the panels, back to front so earlier offsets stay valid.
  let out = cleaned;
  for (let i = found.length - 1; i >= 0; i -= 1) {
    const f = found[i];
    const lineStart = out.lastIndexOf(nl, f.close) + nl.length;
    const closeIndent = out.slice(lineStart, f.close).match(/^[ \t]*/)[0];
    // Children sit one level in from the closing tag.
    out =
      out.slice(0, f.close) +
      `  <CodeExample sampleId="${f.id}" />${nl}${closeIndent}` +
      out.slice(f.close);
  }

  if (!out.includes("from '../shared/CodeExample'")) {
    const firstImport = out.indexOf('import ');
    out =
      out.slice(0, firstImport) +
      `import { CodeExample } from '../shared/CodeExample';${nl}` +
      out.slice(firstImport);
  }

  if (out !== source) await writeFile(file, out, 'utf8');
}

// Per-page snippets for the pages that have no sections.
const readme = (await readFile(path.join(ROOT, 'README.md'), 'utf8')).replace(/\r/g, '');
const missing = [];
for (const [tab, heading, title] of README_SECTIONS) {
  if (withSections.has(tab)) continue;
  const at = readme.indexOf(`\n${heading}\n`);
  const block = at < 0 ? null : /```tsx\n([\s\S]*?)```/.exec(readme.slice(at));
  if (!block) {
    missing.push(`${tab}: no tsx block under "${heading}"`);
    continue;
  }
  samples.push({ id: tab, title, code: block[1].replace(/\s+$/, '') });
}

const body = samples
  .map(
    (s) =>
      `  ${JSON.stringify(s.id)}: {\n    title: ${JSON.stringify(s.title)},\n    code: ${JSON.stringify(s.code)},\n  },`,
  )
  .join('\n');

const pageLevel = README_SECTIONS.filter(([tab]) => !withSections.has(tab)).map(([tab]) => tab);

const file = `/**
 * Code samples shown in the harness.
 *
 * GENERATED by \`npm run gen:samples\` — do not edit by hand. Per-section samples
 * are the library elements lifted from the example files' own source; per-page
 * samples come from the README, whose blocks are compiled by
 * \`npm run verify:readme\`.
 */

export interface CodeSample {
  title: string;
  code: string;
}

export const CODE_SAMPLES: Record<string, CodeSample> = {
${body}
};

/** Tabs whose page shows one snippet at the foot, because it has no sections. */
export const PAGE_LEVEL_SAMPLES: readonly string[] = ${JSON.stringify(pageLevel)};
`;

await writeFile(path.join(EXAMPLES, 'shared/codeSamples.ts'), file, 'utf8');

const perSection = samples.length - pageLevel.length;
console.log(
  `Wrote ${samples.length} sample(s): ${perSection} per-section, ${pageLevel.length} per-page.`,
);
for (const s of samples) console.log(`  ${s.id.padEnd(46)} ${s.code.length} chars`);
if (missing.length) {
  console.warn('\nNo sample generated for:');
  for (const m of missing) console.warn(`  ${m}`);
  process.exitCode = 1;
}
