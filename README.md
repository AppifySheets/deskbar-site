# deskbar-site

The website for [Deskbar](https://github.com/AppifySheets/Deskbar), the taskbar for your
virtual desktops, served at [deskbar.app](https://deskbar.app).

It is plain HTML and CSS with no framework, no build step, no scripts, no analytics and no
cookies. Everything that gets published lives in [`site/`](site/); the rest of the repository
is documentation and checks.

| Path | What it is |
|---|---|
| `site/index.html` | The home page: what Deskbar does, the screenshot, download, pricing |
| `site/privacy.html`, `site/terms.html`, `site/refunds.html` | The legal pages the footer links to |
| `site/404.html` | Served by GitHub Pages for any path that does not exist |
| `site/css/` | `site.css` for every page, `home.css` for the home page only |
| `site/img/` | The hero capture at 1x, 2x and 3x, the mark, the share image, the Store badge |
| `site/download/`, `site/source/` and others | Short links, each a page that forwards the browser |
| `docs/hosting.md` | How the site is hosted: GitHub Pages settings and the DNS at Cloudflare |
| `.github/workflows/check.yml` | HTML validation and link checking on every pull request |
| `.github/workflows/pages.yml` | Publishes `site/` to GitHub Pages on every push to main |

## Previewing locally

Links between pages are written without `.html` (`/privacy`, not `/privacy.html`), the way
GitHub Pages serves them, so preview with a server that does the same:

```powershell
npx serve site
```

## Rules for changing it

- Every claim about the app has to be checkable against the Deskbar README. When unsure,
  leave it out.
- Screenshots are real PrintWindow captures of the app, never mock-ups or edited images,
  and never one that shows a real person's name or a private window title. The hero is
  captured at `"BarScale": 1.8` on a 150% display, shown 221 points wide, and shipped
  at 1x, 2x and 3x (221, 442 and 663 pixels), so it stays sharp on every screen.
- Deskbar is "source available", never "open source".
- Nothing loads from another origin. The Content-Security-Policy meta tag in each page blocks
  it anyway, so a third-party script or font fails in the browser rather than shipping.
- The legal pages are Petre's to approve before they change.

## Copyright

The content of this site is copyright Petre Chitashvili, all rights reserved.
