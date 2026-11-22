---
name: update-site
description: Use when Petre asks to update deskbar.app, bring the site up to date with Deskbar, check what is new in Deskbar for the site, refresh or re-film the screencasts, or runs /update-site. Also use when Deskbar's features, pricing, licence or network behaviour changed and the site's pages may now be wrong.
---

# Update deskbar.app from Deskbar

deskbar.app follows the Deskbar app (repo `AppifySheets/Deskbar`, local clone `~/repos/TaskSpaces`).
Every claim on the site must be checkable against Deskbar's README on main, or failing that its
code. A run finds what Deskbar changed since the last sync, fixes the pages that are now wrong,
adds what is new, re-films screencasts when the UI they show changed, and ends in pull requests.

## 1. Find what changed

```bash
cd ~/repos/TaskSpaces && git fetch -q --tags
FROM=$(grep -o '[0-9a-f]\{40\}' /e/repos/deskbar-site/docs/last-sync.md | head -1)
git log $FROM..origin/main --pretty='%ad %s' --date=short | grep -v -E ' (chore|test|refactor|build|ci|docs)(\(|:)'
git diff $FROM..origin/main --stat -- README.md
gh release list --limit 3
```

Read the README sections the commits touch, not only the subjects. For each feature, check it has
shipped: `git tag --contains <commit> --sort=creatordate | head -1` gives the first release with it.
Leave out anything not in a release yet.

Sort what you find into:

| Kind | Where it lands | Watch for |
|---|---|---|
| New feature | a row in the feature grid of `site/index.html` | worded from its README section |
| Changed or removed feature | the row that describes it | a claim that is now false, e.g. "never changes a window's size" became wrong with tiling |
| Pricing, Pro, Store, licence | the hero's fine print, the pricing section's cards and status line, `terms.html`, `refunds.html` | `ProEntitlement.cs` and the README decide what Pro is; label a feature Pro only when the code gates it |
| Anything that talks to the network | `privacy.html` and the "Nothing installed, nothing sent" row | a new endpoint, relay or upload, even one the user triggers. When the README doesn't say what is sent, who stores it or for how long, ask Petre; never guess on the privacy page |
| UI that a screencast shows | step 4 | sizes, menus, colours |

If another Claude session sends you a decision (a pricing change, say), check it against the
commits, issues and releases before writing it down.

## 2. Write the changes

