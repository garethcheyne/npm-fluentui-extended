/**
 * Capture documentation screenshots.
 *
 *   node scripts/capture-shots.mjs [shotId ...]
 *
 * Starts the test harness, visits each `?shot=<id>` page, waits for it to signal
 * readiness, and screenshots the `#shot-frame` element straight into `assets/`.
 *
 * Shooting the frame element rather than the viewport is what makes the output a tight
 * crop of a single component - no harness chrome, no manual cropping, and identical
 * dimensions every time the docs are regenerated.
 */

import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'assets');
const PORT = 5199;
const BASE = `http://localhost:${PORT}`;

/** Start the harness dev server and resolve once it is serving. */
const startServer = () =>
  new Promise((resolve, reject) => {
    // Resolve Vite's binary directly rather than going through a shell: a shelled
    // child cannot be killed by pid, which strands the server and blocks the port
    // on the next run.
    const viteBin = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
    const proc = spawn(
      process.execPath,
      [viteBin, '--config', 'testHarness/vite.config.ts', '--port', String(PORT), '--strictPort'],
      { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
    );

    const timeout = setTimeout(() => reject(new Error('Server did not start within 60s')), 60_000);

    proc.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('ready in') || chunk.toString().includes(String(PORT))) {
        clearTimeout(timeout);
        // Give Vite a moment to finish binding before the first navigation
        setTimeout(() => resolve(proc), 800);
      }
    });
    proc.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`));
    proc.on('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Vite exited with code ${code}`));
    });
  });

const main = async () => {
  await mkdir(OUT_DIR, { recursive: true });

  console.log('Starting harness...');
  const server = await startServer();

  const browser = await chromium.launch();
  const failures = [];

  try {
    const page = await browser.newPage({
      viewport: { width: 1400, height: 1200 },
      // Retina-density output so the images stay sharp when scaled in a README
      deviceScaleFactor: 2,
    });

    // Surface anything the page logs; a broken shot usually shows up here first
    page.on('pageerror', (err) => failures.push(`page error: ${err.message}`));

    // The index page is the source of truth for which shots exist
    await page.goto(`${BASE}/?shot=index`, { waitUntil: 'networkidle' });
    const allIds = await page.$$eval('a[href^="?shot="]', (links) =>
      links.map((link) => link.getAttribute('href').replace('?shot=', '')),
    );

    // Hover targets live in the registry; read them off the index page
    const hoverMeta = await page.evaluate(() => window.__SHOT_HOVER__ ?? {});

    const requested = process.argv.slice(2);
    const ids = requested.length > 0 ? requested : allIds;
    console.log(`Capturing ${ids.length} shot(s): ${ids.join(', ')}\n`);

    for (const id of ids) {
      const errorsBefore = failures.length;
      await page.goto(`${BASE}/?shot=${id}`, { waitUntil: 'networkidle' });

      const frame = page.locator('#shot-frame');
      try {
        await frame.waitFor({ state: 'visible', timeout: 10_000 });
        // The shot sets this once data has landed and overlays have positioned
        await page.waitForSelector('#shot-frame[data-shot-ready="true"]', { timeout: 10_000 });
      } catch {
        failures.push(`${id}: frame never became ready`);
        console.log(`  ✗ ${id} (not ready)`);
        continue;
      }

      // Hover-only surfaces need a real pointer before the shot is taken
      const hover = hoverMeta[id];
      if (hover) {
        try {
          await page.locator(hover.selector).first().hover();
          await page.waitForTimeout(hover.settleMs ?? 800);
        } catch {
          failures.push(`${id}: hover target "${hover.selector}" not found`);
        }
      }

      const file = path.join(OUT_DIR, `screenshot-${id}.png`);
      await frame.screenshot({ path: file });

      const box = await frame.boundingBox();
      const broke = failures.length > errorsBefore;
      console.log(
        `  ${broke ? '✗' : '✓'} ${id.padEnd(20)} ${Math.round(box.width)}x${Math.round(box.height)} -> assets/screenshot-${id}.png`,
      );
    }
  } finally {
    await browser.close();
    server.kill();
  }

  if (failures.length > 0) {
    console.error(`\n${failures.length} problem(s):`);
    failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exit(1);
  }

  console.log('\nDone.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
