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
| `site/404.html` | Served by Cloudflare Pages for any path that does not exist |
| `site/css/` | `site.css` for every page, `home.css` for the home page only |
| `site/img/` | The bar capture and mark from the Deskbar repo, the share image, the Store badge |
| `site/_headers`, `site/_redirects` | Cloudflare Pages response headers and redirects |
| `docs/hosting.md` | How the site is hosted, and the Cloudflare settings it depends on |
| `.github/workflows/check.yml` | HTML validation and link checking on every pull request |

## Previewing locally

Links between pages are written without `.html` (`/privacy`, not `/privacy.html`), the way
Cloudflare Pages serves them, so preview with a server that does the same:

```powershell
npx serve site
```

## Rules for changing it

- Every claim about the app has to be checkable against the Deskbar README. When unsure,
  leave it out.
- Screenshots come only from `docs/images` in the Deskbar repo, which holds sanitised
  captures. Never one that shows a real person's name as a workspace name.
- Deskbar is "source available", never "open source".
- Nothing loads from another origin. The Content-Security-Policy in `site/_headers` blocks
  it anyway, so a third-party script or font fails in the browser rather than shipping.
- The legal pages are Petre's to approve before they change.

## Copyright

The content of this site is copyright Petre Chitashvili, all rights reserved.
