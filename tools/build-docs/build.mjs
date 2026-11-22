// Renders the Deskbar repo's docs/features/*.md into static pages for deskbar.app.
//
// Input: a folder of markdown pages, each starting with front matter between two `---` lines
// (`title`, `summary`, `order`, optional `clip`). Output: <outDir>/index.html (the list) and
// <outDir>/<slug>.html (one page each), wrapped in page.html. The pages are linked as
// /docs/<slug> without an extension: GitHub Pages serves docs/<slug>.html for that URL
// directly, the way /privacy maps to privacy.html. A folder with an index.html would answer
// /docs/<slug> with a 301 to /docs/<slug>/ instead. No scripts end up on the pages; the CSP
// in page.html would block them anyway.
//
// CLI: node tools/build-docs/build.mjs --docs <dir> --out site/docs --media site/media --tag <tag>
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { posix } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Marked } from 'marked';

const here = dirname(fileURLToPath(import.meta.url));
const REPO = 'https://github.com/AppifySheets/Deskbar';
// Where the markdown pages sit inside the Deskbar repo, to resolve `../../README.md` links.
const DOCS_PATH_IN_REPO = 'docs/features';

const escapeHtml = s => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const slugify = s => s.toLowerCase().replace(/<[^>]*>/g, '').replace(/[^\p{L}\p{N}\s-]/gu, '')
  .trim().replace(/\s+/g, '-');

/** Splits front matter from the body and checks the required keys. Throws naming `file`. */
export const parsePage = (text, file) => {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') throw new Error(`${file}: no front matter (expected --- on the first line)`);
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error(`${file}: front matter is not closed with ---`);
  const meta = Object.fromEntries(lines.slice(1, end)
    .filter(l => l.includes(':'))
    .map(l => [l.slice(0, l.indexOf(':')).trim(), l.slice(l.indexOf(':') + 1).trim()]));
  ['title', 'summary', 'order'].forEach(k => {
    if (!meta[k]) throw new Error(`${file}: front matter is missing "${k}"`);
  });
  if (!/^-?\d+$/.test(meta.order)) throw new Error(`${file}: "order" must be an integer, got "${meta.order}"`);
  return {
    slug: basename(file).replace(/\.md$/, ''),
    title: meta.title,
    summary: meta.summary,
    order: Number(meta.order),
    clip: meta.clip || null,
    body: lines.slice(end + 1).join('\n').replace(/^\s*\n/, '')
  };
};

/** Rewrites one link target: page links to /docs/<slug>, repo links to the release on GitHub. */
const rewriteHref = (href, allPages, file) => {
  if (!href || /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href)) return href;
  const [path, hash] = href.split('#');
  const frag = hash === undefined ? '' : `#${hash}`;
  if (path.startsWith('../'))
    return { repo: posix.normalize(posix.join(DOCS_PATH_IN_REPO, path)) + frag };
  if (path.endsWith('.md')) {
    const slug = path.replace(/^\.\//, '').replace(/\.md$/, '');
    if (!allPages.some(p => p.slug === slug))
      throw new Error(`${file}: link to ${path}, which is not a page`);
    return `/docs/${slug}${frag}`;
  }
  return href;
};

const renderMarkdown = (page, allPages, tag) => {
  const marked = new Marked({
    renderer: {
      // Links: see rewriteHref.
      link({ href, title, tokens }) {
        const target = rewriteHref(href, allPages, `${page.slug}.md`);
        const url = typeof target === 'string' ? target : `${REPO}/blob/${tag}/${target.repo}`;
        const t = title ? ` title="${escapeHtml(title)}"` : '';
        return `<a href="${escapeHtml(url)}"${t}>${this.parser.parseInline(tokens)}</a>`;
      },
      // Headings get ids so `page.md#timers` links land somewhere.
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        return `<h${depth} id="${escapeHtml(slugify(inner))}">${inner}</h${depth}>\n`;
      },
      // Raw HTML in the source is shown as text, never passed through.
      html({ text }) { return escapeHtml(text); },
      // marked writes void elements as <hr>, <br> and <img ...>, but the repo's html-validate
      // config wants them self-closed (void-style: selfclosing), so these three write the
      // closing slash. The image keeps marked's src handling (encodeURI) and escapes the alt
      // text and title; marked leaves the alt text raw.
      hr() { return '<hr />\n'; },
      br() { return '<br />'; },
      image({ href, title, text, tokens }) {
        const alt = tokens ? this.parser.parseInline(tokens, this.parser.textRenderer) : text;
        const src = (() => { try { return encodeURI(href); } catch { return null; } })();
        if (src === null) return escapeHtml(alt);
        const t = title ? ` title="${escapeHtml(title)}"` : '';
        return `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${t} />`;
      }
    }
  });
  return marked.parse(page.body);
};

const template = () => readFileSync(join(here, 'page.html'), 'utf8');

const fill = (tpl, slots) =>
  tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => slots[k] ?? '');

