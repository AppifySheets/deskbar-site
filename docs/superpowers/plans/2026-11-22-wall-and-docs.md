# Wall of Clips and Feature Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put a wall of nine looping screencasts under the deskbar.app hero and publish a page per feature at deskbar.app/docs, built from Markdown that lives in the Deskbar repo.

**Architecture:** Feature pages are Markdown with a small front matter in `docs/features/` of AppifySheets/Deskbar, seeded once from the README and kept current by each feature PR. The site's publish and check workflows fetch that folder at Deskbar's latest release tag and render it into `site/docs/` with a dependency-light Node script, inside the site's existing design. Clips are trimmed and cropped from lossless recordings of the GitHub build and stored in `site/media/`.

**Tech Stack:** plain HTML and CSS (no scripts on any page), Node 22 with `node:test`, `marked@15.0.12` for Markdown, ffmpeg for clips, GitHub Actions and Pages.

**Spec:** [deskbar.app: wall of clips and feature docs](https://claude.ai/artifact/Gc4t4Ta4FGmoJ5p94YMhfJ), approved by Petre on 2026-11-22. Defaults taken from its open questions: docs at deskbar.app/docs (option A), the wall right under the hero, the quick find clip kept as filmed, clips filmed again on 2.5.95 now and the task clip again after the tasks rework.

## Global Constraints

- No script on any page, nothing loaded from another origin; pages that show video add `media-src 'self'` to their Content-Security-Policy meta tag.
- Real footage only: trims and crops, no edits that show something that did not happen. Nothing private in any frame.
- Docs describe the build people download: they are built from Deskbar's latest release tag, never from main.
- Every claim comes from the Deskbar README or a page in `docs/features/`.
- The current design stays: dark page, layout, hero. New CSS reuses the tokens in `site/css/site.css`.
- Copy: plain, specific, no em dashes, "source available", never "open source"; apply the humanizer skill.
- Lead with running many Claude Code sessions side by side: first and largest tile, first docs page.
- PRs: one per task branch, stacked when they touch the same file as an open PR; never merge, never push to main; commits and PRs end with one italic line holding only the model's short name.
- Deskbar repo work happens in a git worktree, never in the shared checkout.

## Review Focus

- A page links another page as `tiling.md` or a README section as `../../README.md#tasks`: on the site both must resolve (`/docs/tiling`, the README on GitHub at the release tag). Test in Task 2.
- A page with no `clip` renders without a video element and without an empty frame. Test in Task 2.
- A page names a clip whose `.mp4` or `.jpg` is missing from `site/media/`: the build fails and names the page and the file. Test in Task 2.
- Markdown with code spans, `<` and `&` in text, or a table produces HTML that html-validate accepts. Test in Task 2.
- The Deskbar fetch fails or the release has no `docs/features/`: the publish run fails and the live site stays as it was (Pages keeps the last deploy). Check in Task 3.

---

### Task 1: Seed the feature pages in the Deskbar repo

**Files (in AppifySheets/Deskbar, worktree `docs-features`):**
- Create: `docs/features/<slug>.md` for the fifteen slugs below
- Modify: `README.md` (each section that moved gets a one-line link to its page; the overview stays)

**Interfaces:**
- Produces: the page format every later task reads. Front matter between `---` lines, one `key: value` per line: `title` (required), `summary` (required, one sentence), `order` (required, integer, unique), `clip` (optional, a file stem in deskbar-site `site/media/`). Body sections in this order: lead sentence, `## How to use it`, `## Settings`, `## From a script` (when there is a command), `## With Claude sessions` (when it applies), `## Related`.
- Slugs and order: 1 `claude-sessions`, 2 `the-bar`, 3 `switching`, 4 `quick-find`, 5 `tiling`, 6 `strips`, 7 `tasks`, 8 `arranging`, 9 `docking`, 10 `where-windows-go`, 11 `naming-windows`, 12 `scripts`, 13 `manage`, 14 `updates`, 15 `reporting-a-problem`.
- Clip stems: `claude-sessions` → `claude-many`, `switching` → `switch`, `quick-find` → `quick-find`, `tiling` → `tiling-drop`, `strips` → `strip-and-pin`, `tasks` → `task-due`, `the-bar` → `hover-card`, `arranging` → `arrange`, `scripts` → `session-start`.

- [ ] **Step 1:** Create the worktree from the latest `origin/main` and write each page from its README section (Reading it, Switching workspaces, Quick find, the Tile windows paragraphs, Tasks, Arranging the bar, Docking and Taskbar pieces, Where windows go, Naming windows, Driving it from scripts with its Claude Code part, Manage, Updates, Reporting a problem). Keep the README's facts and wording where they work; restructure into the sections above. `claude-sessions` draws from "Claude Code", "Agentic AI multiplies the contexts" and the attention, `open`, `start`, `task add` and quick find passages.
- [ ] **Step 2:** Check every front matter by hand: fifteen pages, `order` 1 to 15 with no repeats, each `clip` one of the nine stems above.
- [ ] **Step 3:** Replace each moved README passage's detail with a link to its page, keeping the overview, install and development sections whole.
- [ ] **Step 4:** Commit, push, open the PR in AppifySheets/Deskbar. The body says the pages are seeded from the README, that later feature PRs update them (the project memory rule), and that deskbar.app/docs renders them from the next release.

### Task 2: The docs builder

**Files (deskbar-site):**
- Create: `tools/build-docs/package.json` (`"type": "module"`, dependency `marked` pinned to `15.0.12`, script `"test": "node --test"`), `tools/build-docs/package-lock.json`
- Create: `tools/build-docs/build.mjs` (exports below, plus a CLI)
- Create: `tools/build-docs/page.html` (the page shell: head with CSP `default-src 'none'; img-src 'self'; media-src 'self'; style-src 'self'; base-uri 'none'; form-action 'none'`, the site header and footer as in `site/privacy.html`, `{{title}}`, `{{description}}`, `{{nav}}`, `{{content}}` slots)
- Create: `site/css/docs.css` (a left list of pages on wide screens, stacked on phones, the clip at full content width)
- Create: `tools/build-docs/test/build.test.mjs`, fixtures under `tools/build-docs/test/fixtures/`
- Modify: `.gitignore` (add `site/docs/` and `tools/build-docs/node_modules/`)

**Interfaces:**
- Consumes: the page format from Task 1.
- Produces:
  - `parsePage(text: string, file: string) -> { slug, title, summary, order, clip|null, body }`; throws `Error` naming `file` when `title`, `summary` or `order` is missing or `order` is not an integer.
  - `renderPage(page, allPages, { tag, mediaDir }) -> string` (a whole HTML document).
  - `renderIndex(allPages, { tag }) -> string`.
  - `build({ docsDir, outDir, mediaDir, tag }) -> { pages: number }`; writes `outDir/<slug>/index.html` and `outDir/index.html`; throws on duplicate `order`, on a `clip` with no `<clip>.mp4` or `<clip>.jpg` in `mediaDir`, on a link to a `.md` page that does not exist.
  - CLI: `node tools/build-docs/build.mjs --docs <dir> --out site/docs --media site/media --tag <tag>`.

- [ ] **Step 1: Write the failing tests** in `test/build.test.mjs`:
  - `parsePage reads front matter`: fixture `tiling.md` gives `{ slug: 'tiling', title: 'Tiling', order: 5, clip: 'tiling-drop' }` and a body without the front matter.
  - `parsePage rejects a page without a title`: throws, message contains the file name.
  - `renderPage shows the clip`: output contains `<video src="/media/tiling-drop.mp4" poster="/media/tiling-drop.jpg" autoplay muted loop playsinline controls`.
  - `renderPage without a clip has no video`: no `<video` in the output.
  - `links between pages resolve on the site`: `[Tasks](tasks.md)` becomes `href="/docs/tasks"`, `[Tasks](tasks.md#timers)` becomes `href="/docs/tasks#timers"`.
  - `links into the repo point at the release on GitHub`: `[README](../../README.md#install)` with tag `v2.5.95` becomes `href="https://github.com/AppifySheets/Deskbar/blob/v2.5.95/README.md#install"`.
  - `build fails on a missing clip`: a page with `clip: nope` throws, message contains `nope.mp4` and the page file.
  - `build fails on a duplicate order` and `build fails on a link to a missing page`.
  - `index lists pages in order`: titles appear in `order`, each linking `/docs/<slug>`.
  - `escaping`: a fixture with `` `a < b && c` ``, a bare `<` and `&` in text, and a pipe table builds; run html-validate over the fixture output in the test (`npx --yes html-validate@11.17.0 <dir>`) and expect exit code 0.
- [ ] **Step 2:** Run `npm test --prefix tools/build-docs`. Expected: every test fails (module not found).
- [ ] **Step 3:** Implement `build.mjs`. Front matter parsed by hand (split on the first two `---` lines, `key: value`), no YAML dependency. Links rewritten with a `marked` renderer override for `link`. The page `<title>` is `<title> · Deskbar docs`, the description is `summary`. The nav lists all pages by `order` with `aria-current="page"` on the current one.
- [ ] **Step 4:** Run `npm test --prefix tools/build-docs`. Expected: all pass.
- [ ] **Step 5:** Build against Task 1's worktree (`--docs <worktree>/docs/features --tag main-preview`), serve `site/` with `npx serve site -l 4517`, look at `/docs/` and three pages at 1280 px and 375 px with Playwright (window moved into this session's Deskbar workspace), then delete `site/docs/`.
- [ ] **Step 6:** Commit.

