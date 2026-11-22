// Tests for the docs builder. Fixtures live in ./fixtures; anything a test needs to vary
// (a missing clip, a duplicate order, a broken link) is written to a temp folder instead.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePage, renderPage, renderIndex, build } from '../build.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = join(here, 'fixtures');
const read = (...p) => readFileSync(join(fixtures, ...p), 'utf8');
const tmp = () => mkdtempSync(join(tmpdir(), 'build-docs-'));

// A media folder holding the clips a page may name.
const mediaWith = (...stems) => {
  const dir = tmp();
  stems.forEach(s => { writeFileSync(join(dir, `${s}.mp4`), ''); writeFileSync(join(dir, `${s}.jpg`), ''); });
  return dir;
};

// A docs folder from { 'name.md': text }.
const docsWith = files => {
  const dir = tmp();
  Object.entries(files).forEach(([name, text]) => writeFileSync(join(dir, name), text));
  return dir;
};

const page = (extra = '', title = 'A', order = 1) =>
  `---\ntitle: ${title}\nsummary: S ${title}\norder: ${order}\n${extra}---\n\nBody.\n`;

const basicPages = () => ['tiling.md', 'tasks.md'].map(f => parsePage(read('basic', f), f));

test('parsePage reads front matter', () => {
  const p = parsePage(read('basic', 'tiling.md'), 'tiling.md');
  assert.equal(p.slug, 'tiling');
  assert.equal(p.title, 'Tiling');
  assert.equal(p.order, 5);
  assert.equal(p.clip, 'tiling-drop');
  assert.ok(!p.body.includes('---'));
  assert.ok(!p.body.includes('title:'));
  assert.ok(p.body.startsWith('Tiling needs a grid.'));
});

test('parsePage rejects a page without a title', () => {
  assert.throws(() => parsePage(read('no-title.md'), 'no-title.md'), /no-title\.md/);
});

test('renderPage shows the clip', () => {
  const [tiling, tasks] = basicPages();
  const html = renderPage(tiling, [tiling, tasks], { tag: 'v1.0.0', mediaDir: '' });
  assert.ok(html.includes('<video src="/media/tiling-drop.mp4" poster="/media/tiling-drop.jpg" autoplay muted loop playsinline controls'));
  assert.ok(html.includes("default-src 'none'; img-src 'self'; media-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'"));
});

test('renderPage without a clip has no video', () => {
  const [tiling, tasks] = basicPages();
  const html = renderPage(tasks, [tiling, tasks], { tag: 'v1.0.0', mediaDir: '' });
  assert.ok(!html.includes('<video'));
});

test('links between pages resolve on the site', () => {
  const [tiling, tasks] = basicPages();
  const html = renderPage(tiling, [tiling, tasks], { tag: 'v1.0.0', mediaDir: '' });
  assert.ok(html.includes('href="/docs/tasks"'));
  assert.ok(html.includes('href="/docs/tasks#timers"'));
});

test('links into the repo point at the release on GitHub', () => {
  const [tiling, tasks] = basicPages();
  const html = renderPage(tiling, [tiling, tasks], { tag: 'v2.5.95', mediaDir: '' });
  assert.ok(html.includes('href="https://github.com/AppifySheets/Deskbar/blob/v2.5.95/README.md#install"'));
});

test('build fails on a missing clip', () => {
  const docs = docsWith({ 'a.md': page('clip: nope\n') });
  assert.throws(
    () => build({ docsDir: docs, outDir: tmp(), mediaDir: mediaWith(), tag: 'v1' }),
    e => e.message.includes('nope.mp4') && e.message.includes('a.md'));
});

test('build fails on a duplicate order', () => {
  const docs = docsWith({ 'a.md': page('', 'A', 1), 'b.md': page('', 'B', 1) });
  assert.throws(() => build({ docsDir: docs, outDir: tmp(), mediaDir: mediaWith(), tag: 'v1' }), /order/);
});

test('build fails on a link to a missing page', () => {
  const docs = docsWith({ 'a.md': `${page()}\nSee [gone](gone.md).\n` });
  assert.throws(() => build({ docsDir: docs, outDir: tmp(), mediaDir: mediaWith(), tag: 'v1' }), /gone\.md/);
});

test('build writes every page and the index', () => {
  const out = tmp();
  const result = build({ docsDir: join(fixtures, 'basic'), outDir: out, mediaDir: mediaWith('tiling-drop'), tag: 'v1' });
  assert.equal(result.pages, 2);
  assert.ok(readFileSync(join(out, 'tiling', 'index.html'), 'utf8').includes('<h1'));
  assert.ok(readFileSync(join(out, 'index.html'), 'utf8').includes('Deskbar docs'));
});

test('index lists pages in order', () => {
  const [tiling, tasks] = basicPages();
  const html = renderIndex([tiling, tasks], { tag: 'v1.0.0' });
  const at = s => html.indexOf(s);
  assert.ok(at('href="/docs/tasks"') > -1 && at('href="/docs/tiling"') > -1);
  assert.ok(at('>Tasks<') < at('>Tiling<'));
  assert.ok(html.includes('How each part of Deskbar works, with a short screencast of it.'));
});

test('escaping', () => {
  const out = tmp();
  build({ docsDir: join(fixtures, 'escaping'), outDir: out, mediaDir: mediaWith('demo'), tag: 'v1' });
  const html = readFileSync(join(out, 'escaping', 'index.html'), 'utf8');
  assert.ok(html.includes('<code>a &lt; b &amp;&amp; c</code>'));
  // Validate the output with the repo's own html-validate rules.
  const config = join(here, '..', '..', '..', '.htmlvalidate.json');
  const run = spawnSync('npx', ['--yes', 'html-validate@11.17.0', '-c', `"${config}"`, `"${out}"`], { shell: true, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