const sorted = pages => [...pages].sort((a, b) => a.order - b.order);

const navHtml = (allPages, currentSlug) =>
  `<nav class="docs-nav" aria-label="Docs"><ul>\n${sorted(allPages).map(p =>
    `<li><a href="/docs/${p.slug}"${p.slug === currentSlug ? ' aria-current="page"' : ''}>${escapeHtml(p.title)}</a></li>`
  ).join('\n')}\n</ul></nav>`;

// The clips are short, silent, looping screencasts that play on their own by design (they
// are the point of the page, and `muted` keeps them from making noise), so html-validate's
// no-autoplay rule is switched off for exactly this element. `controls` gives the pause
// button. The aria-label names the clip for screen readers, since a bare <video> has no
// accessible name of its own.
const videoHtml = (clip, title) =>
  `<!-- [html-validate-disable-next no-autoplay -- silent looping screencast] -->
<video src="/media/${clip}.mp4" poster="/media/${clip}.jpg" autoplay muted loop playsinline controls preload="metadata" aria-label="Screencast: ${escapeHtml(title)}"></video>`;

/** One page as a whole HTML document. */
export const renderPage = (page, allPages, { tag }) => {
  const content = `<h1>${escapeHtml(page.title)}</h1>\n<p class="lead">${escapeHtml(page.summary)}</p>\n` +
    (page.clip ? `<figure class="clip">${videoHtml(page.clip, page.title)}</figure>\n` : '') +
    renderMarkdown(page, allPages, tag);
  return fill(template(), {
    title: `${escapeHtml(page.title)} · Deskbar docs`,
    description: escapeHtml(page.summary),
    canonical: `https://deskbar.app/docs/${page.slug}`,
    nav: navHtml(allPages, page.slug),
    content
  });
};

/** The /docs/ list of pages, in `order`. */
export const renderIndex = (allPages, { tag } = {}) => {
  const lead = 'How each part of Deskbar works, with a short screencast of it.';
  const items = sorted(allPages).map(p =>
    `<li><a href="/docs/${p.slug}">${escapeHtml(p.title)}</a><span>${escapeHtml(p.summary)}</span></li>`).join('\n');
  return fill(template(), {
    title: 'Deskbar docs',
    description: lead,
    canonical: 'https://deskbar.app/docs/',
    nav: navHtml(allPages, null),
    content: `<h1>Deskbar docs</h1>\n<p class="lead">${lead}</p>\n<ul class="docs-index">\n${items}\n</ul>`
  });
};

/**
 * Reads docsDir, checks it, and writes the site pages into outDir.
 * outDir is deleted and written afresh, so it must be a folder named `docs` (site/docs in
 * practice): a mistyped --out such as `site` or `.` is refused before anything is removed.
 */
export const build = ({ docsDir, outDir, mediaDir, tag }) => {
  if (basename(resolve(outDir)) !== 'docs')
    throw new Error(`refusing to replace ${outDir}: the output folder must be named "docs"`);
  const files = readdirSync(docsDir).filter(f => f.endsWith('.md')).sort();
  const pages = files.map(f => parsePage(readFileSync(join(docsDir, f), 'utf8'), f));

  // A page named index.md would be written over the list of pages (docs/index.html).
  if (pages.some(p => p.slug === 'index'))
    throw new Error('index.md cannot be a page: docs/index.html is the list of pages');

  // Two pages with one order would make the list ambiguous.
  pages.forEach((p, i) => {
    const other = pages.find((q, j) => j < i && q.order === p.order);
    if (other) throw new Error(`${p.slug}.md and ${other.slug}.md both have order ${p.order}`);
  });
  // A clip is two files in the media folder: the video and its poster.
  pages.filter(p => p.clip).forEach(p =>
    [`${p.clip}.mp4`, `${p.clip}.jpg`].forEach(f => {
      if (!existsSync(join(mediaDir, f)))
        throw new Error(`${p.slug}.md: clip "${p.clip}" needs ${f} in ${mediaDir}`);
    }));

  // Render everything before touching the disk, so a bad link leaves no half-written site.
  const rendered = pages.map(p => [p.slug, renderPage(p, pages, { tag, mediaDir })]);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'index.html'), renderIndex(pages, { tag }));
  // docs/<slug>.html, served at /docs/<slug> (see the comment at the top of this file).
  rendered.forEach(([slug, html]) => writeFileSync(join(outDir, `${slug}.html`), html));
  return { pages: pages.length };
};

// CLI, only when run directly.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, all) =>
    a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc, []));
  const missing = ['docs', 'out', 'media', 'tag'].filter(k => !args[k]);
  if (missing.length) {
    console.error(`missing --${missing.join(' --')}\nusage: node build.mjs --docs <dir> --out <dir> --media <dir> --tag <tag>`);
    process.exit(2);
  }
  try {
    const { pages } = build({ docsDir: args.docs, outDir: args.out, mediaDir: args.media, tag: args.tag });
    console.log(`built ${pages} pages into ${args.out}`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