### Task 3: Build the docs in CI and on publish

**Files:**
- Modify: `.github/workflows/pages.yml`, `.github/workflows/check.yml` (comments on every step saying what and why)

**Interfaces:**
- Consumes: the CLI from Task 2.

- [ ] **Step 1:** In both workflows, before validation or upload: find Deskbar's latest release tag (`gh release view --repo AppifySheets/Deskbar --json tagName -q .tagName`, `GH_TOKEN: ${{ github.token }}`), sparse-clone `docs/features` at that tag (`git clone --depth 1 --branch "$TAG" --filter=blob:none --sparse https://github.com/AppifySheets/Deskbar deskbar` then `git -C deskbar sparse-checkout set docs/features`), `npm ci` and `npm test` in `tools/build-docs`, then run the CLI into `site/docs`.
- [ ] **Step 2:** `pages.yml` also runs on a daily schedule (`cron: "17 6 * * *"`) so a new Deskbar release reaches the docs within a day without a site commit. A failed fetch or build fails the run, and Pages keeps the last deploy.
- [ ] **Step 3:** `check.yml` validates and link-checks the built pages with everything else.
- [ ] **Step 4:** Push the branch and confirm the check run passes. Until a Deskbar release contains `docs/features/`, the build must fail with a clear message naming the tag. Expected now: that failure, if Task 1 is not released yet; a pass once it is.
- [ ] **Step 5:** Commit.