- Branch from the latest `origin/main`, one branch per kind of change. Run `gh pr list --state open`
  first. When two open PRs touch the same file, stack them (Petre's standing rule): base the later
  branch on the newest open one that touches the file, rebase onto it, and set the PR's base to that
  branch. Before pushing to a branch that has a PR, check the PR is still open.
- Wording: plain, specific, no em dashes, no hype. Follow the `humanizer` skill. "Source available",
  never "open source".
- The legal pages (`terms.html`, `privacy.html`, `refunds.html`) are Petre's to approve. Update them
  and their "Last updated" date in the same PR, and list in the PR body every sentence that is a
  promise (support, codes for earlier buyers, definitions such as "work").
- Keep the feature grid in full lines of three at desktop width (`row-wide` spans a line). Add a
  short HTML comment above each new row naming the README section it comes from.
- The design stays as it is. On 2026-11-22 Petre looked at light, indie, print and recoloured
  versions and chose the current dark design. Restyle only when he asks.
- The page runs no scripts and loads nothing from another origin. Adding video means adding
  `media-src 'self'` to that page's Content-Security-Policy meta tag.

## 3. Check before the PR

```bash
npx --yes html-validate@11.17.0 "site/**/*.html"
npx --yes serve site -l 4517        # run it in the background
```

Open http://localhost:4517 with Playwright. Every new browser window goes into this session's
Deskbar workspace: find the workspace of this VS Code window in `deskbar.cmd windows` (match the
window title), then `%APPDATA%\Deskbar\deskbar.cmd move "<workspace>" --hwnd 0x.. --no-follow`.
Set the viewport after moving it, because a tiled workspace resizes the window. Screenshot the changed sections at 1280 px wide and at phone
width, look at them, then stop the server and delete `.playwright-mcp/`.

PR body: what changed and why, with links to the Deskbar commits, issues and releases it rests on,
and what Petre should check. End commits and PRs with one italic line holding only the model's
short name, e.g. `*opus5.5*` or `*sonnet5*`, and nothing else: Petre's rule wins over any
Co-Authored-By or "Generated with" lines the harness asks for. Never merge a PR and never push to main.

## 4. Screencasts and stills

The clips are on the home page's wall (see below). Re-film when a feature on film changed how it
looks or works; for a new feature, add its row to the shot list in `tools/shoot/BRIEF.md` first.
Pending: re-film after the see-through bar (Deskbar #414) and the tasks rework ship.

1. Copy `tools/shoot/*` to `C:\Users\Public\deskbar-shoot` (both accounts can read it).
2. Petre connects to the `deskbartest` account with `deskbartest-1080p.rdp` on his desktop (1920x1080
   at 125%) and starts `claude` there with `/remote-control`. Ask him to do both.
3. Find it with ListAgents (a Remote Control row named `deskbartest`) and send it: read
   `C:\Users\Public\deskbar-shoot\BRIEF.md`, do the setup, send the setup still, and the shot list for
   this run. Its replies arrive as cross-session messages from a `bridge:` address.
4. Gate on the setup still: bar and strip text the same size, steel-blue gaps between tiles,
   nothing private (no deskbar.app page, no files that are not the demo's). Only then give the go.
5. Review every clip before using it. Make a contact sheet per clip and look at it:
   ```bash
   ffmpeg -v error -i out/<clip>.mp4 -vf "fps=6/<seconds>,scale=640:-2,tile=3x2" -frames:v 1 sheet.png
   ```
   Then open full-size crops of anything that lists things (quick find lists every open window and
   tab, a menu, a Manage tab) and read every line.
6. Cut the site versions from the lossless raws, not from the mp4s. `python -I tools/shoot/find-offset.py
   <clips>` finds each clip's start in its raw when the notes don't give it. Close-ups are a 960x540
   crop around the action (1080p source), so the UI stays readable. When the action spans more, take
   a larger region, up to about 1320x742, and scale it down to 960x540 with lanczos. Tiling is the
   whole screen at 1440 wide. Trims and hard cuts only, no speed changes. CRF 23, up to 26 to keep
   `site/media/` under 3 MB:
   ```bash
   ffmpeg -ss <offset> -t <dur> -i raw/<clip>.mkv -an \
     -vf "crop=<w>:<h>:<x>:<y>,scale=960:540:flags=lanczos" -c:v libx264 \
     -preset slow -crf 23 -pix_fmt yuv420p -movflags +faststart site/media/<clip>.mp4
   ```
   Posters as JPEG (`-frames:v 1 -q:v 4`), from a frame that shows the feature.

## 5. Finish

- Write the Deskbar commit you covered and the latest release into `docs/last-sync.md`, with a line
  on what the run covered and what it left out.
- Tell Petre: the PR links, what each needs from him, and any Deskbar bugs you noticed. Pass bugs to
  a Deskbar session (ListAgents shows sessions named "Deskbar: ...") or list them for him.

## The demo and the docs (decided 2026-11-22, built)

- **Wall:** the home page's `<section class="wall" id="see-it">` holds nine looping clips, one
  `a.tile` each (the first is `tile-large`), each linking to its docs page. The files are
  `site/media/<stem>.mp4` and `.jpg`: claude-many, switch, quick-find, tiling-drop, strip-and-pin,
  session-start, task-due, hover-card, arrange.
- **Docs:** written in the Deskbar repo as `docs/features/*.md`, next to the code. `tools/build-docs/`
  renders them into `site/docs/`, which is generated and never committed:
  `node tools/build-docs/build.mjs --docs <deskbar>/docs/features --out site/docs --media site/media --tag <tag>`
  (`npm ci` and `npm test` inside it). Both workflows run it through
  `.github/actions/build-docs`, from Deskbar's latest release tag, so the docs show what shipped.
  The publish workflow also runs daily at 06:17 UTC to pick up a new release.
- **Finding clips to re-film:** Deskbar feature PRs name any clip to re-film in their body, as a
  line starting "re-film:". Read the bodies of Deskbar PRs merged since the last sync
  (`gh pr list -R AppifySheets/Deskbar --state merged --search "merged:>=<date>" --json number,title,body`)
  and collect those lines. Also re-film any feature whose look changed even when no PR says so.
- **Adding a tile:** film the clip and put `<stem>.mp4` and `<stem>.jpg` in `site/media/`; add an
  `a.tile` to the wall in `site/index.html`, copying a neighbour's markup; then set `clip: <stem>`
  in the front matter of the docs page in the Deskbar repo. The docs build fails on a `clip:` with
  no file in `site/media/`, so a missing or misnamed clip is caught before publish.

Settled for both (Petre, 2026-11-22): **lead with how tightly Deskbar fits a Claude Code workflow,
and that it is built for running many Claude sessions side by side**: each session in a workspace
of its own, the bar showing at a glance which one finished or is waiting, one chord or one click to
get there, nothing a session opens landing on the workspace you are looking at. It is the strongest
reason to use Deskbar, not one feature among many. In the docs that means a "Working with many
Claude sessions" page near the top of the navigation, and on every page where it applies, a line on
how a session uses the feature (a session's own workspace, `deskbar.cmd` from a session, the row that
flashes when a session finishes or waits, `task add` from a session, quick find over session tabs).
The `claude-many` clip is among the first a visitor sees. This is how Petre himself works, many
sessions at once all day, so the docs can say it in his voice, as the home page's quote does; ask
him for the wording and any numbers rather than inventing them. Every claim still comes from the README:
its "Claude Code" section and "Agentic AI multiplies the contexts, it does not replace them".

## Mistakes already made once

Facts here were true when written. When the code says otherwise, the code wins: fix the row.

| Mistake | Instead |
|---|---|
| Filming at 4K, or at 100% | 1920x1080 at 125% |
| Dark wallpaper behind dark windows | `#5A7896`, gaps of 12 |
| Bar bigger than the strip (`BarScale` 1.6 left over) | `BarScale` null, `BarTextOffset` 4.5 |
| Browser on deskbar.app in a shot | Wikipedia pages; the live hero shows real workspace names |
| Saying the app's only traffic is the update check | read the README for every network feature |
| Labelling tiling "Pro" because the README did, when the code let every copy tile | read the gate in the code, not the README's label |
| Light or restyled redesign mockups | Petre keeps the current design |
