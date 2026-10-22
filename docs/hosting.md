# Hosting

deskbar.app is served by Cloudflare Pages straight from this repository. The domain is
registered at Namecheap, and its nameservers already point at Cloudflare, so the zone
`deskbar.app` lives in the same Cloudflare account as the Pages project.

## The Pages project

Connected through Cloudflare's GitHub integration, which deploys on every push:

| Setting | Value |
|---|---|
| Project name | `deskbar-site` (gives the fallback address deskbar-site.pages.dev) |
| Repository | AppifySheets/deskbar-site |
| Production branch | `main` |
| Framework preset | None |
| Build command | none (leave it empty) |
| Build output directory | `site` |
| Root directory | leave it empty (the repository root) |

A merge to `main` publishes the site. Every pull request also gets its own preview address,
posted on the pull request as a check, and preview builds are marked `noindex` by
Cloudflare, so they stay out of search results.

Only `site/` is published. The README, this file, the workflow and the checker configs stay
out of the site because they are outside the output directory.

## The domain

- `deskbar.app` is a custom domain on the Pages project. Cloudflare creates its DNS record
  itself when the domain is added there.
- `www.deskbar.app` redirects permanently to `https://deskbar.app`, path and query kept.
  A `_redirects` file cannot do this (it does not match on hostname), so it is a Bulk
  Redirect at the account level, following Cloudflare's own guide
  ([Redirecting www to domain apex](https://developers.cloudflare.com/pages/how-to/www-redirect/)):
  a list with one entry, source `www.deskbar.app`, target `https://deskbar.app`, status 301,
  with Preserve query string, Subpath matching, Preserve path suffix and Include subdomains
  ticked; a Bulk Redirect rule that uses the list; and a placeholder DNS record so the
  hostname resolves at all: type `A`, name `www`, address `192.0.2.1`, proxied. That address
  is a documentation address that never answers; the redirect fires at Cloudflare's edge
  before any request could reach it.
- SSL/TLS encryption mode is Full (strict). Always Use HTTPS is on.

## Zone settings that must stay off

The site promises no cookies and no scripts (see `site/privacy.html`), and its
Content-Security-Policy blocks any script. Several Cloudflare zone features inject a script
or set a cookie on every page. If one is switched on, the privacy page becomes untrue and
the browser blocks the injected script anyway. Keep these off for deskbar.app:

- Scrape Shield, Email Address Obfuscation. When it is on, Cloudflare rewrites the
  `mailto:hello@deskbar.app` links and injects a script to decode them; the CSP blocks the
  script and the email links break.
- Speed, Rocket Loader.
- Web Analytics, both for the zone and in the Pages project's own Metrics tab.
- Security, Bot Fight Mode. Its JavaScript detections inject a script and it can set a
  bot-management cookie.
- Zaraz.

## Files Pages reads from site/

- `_headers` sets the security headers on every response: a Content-Security-Policy that
  allows only the site's own images and stylesheets, HSTS for a year (without preload),
  nosniff, no framing, a strict referrer policy and an empty permissions policy. It is not
  served as a page.
- `_redirects` holds short links (`/download` to the latest GitHub release, `/source` to
  the Deskbar repository) and a few guessed names for the legal pages. It is not served
  either.
- `404.html` is served, with status 404, for any path that does not exist.
- Pages serves `privacy.html` at `/privacy` and redirects the `.html` form there itself, so
  the pages link to each other without the extension.

## Checking it after a change

```powershell
curl.exe -sI https://deskbar.app/              # 200, with the headers from _headers
curl.exe -sI https://www.deskbar.app/privacy   # 301 to https://deskbar.app/privacy
curl.exe -sI https://deskbar.app/download      # 302 to the latest GitHub release
curl.exe -sI https://deskbar.app/nope          # 404
```

The response to the first one should carry `content-security-policy` and no `set-cookie`.