### Task 4: Film the wall's clips on the GitHub build

**Files:**
- Modify: `tools/shoot/BRIEF.md` (shot list rows for the new clips)
- Create: `site/media/<stem>.mp4` and `site/media/<stem>.jpg` for the nine stems in Task 1

**Interfaces:**
- Produces: the nine stems listed in Task 1, each a muted H.264 MP4 and a JPEG poster.

- [ ] **Step 1:** Add shot list rows to `BRIEF.md`: `claude-many` (three Claude sessions in Website, Research and Invoices; two finish while you are on Website, their rows flash; a click on one row lands on its VS Code window), `session-start` (a session runs `deskbar.cmd start Research -- notepad`; the window appears in Research while you stay on Website, and Research's row shows the new icon), `hover-card` (rest on an icon in another workspace's row; the card shows the title, app, workspace and the picture), `arrange` (Arrange workspaces on, drag Music above Invoices, drag Music onto Research and name the group "Reading", Done, then fold the Reading group). Keep the other five clips as named.
- [ ] **Step 2:** Run the shoot as `/update-site` step 4 describes, on Deskbar 2.5.95 or later from GitHub: setup still, approval, all nine clips. Visit every demo workspace shortly before filming so no row has faded unless the clip is about fading.
- [ ] **Step 3:** Review each clip as the skill says: a contact sheet each, full-size crops of every list.
- [ ] **Step 4:** Cut the site versions from the raws with `tools/shoot/find-offset.py` for the start: close-ups as a 960x540 crop around the action, `tiling-drop` as the whole screen scaled to 1440 wide; H.264, CRF 23, `-preset slow`, `yuv420p`, `+faststart`, no audio; poster from a frame that shows the feature, JPEG `-q:v 4`. Expected total under 3 MB.
- [ ] **Step 5:** Commit the media.

### Task 5: The wall on the home page and the Docs link

**Files:**
- Modify: `site/index.html` (CSP adds `media-src 'self'`; a `<section class="wall" id="see-it" aria-labelledby="wall-title">` inside `.stage` between the hero figure and the features section; nav gains `<a href="/docs/">Docs</a>` before Download)
- Modify: `site/css/home.css` (`.stage` grid areas gain a `wall wall` row between `hero shot` and `features features`; the wall grid)
- Modify: `site/privacy.html`, `site/terms.html`, `site/refunds.html`, `site/404.html` (nav gains Docs)

**Interfaces:**
- Consumes: the stems from Task 4, the slugs from Task 1, the Docs pages from Tasks 2 and 3.

- [ ] **Step 1:** Write the wall: nine `<a class="tile" href="/docs/<slug>">` in the order of the spec's table, each holding `<video src="/media/<stem>.mp4" poster="/media/<stem>.jpg" autoplay muted loop playsinline width="960" height="540" aria-label="...">`, an `<h3>` name and one line. The first tile has class `tile-large`. Copy for names and lines comes from the spec's table, through the humanizer skill. No `controls` on wall tiles: the tile is a link, and controls would fight the click. This departs from the spec, which gave every clip controls; the docs pages keep them, so pause and full screen are one click away.
- [ ] **Step 2:** CSS: three columns at desktop width, `tile-large` spanning two columns and two rows; two columns under 860 px with `tile-large` spanning both; one column under 640 px. Video `width: 100%; height: auto; aspect-ratio: 16 / 9`, the existing card surface and border tokens, a visible focus ring on the tile.
- [ ] **Step 3:** Run `npx --yes html-validate@11.17.0 "site/**/*.html"` and lychee with `lychee.toml` against a site built with Task 2's CLI. Expected: both pass.
- [ ] **Step 4:** Look at the home page at 1440, 1024, 768 and 375 px with Playwright; the wall fits without horizontal scroll, the large tile reads first, every clip plays.
- [ ] **Step 5:** Commit, push, open the PR stacked on `site/pricing-personal-free`; the body links the spec and Tasks 1 to 4.

### Task 6: Teach the skill and the README about the wall and the docs

**Files:**
- Modify: `.claude/skills/update-site/SKILL.md` (section "The demo and the docs": built where, re-film triggers from Deskbar PR bodies, adding a tile)
- Modify: `README.md` (table rows for `tools/build-docs/`, `site/media/`, generated `site/docs/`; "Previewing locally" gains the build command)
- Modify: `docs/last-sync.md`

- [ ] **Step 1:** Update the three files. In the README, say `site/docs/` is generated and not committed.
- [ ] **Step 2:** Commit and push to the skill's PR branch if it is still open, otherwise a new branch from `origin/main`.
